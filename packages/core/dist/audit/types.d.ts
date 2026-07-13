import { z } from "zod";
import type { AssetCatalog } from "../assets/types.js";
/**
 * Shape of an audit issue, compatible with SentinelIssue from agents/sentinel.ts.
 *
 * The `label` field is optional and used to distinguish rule-based issues
 * (label: "rule") from LLM-generated issues (no label).
 */
export interface RuleSentinelIssue {
    severity: "error" | "warning" | "info";
    scope: "global" | "chapter" | "paragraph";
    dimension: string;
    message: string;
    repairScope: "local" | "structural";
    location: string;
    /** Distinguishes rule-based issues ("rule") from LLM issues. */
    label?: string;
    /** Optional suggestion for fixing the issue. */
    suggestion?: string;
}
export declare const RuleSentinelIssueSchema: z.ZodObject<{
    severity: z.ZodEnum<["error", "warning", "info"]>;
    scope: z.ZodEnum<["global", "chapter", "paragraph"]>;
    dimension: z.ZodString;
    message: z.ZodString;
    repairScope: z.ZodEnum<["local", "structural"]>;
    location: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    suggestion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    scope: "chapter" | "global" | "paragraph";
    location: string;
    severity: "error" | "warning" | "info";
    dimension: string;
    repairScope: "local" | "structural";
    label?: string | undefined;
    suggestion?: string | undefined;
}, {
    message: string;
    scope: "chapter" | "global" | "paragraph";
    location: string;
    severity: "error" | "warning" | "info";
    dimension: string;
    repairScope: "local" | "structural";
    label?: string | undefined;
    suggestion?: string | undefined;
}>;
/**
 * Input for the rule-based audit engine.
 *
 * All fields except `chapterContent` are optional — the sentinel runs
 * whichever detectors have sufficient data. This makes it easy to call
 * the rule auditor with varying levels of context availability.
 */
export interface RuleSentinelInput {
    /** The chapter text to audit. */
    readonly chapterContent: string;
    /** 1-based chapter index for timeline sequencing checks. */
    readonly chapterIndex?: number;
    /** Current story state projection (markdown string from TruthFiles). */
    readonly currentState?: string;
    /** Chapter summaries projection (markdown string). */
    readonly chapterSummaries?: string;
    /** Story bible text (for character/world context). */
    readonly storyBible?: string;
    /** Asset catalog from prior chapters (for character presence checks). */
    readonly assetCatalog?: AssetCatalog;
}
export declare const RuleSentinelInputSchema: z.ZodObject<{
    chapterContent: z.ZodString;
    chapterIndex: z.ZodOptional<z.ZodNumber>;
    currentState: z.ZodOptional<z.ZodString>;
    chapterSummaries: z.ZodOptional<z.ZodString>;
    storyBible: z.ZodOptional<z.ZodString>;
    assetCatalog: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    chapterContent: string;
    currentState?: string | undefined;
    chapterSummaries?: string | undefined;
    storyBible?: string | undefined;
    chapterIndex?: number | undefined;
    assetCatalog?: any;
}, {
    chapterContent: string;
    currentState?: string | undefined;
    chapterSummaries?: string | undefined;
    storyBible?: string | undefined;
    chapterIndex?: number | undefined;
    assetCatalog?: any;
}>;
/**
 * Result of the rule-based audit.
 */
export interface RuleAuditResult {
    /** All detected issues (compatible with SentinelIssue[]). */
    readonly issues: readonly RuleSentinelIssue[];
    /** Number of detectors that actually ran. */
    readonly detectorCount: number;
    /** One-line summary suitable for logging or CLI display. */
    readonly summary: string;
}
export declare const RuleAuditResultSchema: z.ZodObject<{
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["error", "warning", "info"]>;
        scope: z.ZodEnum<["global", "chapter", "paragraph"]>;
        dimension: z.ZodString;
        message: z.ZodString;
        repairScope: z.ZodEnum<["local", "structural"]>;
        location: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        suggestion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        scope: "chapter" | "global" | "paragraph";
        location: string;
        severity: "error" | "warning" | "info";
        dimension: string;
        repairScope: "local" | "structural";
        label?: string | undefined;
        suggestion?: string | undefined;
    }, {
        message: string;
        scope: "chapter" | "global" | "paragraph";
        location: string;
        severity: "error" | "warning" | "info";
        dimension: string;
        repairScope: "local" | "structural";
        label?: string | undefined;
        suggestion?: string | undefined;
    }>, "many">;
    detectorCount: z.ZodNumber;
    summary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    issues: {
        message: string;
        scope: "chapter" | "global" | "paragraph";
        location: string;
        severity: "error" | "warning" | "info";
        dimension: string;
        repairScope: "local" | "structural";
        label?: string | undefined;
        suggestion?: string | undefined;
    }[];
    summary: string;
    detectorCount: number;
}, {
    issues: {
        message: string;
        scope: "chapter" | "global" | "paragraph";
        location: string;
        severity: "error" | "warning" | "info";
        dimension: string;
        repairScope: "local" | "structural";
        label?: string | undefined;
        suggestion?: string | undefined;
    }[];
    summary: string;
    detectorCount: number;
}>;
/**
 * A numeric fact extracted from text, such as an age, distance, or count.
 * Used by the numeric contradiction and timeline detectors.
 */
export interface ExtractedNumericFact {
    /** The kind of numeric fact (age, distance, time, power, count, etc.). */
    readonly kind: string;
    /** The raw text match that was found. */
    readonly raw: string;
    /** The parsed numeric value, or null if unparseable. */
    readonly value: number | null;
    /** The unit (e.g. "岁", "米", "年", "级"). */
    readonly unit: string;
    /** Character offset in the source text. */
    readonly offset: number;
    /** Optional subject associated with the number (e.g. character name). */
    readonly subject?: string;
}
/**
 * A power level mention extracted from text.
 */
export interface ExtractedPowerLevel {
    /** The raw text match. */
    readonly raw: string;
    /** The realm/level name (e.g. "金丹期", "五级", "S级"). */
    readonly level: string;
    /** The progression system this level belongs to (e.g. "仙侠", "generic"). */
    readonly system: string;
    /** Ordinal index within the progression (0-based), or -1 if unknown. */
    readonly ordinal: number;
    /** Character offset in the source text. */
    readonly offset: number;
    /** Optional subject (character name). */
    readonly subject?: string;
}
/**
 * A time reference extracted from text.
 */
export interface ExtractedTimeRef {
    /** The raw text match. */
    readonly raw: string;
    /** The numeric value, or null (for relative terms like "昨天"). */
    readonly value: number | null;
    /** The time unit (年, 月, 天, 日, 周, 小时, etc.). */
    readonly unit: string;
    /** Direction: "past" (X前/以前), "future" (X后/以后), or "relative" (昨天, etc.). */
    readonly direction: "past" | "future" | "relative";
    /** Character offset in the source text. */
    readonly offset: number;
}
//# sourceMappingURL=types.d.ts.map