import type { VideoGenRequest, VideoGenResponse } from "./types.js";
/** True when the video-generation stub is enabled via env var. */
export declare function isVideoStubEnabled(): boolean;
/**
 * Deterministic stub video generation.
 * Produces a stable placeholder response derived from the prompt so that the
 * same prompt always yields the same video URL — no network access required.
 */
export declare function stubVideoGeneration(request: VideoGenRequest): VideoGenResponse;
//# sourceMappingURL=stub.d.ts.map