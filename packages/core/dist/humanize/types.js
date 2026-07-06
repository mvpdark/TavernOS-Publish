// packages/core/src/humanize/types.ts
// Type definitions for the AI-style removal system (humanizer).
// Detects fatigue words, structural cliches, and formulaic patterns
// in Chinese creative writing, then provides rewrite suggestions.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Zod schemas (for runtime validation of externally-supplied data)
// ---------------------------------------------------------------------------
export const FatigueTermSchema = z.object({
    term: z.string().min(1),
    suggestion: z.string().min(1),
    severity: z.enum(["high", "medium", "low"]),
    category: z.string().min(1),
});
export const ClichePatternSchema = z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    severity: z.enum(["high", "medium", "low"]),
    suggestion: z.string().min(1),
    thresholdPer1k: z.number().min(0),
});
export const SynonymGroupSchema = z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    terms: z.array(z.string().min(1)).min(2),
});
export const StyleIssueSchema = z.object({
    category: z.enum([
        "fatigue",
        "cliche",
        "pattern",
        "burstiness",
        "parallelism",
        "synonym",
    ]),
    severity: z.enum(["high", "medium", "low"]),
    match: z.string(),
    offset: z.number().int().min(0),
    length: z.number().int().min(1),
    suggestion: z.string(),
    context: z.string(),
    label: z.string().optional(),
});
export const StyleReportSchema = z.object({
    issues: z.array(StyleIssueSchema),
    score: z.number().min(0).max(100),
    fatigueCount: z.number().int().min(0),
    clicheCount: z.number().int().min(0),
    patternCount: z.number().int().min(0),
    summary: z.string(),
});
export const BurstinessResultSchema = z.object({
    score: z.number().min(0).max(100),
    label: z.string(),
    issues: z.array(StyleIssueSchema),
});
//# sourceMappingURL=types.js.map