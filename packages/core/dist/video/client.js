// Video generation client.
//
// Uses native fetch (no external SDK) to call an OpenAI-compatible video
// generation endpoint (POST /videos/generations). The base URL is resolved
// from the video provider registry so that Seedance (Volcano Engine), Jimeng
// (local API), and custom endpoints all work transparently.
//
// The client supports two response modes:
//   1. Synchronous — the response body contains the video URL directly
//      (e.g. Jimeng local API).
//   2. Asynchronous — the response body contains a task ID; the client
//      delegates to VideoTaskPoller to poll until the task completes
//      (e.g. Volcano Engine Seedance).
//
// Ported and re-architected from MJ's jimeng_video_api_adapter.py (which used
// urllib + multipart file uploads) into a clean JSON-based HTTP client that
// accepts a reference image URL instead of file uploads.
import { videoProviderRegistry } from "./provider-registry.js";
import { isVideoStubEnabled, stubVideoGeneration } from "./stub.js";
import { VideoTaskPoller } from "./poller.js";
import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";
import { generateVideoViaJimengDirect, } from "./jimeng-direct.js";
/** Timeout for the initial POST request in milliseconds (120 seconds). */
const REQUEST_TIMEOUT_MS = 120_000;
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createVideoGenClient(config) {
    // Resolve the base URL from the provider registry for known providers so
    // that Seedance / Jimeng endpoints are used automatically. For the "custom"
    // provider (not in the registry, or with empty baseUrl) the config baseUrl
    // is used as-is.
    const providerConfig = videoProviderRegistry.get(config.provider);
    // Use || instead of ?? so that an empty-string baseUrl in the registry
    // (e.g. the "custom" provider) falls through to the user-provided config.
    const baseUrl = providerConfig?.baseUrl || config.baseUrl;
    const model = config.model || providerConfig?.models[0]?.id || "seedance-2.0-fast";
    const apiPattern = providerConfig?.apiPattern ?? "openai";
    return {
        provider: config.provider,
        baseUrl,
        defaults: {
            model,
            duration: config.duration,
            resolution: config.resolution,
            aspectRatio: config.aspectRatio,
        },
        generate: (request) => generateVideo(config, baseUrl, model, apiPattern, request),
    };
}
// ---------------------------------------------------------------------------
// Generation (stub mode → real API call → async polling)
// ---------------------------------------------------------------------------
async function generateVideo(config, baseUrl, model, apiPattern, request) {
    // 1. Stub mode — deterministic offline response
    if (isVideoStubEnabled()) {
        return stubVideoGeneration(request);
    }
    // 1b. Jimeng direct mode — bypass the HTTP client framework and call
    //     Jimeng's web API directly with Cookie/deviceId authentication.
    //     No external Python service required.
    if (config.provider === "jimeng-direct") {
        const creds = {
            sessionid: config.jimengSessionId,
        };
        return generateVideoViaJimengDirect(config, creds, request);
    }
    // 2. Determine endpoint path and request body based on API pattern
    const effectiveModel = request.model ?? model;
    const duration = request.duration ?? config.duration;
    const headers = buildHeaders(config.apiKey);
    let createUrl;
    // Merge reference images: legacy single URL + multi-URL array
    const allRefImages = [];
    if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
        allRefImages.push(...request.referenceImageUrls);
    }
    else if (request.referenceImageUrl) {
        allRefImages.push(request.referenceImageUrl);
    }
    const body = {
        model: effectiveModel,
        prompt: request.prompt,
        duration,
        resolution: config.resolution,
        aspect_ratio: config.aspectRatio,
        response_format: "url",
    };
    // Single reference image (image-to-video first frame) — supported by all providers
    if (allRefImages.length === 1) {
        body["reference_image_url"] = allRefImages[0];
        body["image_url"] = allRefImages[0];
    }
    // Multiple reference images (omni_reference for Seedance 2.0)
    if (allRefImages.length >= 2) {
        body["reference_image_urls"] = allRefImages;
        body["images"] = allRefImages;
        body["omni_reference"] = true;
    }
    // Reference audio (for Seedance 2.0 audio-driven video)
    if (request.referenceAudioUrls && request.referenceAudioUrls.length > 0) {
        body["reference_audio_urls"] = request.referenceAudioUrls;
        if (allRefImages.length >= 2) {
            body["audio_urls"] = request.referenceAudioUrls;
        }
    }
    if (apiPattern === "yunwu") {
        createUrl = normalizeApiUrl(baseUrl, "/video/create");
    }
    else if (apiPattern === "agnes") {
        // Agnes uses singular /video/generations (OpenAI uses plural /videos/generations)
        createUrl = normalizeApiUrl(baseUrl, "/video/generations");
    }
    else {
        createUrl = normalizeApiUrl(baseUrl, "/videos/generations");
    }
    // 120-second timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(createUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    }
    catch (err) {
        if (controller.signal.aborted) {
            throw new Error(`Video generation request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
        }
        throw new Error(`Video generation request failed: ${err.message}`);
    }
    finally {
        clearTimeout(timeoutId);
    }
    if (!response.ok) {
        await throwApiError(response, "Video generation API");
    }
    const data = (await response.json());
    // 3. Try to extract a direct video URL from the response (synchronous mode)
    const directUrl = extractVideoUrl(data);
    if (directUrl) {
        return {
            videoUrl: directUrl,
            thumbnailUrl: extractThumbnailUrl(data),
            duration: extractDuration(data) ?? duration,
            createdAt: new Date().toISOString(),
        };
    }
    // 4. No direct URL — check for async task ID and poll until completion
    // Agnes returns both id (video_xxx) and task_id (task_xxx); the query
    // endpoint requires the task_id, so prefer it for the agnes pattern.
    const taskId = apiPattern === "agnes"
        ? (data.task_id ?? data.id)
        : extractTaskId(data);
    if (taskId) {
        const poller = new VideoTaskPoller({
            baseUrl,
            apiKey: config.apiKey,
            apiPattern,
        });
        const taskInfo = await poller.poll(taskId);
        return {
            videoUrl: taskInfo.videoUrl ?? "",
            thumbnailUrl: taskInfo.thumbnailUrl,
            duration: taskInfo.duration ?? duration,
            createdAt: new Date().toISOString(),
        };
    }
    // 5. No video URL and no task ID — malformed response
    throw new Error(`Video generation response did not include a video URL or task ID: ${JSON.stringify(data).slice(0, 500)}`);
}
/**
 * Extract a video URL from any supported response shape.
 * Returns undefined when no URL is present (indicating an async task).
 */
export function extractVideoUrl(data) {
    // Check data array first (OpenAI-style)
    if (Array.isArray(data.data)) {
        for (const item of data.data) {
            const url = item.url ?? item.video_url ?? item.download_url;
            if (url)
                return url;
        }
    }
    // Check nested content (Volcano-style)
    if (data.content) {
        const url = data.content.video_url ??
            data.content.url ??
            data.content.download_url;
        if (url)
            return url;
    }
    // Check top-level flat fields
    return data.url ?? data.video_url ?? data.download_url;
}
/**
 * Extract a thumbnail URL from any supported response shape.
 */
export function extractThumbnailUrl(data) {
    if (data.content?.thumbnail_url)
        return data.content.thumbnail_url;
    return data.thumbnail_url;
}
/**
 * Extract duration from any supported response shape.
 */
export function extractDuration(data) {
    return data.content?.duration ?? data.duration;
}
/**
 * Extract a task ID from an async response.
 */
export function extractTaskId(data) {
    return data.id ?? data.task_id;
}
//# sourceMappingURL=client.js.map