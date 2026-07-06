import { z } from "zod";
/** The three layers of the genre rules system. */
export type GenreLayer = "universal" | "genre" | "book";
/** Severity of a rule violation, matching the AuditIssue severity scale. */
export type GenreSeverity = "error" | "warning" | "info";
/**
 * Story context passed to rule check functions.
 * Provides the surrounding story information a check may need to determine
 * whether a pattern is a genuine violation or an intentional choice.
 */
export interface GenreRuleContext {
    /** The story bible markdown (world-building, characters, plot). */
    readonly storyBible?: string;
    /** Current story state projection (location, goal, active hooks). */
    readonly currentState?: string;
    /** The chapter index being checked (1-based). */
    readonly chapterIndex?: number;
    /** The normalized genre id (e.g. "xuanhuan", "urban"). */
    readonly genre?: string;
}
/**
 * A violation returned by a rule's check function.
 * Each violation corresponds to a single instance of a rule being broken
 * in the chapter text.
 */
export interface GenreRuleViolation {
    /** The id of the rule that produced this violation. */
    readonly ruleId: string;
    /** Severity of this violation. */
    readonly severity: GenreSeverity;
    /** Human-readable description of the violation (Chinese). */
    readonly message: string;
    /** The matched text snippet that triggered the violation. */
    readonly location: string;
}
/**
 * A genre rule definition.
 *
 * Each rule combines a descriptive prompt (injected into the writer's
 * storyBible so the LLM is aware of the constraint) with a conservative
 * string-based check function (run by the auditor after the LLM audit).
 */
export interface GenreRule {
    /** Unique identifier for this rule (e.g. "universal-no-list-structure"). */
    readonly id: string;
    /** Human-readable description of what this rule enforces (Chinese).
     *  Used as a bullet point in the writer's 【创作规则】 section. */
    readonly description: string;
    /** Severity when this rule is violated. */
    readonly severity: GenreSeverity;
    /** Which layer this rule belongs to. */
    readonly layer: GenreLayer;
    /** For genre-specific rules, the canonical genre id (e.g. "xuanhuan"). */
    readonly genre?: string;
    /**
     * Check function: takes chapter text + story context and returns violations.
     * String-based (regex/keyword matching), NOT LLM calls.
     * Should be conservative — only flag clear violations.
     * Must never throw; wrap internal logic in try/catch and return [].
     */
    readonly check: (text: string, context?: GenreRuleContext) => GenreRuleViolation[];
}
export declare const GenreLayerSchema: z.ZodEnum<["universal", "genre", "book"]>;
export declare const GenreSeveritySchema: z.ZodEnum<["error", "warning", "info"]>;
export declare const GenreRuleContextSchema: z.ZodObject<{
    storyBible: z.ZodOptional<z.ZodString>;
    currentState: z.ZodOptional<z.ZodString>;
    chapterIndex: z.ZodOptional<z.ZodNumber>;
    genre: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    genre?: string | undefined;
    currentState?: string | undefined;
    storyBible?: string | undefined;
    chapterIndex?: number | undefined;
}, {
    genre?: string | undefined;
    currentState?: string | undefined;
    storyBible?: string | undefined;
    chapterIndex?: number | undefined;
}>;
export declare const GenreRuleViolationSchema: z.ZodObject<{
    ruleId: z.ZodString;
    severity: z.ZodEnum<["error", "warning", "info"]>;
    message: z.ZodString;
    location: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    location: string;
    severity: "error" | "warning" | "info";
    ruleId: string;
}, {
    message: string;
    location: string;
    severity: "error" | "warning" | "info";
    ruleId: string;
}>;
//# sourceMappingURL=types.d.ts.map