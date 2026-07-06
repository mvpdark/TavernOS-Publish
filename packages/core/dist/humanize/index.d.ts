export type { IssueCategory, IssueSeverity, FatigueTerm, ClichePattern, SynonymGroup, BurstinessResult, StyleIssue, StyleReport, RewriteResult, } from "./types.js";
export { FatigueTermSchema, ClichePatternSchema, SynonymGroupSchema, StyleIssueSchema, StyleReportSchema, BurstinessResultSchema, } from "./types.js";
export { FATIGUE_TERMS, CLICHE_PATTERNS, SYNONYM_GROUPS } from "./lexicon.js";
export { createStyleDetector, detectStyle, computeBurstiness } from "./detector.js";
export type { DetectorConfig, StyleDetector } from "./detector.js";
export { rewriteStyle, humanizeText } from "./rewriter.js";
//# sourceMappingURL=index.d.ts.map