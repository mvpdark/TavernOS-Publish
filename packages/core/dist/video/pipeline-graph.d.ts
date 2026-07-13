import type { CompiledGraph } from "./graph/types.js";
import { type ClipPipelineState } from "./graph/state.js";
import type { VideoPipelineInput, VideoPipelineResult, VideoPipelineCallbacks } from "./pipeline-types.js";
import type { PipelineStages } from "./pipeline-stages.js";
/**
 * Build and compile the per-clip pipeline graph.
 *
 * The graph is built once and reused for all clips — state is passed
 * in via `invoke()`.
 */
export declare function buildClipPipelineGraph(): CompiledGraph<ClipPipelineState>;
/**
 * Orchestrates the full video pipeline using a state graph.
 *
 * Replaces OrchestrateStage with the same public interface.
 * The per-clip processing is delegated to the state graph;
 * the outer worker pool and composition logic remain straightforward.
 */
export declare class GraphOrchestrator {
    private readonly graph;
    private readonly stages;
    private readonly callbacks;
    constructor(stages: PipelineStages, callbacks?: VideoPipelineCallbacks);
    /**
     * Run the full pipeline: process all clips → compose.
     * Same signature as OrchestrateStage.run().
     */
    run(input: VideoPipelineInput): Promise<VideoPipelineResult>;
    /**
     * Process a single clip through the state graph.
     */
    private processClipViaGraph;
    /**
     * Convert final graph state to ClipProcessResult.
     */
    private stateToResult;
    /**
     * Get the compiled graph topology for visualization.
     */
    getTopology(): import("./graph/types.js").GraphTopology;
    /**
     * Build StageContext from VideoPipelineInput.
     * Extracted from OrchestrateStage.run() — unchanged logic.
     */
    private buildContext;
}
//# sourceMappingURL=pipeline-graph.d.ts.map