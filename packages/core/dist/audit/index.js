// packages/core/src/audit/index.ts
// Pure rule-based audit engine — zero-LLM-cost detection of logical
// contradictions in Chinese creative writing.
export { RuleAuditIssueSchema, RuleAuditInputSchema, RuleAuditResultSchema, } from "./types.js";
// Chinese number parsing utilities
export { parseChineseNumber, extractNumericFacts, extractSubjectBefore, extractAges, extractDistances, extractCounts, extractTimeReferences, hasChineseNumber, } from "./chinese-numbers.js";
// Rule audit engine
export { runRuleAudit, createRuleAuditor, } from "./rule-auditor.js";
// Hook & cool-point density analyzer (zero-LLM, pure regex)
export { analyzeHookDensity, } from "./hook-density.js";
//# sourceMappingURL=index.js.map