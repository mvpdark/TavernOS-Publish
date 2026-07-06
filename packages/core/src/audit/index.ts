// packages/core/src/audit/index.ts
// Pure rule-based audit engine — zero-LLM-cost detection of logical
// contradictions in Chinese creative writing.

// Types and Zod schemas
export type {
  RuleAuditIssue,
  RuleAuditInput,
  RuleAuditResult,
  ExtractedNumericFact,
  ExtractedPowerLevel,
  ExtractedTimeRef,
} from "./types.js";

export {
  RuleAuditIssueSchema,
  RuleAuditInputSchema,
  RuleAuditResultSchema,
} from "./types.js";

// Chinese number parsing utilities
export {
  parseChineseNumber,
  extractNumericFacts,
  extractSubjectBefore,
  extractAges,
  extractDistances,
  extractCounts,
  extractTimeReferences,
  hasChineseNumber,
} from "./chinese-numbers.js";

// Rule audit engine
export {
  runRuleAudit,
  createRuleAuditor,
  type RuleAuditorConfig,
} from "./rule-auditor.js";

// Hook & cool-point density analyzer (zero-LLM, pure regex)
export {
  analyzeHookDensity,
  type HookSignal,
  type CoolPointSignal,
  type HookDensityResult,
} from "./hook-density.js";
