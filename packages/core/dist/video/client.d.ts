import type { VideoGenConfig, VideoGenRequest, VideoGenResponse } from "./types.js";
export interface VideoGenClient {
    readonly provider: string;
    readonly baseUrl: string;
    readonly defaults: {
        readonly model: string;
        readonly duration: number;
        readonly resolution: string;
        readonly aspectRatio: string;
    };
    /** Generate a video from a text prompt (with optional reference image URL). */
    generate(request: VideoGenRequest): Promise<VideoGenResponse>;
}
export declare function createVideoGenClient(config: VideoGenConfig): VideoGenClient;
/**
 * Raw JSON shape returned by a video generation endpoint. Field names cover
 * OpenAI-style, Volcano Engine-style, and Jimeng local API responses for
 * maximum compatibility.
 */
interface VideoApiResponse {
    id?: string;
    task_id?: string;
    status?: string;
    data?: Array<{
        url?: string;
        video_url?: string;
        download_url?: string;
    }>;
    url?: string;
    video_url?: string;
    download_url?: string;
    thumbnail_url?: string;
    duration?: number;
    content?: {
        video_url?: string;
        url?: string;
        download_url?: string;
        thumbnail_url?: string;
        duration?: number;
    };
}
/**
 * Extract a video URL from any supported response shape.
 * Returns undefined when no URL is present (indicating an async task).
 */
export declare function extractVideoUrl(data: VideoApiResponse): string | undefined;
/**
 * Extract a thumbnail URL from any supported response shape.
 */
export declare function extractThumbnailUrl(data: VideoApiResponse): string | undefined;
/**
 * Extract duration from any supported response shape.
 */
export declare function extractDuration(data: VideoApiResponse): number | undefined;
/**
 * Extract a task ID from an async response.
 */
export declare function extractTaskId(data: VideoApiResponse): string | undefined;
export {};
//# sourceMappingURL=client.d.ts.map