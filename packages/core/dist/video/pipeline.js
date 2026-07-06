// Video pipeline orchestrator — thin wrapper around named pipeline stages.
//
// V3.0 upgrades:
//   - Refactored from monolithic processClip() into 9 named stage agents
//     (pipeline-stages.ts): Generation, Download, FrameCheck, Review,
//     Reroll, AutoCut, Compose, LipSync, Orchestrate
//   - Each stage has a clear interface, independent error handling,
//     and is independently testable
//   - VideoPipeline is now a thin facade that delegates to OrchestrateStage
//   - Full backward compatibility: same constructor signature, same
//     runChapter() API, same VideoPipelineInput/Result types
//   - Optional lip-sync post-processing and character consistency checking
//
// V2.1 features preserved:
//   - Frame-level quality check after generation: auto-trim bad frames
//   - processClip passes referenceImageUrls to generate()
//   - On review failure, appends concrete acting fix instructions
//   - Acting anchors injected into prompt before initial generation
//   - Reroll count respected; max 3 attempts by default
import { createPipelineStages, } from "./pipeline-stages.js";
// ---------------------------------------------------------------------------
// VideoPipeline — thin facade over OrchestrateStage
// ---------------------------------------------------------------------------
export class VideoPipeline {
    stages;
    orchestrate;
    /** Optional character library for consistency checking (constructor default). */
    characterLibrary;
    constructor(client, reviewer, composer, callbacks = {}, _enableAutoCut = true, 
    /** Optional lip-sync manager for post-generation synchronization. */
    lipSyncManager, 
    /** Optional character library for consistency checking. */
    characterLibrary) {
        this.stages = createPipelineStages(client, reviewer, composer, callbacks, lipSyncManager);
        this.orchestrate = this.stages.orchestrate;
        this.characterLibrary = characterLibrary;
    }
    /**
     * Run the full pipeline: generate → review → reroll for each clip, then compose.
     * Delegates to OrchestrateStage which coordinates all named stages.
     *
     * Lip-sync and character library are passed through the input. If the input
     * does not specify a characterLibrary, the constructor's default is used.
     */
    async runChapter(input) {
        // Pass lip-sync and character library through input
        return this.orchestrate.run({
            ...input,
            enableLipSync: input.enableLipSync,
            lipSyncProvider: input.lipSyncProvider,
            characterLibrary: input.characterLibrary ?? this.characterLibrary,
        });
    }
    /**
     * Access the underlying named stages for advanced use cases
     * (custom orchestration, testing individual stages, etc.)
     */
    getStages() {
        return this.stages;
    }
}
//# sourceMappingURL=pipeline.js.map