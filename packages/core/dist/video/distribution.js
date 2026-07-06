// Distribution channel module — one-click multi-platform video publishing.
//
// TavernOS generates short-drama videos internally; once a video is composed,
// users need to distribute it to multiple short-video platforms (Douyin /
// Kuaishou / Bilibili / Xiaohongshu / Weixin Channels / YouTube / TikTok).
//
// Design overview:
//   - DistributionPlatform: union of supported publishing targets.
//   - IPlatformPublisher: per-platform strategy interface; each platform has
//     its own Publisher class (DouyinPublisher, BilibiliPublisher, ...).
//   - PLATFORM_LIMITS: hard constraints (title/description length, max video
//     size/duration, supported formats, cover requirement) per platform.
//   - DistributionManager: orchestrator that registers publishers, validates
//     video params, publishes to a single platform, or fans out to many
//     platforms in parallel via Promise.allSettled.
//
// Each Publisher implements the full publish lifecycle:
//   1. Check OAuth config (isConfigured)
//   2. Validate video params (size / duration / format / title length)
//   3. Upload the video binary (fetch multipart or resumable)
//   4. Create the publish task on the platform
//   5. Return a PublishResult (with platform video id + url)
//
// IMPORTANT: All platform APIs require OAuth authentication and real API
// credentials. The HTTP calls below use the global `fetch()` (Node >= 18)
// with templated API URLs and headers; tokens are read from PlatformConfig.
// The concrete OAuth flow and token refresh are defined by the interface but
// not wired to a live auth backend — they are stubs that return the config
// unchanged, to be implemented by a higher-level auth orchestrator.
//
// API reference summary (researched from official open-platform docs):
//   - Douyin:   https://developer.toutiao.com  (upload → create → status)
//   - Kuaishou: https://open.kuaishou.com      (upload → publish → info)
//   - Bilibili: https://api.bilibili.com        (preupload → chunk → submit)
//   - XHS:      https://open.xiaohongshu.com     (upload → publish)
//   - Weixin:   https://api.weixin.qq.com        (media upload → publish)
//   - YouTube:  https://www.googleapis.com        (resumable upload v3)
//   - TikTok:   https://open.tiktokapis.com       (init → upload → complete)
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { extname, basename } from "node:path";
// ---------------------------------------------------------------------------
// Platform limit constants
// ---------------------------------------------------------------------------
/**
 * Hard per-platform limits (title/description length, max video size &
 * duration, supported formats, cover requirement).
 *
 * Researched from each platform's open-API documentation. Values are the
 * platform-side ceilings; deployments may enforce tighter limits via
 * {@link PlatformConfig}.
 */
export const PLATFORM_LIMITS = {
    douyin: {
        maxTitleLength: 55,
        maxDescriptionLength: 500,
        maxVideoSizeMB: 4096,
        maxVideoDurationSec: 900,
        supportedFormats: ["mp4", "mov"],
        requireCover: false,
    },
    kuaishou: {
        maxTitleLength: 50,
        maxDescriptionLength: 2000,
        maxVideoSizeMB: 4096,
        maxVideoDurationSec: 600,
        supportedFormats: ["mp4", "mov", "flv"],
        requireCover: false,
    },
    bilibili: {
        maxTitleLength: 80,
        maxDescriptionLength: 2000,
        maxVideoSizeMB: 8192,
        maxVideoDurationSec: 3600,
        supportedFormats: ["mp4", "flv"],
        requireCover: true,
    },
    xiaohongshu: {
        maxTitleLength: 20,
        maxDescriptionLength: 1000,
        maxVideoSizeMB: 1024,
        maxVideoDurationSec: 300,
        supportedFormats: ["mp4"],
        requireCover: true,
    },
    weixin: {
        maxTitleLength: 30,
        maxDescriptionLength: 120,
        maxVideoSizeMB: 2048,
        maxVideoDurationSec: 600,
        supportedFormats: ["mp4"],
        requireCover: false,
    },
    youtube: {
        maxTitleLength: 100,
        maxDescriptionLength: 5000,
        maxVideoSizeMB: 256000,
        maxVideoDurationSec: 43200,
        supportedFormats: ["mp4", "mov", "avi", "wmv"],
        requireCover: false,
    },
    tiktok: {
        maxTitleLength: 150,
        maxDescriptionLength: 2200,
        maxVideoSizeMB: 2867,
        maxVideoDurationSec: 600,
        supportedFormats: ["mp4", "mov"],
        requireCover: false,
    },
};
/**
 * Default API base URLs per platform (overridable via {@link PlatformConfig.apiUrl}).
 */
export const PLATFORM_API_URLS = {
    douyin: "https://developer.toutiao.com",
    kuaishou: "https://open.kuaishou.com",
    bilibili: "https://api.bilibili.com",
    xiaohongshu: "https://open.xiaohongshu.com",
    weixin: "https://api.weixin.qq.com",
    youtube: "https://www.googleapis.com",
    tiktok: "https://open.tiktokapis.com",
};
/**
 * Human-readable Chinese display names per platform.
 */
export const PLATFORM_NAMES = {
    douyin: "抖音",
    kuaishou: "快手",
    bilibili: "哔哩哔哩",
    xiaohongshu: "小红书",
    weixin: "微信视频号",
    youtube: "YouTube",
    tiktok: "TikTok",
};
/**
 * Icon emoji per platform (for UI rendering).
 */
export const PLATFORM_ICONS = {
    douyin: "🎵",
    kuaishou: "⚡",
    bilibili: "📺",
    xiaohongshu: "📕",
    weixin: "💬",
    youtube: "▶️",
    tiktok: "🎬",
};
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/**
 * Validate that a title fits the platform's length limit.
 *
 * @param platform Target platform.
 * @param title    The title to validate.
 * @returns `true` if the title length is within the platform ceiling.
 */
export function validateTitle(platform, title) {
    const limits = PLATFORM_LIMITS[platform];
    return title.length > 0 && title.length <= limits.maxTitleLength;
}
/**
 * Validate that a description fits the platform's length limit.
 *
 * @param platform    Target platform.
 * @param desc        The description to validate.
 * @returns `true` if the description length is within the platform ceiling.
 */
export function validateDescription(platform, desc) {
    const limits = PLATFORM_LIMITS[platform];
    return desc.length <= limits.maxDescriptionLength;
}
/**
 * Get the Chinese display name of a platform.
 *
 * @param platform Target platform.
 * @returns Localised platform name (e.g. "抖音").
 */
export function getPlatformName(platform) {
    return PLATFORM_NAMES[platform];
}
/**
 * Get the icon emoji of a platform.
 *
 * @param platform Target platform.
 * @returns Icon emoji string (e.g. "🎵").
 */
export function getPlatformIcon(platform) {
    return PLATFORM_ICONS[platform];
}
/**
 * Resolve the effective API base URL for a platform config, falling back to
 * the documented default when `config.apiUrl` is unset.
 */
function resolveApiUrl(config) {
    return config.apiUrl ?? PLATFORM_API_URLS[config.platform];
}
/**
 * Read a local file as a Node `Buffer` for upload.
 *
 * `node:fs/promises.readFile` returns a Node `Buffer` (a `Uint8Array`
 * subclass); we keep it as `Buffer` so it can be passed uniformly to `Blob`
 * and `fetch` bodies, and sliced for chunked uploads.
 *
 * @throws when the file cannot be read.
 */
async function readVideoBuffer(filePath) {
    return readFile(filePath);
}
/**
 * Get the file size (bytes) of a local file.
 */
async function getFileSize(filePath) {
    const info = await stat(filePath);
    return info.size;
}
/**
 * Extract the lower-cased extension (without dot) from a file path.
 */
function getFileExtension(filePath) {
    return extname(filePath).slice(1).toLowerCase();
}
/**
 * Validate a publish request against a platform config.
 *
 * Checks: title length, description length, cover requirement, and video
 * format. File size & duration are validated separately in
 * {@link DistributionManager.validateVideo} because they require probing.
 *
 * @returns A list of error messages (empty when valid).
 */
function validateRequest(request, config) {
    const errors = [];
    const limits = PLATFORM_LIMITS[config.platform];
    if (!request.title || request.title.length === 0) {
        errors.push("标题不能为空");
    }
    else if (request.title.length > limits.maxTitleLength) {
        errors.push(`标题长度 ${request.title.length} 超过 ${getPlatformName(config.platform)} 限制 ${limits.maxTitleLength}`);
    }
    if (request.description && request.description.length > limits.maxDescriptionLength) {
        errors.push(`描述长度 ${request.description.length} 超过 ${getPlatformName(config.platform)} 限制 ${limits.maxDescriptionLength}`);
    }
    if (limits.requireCover && !request.coverImagePath) {
        errors.push(`${getPlatformName(config.platform)} 要求上传封面图`);
    }
    const ext = getFileExtension(request.videoPath);
    if (!limits.supportedFormats.includes(ext)) {
        errors.push(`视频格式 ${ext} 不被 ${getPlatformName(config.platform)} 支持，仅支持 ${limits.supportedFormats.join(", ")}`);
    }
    return errors;
}
/**
 * Build a failed {@link PublishResult} with an error message.
 */
function buildFailedResult(platform, message, rawData) {
    return {
        platform,
        status: "failed",
        errorMessage: message,
        rawData,
    };
}
/**
 * Fetch wrapper with timeout (AbortController) and JSON parsing.
 *
 * @param url     Request URL.
 * @param init    Fetch init (method/headers/body).
 * @param timeoutMs Timeout in milliseconds.
 * @returns Parsed JSON body (typed as `T`).
 * @throws when the request fails, times out, or returns a non-ok status.
 */
async function fetchJson(url, init, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(`HTTP ${response.status} ${response.statusText}${text ? `: ${text}` : ""}`);
        }
        return (await response.json());
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn       Operation to retry.
 * @param retries  Max retry attempts (default 3).
 * @param baseMs   Base backoff in ms (default 1000, doubled each attempt).
 * @returns The result of `fn` on success.
 * @throws the last error after exhausting retries.
 */
async function withRetry(fn, retries = 3, baseMs = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === retries)
                break;
            const delay = baseMs * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
// ---------------------------------------------------------------------------
// Abstract base publisher
// ---------------------------------------------------------------------------
/**
 * Shared base class for all platform publishers.
 *
 * Centralises the common publish lifecycle:
 *   1. Credential check (`isConfigured`).
 *   2. Request validation (title / description / cover / format).
 *   3. File-size validation against the platform ceiling.
 *   4. Delegation to the platform-specific `doPublish` hook.
 *
 * Concrete subclasses implement {@link BasePlatformPublisher.doPublish} and
 * {@link BasePlatformPublisher.doGetStatus}; token refresh defaults to a
 * no-op stub (returns config unchanged) since real OAuth wiring is owned by
 * a higher-level auth orchestrator.
 */
export class BasePlatformPublisher {
    /** The platform config bound to this publisher instance. */
    config;
    /** Per-upload timeout in milliseconds. */
    timeoutMs;
    constructor(config, timeoutMs) {
        this.config = config;
        this.timeoutMs = timeoutMs;
    }
    /** Whether the bound config carries the minimum required credentials. */
    isConfigured() {
        return (this.config.enabled &&
            typeof this.config.accessToken === "string" &&
            this.config.accessToken.length > 0);
    }
    /** {@inheritDoc IPlatformPublisher.publish} */
    async publish(request, config) {
        // 1. Credential check.
        if (!this.isConfigured()) {
            return buildFailedResult(this.platform, `${getPlatformName(this.platform)} 未配置有效凭证`);
        }
        // 2. Validate request params (title / description / cover / format).
        const validationErrors = validateRequest(request, config);
        if (validationErrors.length > 0) {
            return buildFailedResult(this.platform, validationErrors.join("; "));
        }
        // 3. Validate file size.
        try {
            const sizeBytes = await getFileSize(request.videoPath);
            const sizeMB = sizeBytes / (1024 * 1024);
            if (sizeMB > config.maxVideoSizeMB) {
                return buildFailedResult(this.platform, `视频大小 ${sizeMB.toFixed(1)}MB 超过 ${getPlatformName(this.platform)} 限制 ${config.maxVideoSizeMB}MB`);
            }
            // 4. Read video buffer.
            const videoBuffer = await readVideoBuffer(request.videoPath);
            // 5. Delegate to platform-specific publish with retry.
            return await withRetry(() => this.doPublish(request, videoBuffer, config), 2, 2000);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return buildFailedResult(this.platform, `发布失败: ${message}`);
        }
    }
    /** {@inheritDoc IPlatformPublisher.getStatus} */
    async getStatus(platformVideoId, config) {
        if (!this.isConfigured()) {
            return "failed";
        }
        try {
            return await this.doGetStatus(platformVideoId, config);
        }
        catch {
            return "failed";
        }
    }
    /**
     * Default token refresh — no-op stub.
     *
     * Real OAuth refresh must be implemented by an auth orchestrator that has
     * access to the client secret; this returns the config unchanged.
     */
    async refreshToken(config) {
        return config;
    }
}
/**
 * Publisher for 抖音 (Douyin) via the ByteDance open platform.
 *
 * Publish flow (developer.toutiao.com):
 *   1. POST /api/v1/video/upload/  — upload video binary (multipart).
 *   2. POST /api/v1/video/create/  — create a publish task with title/desc.
 *   3. GET  /api/v1/video/status/  — poll publish status by item_id.
 *
 * Auth: `access_token` + `open_id` query params (OAuth2 from partner.open-douyin.com).
 */
export class DouyinPublisher extends BasePlatformPublisher {
    platform = "douyin";
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const fileName = basename(request.videoPath);
        // Step 1: upload the video binary.
        const uploadForm = new FormData();
        uploadForm.append("video", new Blob([videoBuffer]), fileName);
        const uploadUrl = `${base}/api/v1/video/upload/?access_token=${encodeURIComponent(config.accessToken ?? "")}&open_id=${encodeURIComponent(config.openId ?? "")}`;
        const uploadRes = await fetchJson(uploadUrl, { method: "POST", body: uploadForm }, this.timeoutMs);
        const videoId = uploadRes.data?.video_id;
        if (!videoId) {
            return buildFailedResult(this.platform, "抖音视频上传未返回 video_id", uploadRes);
        }
        // Step 2: create the publish task.
        const createBody = {
            video_id: videoId,
            text: request.title + (request.description ? `\n${request.description}` : ""),
            cover_url: request.coverImagePath,
            poi_id: request.douyin?.poiId,
            challenge_ids: request.douyin?.challengeIds,
            original: request.douyin?.original ?? true,
            scheduled_time: request.scheduledTime,
        };
        const createUrl = `${base}/api/v1/video/create/?access_token=${encodeURIComponent(config.accessToken ?? "")}&open_id=${encodeURIComponent(config.openId ?? "")}`;
        const createRes = await fetchJson(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createBody),
        }, this.timeoutMs);
        const itemId = createRes.data?.item_id;
        if (!itemId) {
            return buildFailedResult(this.platform, "抖音创建发布任务失败", createRes);
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: itemId,
            platformUrl: createRes.data?.share_url,
            publishTime: createRes.data?.create_time
                ? new Date(createRes.data.create_time * 1000).toISOString()
                : undefined,
            rawData: createRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/api/v1/video/status/?access_token=${encodeURIComponent(config.accessToken ?? "")}&open_id=${encodeURIComponent(config.openId ?? "")}&item_id=${encodeURIComponent(platformVideoId)}`;
        const res = await fetchJson(url, { method: "GET" }, this.timeoutMs);
        const status = res.data?.status;
        // Douyin status: 1=审核中 2=通过 3=失败.
        if (status === 2)
            return "published";
        if (status === 3)
            return "failed";
        return "processing";
    }
}
/**
 * Publisher for 快手 (Kuaishou) via the Kuaishou open platform.
 *
 * Publish flow (open.kuaishou.com):
 *   1. POST /openapi/photo/upload   — upload video binary (multipart).
 *   2. POST /openapi/photo/publish  — publish with caption / cover / schedule.
 *   3. GET  /openapi/photo/info     — poll publish status by photo_id.
 *
 * Auth: `access_token` query param + `open_id` (OAuth2 from open.kuaishou.com).
 */
export class KuaishouPublisher extends BasePlatformPublisher {
    platform = "kuaishou";
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const fileName = basename(request.videoPath);
        // Step 1: upload the video binary.
        const uploadForm = new FormData();
        uploadForm.append("video", new Blob([videoBuffer]), fileName);
        const uploadUrl = `${base}/openapi/photo/upload?access_token=${encodeURIComponent(config.accessToken ?? "")}&open_id=${encodeURIComponent(config.openId ?? "")}`;
        const uploadRes = await fetchJson(uploadUrl, { method: "POST", body: uploadForm }, this.timeoutMs);
        const videoId = uploadRes.response?.video_id;
        if (!videoId) {
            return buildFailedResult(this.platform, "快手视频上传未返回 video_id", uploadRes);
        }
        // Step 2: publish the photo with metadata.
        const publishBody = {
            photo_id: videoId,
            caption: request.title + (request.description ? `\n${request.description}` : ""),
            cover_url: request.coverImagePath,
            cover_type: request.kuaishou?.coverType,
            collection_id: request.kuaishou?.collectionId,
            scheduled_time: request.scheduledTime,
        };
        const publishUrl = `${base}/openapi/photo/publish?access_token=${encodeURIComponent(config.accessToken ?? "")}&open_id=${encodeURIComponent(config.openId ?? "")}`;
        const publishRes = await fetchJson(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(publishBody),
        }, this.timeoutMs);
        const photoId = publishRes.response?.photo_id ?? videoId;
        if (!photoId) {
            return buildFailedResult(this.platform, "快手发布失败", publishRes);
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: photoId,
            platformUrl: publishRes.response?.share_url,
            publishTime: publishRes.response?.create_time
                ? new Date(publishRes.response.create_time * 1000).toISOString()
                : undefined,
            rawData: publishRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/openapi/photo/info?access_token=${encodeURIComponent(config.accessToken ?? "")}&open_id=${encodeURIComponent(config.openId ?? "")}&photo_id=${encodeURIComponent(platformVideoId)}`;
        const res = await fetchJson(url, { method: "GET" }, this.timeoutMs);
        const status = res.response?.status;
        // Kuaishou status: 1=审核中 2=通过 3=失败.
        if (status === 2)
            return "published";
        if (status === 3)
            return "failed";
        return "processing";
    }
}
/**
 * Publisher for 哔哩哔哩 (Bilibili) video submission.
 *
 * Publish flow (api.bilibili.com) — B站投稿分片上传:
 *   1. POST /x/preupload             — pre-upload, get upos uri / auth / endpoints.
 *   2. POST {uposHost}/upload/v1/{uri}  — upload file in <= 10MB chunks.
 *   3. POST {uposHost}/upload/v1/{uri}?parts=...  — merge parts (合片).
 *   4. POST /x/web/dm/web/upload      — upload cover (when required).
 *   5. POST /x/web-interface/submit   — submit the submission (tid/copyright/title/desc).
 *
 * Auth: `access_token` cookie / `SESSDATA` (login session). The config
 * `accessToken` field carries the SESSDATA value; `apiUrl` may point to a
 * proxy.
 */
export class BilibiliPublisher extends BasePlatformPublisher {
    platform = "bilibili";
    /** B站分片大小上限 (10MB). */
    static CHUNK_SIZE = 10 * 1024 * 1024;
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const fileName = basename(request.videoPath);
        // Step 1: preupload.
        const preuploadUrl = `${base}/x/preupload`;
        const preuploadForm = new FormData();
        preuploadForm.append("name", fileName);
        preuploadForm.append("size", String(videoBuffer.byteLength));
        preuploadForm.append("r", "upos");
        preuploadForm.append("profile", "ugcfx/bup");
        const preRes = await fetchJson(preuploadUrl, {
            method: "POST",
            headers: { Cookie: `SESSDATA=${config.accessToken ?? ""}` },
            body: preuploadForm,
        }, this.timeoutMs);
        const uposUri = preRes.upos_uri;
        const auth = preRes.auth;
        const uposHost = preRes.endpoints?.[0] ?? "https://upos-sz-upcdnbhw.bilivideo.com";
        const biliFilename = preRes.bili_filename ?? fileName;
        if (!uposUri) {
            return buildFailedResult(this.platform, "B站预上传失败，未返回 upos_uri", preRes);
        }
        // Step 2: upload chunks.
        const uploadUrl = `${uposHost}/upload/v1/${uposUri.replace(/^upos:\/\//, "")}`;
        const totalChunks = Math.ceil(videoBuffer.byteLength / BilibiliPublisher.CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
            const start = i * BilibiliPublisher.CHUNK_SIZE;
            const end = Math.min(start + BilibiliPublisher.CHUNK_SIZE, videoBuffer.byteLength);
            const chunk = videoBuffer.subarray(start, end);
            const chunkUrl = `${uploadUrl}?chunks=${totalChunks}&chunk=${i}&size=${end - start}&partsize=${BilibiliPublisher.CHUNK_SIZE}&total=${videoBuffer.byteLength}`;
            await fetchJson(chunkUrl, {
                method: "POST",
                headers: {
                    "X-Upos-Auth": auth ?? "",
                    "Content-Type": "application/octet-stream",
                },
                body: chunk,
            }, this.timeoutMs);
        }
        // Step 3: merge parts (合片).
        const mergeBody = {
            parts: Array.from({ length: totalChunks }, (_, i) => ({
                partNumber: i + 1,
                eTag: "etag",
            })),
        };
        const mergeUrl = `${uploadUrl}?output=json&name=${encodeURIComponent(fileName)}&profile=ugcfx/bup&total=${videoBuffer.byteLength}`;
        const mergeRes = await fetchJson(mergeUrl, {
            method: "POST",
            headers: { "X-Upos-Auth": auth ?? "", "Content-Type": "application/json" },
            body: JSON.stringify(mergeBody),
        }, this.timeoutMs);
        // Step 4: upload cover (B站要求封面).
        let coverUrl;
        if (request.coverImagePath) {
            const coverBuffer = await readFile(request.coverImagePath);
            const coverForm = new FormData();
            coverForm.append("cover", new Blob([coverBuffer]), basename(request.coverImagePath));
            const coverRes = await fetchJson(`${base}/x/web/dm/web/upload`, {
                method: "POST",
                headers: { Cookie: `SESSDATA=${config.accessToken ?? ""}` },
                body: coverForm,
            }, this.timeoutMs);
            coverUrl = coverRes.url;
        }
        // Step 5: submit the submission.
        const submitBody = {
            copyright: request.bilibili?.copyright ?? 1,
            videos: [{ filename: biliFilename, title: request.title, desc: request.description ?? "" }],
            source: request.bilibili?.source ?? "",
            tid: request.bilibili?.tid ?? 95,
            title: request.title,
            tag: (request.tags ?? []).join(","),
            desc: request.description ?? "",
            cover: coverUrl,
            mission_id: 0,
            dynamic: "",
            subtitle: { open: 0, lan: "" },
            scheduled_time: request.scheduledTime,
        };
        const submitUrl = `${base}/x/web-interface/submit`;
        const submitRes = await fetchJson(submitUrl, {
            method: "POST",
            headers: {
                Cookie: `SESSDATA=${config.accessToken ?? ""}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(submitBody),
        }, this.timeoutMs);
        const bvid = submitRes.data?.bvid;
        if (!bvid) {
            return buildFailedResult(this.platform, "B站投稿提交失败", { mergeRes, submitRes });
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: bvid,
            platformUrl: submitRes.data?.share_url ?? `https://www.bilibili.com/video/${bvid}`,
            rawData: submitRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/x/web-interface/view?bvid=${encodeURIComponent(platformVideoId)}`;
        const res = await fetchJson(url, { method: "GET", headers: { Cookie: `SESSDATA=${config.accessToken ?? ""}` } }, this.timeoutMs);
        // B站视频状态: 0=正常 1=审核中 -4=审核中 -6=审核未通过.
        const state = res.data?.state;
        if (state === 0)
            return "published";
        if (state === -6)
            return "failed";
        return "processing";
    }
}
/**
 * Publisher for 小红书 (Xiaohongshu / RED) via the open platform.
 *
 * Publish flow (open.xiaohongshu.com):
 *   1. POST /api/v1/video/upload  — upload video binary (multipart).
 *   2. POST /api/v1/note/publish — publish a video note with title/desc/cover.
 *   3. GET  /api/v1/note/info    — poll publish status by note_id.
 *
 * Auth: `access_token` query param (OAuth2 with app key/secret).
 *
 * NOTE: 小红书 requires a cover image (see PLATFORM_LIMITS.xiaohongshu.requireCover).
 */
export class XiaohongshuPublisher extends BasePlatformPublisher {
    platform = "xiaohongshu";
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const fileName = basename(request.videoPath);
        // Step 1: upload the video binary.
        const uploadForm = new FormData();
        uploadForm.append("video", new Blob([videoBuffer]), fileName);
        const uploadUrl = `${base}/api/v1/video/upload?access_token=${encodeURIComponent(config.accessToken ?? "")}`;
        const uploadRes = await fetchJson(uploadUrl, { method: "POST", body: uploadForm }, this.timeoutMs);
        const videoId = uploadRes.data?.video_id;
        if (!videoId) {
            return buildFailedResult(this.platform, "小红书视频上传未返回 video_id", uploadRes);
        }
        // Step 2: upload cover (required by 小红书).
        let coverUrl;
        if (request.coverImagePath) {
            const coverBuffer = await readFile(request.coverImagePath);
            const coverForm = new FormData();
            coverForm.append("cover", new Blob([coverBuffer]), basename(request.coverImagePath));
            const coverRes = await fetchJson(`${base}/api/v1/cover/upload?access_token=${encodeURIComponent(config.accessToken ?? "")}`, { method: "POST", body: coverForm }, this.timeoutMs);
            coverUrl = coverRes.data?.url;
        }
        // Step 3: publish the video note.
        const publishBody = {
            video_id: videoId,
            title: request.title,
            desc: request.description ?? "",
            cover_url: coverUrl,
            tags: request.tags ?? [],
            scheduled_time: request.scheduledTime,
        };
        const publishUrl = `${base}/api/v1/note/publish?access_token=${encodeURIComponent(config.accessToken ?? "")}`;
        const publishRes = await fetchJson(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(publishBody),
        }, this.timeoutMs);
        const noteId = publishRes.data?.note_id;
        if (!noteId) {
            return buildFailedResult(this.platform, "小红书发布笔记失败", publishRes);
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: noteId,
            platformUrl: publishRes.data?.share_url,
            publishTime: publishRes.data?.create_time
                ? new Date(publishRes.data.create_time * 1000).toISOString()
                : undefined,
            rawData: publishRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/api/v1/note/info?access_token=${encodeURIComponent(config.accessToken ?? "")}&note_id=${encodeURIComponent(platformVideoId)}`;
        const res = await fetchJson(url, { method: "GET" }, this.timeoutMs);
        const status = res.data?.status;
        // 小红书状态: 0=审核中 1=已发布 -1=失败.
        if (status === 1)
            return "published";
        if (status === -1)
            return "failed";
        return "processing";
    }
}
/**
 * Publisher for 微信视频号 (WeChat Channels) via the WeChat open API.
 *
 * Publish flow (api.weixin.qq.com):
 *   1. POST /cgi-bin/material/add_material?type=video  — upload video (multipart).
 *   2. POST /wxa/api/channels/publish                  — publish to Channels.
 *   3. GET  /wxa/api/channels/get                      — poll status by video_id.
 *
 * Auth: `access_token` query param (OAuth2 client-credential or login token).
 */
export class WeixinPublisher extends BasePlatformPublisher {
    platform = "weixin";
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const fileName = basename(request.videoPath);
        const token = config.accessToken ?? "";
        // Step 1: upload video as a permanent material.
        const uploadForm = new FormData();
        uploadForm.append("media", new Blob([videoBuffer]), fileName);
        const desc = JSON.stringify({
            title: request.title,
            introduction: request.description ?? "",
        });
        uploadForm.append("description", desc);
        const uploadUrl = `${base}/cgi-bin/material/add_material?access_token=${encodeURIComponent(token)}&type=video`;
        const uploadRes = await fetchJson(uploadUrl, { method: "POST", body: uploadForm }, this.timeoutMs);
        const mediaId = uploadRes.media_id;
        if (!mediaId) {
            return buildFailedResult(this.platform, "视频号素材上传未返回 media_id", uploadRes);
        }
        // Step 2: publish to Channels.
        const publishBody = {
            media_id: mediaId,
            title: request.title,
            description: request.description ?? "",
            cover_url: request.coverImagePath,
            scheduled_time: request.scheduledTime,
        };
        const publishUrl = `${base}/wxa/api/channels/publish?access_token=${encodeURIComponent(token)}`;
        const publishRes = await fetchJson(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(publishBody),
        }, this.timeoutMs);
        const videoId = publishRes.video_id ?? mediaId;
        if (!videoId) {
            return buildFailedResult(this.platform, "视频号发布失败", publishRes);
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: videoId,
            platformUrl: publishRes.share_url,
            publishTime: publishRes.create_time
                ? new Date(publishRes.create_time * 1000).toISOString()
                : undefined,
            rawData: publishRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/wxa/api/channels/get?access_token=${encodeURIComponent(config.accessToken ?? "")}&video_id=${encodeURIComponent(platformVideoId)}`;
        const res = await fetchJson(url, { method: "GET" }, this.timeoutMs);
        // 视频号状态映射 (示意): share_url 存在视为已发布.
        if (res.share_url)
            return "published";
        return "processing";
    }
}
/**
 * Publisher for YouTube via the YouTube Data API v3.
 *
 * Publish flow (googleapis.com) — resumable upload:
 *   1. POST /upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
 *        — initiate a resumable session, obtain the upload Location URL.
 *   2. PUT  {locationUrl}  — stream the video binary in a single PUT.
 *   3. GET  /youtube/v3/videos?id={id}&part=status  — poll upload status.
 *
 * Auth: OAuth2 `Bearer` access token (from Google Cloud console).
 */
export class YouTubePublisher extends BasePlatformPublisher {
    platform = "youtube";
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const token = config.accessToken ?? "";
        // Step 1: initiate a resumable upload session.
        const metadata = {
            snippet: {
                title: request.title,
                description: request.description ?? "",
                tags: request.tags ?? [],
                categoryId: request.categoryId ?? "22", // 22 = People & Blogs
            },
            status: {
                privacyStatus: request.scheduledTime ? "private" : "public",
                selfDeclaredMadeForKids: false,
            },
        };
        if (request.scheduledTime) {
            metadata.status.publishAt = request.scheduledTime;
        }
        const initiateUrl = `${base}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let locationUrl = null;
        try {
            const initiateRes = await fetch(initiateUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "X-Upload-Content-Length": String(videoBuffer.byteLength),
                    "X-Upload-Content-Type": "video/mp4",
                },
                body: JSON.stringify(metadata),
                signal: controller.signal,
            });
            if (!initiateRes.ok) {
                const text = await initiateRes.text().catch(() => "");
                return buildFailedResult(this.platform, `YouTube resumable 会话创建失败: HTTP ${initiateRes.status}${text ? `: ${text}` : ""}`);
            }
            locationUrl = initiateRes.headers.get("location");
        }
        finally {
            clearTimeout(timer);
        }
        if (!locationUrl) {
            return buildFailedResult(this.platform, "YouTube 未返回 resumable Location URL");
        }
        // Step 2: upload the video binary to the resumable session URL.
        const videoRes = await fetchJson(locationUrl, {
            method: "PUT",
            headers: { "Content-Type": "video/mp4" },
            body: videoBuffer,
        }, this.timeoutMs);
        const videoId = videoRes.id;
        if (!videoId) {
            return buildFailedResult(this.platform, "YouTube 上传未返回 video id", videoRes);
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: videoId,
            platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
            publishTime: videoRes.snippet?.publishedAt,
            rawData: videoRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/youtube/v3/videos?id=${encodeURIComponent(platformVideoId)}&part=status&key=${encodeURIComponent(config.openId ?? "")}`;
        const res = await fetchJson(url, { method: "GET", headers: { Authorization: `Bearer ${config.accessToken ?? ""}` } }, this.timeoutMs);
        const uploadStatus = res.items?.[0]?.status?.uploadStatus;
        if (uploadStatus === "processed")
            return "published";
        if (uploadStatus === "failed" || uploadStatus === "rejected")
            return "failed";
        return "processing";
    }
}
/**
 * Publisher for TikTok via the Content Posting API.
 *
 * Publish flow (open.tiktokapis.com) — direct file upload:
 *   1. POST /v2/post/publish/video/init/  — initialise a direct-file upload,
 *        receive an upload URL.
 *   2. PUT  {uploadUrl}  — upload the video binary (chunked transfer).
 *   3. POST /v2/post/publish/video/complete/  — finalise & publish.
 *   4. GET  /v2/post/publish/status/fetch/    — poll publish status.
 *
 * Auth: OAuth2 `Bearer` access token (Content Posting API scope).
 */
export class TikTokPublisher extends BasePlatformPublisher {
    platform = "tiktok";
    async doPublish(request, videoBuffer, config) {
        const base = resolveApiUrl(config);
        const token = config.accessToken ?? "";
        // Step 1: initialise a direct-file upload.
        const initBody = {
            source: "FILE_UPLOAD",
            video_size: { video_size: videoBuffer.byteLength },
            title: request.title,
            description: request.description ?? "",
            privacy_level: request.scheduledTime ? "SELF_ONLY" : "PUBLIC_TO_EVERYONE",
        };
        const initUrl = `${base}/v2/post/publish/video/init/`;
        const initRes = await fetchJson(initUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(initBody),
        }, this.timeoutMs);
        const uploadUrl = initRes.data?.video_id;
        const publishId = initRes.data?.publish_id;
        if (!uploadUrl || !publishId) {
            return buildFailedResult(this.platform, "TikTok 初始化上传失败", initRes);
        }
        // Step 2: upload the video binary via chunked PUT.
        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "video/mp4",
                "Content-Length": String(videoBuffer.byteLength),
                "Content-Range": `bytes 0-${videoBuffer.byteLength - 1}/${videoBuffer.byteLength}`,
            },
            body: videoBuffer,
        });
        if (!uploadRes.ok) {
            const text = await uploadRes.text().catch(() => "");
            return buildFailedResult(this.platform, `TikTok 视频上传失败: HTTP ${uploadRes.status}${text ? `: ${text}` : ""}`);
        }
        // Step 3: finalise & publish.
        const completeBody = {
            publish_id: publishId,
            scheduled_time: request.scheduledTime,
        };
        const completeUrl = `${base}/v2/post/publish/video/complete/`;
        const completeRes = await fetchJson(completeUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(completeBody),
        }, this.timeoutMs);
        const videoId = completeRes.data?.video_id ?? publishId;
        if (!videoId) {
            return buildFailedResult(this.platform, "TikTok 发布完成调用失败", completeRes);
        }
        return {
            platform: this.platform,
            status: request.scheduledTime ? "scheduled" : "processing",
            platformVideoId: videoId,
            platformUrl: completeRes.data?.share_url,
            publishTime: completeRes.data?.create_time
                ? new Date(completeRes.data.create_time * 1000).toISOString()
                : undefined,
            rawData: completeRes,
        };
    }
    async doGetStatus(platformVideoId, config) {
        const base = resolveApiUrl(config);
        const url = `${base}/v2/post/publish/status/fetch/`;
        const res = await fetchJson(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.accessToken ?? ""}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ publish_id: platformVideoId }),
        }, this.timeoutMs);
        const status = res.data?.status;
        // TikTok status: PROCESSING_UPLOAD, PROCESSING_DOWNLOAD, PUBLISH_COMPLETE, FAILED.
        if (status === "PUBLISH_COMPLETE")
            return "published";
        if (status === "FAILED")
            return "failed";
        return "processing";
    }
}
// ---------------------------------------------------------------------------
// Publisher factory
// ---------------------------------------------------------------------------
/**
 * Factory mapping for built-in platform publishers.
 *
 * Each entry is a constructor that takes `(config, timeoutMs)` and returns a
 * {@link BasePlatformPublisher}. Used by {@link DistributionManager} to
 * instantiate publishers from config.
 */
const PUBLISHER_FACTORIES = {
    douyin: DouyinPublisher,
    kuaishou: KuaishouPublisher,
    bilibili: BilibiliPublisher,
    xiaohongshu: XiaohongshuPublisher,
    weixin: WeixinPublisher,
    youtube: YouTubePublisher,
    tiktok: TikTokPublisher,
};
/**
 * Build the default {@link PlatformConfig} for a platform by merging the
 * shared {@link PLATFORM_LIMITS} with the given overrides.
 *
 * @param platform      Target platform.
 * @param overrides     Partial credentials / limits to overlay.
 * @returns A complete PlatformConfig (enabled defaults to false).
 */
export function buildPlatformConfig(platform, overrides = {}) {
    const limits = PLATFORM_LIMITS[platform];
    return {
        platform,
        enabled: overrides.enabled ?? false,
        accessToken: overrides.accessToken,
        refreshToken: overrides.refreshToken,
        tokenExpiresAt: overrides.tokenExpiresAt,
        openId: overrides.openId,
        apiUrl: overrides.apiUrl,
        maxTitleLength: overrides.maxTitleLength ?? limits.maxTitleLength,
        maxDescriptionLength: overrides.maxDescriptionLength ?? limits.maxDescriptionLength,
        maxVideoSizeMB: overrides.maxVideoSizeMB ?? limits.maxVideoSizeMB,
        maxVideoDurationSec: overrides.maxVideoDurationSec ?? limits.maxVideoDurationSec,
        supportedFormats: overrides.supportedFormats ?? [...limits.supportedFormats],
        requireCover: overrides.requireCover ?? limits.requireCover,
    };
}
/** Default {@link DistributionConfig} with every platform disabled. */
export const DEFAULT_DISTRIBUTION_CONFIG = {
    platforms: Object.keys(PLATFORM_LIMITS).map((p) => buildPlatformConfig(p)),
    publishAllByDefault: false,
    uploadTimeoutMs: 300_000, // 5 minutes
};
// ---------------------------------------------------------------------------
// DistributionManager
// ---------------------------------------------------------------------------
/**
 * Orchestrates multi-platform video distribution.
 *
 * Responsibilities:
 *   - Register publishers (built-in or custom) keyed by platform.
 *   - Validate video params (size / duration / format) against platform limits.
 *   - Publish to a single platform (`publishTo`) or fan out to many
 *     platforms in parallel (`publishToAll` via `Promise.allSettled`).
 *   - Poll publish status for a previously-created platform video.
 *   - Expose the list of configured (credential-bearing) platforms.
 *
 * Each publisher is optional: a platform is only registered when its
 * {@link PlatformConfig.enabled} is `true`, so deployments opt into exactly
 * the platforms they have credentials for.
 */
export class DistributionManager {
    publishers = new Map();
    configs = new Map();
    uploadTimeoutMs;
    publishAllByDefault;
    /**
     * @param config Distribution-level config. Each enabled platform entry
     *   instantiates its built-in publisher automatically.
     */
    constructor(config) {
        this.uploadTimeoutMs = config.uploadTimeoutMs;
        this.publishAllByDefault = config.publishAllByDefault;
        for (const platformConfig of config.platforms) {
            this.configs.set(platformConfig.platform, platformConfig);
            if (platformConfig.enabled) {
                this.registerBuiltInPublisher(platformConfig);
            }
        }
    }
    /**
     * Instantiate and register the built-in publisher for a platform config.
     *
     * No-op when no factory exists for the platform (custom publishers must be
     * registered explicitly via {@link registerPublisher}).
     */
    registerBuiltInPublisher(platformConfig) {
        const Factory = PUBLISHER_FACTORIES[platformConfig.platform];
        if (!Factory)
            return;
        const publisher = new Factory(platformConfig, this.uploadTimeoutMs);
        this.publishers.set(platformConfig.platform, publisher);
    }
    /**
     * Register a custom publisher (overrides any built-in for the same platform).
     *
     * @param publisher The publisher instance to register.
     */
    registerPublisher(publisher) {
        this.publishers.set(publisher.platform, publisher);
    }
    /**
     * Publish a video to a single platform.
     *
     * @param request Publish request (must specify `platform`).
     * @returns The publish result for that platform.
     * @throws when no publisher is registered for the requested platform.
     */
    async publishTo(request) {
        const publisher = this.publishers.get(request.platform);
        const config = this.configs.get(request.platform);
        if (!publisher) {
            return buildFailedResult(request.platform, `${getPlatformName(request.platform)} 未注册 Publisher（请在 DistributionConfig 中启用该平台）`);
        }
        if (!config) {
            return buildFailedResult(request.platform, `${getPlatformName(request.platform)} 缺少配置`);
        }
        return publisher.publish(request, config);
    }
    /**
     * Publish a video to multiple platforms in parallel.
     *
     * Uses `Promise.allSettled` so a single platform failure does not abort
     * the others; every platform result (success or failure) is recorded in
     * the returned {@link PublishTask}.
     *
     * @param videoPath  Local video file path.
     * @param title      Video title.
     * @param options    Optional description / tags / cover / target platforms /
     *                   scheduled time. When `platforms` is omitted, publishes
     *                   to every configured (enabled) platform.
     * @returns A PublishTask aggregating all platform results.
     */
    async publishToAll(videoPath, title, options) {
        // publishAllByDefault=true: attempt every platform that has a config
        // entry (uncredentialed ones fail gracefully). When false, only fan out
        // to fully configured (credential-bearing) platforms.
        const targets = options?.platforms ??
            (this.publishAllByDefault
                ? Array.from(this.configs.keys())
                : this.listConfiguredPlatforms());
        const createdAt = new Date().toISOString();
        const requests = targets.map((platform) => ({
            platform,
            videoPath,
            title,
            description: options?.description,
            tags: options?.tags,
            coverImagePath: options?.coverImagePath,
            scheduledTime: options?.scheduledTime,
        }));
        // Fan out in parallel — allSettled ensures one failure doesn't cancel others.
        const settled = await Promise.allSettled(requests.map((request) => this.publishTo(request)));
        const results = settled.map((outcome, index) => {
            if (outcome.status === "fulfilled") {
                return outcome.value;
            }
            return buildFailedResult(requests[index].platform, outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
        });
        const allFailed = results.every((r) => r.status === "failed");
        const allPublished = results.every((r) => r.status === "published" || r.status === "scheduled");
        // 仅在全部完成（全部成功或全部失败）时设置 completedAt；
        // 部分成功部分失败的状态为 "processing"，不应设置 completedAt
        const isComplete = allFailed || allPublished;
        return {
            id: randomUUID(),
            requests,
            results,
            status: allFailed ? "failed" : allPublished ? "published" : "processing",
            createdAt,
            ...(isComplete ? { completedAt: new Date().toISOString() } : {}),
        };
    }
    /**
     * Poll the publish status of a previously-created platform video.
     *
     * @param platform       Target platform.
     * @param platformVideoId The video id returned by {@link publishTo}.
     * @returns The current {@link PublishStatus}.
     */
    async getStatus(platform, platformVideoId) {
        const publisher = this.publishers.get(platform);
        const config = this.configs.get(platform);
        if (!publisher || !config) {
            return "failed";
        }
        return publisher.getStatus(platformVideoId, config);
    }
    /**
     * List the platforms that have been registered (enabled + credential-bearing).
     *
     * @returns Array of configured platform ids.
     */
    listConfiguredPlatforms() {
        const configured = [];
        for (const [platform, publisher] of this.publishers) {
            if (publisher.isConfigured()) {
                configured.push(platform);
            }
        }
        return configured;
    }
    /**
     * Get the full {@link PlatformConfig} for a platform.
     *
     * @param platform Target platform.
     * @returns The platform config (throws if missing).
     */
    getPlatformLimits(platform) {
        const config = this.configs.get(platform);
        if (!config) {
            throw new Error(`${getPlatformName(platform)} 未配置`);
        }
        return config;
    }
    /**
     * Validate video parameters against a platform's hard limits.
     *
     * @param platform Target platform.
     * @param params   `{ sizeMB, durationSec, format }` of the video.
     * @returns `{ valid, errors }` — `errors` is empty when valid.
     */
    validateVideo(platform, params) {
        const config = this.configs.get(platform);
        const limits = config ?? PLATFORM_LIMITS[platform];
        const errors = [];
        if (params.sizeMB > limits.maxVideoSizeMB) {
            errors.push(`视频大小 ${params.sizeMB.toFixed(1)}MB 超过 ${getPlatformName(platform)} 限制 ${limits.maxVideoSizeMB}MB`);
        }
        if (params.durationSec > limits.maxVideoDurationSec) {
            errors.push(`视频时长 ${params.durationSec}s 超过 ${getPlatformName(platform)} 限制 ${limits.maxVideoDurationSec}s`);
        }
        const format = params.format.toLowerCase().replace(/^\./, "");
        if (!limits.supportedFormats.includes(format)) {
            errors.push(`视频格式 ${format} 不被 ${getPlatformName(platform)} 支持，仅支持 ${limits.supportedFormats.join(", ")}`);
        }
        return { valid: errors.length === 0, errors };
    }
}
//# sourceMappingURL=distribution.js.map