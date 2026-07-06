// packages/core/src/audit/chinese-numbers.ts
// Chinese number parsing utilities for the rule-based audit engine.
//
// Supports three numeric formats commonly found in Chinese creative writing:
//   1. Arabic numerals: 0, 1, 42, 500, 10000
//   2. Simplified Chinese: 零一二三四五六七八九十百千万亿
//   3. Formal Chinese (大写/银行大写): 零壹贰叁肆伍陆柒捌玖拾佰仟萬億
//
// Also handles the colloquial "两" (liǎng) as an alternative for 2.
// ---------------------------------------------------------------------------
// Character maps
// ---------------------------------------------------------------------------
/** Simplified Chinese digit characters → numeric values. */
const SIMPLE_DIGITS = {
    "零": 0, "一": 1, "二": 2, "三": 3, "四": 4,
    "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
    "两": 2, // colloquial "two"
};
/** Formal Chinese (大写) digit characters → numeric values. */
const FORMAL_DIGITS = {
    "零": 0, "壹": 1, "贰": 2, "叁": 3, "肆": 4,
    "伍": 5, "陆": 6, "柒": 7, "捌": 8, "玖": 9,
};
/** Merged digit map (simple + formal, with "两"). */
const ALL_DIGITS = {
    ...SIMPLE_DIGITS,
    ...FORMAL_DIGITS,
};
/** Unit characters → their multiplier values. */
const UNITS = {
    "十": 10, "拾": 10,
    "百": 100, "佰": 100,
    "千": 1000, "仟": 1000,
    "万": 10000, "萬": 10000,
    "亿": 100000000, "億": 100000000,
};
/** Large unit thresholds (万 and 亿) that trigger segment finalization. */
const LARGE_UNITS = new Set(["万", "萬", "亿", "億"]);
/**
 * Set of all characters that can appear in a Chinese number expression.
 * Used to test whether a substring is a valid Chinese number.
 */
const CHINESE_NUM_CHARS = new Set([
    ...Object.keys(ALL_DIGITS),
    ...Object.keys(UNITS),
]);
// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------
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
export function parseChineseNumber(text) {
    const trimmed = text.trim();
    if (trimmed.length === 0)
        return null;
    // --- Arabic numeral path ---
    if (/^\d+$/.test(trimmed)) {
        const n = parseInt(trimmed, 10);
        return Number.isNaN(n) ? null : n;
    }
    // --- Chinese numeral path ---
    // Validate: every character must be a known digit or unit.
    for (const char of trimmed) {
        if (!CHINESE_NUM_CHARS.has(char))
            return null;
    }
    let total = 0; // accumulated total (finalized at 万/亿 boundaries)
    let segment = 0; // current segment value (before 万/亿)
    let currentDigit = 0; // digit waiting to be multiplied by a unit
    for (const char of trimmed) {
        if (char in ALL_DIGITS) {
            // Accumulate digit; will be multiplied by the next unit.
            currentDigit = ALL_DIGITS[char];
        }
        else if (char in UNITS) {
            const unitVal = UNITS[char];
            if (LARGE_UNITS.has(char)) {
                // 万 or 亿: finalize the current segment.
                segment += currentDigit;
                total += segment * unitVal;
                segment = 0;
                currentDigit = 0;
            }
            else {
                // 十, 百, 千: multiply current digit by this unit.
                // If no digit precedes the unit (e.g. "十二"), treat as 1.
                if (currentDigit === 0)
                    currentDigit = 1;
                segment += currentDigit * unitVal;
                currentDigit = 0;
            }
        }
    }
    // Add any remaining digit (e.g. the "五" in "一百零五").
    segment += currentDigit;
    total += segment;
    // Return null if nothing was parsed (e.g. input was all "零").
    // Note: parseChineseNumber("零") returns 0, which is correct — callers that
    // want to ignore zero values filter with `value < 1` (see rule-auditor's
    // power-level and numeric-contradiction detectors).
    return total === 0 && !trimmed.includes("零") ? null : total;
}
// ---------------------------------------------------------------------------
// Extraction helpers — find numbers in context within larger text
// ---------------------------------------------------------------------------
/**
 * Regex pattern matching a number token (Arabic or Chinese) that can appear
 * before a unit like 岁/米/年. Captures the number portion in group 1.
 *
 * Arabic: \d+
 * Chinese: 1-10 chars from the digit/unit character set
 */
const NUMBER_PATTERN = "(\\d+|[零一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬億两]{1,12})";
/**
 * Extract all numeric facts of a given kind from text.
 *
 * @param text The source text to search.
 * @param unitRegex A regex source string for the unit portion (e.g. "岁").
 * @param kind A label for the fact kind (e.g. "age", "distance").
 * @returns Array of extracted numeric facts with values and offsets.
 */
export function extractNumericFacts(text, unitRegex, _kind) {
    const results = [];
    // Build a regex that captures the number before the unit.
    const re = new RegExp(NUMBER_PATTERN + "(" + unitRegex + ")", "g");
    let m;
    while ((m = re.exec(text)) !== null) {
        const numStr = m[1];
        const unitStr = m[2];
        const value = parseChineseNumber(numStr);
        results.push({
            raw: m[0],
            value,
            unit: unitStr,
            offset: m.index,
        });
        // Prevent infinite loop on zero-length matches.
        if (m[0].length === 0)
            re.lastIndex++;
    }
    return results;
}
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
export function extractSubjectBefore(text, offset) {
    // Look back up to 20 characters for a name-like token.
    const lookback = Math.min(20, offset);
    const before = text.slice(Math.max(0, offset - lookback), offset);
    // Match 1-6 Chinese characters immediately before the number, stopping
    // at delimiters. We also handle "的" as a boundary.
    // Pattern: a run of CJK characters (not digits/units) right before the
    // number, optionally preceded by a subject marker like "了", "是".
    const match = before.match(/([\u4e00-\u9fff]{1,6})\s*$/);
    if (!match)
        return undefined;
    let subject = match[1];
    // Trim common trailing particles that are not part of a name.
    const PARTICLES = ["的", "了", "是", "在", "有", "和", "与", "让", "被", "把", "给", "到", "为", "之"];
    while (subject.length > 1 && PARTICLES.includes(subject[subject.length - 1])) {
        subject = subject.slice(0, -1);
    }
    // Filter out generic words that are unlikely to be names.
    const GENERIC = ["他", "她", "它", "我", "你", "这", "那", "其", "此", "某", "该", "本", "一个", "这个", "那个", "他们", "她们", "它们", "我们", "你们", "大家", "众人", "所有", "整个"];
    if (GENERIC.includes(subject))
        return undefined;
    return subject.length > 0 ? subject : undefined;
}
// ---------------------------------------------------------------------------
// Convenience extractors for specific fact types
// ---------------------------------------------------------------------------
/**
 * Extract all age mentions from text (e.g. "十八岁", "25岁", "一百岁").
 */
export function extractAges(text) {
    const facts = extractNumericFacts(text, "岁", "age");
    return facts.map((f) => ({
        ...f,
        subject: extractSubjectBefore(text, f.offset),
    }));
}
/**
 * Extract all distance/measurement mentions from text.
 * Supports: 米, 公里, 千米, 里, 丈, 尺, 寸, 光年, 吨, 斤, 公斤, kg
 */
export function extractDistances(text) {
    const facts = extractNumericFacts(text, "米|公里|千米|里|丈|尺|寸|光年|吨|斤|公斤|kg|KM|km", "distance");
    return facts.map((f) => ({
        ...f,
        subject: extractSubjectBefore(text, f.offset),
    }));
}
/**
 * Extract all count mentions from text (e.g. "三个人", "五名弟子", "两把剑").
 * Supports counters: 个, 名, 位, 把, 只, 头, 条, 本, 朵, 棵, 道, 颗, 粒, 滴, 件, 块, 张, 座, 座, 层, 篇, 章
 */
export function extractCounts(text) {
    return extractNumericFacts(text, "个|名|位|把|只|头|条|本|朵|棵|道|颗|粒|滴|件|块|张|座|层|篇|章|人|剑|刀|枪", "count");
}
/**
 * Extract all time references from text.
 * Supports: X年前/后, X月前/后, X天前/后, X日前/后, X周前/后, X小时前/后,
 *           X年前/以后, 昨天, 今天, 明天, 前天, 后天, 去年, 今年, 明年, 前年, 大前年
 *
 * @returns Array of time references with direction (past/future/relative).
 */
export function extractTimeReferences(text) {
    const results = [];
    // --- Numeric time references: X年/月/天/日前/后 ---
    const timeUnits = "年|月|天|日|周|星期|小时|时辰|分钟|分|秒|个?月|个?星期";
    // Pattern: number + unit + optional 前/后/以前/以后
    const re = new RegExp(NUMBER_PATTERN + "(" + timeUnits + ")(以前|以后|前|后)?", "g");
    let m;
    while ((m = re.exec(text)) !== null) {
        const numStr = m[1];
        const unitStr = m[2];
        const dirStr = m[3] ?? "";
        const value = parseChineseNumber(numStr);
        let direction = "relative";
        if (dirStr.includes("前"))
            direction = "past";
        else if (dirStr.includes("后"))
            direction = "future";
        results.push({
            raw: m[0],
            value,
            unit: unitStr,
            direction,
            offset: m.index,
        });
        if (m[0].length === 0)
            re.lastIndex++;
    }
    // --- Relative time terms (no number) ---
    const relativeTerms = [
        { term: "大前天", unit: "天" },
        { term: "大后天", unit: "天" },
        { term: "前天", unit: "天" },
        { term: "后天", unit: "天" },
        { term: "昨天", unit: "天" },
        { term: "今天", unit: "天" },
        { term: "明天", unit: "天" },
        { term: "大前年", unit: "年" },
        { term: "前年", unit: "年" },
        { term: "后年", unit: "年" },
        { term: "去年", unit: "年" },
        { term: "今年", unit: "年" },
        { term: "明年", unit: "年" },
        { term: "刚才", unit: "瞬" },
        { term: "刚刚", unit: "瞬" },
        { term: "此刻", unit: "瞬" },
        { term: "现在", unit: "瞬" },
    ];
    for (const { term, unit } of relativeTerms) {
        let searchFrom = 0;
        while (true) {
            const idx = text.indexOf(term, searchFrom);
            if (idx === -1)
                break;
            results.push({
                raw: term,
                value: null,
                unit,
                direction: "relative",
                offset: idx,
            });
            searchFrom = idx + term.length;
        }
    }
    // Sort by offset for consistent ordering.
    results.sort((a, b) => a.offset - b.offset);
    return results;
}
// ---------------------------------------------------------------------------
// Utility: check if a string contains any Chinese number characters
// ---------------------------------------------------------------------------
/**
 * Returns true if the string contains at least one Chinese numeral character.
 */
export function hasChineseNumber(text) {
    for (const char of text) {
        if (CHINESE_NUM_CHARS.has(char))
            return true;
    }
    return false;
}
//# sourceMappingURL=chinese-numbers.js.map