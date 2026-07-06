import type { StyleIssue, StyleReport, RewriteResult } from "./types.js";
/**
 * Apply mechanical rewrites to a text based on detected issues.
 *
 * Processing order:
 *  1. Apply simple replacements (English words, modern terms)
 *  2. Sort deletable issues by offset descending (right-to-left) so that
 *     earlier deletions don't shift offsets of later ones.
 *  3. Delete each deletable fatigue term from the text.
 *  4. Run punctuation cleanup on the result.
 *  5. Collect non-deletable, non-replaced issues as `remaining`.
 *
 * @param text   The original text to rewrite.
 * @param report Optional pre-computed style report.  If omitted, the
 *               function runs the default detector internally.
 */
export declare function rewriteStyle(text: string, report?: StyleReport): RewriteResult;
/**
 * High-level convenience: analyze text, auto-fix what can be mechanically
 * rewritten, and return both the rewritten text and the remaining issues
 * that require manual or LLM-assisted review.
 *
 * @param text   The original text.
 * @param report Optional pre-computed style report.
 * @returns An object containing the rewritten text, the count of auto-fixed
 *          issues, and the remaining issues for manual review.
 */
export declare function humanizeText(text: string, report?: StyleReport): {
    text: string;
    fixedCount: number;
    remaining: readonly StyleIssue[];
    report: StyleReport;
};
//# sourceMappingURL=rewriter.d.ts.map