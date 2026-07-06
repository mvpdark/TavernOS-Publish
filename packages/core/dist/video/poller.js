// Video task poller for asynchronous video generation APIs.
//
// Some video generation providers (e.g. Volcano Engine Seedance) return a
// task ID instead of a completed video URL. The client must then poll a
// status endpoint until the task succeeds or fails. This module provides
// a reusable VideoTaskPoller class that handles the polling loop, timeout,
// and cancellation via AbortSignal.
//
// Ported from MJ's polling logic in jimeng_video_api_adapter.py (which used
// blocking urllib calls) into a clean async/await implementation with
// configurable intervals and deadlines.
import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_INTERVAL_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 60;
const DEFAULT_TIMEOUT_MS = 600_000;
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Promise-based sleep that rejects early if the signal is aborted.
 */
function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error("Polling aborted"));
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error("Polling aborted"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}
/**
 * Normalise various status strings into the canonical VideoTaskStatus enum.
 */
function normalizeStatus(raw) {
    const s = (raw ?? "").toLowerCase().trim();
    if (s === "succeeded" ||
        s === "success" ||
        s === "completed" ||
        s === "done" ||
        s === "complete") {
        return "succeeded";
    }
    if (s === "failed" ||
        s === "error" ||
        s === "cancelled" ||
        s === "canceled") {
        return "failed";
    }
    if (s === "running" ||
        s === "processing" ||
        s === "in_progress" ||
        s === "in-progress") {
        return "running";
    }
    // Default to queued for any unrecognised or empty value.
    return "queued";
}
/**
 * Parse a raw poll response into a normalised VideoTaskInfo.
 */
export function parseTaskInfo(taskId, data) {
    // Agnes wraps the task under data.data — prefer the nested object when present.
    // Agnes shape: { data: { status: "SUCCESS", result_url, data: { url, status } } }
    const outer = data.data;
    const inner = outer?.data;
    const status = normalizeStatus(inner?.status ?? outer?.status ?? data.status);
    const content = data.content ?? {};
    const videoUrl = inner?.url ??
        inner?.video_url ??
        inner?.download_url ??
        outer?.result_url ??
        outer?.url ??
        outer?.video_url ??
        outer?.download_url ??
        content.video_url ??
        content.url ??
        content.download_url ??
        data.video_url ??
        data.url ??
        data.download_url;
    const thumbnailUrl = inner?.thumbnail_url ?? content.thumbnail_url ?? data.thumbnail_url;
    const duration = inner?.duration ?? content.duration ?? data.duration;
    return {
        id: data.id ?? taskId,
        status,
        videoUrl,
        thumbnailUrl,
        duration,
        error: inner?.error ?? outer?.error ?? data.error ?? data.message,
    };
}
// ---------------------------------------------------------------------------
// VideoTaskPoller
// ---------------------------------------------------------------------------
/**
 * Polls an asynchronous video generation task until completion.
 *
 * The poller sends GET requests to `{baseUrl}/videos/generations/{taskId}`
 * and inspects the `status` field. When the status becomes `succeeded` the
 * resolved VideoTaskInfo includes the video URL. When it becomes `failed`
 * (or the poller exceeds its attempts/timeout) an error is thrown.
 */
export class VideoTaskPoller {
    baseUrl;
    apiKey;
    intervalMs;
    maxAttempts;
    timeoutMs;
    apiPattern;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.apiKey = options.apiKey ?? "";
        this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
        this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.apiPattern = options.apiPattern ?? "openai";
    }
    /**
     * Poll a video generation task until it succeeds, fails, or times out.
     *
     * @param taskId - The task identifier returned by the generation endpoint.
     * @param signal - Optional AbortSignal for external cancellation.
     * @returns VideoTaskInfo with status `succeeded` and the video URL.
     */
    async poll(taskId, signal) {
        // Build the query URL based on the API pattern
        const url = this.apiPattern === "yunwu"
            ? normalizeApiUrl(this.baseUrl, `/video/query?id=${encodeURIComponent(taskId)}`)
            : this.apiPattern === "agnes"
                ? normalizeApiUrl(this.baseUrl, `/video/generations/${taskId}`)
                : normalizeApiUrl(this.baseUrl, `/videos/generations/${taskId}`);
        const headers = buildHeaders(this.apiKey, { json: false });
        const deadline = Date.now() + this.timeoutMs;
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            if (Date.now() >= deadline) {
                throw new Error(`Video task ${taskId} timed out after ${this.timeoutMs}ms`);
            }
            if (signal?.aborted) {
                throw new Error(`Video task ${taskId} was aborted`);
            }
            const response = await fetch(url, { method: "GET", headers, signal });
            if (!response.ok) {
                await throwApiError(response, "Video task poll");
            }
            const data = (await response.json());
            const info = parseTaskInfo(taskId, data);
            if (info.status === "succeeded") {
                return info;
            }
            if (info.status === "failed") {
                throw new Error(`Video task ${taskId} failed: ${info.error ?? "unknown error"}`);
            }
            // queued or running — wait and retry
            await sleep(this.intervalMs, signal);
        }
        throw new Error(`Video task ${taskId} exceeded max attempts (${this.maxAttempts})`);
    }
}
//# sourceMappingURL=poller.js.map