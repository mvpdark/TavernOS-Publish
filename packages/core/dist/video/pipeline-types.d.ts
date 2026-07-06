import type { VideoClip, VideoGenConfig } from "./types.js";
import type { VideoReviewResult } from "../agents/video-reviewer.js";
import type { ComposeResult } from "./composer.js";
import type { Transition } from "./edl.js";
import type { Shot } from "../agents/storyboard.js";
/** Configuration for the review and reroll loop. */
export interface VideoReviewConfig {
    /** Maximum number of reroll attempts for a clip that fails review (default 3). */
    maxRerolls: number;
    /** Minimum score to consider a clip as "passed" (default 80). */
    passScore: number;
}
/** Default review configuration. */
export declare const DEFAULT_REVIEW_CONFIG: VideoReviewConfig;
/** Callbacks for pipeline progress reporting. */
export interface VideoPipelineCallbacks {
    /** Called after a clip has been generated (or re-generated). */
    onClipGenerated?: (clip: VideoClip, attempt: number) => void;
    /** Called after a clip has been reviewed. */
    onClipReviewed?: (clip: VideoClip, result: VideoReviewResult, attempt: number) => void;
    /** Called during composition with progress messages. */
    onComposeProgress?: (message: string) => void;
    /** Called when a clip fails (generation error or max rerolls exhausted). */
    onClipFailed?: (clip: VideoClip, error: string) => void;
    /** Called after lip-sync is applied to a clip. */
    onLipSyncApplied?: (clip: VideoClip, success: boolean) => void;
    /** Called after character consistency check. */
    onConsistencyChecked?: (clip: VideoClip, score: number, passed: boolean) => void;
}
/** Input for the pipeline's runChapter method. */
export interface VideoPipelineInput {
    /** Script context describing the chapter (used as review scriptContext). */
    chapterScript: string;
    /** Clips to generate, review, and compose. */
    clips: VideoClip[];
    /** Video generation config (provides duration and model defaults). */
    videoGenConfig: VideoGenConfig;
    /** Review configuration overrides. */
    reviewConfig?: Partial<VideoReviewConfig>;
    /** Transitions between clips for composition. */
    transitions?: Transition[];
    /** Output path for the composed video. Required for composition. */
    outputPath?: string;
    /** Reference image URLs for review consistency checks. */
    referenceImages?: string[];
    /**
     * Maximum number of clips to process in parallel (default 1 = serial).
     * Set to 2-3 for concurrent generation when the video API supports it.
     * Each clip still goes through generate → review → reroll independently;
     * only the outer clip loop is parallelized.
     */
    concurrency?: number;
    /** Shot data from storyboard (enables AutoCut smart editing). */
    shots?: Shot[];
    /** Whether to use AutoCut smart editing (requires shots). */
    useAutoCut?: boolean;
    /** Whether to enable lip-sync post-processing (default false). */
    enableLipSync?: boolean;
    /** Lip-sync provider to use (default "seedance-audio"). */
    lipSyncProvider?: string;
    /** Character library for consistency checking (optional). */
    characterLibrary?: import("./character-asset-library.js").CharacterLibrary;
    /** Whether to check character consistency during review (default false). */
    enableConsistencyCheck?: boolean;
    /** Prompt template ID to enhance generation prompts (optional). */
    promptTemplateId?: string;
    /** TTS audio URL for lip-sync post-processing (optional). */
    ttsAudioUrl?: string;
}
/** Result of a single clip's processing within the pipeline. */
export interface ClipProcessResult {
    /** The updated clip (with videoUrl and final status). */
    clip: VideoClip;
    /** The final review result for this clip. */
    review: VideoReviewResult;
    /** Error message if the clip failed (undefined on success). */
    error?: string;
    /** Number of generation attempts made (1 = initial only). */
    attempts: number;
    /** Lip-sync result (undefined if not applied). */
    lipSyncApplied?: boolean;
    /** Character consistency score (undefined if not checked). */
    consistencyScore?: number;
}
/** Result of the full pipeline run. */
export interface VideoPipelineResult {
    /** Updated clips with video URLs and final statuses. */
    clips: VideoClip[];
    /** Review results for each clip (parallel to clips array). */
    reviewResults: VideoReviewResult[];
    /** Composition result (undefined if composition was not performed). */
    composeResult?: ComposeResult;
    /** Whether the pipeline completed without errors. */
    success: boolean;
    /** Error messages from failed clips. */
    errors: string[];
    /** Per-clip processing details. */
    clipResults: ClipProcessResult[];
}
//# sourceMappingURL=pipeline-types.d.ts.map