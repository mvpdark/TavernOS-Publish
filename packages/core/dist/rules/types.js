// packages/core/src/rules/types.ts
//
// Type definitions for the three-layer genre rules system.
//
// The genre rules system enforces writing quality and genre consistency
// through string-based checks (regex/keyword matching), NOT LLM calls.
// Rules are organized in three layers:
//
//   1. Universal — apply to every book regardless of genre
//   2. Genre-specific — apply based on the book's genre (玄幻/都市/科幻/etc.)
//   3. Book-specific — custom rules from the project's book-rules.md file
//
// Each rule has a check function that takes chapter text + story context
// and returns violations. Checks are conservative: they only flag clear
// violations to avoid false positives that would noise up the audit.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Zod schemas (for runtime validation of externally-supplied data)
// ---------------------------------------------------------------------------
export const GenreLayerSchema = z.enum(["universal", "genre", "book"]);
export const GenreSeveritySchema = z.enum(["error", "warning", "info"]);
export const GenreRuleContextSchema = z.object({
    storyBible: z.string().optional(),
    currentState: z.string().optional(),
    chapterIndex: z.number().int().min(0).optional(),
    genre: z.string().optional(),
});
export const GenreRuleViolationSchema = z.object({
    ruleId: z.string().min(1),
    severity: GenreSeveritySchema,
    message: z.string().min(1),
    location: z.string(),
});
//# sourceMappingURL=types.js.map