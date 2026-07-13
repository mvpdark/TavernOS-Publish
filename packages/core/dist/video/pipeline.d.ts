import type { VideoGenClient } from "./client.js";
import type { VideoReviewer } from "../agents/video-reviewer.js";
import type { VideoComposer } from "./composer.js";
import { type PipelineStages } from "./pipeline-stages.js";
import type { VideoPipelineInput, VideoPipelineResult, VideoPipelineCallbacks } from "./pipeline-types.js";
export declare class VideoPipeline {
    private readonly stages;
    private readonly orchestrator;
    /** Optional character library for consistency checking (constructor default). */
    private readonly characterLibrary?;
    constructor(client: VideoGenClient, reviewer?: VideoReviewer, composer?: VideoComposer, callbacks?: VideoPipelineCallbacks, _enableAutoCut?: boolean, 
    /** Optional lip-sync manager for post-generation synchronization. */
    lipSyncManager?: import("./lip-sync.js").LipSyncManager, 
    /** Optional character library for consistency checking. */
    characterLibrary?: import("./character-asset-library.js").CharacterLibrary);
    /**
     * Run the full pipeline: generate → review → reroll for each clip, then compose.
     * Delegates to GraphOrchestrator which uses a state graph to process each clip.
     *
     * Lip-sync and character library are passed through the input. If the input
     * does not specify a characterLibrary, the constructor's default is used.
     */
    runChapter(input: VideoPipelineInput): Promise<VideoPipelineResult>;
    /**
     * Access the underlying named stages for advanced use cases
     * (custom orchestration, testing individual stages, etc.)
     */
    getStages(): PipelineStages;
    /**
     * Get the compiled graph topology for visualization.
     */
    getGraphTopology(): import("./index.js").GraphTopology;
}
//# sourceMappingURL=pipeline.d.ts.map