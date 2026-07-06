import type { PaceMetrics, RetentionMetrics, RetentionDashboard } from "./types.js";
import type { SceneSignal } from "../scene/types.js";
/** Tension curve point for multi-chapter analysis. */
export interface TensionCurvePoint {
    chapterIndex: number;
    tension: number;
    relaxation: number;
    rhythm: string;
    retentionPower?: number;
}
/** Multi-chapter tension curve analysis result. */
export interface TensionCurveAnalysis {
    points: TensionCurvePoint[];
    /** Average tension across the range. */
    averageTension: number;
    /** Tension volatility (standard deviation). */
    volatility: number;
    /** Detected pacing pattern. */
    pattern: "roller-coaster" | "ascending" | "descending" | "flat" | "wave";
    /** Chapters with tension drops > 0.3 (potential reader drop-off points). */
    dropOffPoints: number[];
    /** Chapters with tension peaks (potential climax points). */
    peakPoints: number[];
    /** Chinese recommendation based on the curve. */
    recommendation: string;
}
export declare class PaceDirector {
    private readonly db;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    private upsert;
    private mapRetentionRow;
    private upsertRetention;
    /**
     * Determine the rhythm label from the current tension and its trend
     * relative to the previous chapter.
     *
     * Priority (first match wins):
     *   1. rising  — tensionTrend > 0.15
     *   2. peak    — tension > 0.8 AND tensionTrend >= 0
     *   3. falling — tensionTrend < -0.15
     *   4. valley  — tension < 0.2 AND tensionTrend <= 0
     *   5. flat    — everything else
     */
    private computeRhythm;
    /**
     * Generate a Chinese recommendation string based on the current rhythm
     * and recent chapter history.
     *
     * Note: the "valley" rhythm inherently implies low tension (tension < 0.2),
     * so no separate tension check is needed for that branch.
     */
    private computeRecommendation;
    /**
     * Analyse a chapter's scene composition and compute pacing metrics.
     *
     * @param chapterIndex The chapter being analysed.
     * @param scenes       The scene signals detected in this chapter.
     * @param wordCount    The total word count of the chapter.
     */
    analyze(chapterIndex: number, scenes: readonly SceneSignal[], wordCount: number): PaceMetrics;
    /** Retrieve metrics for a specific chapter. */
    getMetrics(chapterIndex: number): PaceMetrics | undefined;
    /** Retrieve the most recent N chapters' metrics (ascending order). */
    getRecentMetrics(count: number): PaceMetrics[];
    /**
     * Analyse reader retention metrics for a chapter.
     * Combines hook density, cool-point density, pacing data, and historical
     * fatigue to compute a 追读力 (retention power) score.
     *
     * @param chapterIndex       The chapter being analysed.
     * @param hookDensity        Hook density score (0-1) from hook-density analyzer.
     * @param coolPointDensity   Cool-point density score (0-1).
     * @param cliffhangerStrength Chapter-end cliffhanger strength (0-1).
     */
    analyzeRetention(chapterIndex: number, hookDensity: number, coolPointDensity: number, cliffhangerStrength: number): RetentionMetrics;
    /**
     * Analyse reader retention for a chapter by automatically running
     * hook-density analysis on the chapter content.
     *
     * This is a convenience wrapper that calls `analyzeHookDensity()` from the
     * audit module, then feeds the derived metrics into `analyzeRetention()`.
     *
     * Normalisation notes (per-1000-char densities -> 0-1 scores):
     *   - hookDensity:         result.hookDensity / 1000 * 3, clamped to 0-1
     *     (hookDensity is hooks-per-1000-chars; 3 per 1000 is high density)
     *   - coolPointDensity:    result.coolPointDensity / 1000 * 3, clamped to 0-1
     *   - cliffhangerStrength: count of cliffhanger hooks / 3, clamped to 0-1
     *
     * @param chapterIndex   The chapter being analysed.
     * @param chapterContent The chapter text content.
     * @param wordCount      Optional word count (auto-calculated if omitted).
     */
    analyzeRetentionFromText(chapterIndex: number, chapterContent: string, wordCount?: number): RetentionMetrics;
    /**
     * Generate a Chinese recommendation string for retention metrics. Multiple
     * applicable conditions are joined with a Chinese semicolon.
     */
    private computeRetentionRecommendation;
    /** Retrieve retention metrics for a specific chapter. */
    getRetentionMetrics(chapterIndex: number): RetentionMetrics | undefined;
    /**
     * Build a retention dashboard aggregating metrics across recent chapters.
     *
     * @param recentCount Number of recent chapters to include (default 20).
     */
    getRetentionDashboard(recentCount?: number): RetentionDashboard;
    /**
     * Generate an aggregate Chinese recommendation for the retention dashboard.
     */
    private computeOverallRecommendation;
    /**
     * Analyse the tension curve across multiple chapters.
     * Detects pacing patterns and identifies potential reader drop-off points.
     *
     * Loads pace_metrics and retention_metrics for the specified range,
     * computes aggregate statistics, classifies the overall pattern, and
     * produces a Chinese-language recommendation.
     *
     * @param startChapter First chapter index (inclusive).
     * @param endChapter   Last chapter index (inclusive).
     */
    analyzeTensionCurve(startChapter: number, endChapter: number): TensionCurveAnalysis;
    /** Close the database connection. */
    close(): void;
}
//# sourceMappingURL=pace-director.d.ts.map