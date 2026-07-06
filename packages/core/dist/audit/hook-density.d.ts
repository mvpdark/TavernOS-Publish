export interface HookSignal {
    type: "cliffhanger" | "suspense_opening" | "mystery_question" | "foreshadow";
    /** Character offset of the match within the chapter content. */
    offset: number;
    /** Matched text fragment with ~15 chars of context on each side. */
    excerpt: string;
    /** Pattern confidence in the range 0-1. */
    confidence: number;
}
export interface CoolPointSignal {
    type: "face_slap" | "power_up" | "reveal" | "revenge" | "turnaround" | "recognition";
    offset: number;
    excerpt: string;
    confidence: number;
}
export interface HookDensityResult {
    hooks: readonly HookSignal[];
    coolPoints: readonly CoolPointSignal[];
    hookCount: number;
    coolPointCount: number;
    /** Hooks per 1000 characters. */
    hookDensity: number;
    /** Cool points per 1000 characters. */
    coolPointDensity: number;
    /** Combined density score in the range 0-1. */
    densityScore: number;
    distribution: {
        /** Share (0-1) of hooks+cool points falling in the first third. */
        beginning: number;
        /** Share (0-1) in the middle third. */
        middle: number;
        /** Share (0-1) in the last third. */
        ending: number;
    };
    /** Chinese-language summary of the analysis. */
    summary: string;
}
/**
 * Analyze the hook and cool-point density of a chapter.
 *
 * This is the main entry point for the zero-LLM hook-density analyzer.
 * It scans the chapter content for narrative hooks and cool points using
 * pure regex/string patterns, then computes per-thousand-character
 * densities, a combined 0-1 density score, and a three-segment
 * distribution.
 *
 * @param chapterContent The full text of the chapter.
 * @param wordCount      Optional character count; defaults to
 *                       `chapterContent.length`. Pass an explicit value
 *                       when the caller already has a normalized count.
 * @returns A HookDensityResult with signals, metrics, and summary.
 */
export declare function analyzeHookDensity(chapterContent: string, wordCount?: number): HookDensityResult;
//# sourceMappingURL=hook-density.d.ts.map