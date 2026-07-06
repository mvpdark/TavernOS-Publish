// Video downloader — downloads remote video URLs to local files.
//
// Generated videos are returned as remote CDN URLs (Seedance/Jimeng/Volcano).
// FFmpeg operations (frame quality check, composition) require local files for
// reliable random access. This module provides:
//   - download: Download a single video URL to a local .mp4 file
//   - downloadIfNeeded: Check if localPath exists, download if not
//   - batchDownload: Download multiple videos with concurrency control
import { writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
export const DEFAULT_DOWNLOADER_CONFIG = {
    baseDir: "./.tavernos/videos/raw",
    timeoutMs: 300_000, // 5 minutes
    concurrency: 3,
};
// ---------------------------------------------------------------------------
// VideoDownloader class
// ---------------------------------------------------------------------------
/**
 * Downloads remote video URLs to local .mp4 files so that FFmpeg-based
 * operations (frame quality check, composition) have reliable local-file
 * access instead of streaming from a CDN.
 *
 * Uses the global `fetch()` (Node >= 18) for HTTP(S) downloads with
 * AbortController-based timeout, and a simple worker-pool for concurrency.
 */
export class VideoDownloader {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_DOWNLOADER_CONFIG, ...config };
    }
    /**
     * Download a video from a URL to a local file.
     *
     * File naming: `{baseDir}/{clipId}.mp4`
     *
     * Flow:
     *   1. Construct localPath as `{baseDir}/{clipId}.mp4`
     *   2. If `skipIfExists` is set and the file already exists, return early
     *   3. Create the parent directory (mkdir -p)
     *   4. `fetch(videoUrl)` with an AbortController timeout
     *   5. If the response is not ok, throw with status
     *   6. Read the body as an ArrayBuffer and write it to disk
     *   7. Return a DownloadResult with localPath and size
     *
     * @param videoUrl Remote URL of the video to download.
     * @param clipId Stable clip identifier used for the local filename.
     * @param options Optional `{ skipIfExists }` to skip when the file exists.
     */
    async download(videoUrl, clipId, options) {
        const localPath = join(this.config.baseDir, `${clipId}.mp4`);
        // If skipIfExists and the file already exists, return early.
        if (options?.skipIfExists) {
            try {
                const existing = await stat(localPath);
                return {
                    localPath,
                    downloaded: false,
                    size: existing.size,
                    success: true,
                };
            }
            catch {
                // File doesn't exist — proceed to download.
            }
        }
        // Create the parent directory (mkdir -p).
        await mkdir(dirname(localPath), { recursive: true });
        // Set up timeout via AbortController.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await fetch(videoUrl, {
                signal: controller.signal,
            });
            if (!response.ok) {
                return {
                    localPath,
                    downloaded: false,
                    size: 0,
                    success: false,
                    error: `Download failed: HTTP ${response.status} ${response.statusText}`,
                };
            }
            const buffer = await response.arrayBuffer();
            await writeFile(localPath, Buffer.from(buffer));
            return {
                localPath,
                downloaded: true,
                size: buffer.byteLength,
                success: true,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            // Distinguish abort/timeout from other errors for clearer diagnostics.
            const isAbort = err instanceof Error && err.name === "AbortError";
            return {
                localPath,
                downloaded: false,
                size: 0,
                success: false,
                error: isAbort
                    ? `Download timed out after ${this.config.timeoutMs}ms`
                    : `Download failed: ${message}`,
            };
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Download a video only if localPath doesn't exist yet.
     *
     * If `localPath` is provided and the file exists on disk, the download is
     * skipped and a result with `downloaded: false` is returned. Otherwise the
     * video is downloaded via {@link download}.
     *
     * @param videoUrl Remote URL of the video.
     * @param localPath Existing local path to check, or undefined.
     * @param clipId Stable clip identifier used for the local filename.
     */
    async downloadIfNeeded(videoUrl, localPath, clipId) {
        // If a localPath is provided and the file exists, skip download.
        if (localPath) {
            try {
                const existing = await stat(localPath);
                return {
                    localPath,
                    downloaded: false,
                    size: existing.size,
                    success: true,
                };
            }
            catch {
                // File doesn't exist — fall through to download.
            }
        }
        // Download to {baseDir}/{clipId}.mp4, skipping if it already exists
        // (covers the case where a previous run downloaded the same clip).
        return this.download(videoUrl, clipId, { skipIfExists: true });
    }
    /**
     * Batch download multiple videos with concurrency control.
     *
     * Uses a simple worker-pool pattern (same as pipeline.ts): N workers pull
     * items from a shared index until all items are processed. The concurrency
     * limit is taken from the downloader config.
     *
     * @param items Array of `{ url, clipId, localPath? }` to download.
     * @param onProgress Optional callback invoked after each download completes.
     * @returns Map<clipId, DownloadResult> for all items.
     */
    async batchDownload(items, onProgress) {
        const results = new Map();
        const total = items.length;
        if (total === 0)
            return results;
        const concurrency = Math.max(1, Math.min(this.config.concurrency, total));
        let nextIndex = 0;
        let completed = 0;
        const worker = async () => {
            while (true) {
                const i = nextIndex++;
                if (i >= total)
                    return;
                const item = items[i];
                const result = await this.downloadIfNeeded(item.url, item.localPath, item.clipId);
                results.set(item.clipId, result);
                completed++;
                onProgress?.(completed, total, item.clipId);
            }
        };
        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);
        return results;
    }
}
//# sourceMappingURL=video-downloader.js.map