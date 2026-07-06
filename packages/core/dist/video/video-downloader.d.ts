export interface DownloadResult {
    /** Local file path of the downloaded video. */
    localPath: string;
    /** Whether the file was newly downloaded (false = already existed). */
    downloaded: boolean;
    /** File size in bytes. */
    size: number;
    /** Success status. */
    success: boolean;
    /** Error message if failed. */
    error?: string;
}
export interface VideoDownloaderConfig {
    /** Base directory for storing downloaded videos. */
    baseDir: string;
    /** Download timeout in ms. */
    timeoutMs: number;
    /** Maximum concurrent downloads. */
    concurrency: number;
}
export declare const DEFAULT_DOWNLOADER_CONFIG: VideoDownloaderConfig;
/**
 * Downloads remote video URLs to local .mp4 files so that FFmpeg-based
 * operations (frame quality check, composition) have reliable local-file
 * access instead of streaming from a CDN.
 *
 * Uses the global `fetch()` (Node >= 18) for HTTP(S) downloads with
 * AbortController-based timeout, and a simple worker-pool for concurrency.
 */
export declare class VideoDownloader {
    private readonly config;
    constructor(config?: Partial<VideoDownloaderConfig>);
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
    download(videoUrl: string, clipId: string, options?: {
        skipIfExists?: boolean;
    }): Promise<DownloadResult>;
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
    downloadIfNeeded(videoUrl: string, localPath: string | undefined, clipId: string): Promise<DownloadResult>;
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
    batchDownload(items: Array<{
        url: string;
        clipId: string;
        localPath?: string;
    }>, onProgress?: (completed: number, total: number, clipId: string) => void): Promise<Map<string, DownloadResult>>;
}
//# sourceMappingURL=video-downloader.d.ts.map