import type { Shot } from "../agents/storyboard.js";
/** Pacing level for rhythm curve analysis. */
type PacingLevel = "slow" | "medium" | "fast";
/** Recommended transition hint between two adjacent shots. */
export interface TransitionHint {
    /** Shot index this transition applies to (the shot AFTER the cut). */
    shotIndex: number;
    /** Transition type: "cut" (hard cut), "match-cut" (match on action/subject), "dissolve" (gradual), "smash" (smash cut). */
    type: "cut" | "match-cut" | "dissolve" | "smash";
    /** Human-readable reason for this transition choice. */
    reason: string;
}
/** Result of sequence director analysis. */
export interface SequenceAnalysis {
    /** Enriched shots with director adjustments applied. */
    shots: Shot[];
    /** Transition hints between adjacent shots. */
    transitions: TransitionHint[];
    /** Overall pacing curve (one entry per shot). */
    rhythmCurve: PacingLevel[];
    /** Director's notes for the entire sequence. */
    notes: string[];
}
/**
 * Apply sequence-level directing to a shot list.
 *
 * This is a post-processing step that runs AFTER the storyboard agent has
 * generated individual shots. It ensures:
 * 1. Shot-type alternation (no three identical scales in a row)
 * 2. Transition hints between adjacent shots
 * 3. Rhythm curve analysis with director's notes
 *
 * @param shots - The original shot list from the storyboard agent.
 * @returns SequenceAnalysis with enriched shots, transitions, and notes.
 */
export declare function directSequence(shots: Shot[]): SequenceAnalysis;
export {};
//# sourceMappingURL=sequence-director.d.ts.map