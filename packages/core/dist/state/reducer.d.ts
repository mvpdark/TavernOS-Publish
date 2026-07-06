import { type StoryStateSnapshot, type StoryStateDelta } from "../models/story-state.js";
/**
 * Apply a StoryStateDelta to a StoryStateSnapshot through the reduction
 * pipeline. The delta is processed step-by-step: inputs are normalized, chapter
 * order is enforced, threads are reconciled, facts are patched, the summary is
 * stored, and the result is validated and finalized.
 */
export declare function applyStoryStateDelta(params: {
    readonly snapshot: StoryStateSnapshot;
    readonly delta: StoryStateDelta;
    readonly allowReapply?: boolean;
}): StoryStateSnapshot;
//# sourceMappingURL=reducer.d.ts.map