import type { LoreEntry } from "./types.js";
export interface MatchOptions {
    readonly caseSensitive: boolean;
    readonly matchWholeWords: boolean;
}
/**
 * Match a single key against the haystack.
 * - If the key is a regex pattern (/pattern/flags), uses regex matching.
 * - Otherwise uses string includes, with optional case sensitivity and whole word matching.
 */
export declare function matchKeys(haystack: string, needle: string, options: MatchOptions): boolean;
/**
 * Check if any primary key matches.
 */
export declare function checkPrimaryKeys(haystack: string, entry: LoreEntry, globalOptions: MatchOptions): boolean;
/**
 * Check secondary key logic for selective entries.
 * Returns true if the entry should be activated based on secondary key logic.
 *
 * - AND_ANY: at least one secondary key matches
 * - AND_ALL: all secondary keys match
 * - NOT_ALL: not all secondary keys match (at least one doesn't match)
 * - NOT_ANY: no secondary key matches
 */
export declare function checkSecondaryLogic(haystack: string, entry: LoreEntry, globalOptions: MatchOptions): boolean;
/**
 * Full entry match check: primary keys AND secondary logic.
 */
export declare function checkEntryMatch(haystack: string, entry: LoreEntry, globalOptions: MatchOptions): boolean;
//# sourceMappingURL=matcher.d.ts.map