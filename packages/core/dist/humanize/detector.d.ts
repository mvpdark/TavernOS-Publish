import type { StyleReport, FatigueTerm, ClichePattern, BurstinessResult } from "./types.js";
/**
 * Compute burstiness (突发性) of the given text.
 *
 * Returns a 0–100 score (higher = more human-like variety), a human-readable
 * label, and a list of detected style issues:
 *   - uniform sentence-length runs (均匀段落)
 *   - three-piece parallelism (三件套排比)
 *   - synonym rotation (同义词轮换)
 *
 * Scoring uses the coefficient of variation of sentence lengths
 * (CV = std / mean): CV < 0.3 → low burstiness (AI-flavored),
 * CV > 0.6 → high burstiness (human-like).
 */
export declare function computeBurstiness(text: string): BurstinessResult;
/**
 * Configuration for the style detector.
 */
export interface DetectorConfig {
    /** Additional fatigue terms beyond the built-in list. */
    readonly extraFatigueTerms?: readonly FatigueTerm[];
    /** Additional cliche patterns beyond the built-in list. */
    readonly extraClichePatterns?: readonly ClichePattern[];
}
/**
 * Return type of createStyleDetector — the style detector public surface.
 */
export interface StyleDetector {
    /** Analyze text and return a full style report. */
    analyze(text: string): StyleReport;
    /** Access the merged term list (read-only). */
    readonly terms: readonly FatigueTerm[];
    /** Access the merged pattern list (read-only). */
    readonly patterns: readonly ClichePattern[];
}
/**
 * Create a style detector with optional custom terms and patterns.
 * The detector merges user-supplied data with the built-in lexicon.
 */
export declare function createStyleDetector(config?: DetectorConfig): StyleDetector;
/**
 * Convenience function: analyze text with the default detector.
 */
export declare function detectStyle(text: string): StyleReport;
//# sourceMappingURL=detector.d.ts.map