// packages/core/src/humanize/index.ts
// AI-style removal system (humanizer) — detects and rewrites AI-flavored
// patterns in Chinese creative writing.
export { FatigueTermSchema, ClichePatternSchema, SynonymGroupSchema, StyleIssueSchema, StyleReportSchema, BurstinessResultSchema, } from "./types.js";
// Built-in lexicon
export { FATIGUE_TERMS, CLICHE_PATTERNS, SYNONYM_GROUPS } from "./lexicon.js";
// Detection engine
export { createStyleDetector, detectStyle, computeBurstiness } from "./detector.js";
// Rule-based rewriter
export { rewriteStyle, humanizeText } from "./rewriter.js";
//# sourceMappingURL=index.js.map