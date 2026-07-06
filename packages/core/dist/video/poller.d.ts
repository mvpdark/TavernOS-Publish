/** Lifecycle status of an asynchronous video generation task. */
export type VideoTaskStatus = "queued" | "running" | "succeeded" | "failed";
/** Normalised information about a polled video task. */
export interface VideoTaskInfo {
    readonly id: string;
    readonly status: VideoTaskStatus;
    readonly videoUrl?: string;
    readonly thumbnailUrl?: string;
    readonly duration?: number;
    readonly error?: string;
}
/** Options for controlling the polling behaviour. */
export interface VideoPollOptions {
    /** Milliseconds between poll requests (default 10 000). */
    readonly intervalMs?: number;
    /** Maximum number of poll attempts before giving up (default 60). */
    readonly maxAttempts?: number;
    /** Absolute deadline in milliseconds from the first poll (default 600 000). */
    readonly timeoutMs?: number;
    /** API endpoint pattern. "openai" polls /videos/generations/{id}; "yunwu" polls /video/query?id={id}; "agnes" polls /video/generations/{id}. */
    readonly apiPattern?: "openai" | "yunwu" | "agnes";
}
/**
 * Raw JSON shape returned by a task status endpoint. Field names cover both
 * OpenAI-style and Volcano Engine-style responses for maximum compatibility.
 */
interface PollApiResponse {
    id?: string;
    status?: string;
    error?: string;
    message?: string;
    content?: {
        video_url?: string;
        url?: string;
        download_url?: string;
        thumbnail_url?: string;
        duration?: number;
    };
    video_url?: string;
    url?: string;
    download_url?: string;
    thumbnail_url?: string;
    duration?: number;
    data?: {
        status?: string;
        result_url?: string;
        url?: string;
        video_url?: string;
        download_url?: string;
        error?: string;
        data?: {
            status?: string;
            url?: string;
            video_url?: string;
            download_url?: string;
            thumbnail_url?: string;
            duration?: number;
            error?: string;
        };
    };
}
/**
 * Parse a raw poll response into a normalised VideoTaskInfo.
 */
export declare function parseTaskInfo(taskId: string, data: PollApiResponse): VideoTaskInfo;
/**
 * Polls an asynchronous video generation task until completion.
 *
 * The poller sends GET requests to `{baseUrl}/videos/generations/{taskId}`
 * and inspects the `status` field. When the status becomes `succeeded` the
 * resolved VideoTaskInfo includes the video URL. When it becomes `failed`
 * (or the poller exceeds its attempts/timeout) an error is thrown.
 */
export declare class VideoTaskPoller {
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly intervalMs: number;
    readonly maxAttempts: number;
    readonly timeoutMs: number;
    readonly apiPattern: "openai" | "yunwu" | "agnes";
    constructor(options: {
        baseUrl: string;
        apiKey?: string;
        intervalMs?: number;
        maxAttempts?: number;
        timeoutMs?: number;
        apiPattern?: "openai" | "yunwu" | "agnes";
    });
    /**
     * Poll a video generation task until it succeeds, fails, or times out.
     *
     * @param taskId - The task identifier returned by the generation endpoint.
     * @param signal - Optional AbortSignal for external cancellation.
     * @returns VideoTaskInfo with status `succeeded` and the video URL.
     */
    poll(taskId: string, signal?: AbortSignal): Promise<VideoTaskInfo>;
}
export {};
//# sourceMappingURL=poller.d.ts.map