import type { StyleProfile, StyleAnalysisResult } from "./types.js";
/**
 * Detect language from text content.
 * If >30% of characters are CJK, treat as Chinese; otherwise English.
 */
export declare function detectLanguage(text: string): "zh" | "en";
/**
 * Analyze a text and produce a statistical style profile.
 * Pure function — no LLM, no I/O, deterministic.
 *
 * @param text The reference text to analyze (min 500 chars recommended).
 * @param sourceName Optional name of the source file/author.
 * @param language Optional language override (auto-detected if omitted).
 */
export declare function analyzeStyle(text: string, sourceName?: string, language?: "zh" | "en"): StyleAnalysisResult;
/**
 * Format a style profile into a compact human-readable summary (for display).
 */
export declare function formatProfileSummary(profile: StyleProfile): string;
//# sourceMappingURL=style-analyzer.d.ts.map