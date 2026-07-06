import { type AgentContext, type AgentChatOptions } from "./base.js";
import type { StyleIssue } from "../humanize/types.js";
import type { AssetCatalog } from "../assets/types.js";
export interface AuditInput {
    storyBible: string;
    currentState: string;
    activeHooks: string;
    chapterSummaries: string;
    chapterContent: string;
    /**
     * Genre string for genre-rule checking. When provided and genre rules
     * are enabled, the auditor runs string-based genre rule checks after
     * the LLM audit. The genre is free-form (e.g. "玄幻", "都市异能").
     */
    genre?: string;
    /** 1-based chapter index for rule-based timeline checks. */
    chapter?: number;
    /** Asset catalog from prior chapters for rule-based character presence checks. */
    assetCatalog?: AssetCatalog;
}
export interface AuditIssue {
    severity: "error" | "warning" | "info";
    scope: "global" | "chapter" | "paragraph";
    dimension: string;
    message: string;
    repairScope: "local" | "structural";
    location: string;
    /** Distinguishes the source of the issue. Rule-based issues use "rule";
     *  LLM-generated issues leave this undefined. */
    label?: string;
    /** Optional suggestion for fixing the issue (used by rule-based audit). */
    suggestion?: string;
}
/** Options for the ConsistencyChecker factory. */
export interface ConsistencyCheckerOptions {
    /** Enable AI-style (humanize) detection after LLM audit. Default: true. */
    enableHumanize?: boolean;
    /** Enable three-layer genre rule checks after LLM audit. Default: true.
     *  When enabled, the auditor runs string-based genre rule checks
     *  (universal + genre-specific) on the chapter content. The genre is
     *  taken from AuditInput.genre; when no genre is provided, only
     *  universal rules are checked. */
    enableGenreRules?: boolean;
    /** Enable pure rule-based audit (numeric contradictions, power scaling,
     *  timeline, character presence) after LLM audit. Default: true.
     *  This is a zero-LLM-cost detection layer that runs locally. */
    enableRuleAudit?: boolean;
}
/** Consistency checker agent produced by the factory (compose pattern). */
export interface ConsistencyChecker {
    readonly name: string;
    audit(input: AuditInput, options?: AgentChatOptions): Promise<AuditIssue[]>;
}
/**
 * Convert a StyleIssue (from the humanize detector) into an AuditIssue
 * so it can be merged into the auditor's output and handled by the EditorAgent.
 *
 * Mapping rules:
 * - Severity: high → error, medium → warning, low → info
 * - Scope: fatigue terms → "paragraph" (specific word, locatable);
 *          cliche/pattern → "chapter" (structural, full-text revision)
 * - Dimension: always "AI语癖"
 * - repairScope: fatigue → "local" (replace/remove word);
 *                cliche → "structural" (restructure sentence)
 * - Location: fatigue → match text (for paragraph lookup);
 *             cliche → pattern label or match text
 */
export declare function styleIssueToAuditIssue(issue: StyleIssue): AuditIssue;
/**
 * Factory: build a ConsistencyChecker agent by composing a shared runtime.
 * Replaces the former `class ConsistencyChecker extends BaseAgent`.
 */
export declare function createConsistencyChecker(ctx: AgentContext, options?: ConsistencyCheckerOptions): ConsistencyChecker;
//# sourceMappingURL=auditor.d.ts.map