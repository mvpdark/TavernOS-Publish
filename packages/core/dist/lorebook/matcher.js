/**
 * Parse a regex from a string like "/pattern/flags".
 * Returns a RegExp or null if the input is not a regex pattern.
 */
function parseRegexFromString(str) {
    const match = str.match(/^\/(.+)\/([gimsuy]*)$/s);
    if (!match)
        return null;
    try {
        return new RegExp(match[1], match[2]);
    }
    catch {
        return null;
    }
}
/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Match a single key against the haystack.
 * - If the key is a regex pattern (/pattern/flags), uses regex matching.
 * - Otherwise uses string includes, with optional case sensitivity and whole word matching.
 */
export function matchKeys(haystack, needle, options) {
    // Regex matching takes precedence
    const keyRegex = parseRegexFromString(needle);
    if (keyRegex) {
        return keyRegex.test(haystack);
    }
    // Transform for case sensitivity
    const hay = options.caseSensitive ? haystack : haystack.toLowerCase();
    const needleStr = options.caseSensitive ? needle : needle.toLowerCase();
    if (options.matchWholeWords) {
        const keyWords = needleStr.split(/\s+/);
        if (keyWords.length > 1) {
            // Multi-word: just use includes
            return hay.includes(needleStr);
        }
        // Single word: use \W boundary regex
        const regex = new RegExp(`(?:^|\\W)(${escapeRegex(needleStr)})(?:$|\\W)`);
        return regex.test(hay);
    }
    return hay.includes(needleStr);
}
/**
 * Check if any primary key matches.
 */
export function checkPrimaryKeys(haystack, entry, globalOptions) {
    const options = {
        caseSensitive: entry.caseSensitive ?? globalOptions.caseSensitive,
        matchWholeWords: entry.matchWholeWords ?? globalOptions.matchWholeWords,
    };
    return entry.key.some((k) => k.trim() !== "" && matchKeys(haystack, k, options));
}
/**
 * Check secondary key logic for selective entries.
 * Returns true if the entry should be activated based on secondary key logic.
 *
 * - AND_ANY: at least one secondary key matches
 * - AND_ALL: all secondary keys match
 * - NOT_ALL: not all secondary keys match (at least one doesn't match)
 * - NOT_ANY: no secondary key matches
 */
export function checkSecondaryLogic(haystack, entry, globalOptions) {
    const secondaryKeys = entry.keysecondary;
    if (secondaryKeys.length === 0) {
        return true; // No secondary keys = pass
    }
    const options = {
        caseSensitive: entry.caseSensitive ?? globalOptions.caseSensitive,
        matchWholeWords: entry.matchWholeWords ?? globalOptions.matchWholeWords,
    };
    const results = secondaryKeys.map((k) => matchKeys(haystack, k, options));
    const anyMatched = results.some((r) => r);
    const allMatched = results.every((r) => r);
    switch (entry.selectiveLogic) {
        case "AND_ANY":
            return anyMatched;
        case "AND_ALL":
            return allMatched;
        case "NOT_ALL":
            return !allMatched;
        case "NOT_ANY":
            return !anyMatched;
        default:
            return anyMatched;
    }
}
/**
 * Full entry match check: primary keys AND secondary logic.
 */
export function checkEntryMatch(haystack, entry, globalOptions) {
    const primaryMatched = checkPrimaryKeys(haystack, entry, globalOptions);
    if (!primaryMatched)
        return false;
    if (!entry.selective) {
        return true; // Non-selective: primary match is enough
    }
    return checkSecondaryLogic(haystack, entry, globalOptions);
}
//# sourceMappingURL=matcher.js.map