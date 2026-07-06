import { z } from "zod";
// ---------------------------------------------------------------------------
// Chapter Status
// ---------------------------------------------------------------------------
export const ChapterStatusSchema = z.enum([
    "card-generated",
    "drafting",
    "drafted",
    "auditing",
    "audit-passed",
    "audit-failed",
    "state-degraded",
    "revising",
    "ready-for-review",
    "approved",
    "rejected",
    "published",
    "imported",
]);
// ---------------------------------------------------------------------------
// Token Usage
// ---------------------------------------------------------------------------
export const TokenUsageSchema = z.object({
    promptTokens: z.number().int().default(0),
    completionTokens: z.number().int().default(0),
    totalTokens: z.number().int().default(0),
});
// ---------------------------------------------------------------------------
// Length Telemetry
// ---------------------------------------------------------------------------
export const LengthTelemetrySchema = z.object({
    targetWords: z.number().int().min(1),
    actualWords: z.number().int().min(0),
    charCount: z.number().int().min(0),
    cjkChars: z.number().int().min(0),
    withinRange: z.boolean().default(true),
    correctionsApplied: z.number().int().min(0).default(0),
});
// ---------------------------------------------------------------------------
// Chapter Metadata
// ---------------------------------------------------------------------------
export const ChapterMetaSchema = z.object({
    number: z.number().int().min(1),
    title: z.string(),
    status: ChapterStatusSchema,
    wordCount: z.number().int().default(0),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    auditIssues: z.array(z.string()).default([]),
    lengthWarnings: z.array(z.string()).default([]),
    reviewNote: z.string().optional(),
    detectionScore: z.number().min(0).max(1).optional(),
    detectionProvider: z.string().optional(),
    detectedAt: z.string().datetime().optional(),
    lengthTelemetry: LengthTelemetrySchema.optional(),
    tokenUsage: TokenUsageSchema.optional(),
});
// ---------------------------------------------------------------------------
// Chapter Content (full chapter with body)
// ---------------------------------------------------------------------------
export const ChapterSchema = ChapterMetaSchema.extend({
    bookId: z.string().min(1),
    body: z.string().default(""),
    intent: z.string().optional(),
    contextHash: z.string().optional(),
});
//# sourceMappingURL=chapter.js.map