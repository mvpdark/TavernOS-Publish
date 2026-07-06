// Jimeng (即梦) Web API direct client.
//
// This module connects directly to Jimeng's web API (jimeng.jianying.com),
// eliminating the need for an external jimeng-api service. Users only need to
// provide their sessionid (captured from browser DevTools → Application →
// Cookies → sessionid). Everything else (deviceId, Cookie, Sign) is generated
// automatically, mirroring the approach of the open-source jimeng-api project.
//
// AUTHENTICATION:
//   Jimeng's web API authenticates via:
//   1. sessionid — the only user-provided credential, from jimeng.jianying.com
//      DevTools → Application → Cookies → sessionid
//   2. Cookie — auto-constructed from sessionid + random device/web/user IDs
//   3. Sign — auto-computed via MD5("9e2c|" + URI_tail + "|" + platform + "|" + version + "|" + timestamp + "||11ac")
//
// API ENDPOINTS (reverse-engineered from jimeng.jianying.com web traffic):
//   - Generate: POST /mweb/v1/aigc_video_generation/generate
//   - Query:    POST /mweb/v1/aigc_video_generation/task_list
import { createHash, randomUUID } from "node:crypto";
import { uploadAudioFromUrl, MAX_TOTAL_AUDIO_DURATION_SEC, } from "./jimeng-vod-uploader.js";
// ---------------------------------------------------------------------------
// Constants — extracted from jimeng-api (https://github.com/iptag/jimeng-api)
// ---------------------------------------------------------------------------
/** Base URL for Jimeng CN web API. */
const JIMENG_BASE_URL = "https://jimeng.jianying.com";
/** Default assistant ID for CN region. */
const DEFAULT_ASSISTANT_ID = 513695;
/** Platform code. */
const PLATFORM_CODE = "7";
/** Version code. */
const VERSION_CODE = "8.4.0";
/** Region code for CN. */
const REGION_CN = "cn";
/** Sign key prefix/suffix — extracted from jimeng-api core.ts. */
const SIGN_PREFIX = "9e2c";
const SIGN_SUFFIX = "11ac";
/** Polling interval in milliseconds (5 seconds). */
const POLL_INTERVAL_MS = 5_000;
/** Maximum poll attempts (180 × 5s = 15 minutes). */
const POLL_MAX_ATTEMPTS = 180;
/** Request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 45_000;
/** Video model name mapping — maps our model IDs to Jimeng internal model names. */
const VIDEO_MODEL_MAP = {
    "jimeng-video-seedance-2.0": "dreamina_seedance_40_pro",
    "jimeng-video-seedance-2.0-fast": "dreamina_seedance_40",
    "jimeng-video-3.5-pro": "dreamina_ic_generate_video_model_vgfm_3.5_pro",
    "jimeng-video-3.0-pro": "dreamina_ic_generate_video_model_vgfm_3.0_pro",
    "jimeng-video-3.0": "dreamina_ic_generate_video_model_vgfm_3.0",
    "jimeng-video-3.0-fast": "dreamina_ic_generate_video_model_vgfm_3.0_fast",
    "jimeng-video-2.0": "dreamina_ic_generate_video_model_vgfm_lite",
    "jimeng-video-2.0-pro": "dreamina_ic_generate_video_model_vgfm1.0",
    // Also accept internal model names directly
    "dreamina_seedance_40_pro": "dreamina_seedance_40_pro",
    "dreamina_seedance_40": "dreamina_seedance_40",
};
// ---------------------------------------------------------------------------
// Omni reference mode constants (Seedance 2.0 only)
// ---------------------------------------------------------------------------
/** Benefit type for omni_reference mode (Seedance 2.0 Pro). */
const OMNI_BENEFIT_TYPE_PRO = "dreamina_video_seedance_20_video_add";
/** Benefit type for omni_reference mode (Seedance 2.0 Fast). */
const OMNI_BENEFIT_TYPE_FAST = "dreamina_seedance_20_fast_with_video";
/** Maximum reference images in omni_reference mode. */
const MAX_OMNI_IMAGES = 9;
/** Maximum reference audios in omni_reference mode. */
const MAX_OMNI_AUDIOS = 3;
/** Regex to match browser-style @图1 @图2 @Image1 references in prompts. */
const WEB_IMAGE_REF_RE = /@(?:图|圖|Image|image|IMG|img)\s*(\d+)/g;
// ---------------------------------------------------------------------------
// Auto-generated device identifiers (random, like jimeng-api does)
// ---------------------------------------------------------------------------
/** Random web ID (18-19 digit number, used in Cookie as _tea_web_id). */
const WEB_ID = String(Math.floor(Math.random() * 999999999999999999) + 7000000000000000000);
/** Random user ID (32-char hex UUID without dashes, used in Cookie as uid_tt). */
const USER_ID = randomUUID().replace(/-/g, "");
// ---------------------------------------------------------------------------
// Cookie & Sign generation (mirrors jimeng-api core.ts)
// ---------------------------------------------------------------------------
/**
 * Build the Cookie header from a sessionid.
 * All other cookie fields are auto-generated (same approach as jimeng-api).
 */
function generateCookie(sessionid) {
    const ts = Math.floor(Date.now() / 1000);
    return [
        `_tea_web_id=${WEB_ID}`,
        `is_staff_user=false`,
        `sid_guard=${sessionid}%7C${ts}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
        `uid_tt=${USER_ID}`,
        `uid_tt_ss=${USER_ID}`,
        `sid_tt=${sessionid}`,
        `sessionid=${sessionid}`,
        `sessionid_ss=${sessionid}`,
    ].join("; ");
}
/**
 * Generate the request signature.
 *
 * Algorithm (from jimeng-api core.ts):
 *   sign = MD5("9e2c|" + URI_last_7_chars + "|" + PLATFORM_CODE + "|" + VERSION_CODE + "|" + timestamp + "||11ac")
 */
function generateSign(uri, timestamp) {
    const uriTail = uri.slice(-7);
    const raw = `${SIGN_PREFIX}|${uriTail}|${PLATFORM_CODE}|${VERSION_CODE}|${timestamp}||${SIGN_SUFFIX}`;
    return createHash("md5").update(raw, "utf8").digest("hex");
}
// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
/**
 * Build browser-like headers to avoid bot detection.
 */
function buildHeaders(sessionid, uri, timestamp) {
    const sign = generateSign(uri, timestamp);
    return {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Cache-Control": "no-cache",
        "Appvr": VERSION_CODE,
        "Pragma": "no-cache",
        "Priority": "u=1, i",
        "Pf": PLATFORM_CODE,
        "Sec-Ch-Ua": '"Google Chrome";v="142", "Chromium";v="142", "Not_A Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Origin": JIMENG_BASE_URL,
        "Referer": JIMENG_BASE_URL + "/",
        "App-Sdk-Version": "48.0.0",
        "Appid": String(DEFAULT_ASSISTANT_ID),
        "Cookie": generateCookie(sessionid),
        "Device-Time": String(timestamp),
        "Lan": "zh-Hans",
        "Loc": "cn",
        "Sign": sign,
        "Sign-Ver": "1",
        "Tdid": "",
        "Content-Type": "application/json",
    };
}
/** Build default query params for every Jimeng API request. */
function buildQueryParams() {
    return {
        aid: DEFAULT_ASSISTANT_ID,
        device_platform: "web",
        region: REGION_CN,
        webId: WEB_ID,
        os: "windows",
        web_component_open_flag: 1,
    };
}
/** POST with timeout via AbortController. */
async function postWithTimeout(url, params, body, headers, timeoutMs = REQUEST_TIMEOUT_MS) {
    // Append query params to URL
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        searchParams.set(k, String(v));
    }
    const fullUrl = `${url}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(fullUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    }
    catch (err) {
        if (controller.signal.aborted) {
            throw new Error(`Jimeng API request timed out after ${timeoutMs / 1000}s`);
        }
        throw new Error(`Jimeng API request failed: ${err.message}`);
    }
    finally {
        clearTimeout(timer);
    }
}
// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------
/** Map our model ID to Jimeng's internal model name. */
function resolveModel(model) {
    return VIDEO_MODEL_MAP[model] ?? model;
}
/** Get benefit type for a given model (used in generate request body). */
function getBenefitType(model) {
    if (model.includes("40_pro"))
        return "dreamina_video_seedance_20_pro";
    if (model.includes("40"))
        return "dreamina_seedance_20_fast";
    if (model.includes("3.5_pro"))
        return "dreamina_video_seedance_15_pro";
    if (model.includes("3.5"))
        return "dreamina_video_seedance_15";
    return "basic_video_operation_vgfm_v_three";
}
// ---------------------------------------------------------------------------
// Omni reference helpers (ported from MJ's jimeng_video_api_adapter.py)
// ---------------------------------------------------------------------------
/** Check if a model supports omni_reference mode (only Seedance 2.0 / 2.0-fast). */
function isOmniCapableModel(internalModel) {
    return internalModel.includes("seedance_40_pro") || internalModel.includes("seedance_40");
}
/** Get the omni_reference benefit type for a given model. */
function getOmniBenefitType(internalModel) {
    if (internalModel.includes("40_pro"))
        return OMNI_BENEFIT_TYPE_PRO;
    return OMNI_BENEFIT_TYPE_FAST;
}
/**
 * Strip browser-style reference prefix lines from the prompt.
 * Removes lines starting with @图1, @Image1, "参考图顺序", "绑定规则", etc.
 * Ported from MJ's strip_browser_reference_prefix().
 */
function stripBrowserReferencePrefix(prompt) {
    const lines = prompt.trim().split("\n");
    while (lines.length > 0) {
        const stripped = lines[0].trim();
        if (!stripped ||
            stripped.startsWith("参考图顺序") ||
            stripped.startsWith("Reference image order") ||
            stripped.startsWith("绑定规则") ||
            stripped.startsWith("@图") ||
            stripped.startsWith("@圖") ||
            stripped.startsWith("@Image") ||
            stripped.startsWith("@image") ||
            stripped.startsWith("@IMG") ||
            stripped.startsWith("@img")) {
            lines.shift();
            continue;
        }
        break;
    }
    return lines.join("\n").trim();
}
/**
 * Classify a reference image by its URL/path to determine its role.
 * Ported from MJ's reference_role().
 *
 * @param index  1-based index (1 = storyboard, 2 = character, etc.)
 * @param url    The image URL or file path.
 * @returns A Chinese description of the image's role.
 */
function referenceRole(index, url) {
    const lowered = url.toLowerCase();
    if (index === 1 || lowered.includes("storyboard") || lowered.includes("single_storyboard")) {
        return "故事板图；严格按照故事板内 S1-Sn 分镜顺序执行，画面运动、站位、景别和节奏不得乱序";
    }
    if (lowered.includes("character") || lowered.includes("seedance_character_refs") || url.includes("人物资产") || url.includes("角色资产")) {
        return `角色图：${getFileName(url)}`;
    }
    if (lowered.includes("scene") || url.includes("场景资产")) {
        return `场景图：${getFileName(url)}`;
    }
    if (lowered.includes("prop") || url.includes("道具资产") || lowered.includes("item")) {
        return `物品图：${getFileName(url)}`;
    }
    const fallbackRoles = {
        2: "角色图：本 clip 的主要角色参考图",
        3: "场景图：本 clip 的主要空间参考图",
        4: "场景图：本 clip 的补充空间参考图",
        5: "物品图：本 clip 的关键道具参考图",
    };
    return fallbackRoles[index] ?? `参考图：${getFileName(url)}`;
}
/** Extract file name from a URL or path. */
function getFileName(url) {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const parts = cleanUrl.split(/[/\\]/);
    return parts[parts.length - 1] || url;
}
/**
 * Normalize a browser-style prompt for the Jimeng omni_reference API.
 *
 * Converts @图1 @图2 → @image_file_1 @image_file_2, strips browser prefix lines,
 * and prepends role descriptions for each reference image.
 *
 * Ported from MJ's normalize_prompt_for_jimeng_api().
 *
 * @param prompt            The raw prompt text.
 * @param referenceImageUrls Array of reference image URLs (1-based index).
 * @returns An object with the normalized prompt and debug info.
 */
function normalizePromptForOmni(prompt, referenceImageUrls) {
    const replacements = [];
    // Convert @图N / @ImageN → @image_file_N
    const replaceMatch = (match, indexStr) => {
        const index = parseInt(indexStr, 10);
        if (index >= 1 && index <= referenceImageUrls.length) {
            const replacement = `@image_file_${index}`;
            replacements.push({ from: match, to: replacement });
            return replacement;
        }
        return match;
    };
    // Reset regex state (global flag)
    WEB_IMAGE_REF_RE.lastIndex = 0;
    const stripped = stripBrowserReferencePrefix(prompt);
    let rewritten = stripped.replace(WEB_IMAGE_REF_RE, (match, p1) => replaceMatch(match, p1));
    // Find which @image_file_N references are already in the prompt
    const existingRefs = new Set([...rewritten.matchAll(/@image_file_(\d+)\b/g)].map((m) => parseInt(m[1], 10)));
    const missingRefs = Array.from({ length: referenceImageUrls.length }, (_, i) => i + 1)
        .filter((idx) => !existingRefs.has(idx));
    // Prepend role descriptions for all reference images
    const prefixLines = [];
    for (let i = 0; i < referenceImageUrls.length; i++) {
        prefixLines.push(`@image_file_${i + 1} = ${referenceRole(i + 1, referenceImageUrls[i])}。`);
    }
    // If some images aren't referenced in the prompt, add them as a suffix
    const suffixLines = [];
    for (const idx of missingRefs) {
        suffixLines.push(`@image_file_${idx}`);
    }
    let result = "";
    if (prefixLines.length > 0) {
        result += prefixLines.join("\n") + "\n\n";
    }
    result += rewritten;
    if (suffixLines.length > 0) {
        result += "\n\n" + suffixLines.join(" ");
    }
    return { prompt: result, replacements };
}
/**
 * Build the meta_list from a normalized prompt.
 * Splits the prompt into alternating text and @image_file_N reference segments.
 */
function buildMetaList(normalizedPrompt, imageCount, audioCount) {
    const metaList = [];
    // Split by @image_file_N references
    const parts = normalizedPrompt.split(/(@image_file_\d+)/g);
    for (const part of parts) {
        if (!part)
            continue;
        const match = part.match(/^@image_file_(\d+)$/);
        if (match) {
            const idx = parseInt(match[1], 10) - 1;
            if (idx >= 0 && idx < imageCount) {
                metaList.push({
                    meta_type: "image",
                    text: "",
                    material_ref: { material_idx: idx },
                });
                continue;
            }
        }
        // Text segment
        if (part.trim()) {
            metaList.push({ meta_type: "text", text: part });
        }
    }
    // Append audio references at the end
    for (let i = 0; i < audioCount; i++) {
        metaList.push({
            meta_type: "audio",
            text: "",
            material_ref: { material_idx: imageCount + i },
        });
    }
    return metaList;
}
/**
 * Build the material_list from reference image URLs and uploaded audio results.
 * Images use direct URLs; audios use VOD-uploaded vid + duration.
 *
 * @param referenceImageUrls  Image URLs (used directly as image_info.uri)
 * @param audioUploadResults  Uploaded audio results from VOD (contains vid + duration)
 */
function buildMaterialList(referenceImageUrls, audioUploadResults) {
    const list = [];
    for (const url of referenceImageUrls) {
        const format = getFileName(url).split(".").pop()?.toLowerCase() || "png";
        list.push({
            type: "",
            id: randomUUID(),
            material_type: "image",
            image_info: { uri: url, format },
        });
    }
    for (const audioResult of audioUploadResults) {
        list.push({
            type: "",
            id: randomUUID(),
            material_type: "audio",
            audio_info: {
                type: "audio",
                id: randomUUID(),
                source_from: "upload",
                vid: audioResult.vid,
                duration: audioResult.audioMeta.durationMs,
                name: "",
            },
        });
    }
    return list;
}
/**
 * Submit a video generation request to Jimeng's web API.
 * Returns the task ID for subsequent polling.
 *
 * Two modes:
 * 1. Simple mode (first_last_frames) — 0 or 1 reference image, all models.
 * 2. Omni reference mode — 2+ reference images and/or audio, Seedance 2.0 only.
 */
async function submitGeneration(sessionid, config, request) {
    const timestamp = Math.floor(Date.now() / 1000);
    const uri = "/mweb/v1/aigc_video_generation/generate";
    const url = JIMENG_BASE_URL + uri;
    const headers = buildHeaders(sessionid, uri, timestamp);
    const params = buildQueryParams();
    const internalModel = resolveModel(request.model ?? config.model);
    const duration = request.duration ?? config.duration;
    // Collect all reference images (merge legacy single URL + multi-URL array)
    const referenceImageUrls = [];
    if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
        referenceImageUrls.push(...request.referenceImageUrls);
    }
    else if (request.referenceImageUrl) {
        referenceImageUrls.push(request.referenceImageUrl);
    }
    const referenceAudioUrls = request.referenceAudioUrls ?? [];
    // Decide mode: omni_reference if 2+ images or any audio, and model supports it
    const useOmni = (referenceImageUrls.length >= 2 || referenceAudioUrls.length > 0) &&
        isOmniCapableModel(internalModel);
    let body;
    if (useOmni) {
        // --- Omni reference mode (Seedance 2.0 only) ---
        const cappedImages = referenceImageUrls.slice(0, MAX_OMNI_IMAGES);
        const cappedAudios = referenceAudioUrls.slice(0, MAX_OMNI_AUDIOS);
        // Upload audio files to VOD (serial, to track total duration)
        const audioUploadResults = [];
        let totalAudioDuration = 0;
        for (let i = 0; i < cappedAudios.length; i++) {
            const audioUrl = cappedAudios[i];
            console.log(`[jimeng-direct] 上传音频 ${i + 1}/${cappedAudios.length}: ${audioUrl}`);
            const result = await uploadAudioFromUrl(audioUrl, sessionid, buildHeaders, buildQueryParams, postWithTimeout);
            audioUploadResults.push(result);
            totalAudioDuration += result.audioMeta.duration;
        }
        // Validate total audio duration (即梦 constraint: max 15s total)
        if (totalAudioDuration > MAX_TOTAL_AUDIO_DURATION_SEC) {
            throw new Error(`音频总时长 ${totalAudioDuration.toFixed(2)}s 超过限制 (最大 ${MAX_TOTAL_AUDIO_DURATION_SEC}s)`);
        }
        // Validate: audio requires at least one image or video (即梦 constraint)
        if (audioUploadResults.length > 0 && cappedImages.length === 0) {
            throw new Error("omni_reference 模式中使用音频素材时，至少需要同时提供一张图片");
        }
        // Normalize prompt: convert @图N → @image_file_N, add role descriptions
        const { prompt: normalizedPrompt } = normalizePromptForOmni(request.prompt, cappedImages);
        const metaList = buildMetaList(normalizedPrompt, cappedImages.length, audioUploadResults.length);
        const materialList = buildMaterialList(cappedImages, audioUploadResults);
        body = {
            model: internalModel,
            prompt: normalizedPrompt,
            duration: duration * 1000, // milliseconds
            ratio: config.aspectRatio,
            resolution: config.resolution,
            benefit_type: getOmniBenefitType(internalModel),
            draft_version: "3.3.9",
            function_mode: "omni_reference",
            meta_list: metaList,
            material_list: materialList,
        };
        console.log(`[jimeng-direct] omni_reference mode: ${cappedImages.length} images, ${audioUploadResults.length} audios (${totalAudioDuration.toFixed(1)}s total), model=${internalModel}`);
    }
    else {
        // --- Simple mode (first_last_frames) ---
        body = {
            model: internalModel,
            prompt: request.prompt,
            duration: duration * 1000, // milliseconds
            ratio: config.aspectRatio,
            resolution: config.resolution,
            benefit_type: getBenefitType(internalModel),
            draft_version: "3.3.9",
        };
        // Image-to-video: if a single reference image is provided, include it.
        if (referenceImageUrls.length === 1) {
            body["first_frame"] = { url: referenceImageUrls[0] };
            body["last_frame"] = { url: referenceImageUrls[0] };
        }
        // Warn if user wanted omni but model doesn't support it
        if (referenceImageUrls.length >= 2 && !isOmniCapableModel(internalModel)) {
            console.warn(`[jimeng-direct] ${referenceImageUrls.length} reference images provided but model ${internalModel} doesn't support omni_reference; falling back to simple mode with first image only`);
        }
    }
    const response = await postWithTimeout(url, params, body, headers);
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        if (response.status === 401 || response.status === 403) {
            throw new Error(`即梦认证失败 (${response.status})。sessionid 可能已过期，请重新从 jimeng.jianying.com 获取。`);
        }
        throw new Error(`即梦生成接口返回 ${response.status}: ${text.slice(0, 300)}`);
    }
    const data = (await response.json());
    if (data.ret !== 0) {
        throw new Error(`即梦生成失败: ${data.errmsg ?? `ret=${data.ret}`}`);
    }
    const taskData = data.data;
    const taskId = taskData?.aigc_video_id ??
        taskData?.task_id ??
        taskData?.id;
    if (!taskId) {
        throw new Error(`即梦生成响应未包含任务 ID: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return taskId;
}
// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------
/**
 * Poll Jimeng's task status endpoint until the video is ready or fails.
 *
 * Jimeng status codes:
 *   20 = PROCESSING
 *   10 = SUCCESS
 *   30 = FAILED
 *   42 = POST_PROCESSING
 *   45 = FINALIZING
 *   50 = COMPLETED
 */
async function pollTask(sessionid, taskId, expectedDuration) {
    const uri = "/mweb/v1/aigc_video_generation/task_list";
    const url = JIMENG_BASE_URL + uri;
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        const timestamp = Math.floor(Date.now() / 1000);
        const headers = buildHeaders(sessionid, uri, timestamp);
        const params = buildQueryParams();
        const body = {
            aigc_video_ids: [taskId],
            task_id: taskId,
        };
        let response;
        try {
            response = await postWithTimeout(url, params, body, headers);
        }
        catch (err) {
            // Transient network error — wait and retry.
            console.warn(`[jimeng-direct] poll attempt ${attempt + 1} network error:`, err);
            await sleep(POLL_INTERVAL_MS);
            continue;
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error("即梦 sessionid 已过期。请重新从 jimeng.jianying.com 获取 sessionid。");
        }
        if (!response.ok) {
            console.warn(`[jimeng-direct] poll returned ${response.status}`);
            await sleep(POLL_INTERVAL_MS);
            continue;
        }
        const data = (await response.json());
        if (data.ret !== 0) {
            throw new Error(`即梦任务查询失败: ${data.errmsg ?? `ret=${data.ret}`}`);
        }
        const taskData = data.data;
        const status = taskData?.status;
        const videoInfo = taskData?.video_info;
        const videoUrl = taskData?.video_url ??
            videoInfo?.url ??
            videoInfo?.video_url;
        // Status 10 (SUCCESS) or 50 (COMPLETED) with a video URL
        if ((status === 10 || status === 50) && videoUrl) {
            return {
                videoUrl,
                thumbnailUrl: videoInfo?.cover_url ?? videoInfo?.thumbnail_url,
                duration: videoInfo?.duration ?? expectedDuration,
                createdAt: new Date().toISOString(),
            };
        }
        // Status 30 = FAILED
        if (status === 30) {
            throw new Error(`即梦视频生成失败: ${taskData?.error_msg ?? "unknown error"}`);
        }
        // Status 20 (PROCESSING), 42 (POST_PROCESSING), 45 (FINALIZING) — wait and retry.
        await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`即梦视频任务 ${taskId} 超时（${(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s）`);
}
// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Generate a video via Jimeng's web API (direct connection).
 *
 * This function replaces the external jimeng-api service by calling Jimeng's
 * web API directly from the TavernOS backend. Users only need to provide their
 * sessionid — everything else (deviceId, Cookie, Sign) is auto-generated.
 *
 * @param config  - Video generation config (provider, model, duration, etc.)
 * @param creds   - Jimeng credentials (just sessionid)
 * @param request - Generation request (prompt, optional reference image)
 * @returns Video generation response with the video URL.
 *
 * @throws Error if sessionid is missing/expired, or the generation fails.
 */
export async function generateVideoViaJimengDirect(config, creds, request) {
    // Validate sessionid.
    if (!creds.sessionid.trim()) {
        throw new Error("即梦直连模式需要 sessionid。获取方式：打开 jimeng.jianying.com → F12 开发者工具 → Application → Cookies → sessionid → 复制 value 值。");
    }
    // Step 1: Submit the generation request.
    const taskId = await submitGeneration(creds.sessionid, config, request);
    // Step 2: Poll until the video is ready.
    const expectedDuration = request.duration ?? config.duration;
    return pollTask(creds.sessionid, taskId, expectedDuration);
}
/**
 * Check if the Jimeng sessionid is valid by making a lightweight request.
 * Used by the frontend settings page for the "test connection" button.
 *
 * @returns An object with `valid: true` or an error message.
 */
export async function testJimengDirectConnection(creds) {
    try {
        if (!creds.sessionid.trim()) {
            return { valid: false, error: "sessionid 不能为空" };
        }
        const timestamp = Math.floor(Date.now() / 1000);
        const uri = "/mweb/v1/aigc_video_generation/task_list";
        const url = JIMENG_BASE_URL + uri;
        const headers = buildHeaders(creds.sessionid, uri, timestamp);
        const params = buildQueryParams();
        const body = {
            aigc_video_ids: ["test_connection"],
            task_id: "test_connection",
        };
        const response = await postWithTimeout(url, params, body, headers, 10_000);
        // If we get a valid JSON response (even with an error about the fake task
        // ID), it means authentication succeeded — the sessionid is valid.
        if (response.status === 401 || response.status === 403) {
            return {
                valid: false,
                error: "sessionid 已过期或无效，请重新从 jimeng.jianying.com 获取。",
            };
        }
        if (response.ok) {
            const data = (await response.json());
            // ret=0 means the API accepted our request (auth passed), even if the
            // task ID is invalid. Any other ret means auth or params issue.
            if (data.ret === 0) {
                return { valid: true };
            }
            // Common error: "task not found" — still means auth is valid.
            if (data.errmsg && (data.errmsg.includes("not found") || data.errmsg.includes("不存在"))) {
                return { valid: true };
            }
            return { valid: false, error: data.errmsg ?? `ret=${data.ret}` };
        }
        return { valid: false, error: `HTTP ${response.status}` };
    }
    catch (e) {
        return { valid: false, error: e instanceof Error ? e.message : String(e) };
    }
}
//# sourceMappingURL=jimeng-direct.js.map