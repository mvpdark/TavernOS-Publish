// packages/core/src/audit/types.ts
// Type definitions for the pure rule-based audit engine.
//
// This module provides zero-LLM-cost detection of logical contradictions
// in Chinese creative writing. All detection is performed via pure
// string/regex/number analysis — no LLM calls are made.
//
// The rule auditor produces AuditIssue[] values that are structurally
// compatible with the existing auditor pipeline. Rule-based issues carry
// a `label: "rule"` field to distinguish them from LLM-generated issues.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Zod schema for runtime validation of rule audit issues
// ---------------------------------------------------------------------------
export const RuleAuditIssueSchema = z.object({
    severity: z.enum(["error", "warning", "info"]),
    scope: z.enum(["global", "chapter", "paragraph"]),
    dimension: z.string().min(1),
    message: z.string().min(1),
    repairScope: z.enum(["local", "structural"]),
    location: z.string(),
    label: z.string().optional(),
    suggestion: z.string().optional(),
});
export const RuleAuditInputSchema = z.object({
    chapterContent: z.string().min(1),
    chapterIndex: z.number().int().min(1).optional(),
    currentState: z.string().optional(),
    chapterSummaries: z.string().optional(),
    storyBible: z.string().optional(),
    assetCatalog: z.any().optional(),
});
export const RuleAuditResultSchema = z.object({
    issues: z.array(RuleAuditIssueSchema),
    detectorCount: z.number().int().min(0),
    summary: z.string(),
});
//# sourceMappingURL=types.js.map