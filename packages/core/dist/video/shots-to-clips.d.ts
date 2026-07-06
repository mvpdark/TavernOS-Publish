import type { Shot } from "../agents/storyboard.js";
import type { VideoClip, VideoGenConfig } from "./types.js";
export interface ShotsToClipsOptions {
    chapterId: number;
    config: VideoGenConfig;
    /** Reference image URLs to attach to each clip (e.g. character avatars). */
    referenceImageUrls?: string[];
    /** Reference audio URLs. */
    referenceAudioUrls?: string[];
}
export declare function shotsToClips(shots: Shot[], options: ShotsToClipsOptions): VideoClip[];
//# sourceMappingURL=shots-to-clips.d.ts.map