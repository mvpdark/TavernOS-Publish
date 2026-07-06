import { z } from "zod";
export declare const ChapterStatusSchema: z.ZodEnum<["card-generated", "drafting", "drafted", "auditing", "audit-passed", "audit-failed", "state-degraded", "revising", "ready-for-review", "approved", "rejected", "published", "imported"]>;
export type ChapterStatus = z.infer<typeof ChapterStatusSchema>;
export declare const TokenUsageSchema: z.ZodObject<{
    promptTokens: z.ZodDefault<z.ZodNumber>;
    completionTokens: z.ZodDefault<z.ZodNumber>;
    totalTokens: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}, {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
}>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export declare const LengthTelemetrySchema: z.ZodObject<{
    targetWords: z.ZodNumber;
    actualWords: z.ZodNumber;
    charCount: z.ZodNumber;
    cjkChars: z.ZodNumber;
    withinRange: z.ZodDefault<z.ZodBoolean>;
    correctionsApplied: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    targetWords: number;
    actualWords: number;
    charCount: number;
    cjkChars: number;
    withinRange: boolean;
    correctionsApplied: number;
}, {
    targetWords: number;
    actualWords: number;
    charCount: number;
    cjkChars: number;
    withinRange?: boolean | undefined;
    correctionsApplied?: number | undefined;
}>;
export type LengthTelemetry = z.infer<typeof LengthTelemetrySchema>;
export declare const ChapterMetaSchema: z.ZodObject<{
    number: z.ZodNumber;
    title: z.ZodString;
    status: z.ZodEnum<["card-generated", "drafting", "drafted", "auditing", "audit-passed", "audit-failed", "state-degraded", "revising", "ready-for-review", "approved", "rejected", "published", "imported"]>;
    wordCount: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    auditIssues: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lengthWarnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    reviewNote: z.ZodOptional<z.ZodString>;
    detectionScore: z.ZodOptional<z.ZodNumber>;
    detectionProvider: z.ZodOptional<z.ZodString>;
    detectedAt: z.ZodOptional<z.ZodString>;
    lengthTelemetry: z.ZodOptional<z.ZodObject<{
        targetWords: z.ZodNumber;
        actualWords: z.ZodNumber;
        charCount: z.ZodNumber;
        cjkChars: z.ZodNumber;
        withinRange: z.ZodDefault<z.ZodBoolean>;
        correctionsApplied: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange: boolean;
        correctionsApplied: number;
    }, {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange?: boolean | undefined;
        correctionsApplied?: number | undefined;
    }>>;
    tokenUsage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodDefault<z.ZodNumber>;
        completionTokens: z.ZodDefault<z.ZodNumber>;
        totalTokens: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }, {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    number: number;
    status: "card-generated" | "drafting" | "drafted" | "auditing" | "audit-passed" | "audit-failed" | "state-degraded" | "revising" | "ready-for-review" | "approved" | "rejected" | "published" | "imported";
    title: string;
    createdAt: string;
    updatedAt: string;
    wordCount: number;
    auditIssues: string[];
    lengthWarnings: string[];
    reviewNote?: string | undefined;
    detectionScore?: number | undefined;
    detectionProvider?: string | undefined;
    detectedAt?: string | undefined;
    lengthTelemetry?: {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange: boolean;
        correctionsApplied: number;
    } | undefined;
    tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    } | undefined;
}, {
    number: number;
    status: "card-generated" | "drafting" | "drafted" | "auditing" | "audit-passed" | "audit-failed" | "state-degraded" | "revising" | "ready-for-review" | "approved" | "rejected" | "published" | "imported";
    title: string;
    createdAt: string;
    updatedAt: string;
    wordCount?: number | undefined;
    auditIssues?: string[] | undefined;
    lengthWarnings?: string[] | undefined;
    reviewNote?: string | undefined;
    detectionScore?: number | undefined;
    detectionProvider?: string | undefined;
    detectedAt?: string | undefined;
    lengthTelemetry?: {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange?: boolean | undefined;
        correctionsApplied?: number | undefined;
    } | undefined;
    tokenUsage?: {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
    } | undefined;
}>;
export type ChapterMeta = z.infer<typeof ChapterMetaSchema>;
export declare const ChapterSchema: z.ZodObject<{
    number: z.ZodNumber;
    title: z.ZodString;
    status: z.ZodEnum<["card-generated", "drafting", "drafted", "auditing", "audit-passed", "audit-failed", "state-degraded", "revising", "ready-for-review", "approved", "rejected", "published", "imported"]>;
    wordCount: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    auditIssues: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lengthWarnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    reviewNote: z.ZodOptional<z.ZodString>;
    detectionScore: z.ZodOptional<z.ZodNumber>;
    detectionProvider: z.ZodOptional<z.ZodString>;
    detectedAt: z.ZodOptional<z.ZodString>;
    lengthTelemetry: z.ZodOptional<z.ZodObject<{
        targetWords: z.ZodNumber;
        actualWords: z.ZodNumber;
        charCount: z.ZodNumber;
        cjkChars: z.ZodNumber;
        withinRange: z.ZodDefault<z.ZodBoolean>;
        correctionsApplied: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange: boolean;
        correctionsApplied: number;
    }, {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange?: boolean | undefined;
        correctionsApplied?: number | undefined;
    }>>;
    tokenUsage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodDefault<z.ZodNumber>;
        completionTokens: z.ZodDefault<z.ZodNumber>;
        totalTokens: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }, {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
    }>>;
} & {
    bookId: z.ZodString;
    body: z.ZodDefault<z.ZodString>;
    intent: z.ZodOptional<z.ZodString>;
    contextHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    number: number;
    status: "card-generated" | "drafting" | "drafted" | "auditing" | "audit-passed" | "audit-failed" | "state-degraded" | "revising" | "ready-for-review" | "approved" | "rejected" | "published" | "imported";
    title: string;
    createdAt: string;
    updatedAt: string;
    wordCount: number;
    auditIssues: string[];
    lengthWarnings: string[];
    bookId: string;
    body: string;
    reviewNote?: string | undefined;
    detectionScore?: number | undefined;
    detectionProvider?: string | undefined;
    detectedAt?: string | undefined;
    lengthTelemetry?: {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange: boolean;
        correctionsApplied: number;
    } | undefined;
    tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    } | undefined;
    intent?: string | undefined;
    contextHash?: string | undefined;
}, {
    number: number;
    status: "card-generated" | "drafting" | "drafted" | "auditing" | "audit-passed" | "audit-failed" | "state-degraded" | "revising" | "ready-for-review" | "approved" | "rejected" | "published" | "imported";
    title: string;
    createdAt: string;
    updatedAt: string;
    bookId: string;
    wordCount?: number | undefined;
    auditIssues?: string[] | undefined;
    lengthWarnings?: string[] | undefined;
    reviewNote?: string | undefined;
    detectionScore?: number | undefined;
    detectionProvider?: string | undefined;
    detectedAt?: string | undefined;
    lengthTelemetry?: {
        targetWords: number;
        actualWords: number;
        charCount: number;
        cjkChars: number;
        withinRange?: boolean | undefined;
        correctionsApplied?: number | undefined;
    } | undefined;
    tokenUsage?: {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
    } | undefined;
    body?: string | undefined;
    intent?: string | undefined;
    contextHash?: string | undefined;
}>;
export type Chapter = z.infer<typeof ChapterSchema>;
//# sourceMappingURL=chapter.d.ts.map