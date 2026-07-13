import type { VideoGenClient } from "./client.js";
import type { VideoReviewer, VideoReviewResult } from "../agents/video-reviewer.js";
import type { VideoComposer, ComposeResult } from "./composer.js";
import { FrameQualityChecker } from "./frame-quality.js";
import { VideoDownloader } from "./video-downloader.js";
import type { EDLClip, Transition } from "./edl.js";
import type { VideoPipelineInput, VideoPipelineResult, VideoPipelineCallbacks, VideoReviewConfig } from "./pipeline-types.js";
import type { VideoClip } from "./types.js";
import { CharacterSentinel } from "./character-consistency.js";
/** Context shared across all stages within a single pipeline run. */
export interface StageContext {
    readonly reviewConfig: VideoReviewConfig;
    readonly chapterScript: string;
    readonly referenceImages: string[];
    readonly callbacks: VideoPipelineCallbacks;
    /** Character library for consistency checking. */
    readonly characterLibrary?: import("./character-asset-library.js").CharacterLibrary;
    /** Whether consistency check is enabled. */
    readonly enableConsistencyCheck?: boolean;
    /** Whether lip-sync is enabled. */
    readonly enableLipSync?: boolean;
    /** Lip-sync provider. */
    readonly lipSyncProvider?: string;
    /** Lip-sync manager instance. */
    readonly lipSyncManager?: import("./lip-sync.js").LipSyncManager;
    /** Output path for composed video (used for lip-sync output naming). */
    readonly outputPath?: string;
    /** Prompt template ID for prompt enhancement. */
    readonly promptTemplateId?: string;
    /** TTS audio URL for lip-sync. */
    readonly ttsAudioUrl?: string;
    /** Character consistency checker instance. */
    readonly consistencyChecker?: CharacterSentinel;
}
/** Result of a single stage execution. */
export interface StageResult<T = unknown> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: string;
    readonly skipped?: boolean;
}
export interface GenerationStageInput {
    clip: VideoClip;
    prompt: string;
    attempt: number;
}
export interface GenerationStageOutput {
    videoUrl: string;
    thumbnailUrl?: string;
}
export declare class GenerationStage {
    private readonly client;
    constructor(client: VideoGenClient);
    run(input: GenerationStageInput, ctx: StageContext): Promise<StageResult<GenerationStageOutput>>;
}
export interface DownloadStageInput {
    clip: VideoClip;
    videoUrl: string;
}
export interface DownloadStageOutput {
    localPath?: string;
}
export declare class DownloadStage {
    private readonly downloader;
    constructor(downloader: VideoDownloader);
    run(input: DownloadStageInput): Promise<StageResult<DownloadStageOutput>>;
}
export interface FrameCheckStageInput {
    clip: VideoClip;
    videoSource: string;
}
export interface FrameCheckStageOutput {
    trimStart?: number;
    trimEnd?: number | null;
    badFrameCount: number;
}
export declare class FrameCheckStage {
    private readonly checker;
    constructor(checker: FrameQualityChecker);
    run(input: FrameCheckStageInput, ctx: StageContext): Promise<StageResult<FrameCheckStageOutput>>;
}
export interface ReviewStageInput {
    clip: VideoClip;
    /** Attempt number (1-indexed) for callback reporting. */
    attempt?: number;
}
export type ReviewStageOutput = VideoReviewResult;
export declare class ReviewStage {
    private readonly reviewer?;
    constructor(reviewer?: VideoReviewer | undefined);
    run(input: ReviewStageInput, ctx: StageContext): Promise<StageResult<ReviewStageOutput>>;
}
export interface RerollDecision {
    shouldReroll: boolean;
    patchedPrompt?: string;
    reason: string;
}
export declare class RerollStage {
    decide(params: {
        review: VideoReviewResult;
        attempt: number;
        maxAttempts: number;
        passScore: number;
        currentPrompt: string;
    }): RerollDecision;
}
export interface AutoCutStageInput {
    clips: VideoClip[];
    shots: import("../agents/storyboard.js").Shot[];
}
export interface AutoCutStageOutput {
    clips: EDLClip[];
    transitions: Transition[];
    styleSummary: string;
    estimatedDuration: number;
}
export declare class AutoCutStage {
    run(input: AutoCutStageInput, ctx: StageContext): Promise<StageResult<AutoCutStageOutput>>;
}
export interface ComposeStageInput {
    clips: VideoClip[];
    outputPath: string;
    /** EDL clips from AutoCut (if using smart editing). */
    edlClips?: EDLClip[];
    /** Transitions from AutoCut (if using smart editing). */
    edlTransitions?: Transition[];
    /** Manual transitions (if not using AutoCut). */
    transitions?: Transition[];
}
export declare class ComposeStage {
    private readonly composer?;
    constructor(composer?: VideoComposer | undefined);
    run(input: ComposeStageInput, ctx: StageContext): Promise<StageResult<ComposeResult>>;
}
export interface LipSyncStageInput {
    clip: VideoClip;
    audioUrl?: string;
    characterImage?: string;
    outputPath: string;
    provider?: string;
}
export interface LipSyncStageOutput {
    success: boolean;
    outputPath: string;
    provider: string;
}
export declare class LipSyncStage {
    /** Lip-sync manager (public for OrchestrateStage to access via ctx). */
    readonly manager?: import("./lip-sync.js").LipSyncManager;
    constructor(manager?: import("./lip-sync.js").LipSyncManager);
    run(input: LipSyncStageInput, ctx: StageContext): Promise<StageResult<LipSyncStageOutput>>;
}
export interface PipelineStages {
    generation: GenerationStage;
    download: DownloadStage;
    frameCheck: FrameCheckStage;
    review: ReviewStage;
    reroll: RerollStage;
    autoCut: AutoCutStage;
    compose: ComposeStage;
    lipSync: LipSyncStage;
    orchestrate: OrchestrateStage;
}
export declare class OrchestrateStage {
    private readonly stages;
    private readonly defaultCallbacks;
    constructor(stages: PipelineStages, defaultCallbacks?: VideoPipelineCallbacks);
    run(input: VideoPipelineInput): Promise<VideoPipelineResult>;
    /**
     * Process a single clip through the full stage chain:
     * generate → download → frameCheck → review → reroll (loop)
     */
    private processSingleClip;
}
export declare function createPipelineStages(client: VideoGenClient, reviewer?: VideoReviewer, composer?: VideoComposer, callbacks?: VideoPipelineCallbacks, lipSyncManager?: import("./lip-sync.js").LipSyncManager): PipelineStages;
//# sourceMappingURL=pipeline-stages.d.ts.map