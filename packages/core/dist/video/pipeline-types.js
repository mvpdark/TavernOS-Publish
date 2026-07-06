// Type definitions and default configuration for the video pipeline orchestrator.
//
// Extracted from pipeline.ts to enforce single-responsibility: this module holds
// only the pipeline's public contracts (interfaces + the default config value),
// with no orchestration logic. The VideoPipeline class lives in pipeline.ts and
// imports these symbols.
/** Default review configuration. */
export const DEFAULT_REVIEW_CONFIG = {
    maxRerolls: 3,
    passScore: 80,
};
//# sourceMappingURL=pipeline-types.js.map