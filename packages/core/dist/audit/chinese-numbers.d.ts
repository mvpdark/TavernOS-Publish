/**
 * Parse a Chinese or Arabic number string into a numeric value.
 *
 * Handles compound forms such as:
 *   - "十二" → 12
 *   - "二十" → 20
 *   - "二百三十四" → 234
 *   - "一万二千三百四十五" → 12345
 *   - "一百零五" → 105
 *   - "十万" → 100000
 *   - "500" → 500
 *   - "壹佰贰拾叁" → 123
 *
 * @param text A string containing ONLY number characters (no units like 岁/米).
 * @returns The parsed number, or null if the input is not a valid number.
 */
export declare function parseChineseNumber(text: string): number | null;
/**
 * Extract all numeric facts of a given kind from text.
 *
 * @param text The source text to search.
 * @param unitRegex A regex source string for the unit portion (e.g. "岁").
 * @param kind A label for the fact kind (e.g. "age", "distance").
 * @returns Array of extracted numeric facts with values and offsets.
 */
export declare function extractNumericFacts(text: string, unitRegex: string, _kind?: string): ReadonlyArray<{
    raw: string;
    value: number | null;
    unit: string;
    offset: number;
}>;
/**
 * Extract a subject name preceding a numeric fact.
 *
 * Looks backwards from the match offset for 1-6 Chinese characters that
 * form a name (stops at common delimiters). This is a heuristic and may
 * return undefined when no clear subject can be identified.
 *
 * @param text The full source text.
 * @param offset The character offset of the numeric match.
 * @returns The extracted subject name, or undefined.
 */
export declare function extractSubjectBefore(text: string, offset: number): string | undefined;
/**
 * Extract all age mentions from text (e.g. "十八岁", "25岁", "一百岁").
 */
export declare function extractAges(text: string): ReadonlyArray<{
    raw: string;
    value: number | null;
    unit: string;
    offset: number;
    subject?: string;
}>;
/**
 * Extract all distance/measurement mentions from text.
 * Supports: 米, 公里, 千米, 里, 丈, 尺, 寸, 光年, 吨, 斤, 公斤, kg
 */
export declare function extractDistances(text: string): ReadonlyArray<{
    raw: string;
    value: number | null;
    unit: string;
    offset: number;
    subject?: string;
}>;
/**
 * Extract all count mentions from text (e.g. "三个人", "五名弟子", "两把剑").
 * Supports counters: 个, 名, 位, 把, 只, 头, 条, 本, 朵, 棵, 道, 颗, 粒, 滴, 件, 块, 张, 座, 座, 层, 篇, 章
 */
export declare function extractCounts(text: string): ReadonlyArray<{
    raw: string;
    value: number | null;
    unit: string;
    offset: number;
}>;
/**
 * Extract all time references from text.
 * Supports: X年前/后, X月前/后, X天前/后, X日前/后, X周前/后, X小时前/后,
 *           X年前/以后, 昨天, 今天, 明天, 前天, 后天, 去年, 今年, 明年, 前年, 大前年
 *
 * @returns Array of time references with direction (past/future/relative).
 */
export declare function extractTimeReferences(text: string): ReadonlyArray<{
    raw: string;
    value: number | null;
    unit: string;
    direction: "past" | "future" | "relative";
    offset: number;
}>;
/**
 * Returns true if the string contains at least one Chinese numeral character.
 */
export declare function hasChineseNumber(text: string): boolean;
//# sourceMappingURL=chinese-numbers.d.ts.map