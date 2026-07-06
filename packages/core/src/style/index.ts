// packages/core/src/style/index.ts
// Style cloning module — analyze, store, and inject writing styles.

export { StyleProfileSchema, StyleEntrySchema, StyleAnalysisResultSchema, CreateStyleEntrySchema } from "./types.js";
export type { StyleProfile, StyleEntry, StyleAnalysisResult, CreateStyleEntry } from "./types.js";
export { analyzeStyle, formatProfileSummary, detectLanguage } from "./style-analyzer.js";
export { generateStyleGuide, buildStyleInjection } from "./style-guide.js";
export { generateFingerprint, fingerprintSimilarity, generateStyleGuide as generateFingerprintGuide } from "./style-fingerprint.js";
export type { StyleFingerprint } from "./style-fingerprint.js";
