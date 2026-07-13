import type { Shot } from "../agents/storyboard.js";
/** Classification of a scene/shot's dramatic function. */
export type DramaticFunction = "establish" | "reveal" | "confrontation" | "emotional-peak" | "transition" | "resolution" | "tension-build" | "character-intro" | "reaction" | "ambient";
/** A director's single-sentence intention plus derived craft choices. */
export interface DirectorIntent {
    dramaticFunction: DramaticFunction;
    /** Director's single-sentence intention for this shot. */
    intention: string;
    /** Recommended shot type. */
    shotType: string;
    /** Recommended camera movement. */
    cameraMovement: string;
    /** Recommended lighting description. */
    lighting: string;
    /** Pacing note (e.g. "slow", "urgent", "deliberate"). */
    pacing: string;
}
/**
 * Classify the dramatic function of a shot based on its textual cues.
 *
 * Detection runs in priority order — the first matching rule wins:
 *   1. description keywords -> entrance / reveal / confrontation / peak /
 *      resolution / tension
 *   2. emotionLabel + dialogue -> reaction
 *   3. empty characters -> ambient
 *   4. fallback -> establish
 */
export declare function detectDramaticFunction(shot: Shot): DramaticFunction;
/**
 * Analyze a shot and derive a DirectorIntent (dramatic function + craft
 * recommendations). This function is pure — it does not mutate the shot.
 */
export declare function analyzeShotIntent(shot: Shot): DirectorIntent;
/**
 * Merge a DirectorIntent onto a shallow copy of the shot.
 *
 * Author-provided values are preserved — intent values only fill in gaps:
 *   - shotType / cameraMovement: overwritten only when empty, "auto" or "default"
 *   - lighting: overwritten only when empty or undefined
 *
 * The original shot object is never mutated.
 */
export declare function applyDirectorIntent(shot: Shot, intent: DirectorIntent): Shot;
/**
 * One-shot helper: analyze the intent for a shot and apply it immediately.
 */
export declare function enrichShotWithDirecting(shot: Shot): Shot;
/**
 * Batch-process an entire shot list through the director engine.
 *
 * Two passes:
 *   1. Enrich every shot individually (fill gaps from dramatic function).
 *   2. Maintain a "single director voice" by ensuring shot types alternate —
 *      if three consecutive shots share the same shot type, the third is
 *      converted to a "close-up" reaction shot to break the monotony.
 *
 * The input array is never mutated; a new array of new shot objects is
 * returned.
 */
export declare function enrichShotList(shots: Shot[]): Shot[];
//# sourceMappingURL=director-engine.d.ts.map