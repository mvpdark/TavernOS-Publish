import { z } from "zod";
/** High-level category of a detected style issue. */
export type IssueCategory = "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
/** Severity of a detected issue. */
export type IssueSeverity = "high" | "medium" | "low";
export interface FatigueTerm {
    /** The phrase to match in text. */
    readonly term: string;
    /** Human-readable suggestion for replacement or removal. */
    readonly suggestion: string;
    readonly severity: IssueSeverity;
    /** Grouping label, e.g. "过渡词", "成语堆砌", "评价套话". */
    readonly category: string;
}
export interface ClichePattern {
    /** Unique identifier for the pattern. */
    readonly id: string;
    /** Human-readable description of what the pattern detects. */
    readonly description: string;
    /** Regex source string (flags supplied separately). */
    readonly regex: RegExp;
    readonly severity: IssueSeverity;
    /** Suggestion shown when this pattern fires. */
    readonly suggestion: string;
    /**
     * Maximum allowed occurrences per 1000 characters before the pattern
     * is considered a problem.  0 means any occurrence is flagged.
     */
    readonly thresholdPer1k: number;
}
export interface StyleIssue {
    readonly category: IssueCategory;
    readonly severity: IssueSeverity;
    /** The matched text snippet. */
    readonly match: string;
    /** Character offset in the original text. */
    readonly offset: number;
    /** Length of the match. */
    readonly length: number;
    /** Suggested replacement or action. */
    readonly suggestion: string;
    /** Up to 20 characters of surrounding context. */
    readonly context: string;
    /** Optional grouping label from the source term/pattern. */
    readonly label?: string;
}
export interface StyleReport {
    /** All detected issues sorted by offset. */
    readonly issues: readonly StyleIssue[];
    /** 0–100 score; 100 = very human-like, 0 = heavily AI-flavored. */
    readonly score: number;
    readonly fatigueCount: number;
    readonly clicheCount: number;
    readonly patternCount: number;
    /** One-line summary suitable for CLI / UI display. */
    readonly summary: string;
}
export interface RewriteResult {
    /** The rewritten text. */
    readonly text: string;
    /** Number of issues that were addressed. */
    readonly fixedCount: number;
    /** Issues that could not be auto-fixed (need manual or LLM review). */
    readonly remaining: readonly StyleIssue[];
}
/**
 * A group of terms that refer to the same entity/concept.
 * Used by the burstiness engine to detect "同义词轮换" — AI's habit of
 * cycling through different words (主角→主人公→中心人物→英雄) within one
 * paragraph to avoid repetition.
 */
export interface SynonymGroup {
    /** Unique identifier for the group. */
    readonly id: string;
    /** Human-readable description of what the group represents. */
    readonly description: string;
    /** Synonymous terms. Terms should not be substrings of each other. */
    readonly terms: readonly string[];
}
/**
 * Result of burstiness (突发性) analysis.
 * Burstiness measures variety in sentence length and structure:
 * AI text tends to be uniform (low burstiness), human text varies a lot.
 */
export interface BurstinessResult {
    /** 0–100 burstiness score; higher = more human-like variety. */
    readonly score: number;
    /** Human-readable label, e.g. "低突发性（AI 味重）". */
    readonly label: string;
    /** Issues detected: uniform runs, three-piece parallelism, synonym rotation. */
    readonly issues: readonly StyleIssue[];
}
export declare const FatigueTermSchema: z.ZodObject<{
    term: z.ZodString;
    suggestion: z.ZodString;
    severity: z.ZodEnum<["high", "medium", "low"]>;
    category: z.ZodString;
}, "strip", z.ZodTypeAny, {
    term: string;
    suggestion: string;
    severity: "high" | "medium" | "low";
    category: string;
}, {
    term: string;
    suggestion: string;
    severity: "high" | "medium" | "low";
    category: string;
}>;
export declare const ClichePatternSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    severity: z.ZodEnum<["high", "medium", "low"]>;
    suggestion: z.ZodString;
    thresholdPer1k: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    suggestion: string;
    severity: "high" | "medium" | "low";
    thresholdPer1k: number;
}, {
    id: string;
    description: string;
    suggestion: string;
    severity: "high" | "medium" | "low";
    thresholdPer1k: number;
}>;
export declare const SynonymGroupSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    terms: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    terms: string[];
}, {
    id: string;
    description: string;
    terms: string[];
}>;
export declare const StyleIssueSchema: z.ZodObject<{
    category: z.ZodEnum<["fatigue", "cliche", "pattern", "burstiness", "parallelism", "synonym"]>;
    severity: z.ZodEnum<["high", "medium", "low"]>;
    match: z.ZodString;
    offset: z.ZodNumber;
    length: z.ZodNumber;
    suggestion: z.ZodString;
    context: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    length: number;
    match: string;
    suggestion: string;
    severity: "high" | "medium" | "low";
    category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
    offset: number;
    context: string;
    label?: string | undefined;
}, {
    length: number;
    match: string;
    suggestion: string;
    severity: "high" | "medium" | "low";
    category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
    offset: number;
    context: string;
    label?: string | undefined;
}>;
export declare const StyleReportSchema: z.ZodObject<{
    issues: z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["fatigue", "cliche", "pattern", "burstiness", "parallelism", "synonym"]>;
        severity: z.ZodEnum<["high", "medium", "low"]>;
        match: z.ZodString;
        offset: z.ZodNumber;
        length: z.ZodNumber;
        suggestion: z.ZodString;
        context: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }, {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }>, "many">;
    score: z.ZodNumber;
    fatigueCount: z.ZodNumber;
    clicheCount: z.ZodNumber;
    patternCount: z.ZodNumber;
    summary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    issues: {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }[];
    score: number;
    fatigueCount: number;
    clicheCount: number;
    patternCount: number;
    summary: string;
}, {
    issues: {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }[];
    score: number;
    fatigueCount: number;
    clicheCount: number;
    patternCount: number;
    summary: string;
}>;
export declare const BurstinessResultSchema: z.ZodObject<{
    score: z.ZodNumber;
    label: z.ZodString;
    issues: z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["fatigue", "cliche", "pattern", "burstiness", "parallelism", "synonym"]>;
        severity: z.ZodEnum<["high", "medium", "low"]>;
        match: z.ZodString;
        offset: z.ZodNumber;
        length: z.ZodNumber;
        suggestion: z.ZodString;
        context: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }, {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    issues: {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }[];
    label: string;
    score: number;
}, {
    issues: {
        length: number;
        match: string;
        suggestion: string;
        severity: "high" | "medium" | "low";
        category: "fatigue" | "cliche" | "pattern" | "burstiness" | "parallelism" | "synonym";
        offset: number;
        context: string;
        label?: string | undefined;
    }[];
    label: string;
    score: number;
}>;
//# sourceMappingURL=types.d.ts.map