// packages/core/src/rules/index.ts
// Three-layer genre rules system exports.
export { GenreLayerSchema, GenreSeveritySchema, GenreRuleContextSchema, GenreRuleViolationSchema, } from "./types.js";
// Genre rules registry and utilities
export { normalizeGenre, UNIVERSAL_RULES, GENRE_RULES, parseBookRules, assembleGenreRulesPrompt, runGenreRuleChecks, getApplicableRules, } from "./genre-rules.js";
//# sourceMappingURL=index.js.map