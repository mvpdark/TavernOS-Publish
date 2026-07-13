import type { VideoClip } from "../types.js";
import type { VideoReviewResult } from "../../agents/video-reviewer.js";
import type { VideoReviewConfig, VideoPipelineCallbacks, ClipProcessResult } from "../pipeline-types.js";
import type { StageContext, PipelineStages } from "../pipeline-stages.js";
/**
 * State for processing a single clip through the graph.
 *
 * The graph processes one clip at a time. The outer orchestrator handles
 * the worker pool (concurrent clip processing) and composition.
 */
export interface ClipPipelineState {
    /** The clip being processed (mutated in-place by nodes, same as old code). */
    clip: VideoClip;
    /** Stage context shared across all nodes. */
    ctx: StageContext;
    /** Stage instances (injected, not part of pure state but needed for I/O). */
    stages: PipelineStages;
    /** Current prompt (may be patched by reroll). */
    currentPrompt: string;
    /** Current attempt number (1-based). */
    attempt: number;
    /** Maximum attempts (maxRerolls + 1). */
    maxAttempts: number;
    /** Review result from the latest review (undefined until review runs). */
    review: VideoReviewResult | undefined;
    /** Whether the clip passed review. */
    passed: boolean;
    /** Whether to retry generation (set by gen_check conditional). */
    shouldRetry: boolean;
    /** Consistency check score (undefined if not checked). */
    consistencyScore: number | undefined;
    /** Whether lip-sync was applied. */
    lipSyncApplied: boolean | undefined;
    /** Error message (undefined if no error). */
    error: string | undefined;
    /** Final status. */
    status: "processing" | "completed" | "failed";
}
/**
 * State for the full pipeline run (all clips + compose).
 * Used by the outer orchestrator, not by the per-clip graph.
 */
export interface VideoPipelineGraphState {
    reviewConfig: VideoReviewConfig;
    chapterScript: string;
    referenceImages: string[];
    callbacks: VideoPipelineCallbacks;
    outputPath: string | undefined;
    shots: import("../../agents/storyboard.js").Shot[] | undefined;
    useAutoCut: boolean;
    transitions: import("../edl.js").Transition[] | undefined;
    stages: PipelineStages;
    clipResults: ClipProcessResult[];
    clips: VideoClip[];
    errors: string[];
    composeResult: import("../composer.js").ComposeResult | undefined;
    success: boolean;
}
import type { ReducerMap } from "./types.js";
/**
 * Reducers for ClipPipelineState.
 * Most fields use "replace" semantics (default), so only array/special
 * fields need explicit reducers.
 */
export declare const clipStateReducers: ReducerMap<ClipPipelineState>;
/**
 * Create initial state for a single clip graph run.
 */
export declare function createClipState(clip: VideoClip, ctx: StageContext, stages: PipelineStages, reviewConfig: VideoReviewConfig): ClipPipelineState;
//# sourceMappingURL=state.d.ts.map