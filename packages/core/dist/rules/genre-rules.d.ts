import type { GenreRule, GenreRuleViolation, GenreRuleContext } from "./types.js";
/** Canonical genre identifiers used by the rules system. */
export type CanonicalGenre = "xuanhuan" | "urban" | "scifi" | "mystery" | "romance";
/**
 * Normalize a free-form genre string to a canonical genre id.
 * Returns undefined when the genre doesn't match any known category.
 *
 * @example
 * normalizeGenre("玄幻") // "xuanhuan"
 * normalizeGenre("都市异能") // "urban"
 * normalizeGenre("未知类型") // undefined
 */
export declare function normalizeGenre(genre: string): CanonicalGenre | undefined;
/** All universal rules, applied to every book. */
export declare const UNIVERSAL_RULES: readonly GenreRule[];
/**
 * All genre-specific rules, keyed by canonical genre id.
 * Access via GENRE_RULES[canonicalGenre] to get the rules for a genre.
 */
export declare const GENRE_RULES: Readonly<Record<CanonicalGenre, readonly GenreRule[]>>;
/**
 * Parse book-rules.md content into rule descriptions (bullet points).
 * Extracts lines starting with "-" from the markdown and returns them as
 * description strings. These are injected into the writer prompt but do
 * not have check functions (book-rules.md is free-form; regex matching
 * is impractical for author-authored rules).
 *
 * @returns array of rule description strings extracted from book-rules.md
 */
export declare function parseBookRules(bookRulesText: string): string[];
/**
 * Assemble the genre rules prompt string for injection into the writer's
 * storyBible. Combines all three layers into a single bullet-point list:
 *
 *   - Universal rule 1
 *   - Universal rule 2
 *   - Genre-specific rule 1
 *   - ...
 *   - Book-specific rule 1 (from book-rules.md)
 *   - ...
 *
 * @param genre    free-form genre string (e.g. "玄幻", "都市异能")
 * @param bookRules  book-rules.md file content (optional)
 * @returns bullet-point string, empty when no rules apply
 */
export declare function assembleGenreRulesPrompt(params: {
    genre?: string;
    bookRules?: string;
}): string;
/**
 * Run all applicable genre rule checks against chapter text.
 * Collects violations from universal + genre-specific rules.
 * Book-specific rules are prompt-only (no check functions) and thus
 * produce no violations.
 *
 * Each rule's check function is wrapped in try/catch so a single rule
 * failure never blocks the others.
 *
 * @param text     chapter content to check
 * @param genre    free-form genre string
 * @param context  story context (story bible, current state, etc.)
 * @returns array of violations from all applicable rules
 */
export declare function runGenreRuleChecks(params: {
    text: string;
    genre?: string;
    context?: GenreRuleContext;
}): GenreRuleViolation[];
/**
 * Get all applicable rules for a given genre (universal + genre-specific).
 * Useful for introspection and UI display.
 *
 * @param genre free-form genre string
 * @returns array of all applicable GenreRule objects
 */
export declare function getApplicableRules(genre?: string): readonly GenreRule[];
//# sourceMappingURL=genre-rules.d.ts.map