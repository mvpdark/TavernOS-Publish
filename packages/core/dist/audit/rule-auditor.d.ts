import type { RuleAuditInput, RuleAuditResult } from "./types.js";
/**
 * Run all rule-based detectors on the chapter content.
 *
 * This is the main entry point for the rule-based audit engine. It runs
 * each detector that has sufficient input data and merges the results.
 *
 * All detection is pure string/regex/number analysis — no LLM calls.
 *
 * @param input The audit input with chapter content and optional context.
 * @returns A RuleAuditResult with all detected issues.
 */
export declare function runRuleAudit(input: RuleAuditInput): RuleAuditResult;
/**
 * Configuration for the rule auditor.
 */
export interface RuleAuditorConfig {
    /** Enable/disable individual detectors. All default to true. */
    readonly enableNumericContradiction?: boolean;
    readonly enablePowerScaling?: boolean;
    readonly enableTimeline?: boolean;
    readonly enableCharacterPresence?: boolean;
}
/**
 * Create a configured rule auditor function.
 *
 * Returns a function that accepts RuleAuditInput and returns RuleAuditResult,
 * with the specified detectors enabled or disabled.
 */
export declare function createRuleAuditor(config?: RuleAuditorConfig): (input: RuleAuditInput) => RuleAuditResult;
//# sourceMappingURL=rule-auditor.d.ts.map