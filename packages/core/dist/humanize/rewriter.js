// packages/core/src/humanize/rewriter.ts
// Rule-based rewriter — performs mechanical anti-detection rewrites
// on detected style issues.  Handles fatigue-term deletion, simple
// term replacement, and punctuation cleanup; structural cliches are
// left for manual or LLM review.
import { detectStyle } from "./detector.js";
const SIMPLE_REPLACEMENTS = [
    // English words mixed into Chinese text
    { from: "faint", to: "微弱的", contextHint: "英文混入" },
    { from: "sizzling", to: "滋滋", contextHint: "英文拟声词" },
    { from: "OK", to: "好", contextHint: "现代词" },
    { from: "cool", to: "妙", contextHint: "现代词" },
    // Modern terms in xuanhuan/ancient settings
    { from: "马拉松", to: "脱力", contextHint: "现代体育术语" },
];
// ---------------------------------------------------------------------------
// Rewrite strategy
// ---------------------------------------------------------------------------
/**
 * Determine whether a fatigue-term issue can be auto-fixed by deletion.
 * Terms whose suggestion starts with "删除" are eligible for removal.
 */
function isDeletable(issue) {
    return issue.category === "fatigue" && issue.suggestion.startsWith("删除");
}
/**
 * Determine whether a fatigue-term issue can be auto-fixed by simple replacement.
 * Uses the SIMPLE_REPLACEMENTS map.
 */
function findReplacement(term) {
    const rep = SIMPLE_REPLACEMENTS.find((r) => r.from === term);
    return rep ? rep.to : null;
}
/**
 * After deleting a fatigue term, clean up resulting punctuation artifacts:
 *   "，综上所述，" → "，"
 *   "。总而言之，" → "。"
 *   "，值得注意的是" → ""
 * Removes duplicate commas, leading commas after periods, etc.
 */
function cleanupPunctuation(text) {
    return text
        // Double commas → single
        .replace(/，{2,}/g, "，")
        // Comma right after period/exclamation/question → drop the comma
        .replace(/([。！？])，/g, "$1")
        // Leading comma at paragraph start → remove
        .replace(/(^|\n)，/g, "$1")
        // Trailing comma before period/exclamation/question → remove comma
        .replace(/，([。！？])/g, "$1")
        // Comma-space-comma → single comma
        .replace(/，\s*，/g, "，")
        // Empty parenthetical remnants
        .replace(/（\s*）/g, "")
        .replace(/\(\s*\)/g, "")
        // "本章完" or "（本章完，待续）" or similar chapter-end markers
        .replace(/[（(]?\s*本章完[^）)]*\s*[）)]?/g, "")
        .replace(/[（(]?\s*待续\s*[）)]?/g, "")
        // Clean up multiple newlines
        .replace(/\n{3,}/g, "\n\n");
}
// ---------------------------------------------------------------------------
// Core rewrite logic
// ---------------------------------------------------------------------------
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
export function rewriteStyle(text, report) {
    const rp = report ?? detectStyle(text);
    // Phase 0: Apply simple replacements (English→Chinese, modern→ancient)
    let result = text;
    let replacedCount = 0;
    for (const rep of SIMPLE_REPLACEMENTS) {
        // Case-sensitive for English, but try case-insensitive too
        const regex = new RegExp(rep.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        const before = result;
        result = result.replace(regex, rep.to);
        if (result !== before)
            replacedCount++;
    }
    // Partition issues: deletable vs. remaining.
    const deletable = [];
    const remaining = [];
    for (const issue of rp.issues) {
        if (isDeletable(issue)) {
            deletable.push(issue);
        }
        else if (!findReplacement(issue.match)) {
            remaining.push(issue);
        }
    }
    // Sort deletable issues by offset descending (process right-to-left).
    deletable.sort((a, b) => b.offset - a.offset);
    let fixedCount = replacedCount;
    for (const issue of deletable) {
        // Verify the match still exists at the expected offset.
        // (It should, since we process right-to-left, but guard anyway.)
        const segment = result.slice(issue.offset, issue.offset + issue.length);
        if (segment === issue.match) {
            result =
                result.slice(0, issue.offset) + result.slice(issue.offset + issue.length);
            fixedCount++;
        }
        else {
            // Offset mismatch after prior edits — try a fallback search.
            const fallbackIdx = result.indexOf(issue.match);
            if (fallbackIdx !== -1) {
                result =
                    result.slice(0, fallbackIdx) +
                        result.slice(fallbackIdx + issue.length);
                fixedCount++;
            }
        }
    }
    // Also do a sweep for meta-commentary terms that might have been missed
    // (these are critical to remove regardless of detection)
    const metaSweepPatterns = [
        /悬念钩子悄然埋下/g,
        /章节钩子埋下[^。！？\n]*/g,
        /动作场景中短句加速[^。！？\n]*/g,
        /比喻减速时[^。！？\n]*/g,
        /计划分三步[——][^。！？\n]*/g,
        /下一步计划[^。！？\n]*/g,
        /战斗在[^。！？]{0,15}(?:展开|升级|拉锯|高潮|继续)/g,
    ];
    for (const pat of metaSweepPatterns) {
        result = result.replace(pat, "");
    }
    // Clean up punctuation artifacts left by deletions.
    if (fixedCount > 0) {
        result = cleanupPunctuation(result);
    }
    return {
        text: result,
        fixedCount,
        remaining,
    };
}
// ---------------------------------------------------------------------------
// Humanizer facade — combines detection + rewrite in one call
// ---------------------------------------------------------------------------
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
export function humanizeText(text, report) {
    const rp = report ?? detectStyle(text);
    const result = rewriteStyle(text, rp);
    return {
        text: result.text,
        fixedCount: result.fixedCount,
        remaining: result.remaining,
        report: rp,
    };
}
//# sourceMappingURL=rewriter.js.map