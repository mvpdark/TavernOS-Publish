// packages/core/src/audit/rule-auditor.ts
// Pure rule-based audit engine — zero-LLM-cost detection of logical
// contradictions in Chinese creative writing.
//
// All detection is performed via pure string/regex/number analysis.
// No LLM calls are made. The engine produces AuditIssue-compatible
// results tagged with `label: "rule"` for easy filtering.
//
// Detectors:
//   1. Numeric contradiction — age, distance, measurement mismatches
//   2. Power scaling — cultivation realm jumps and contradictions
//   3. Timeline contradiction — time reference inconsistencies
//   4. Character presence — speakers not established in the scene
import { parseChineseNumber, extractAges, extractDistances, extractTimeReferences, } from "./chinese-numbers.js";
// ===========================================================================
// Part 1: Power realm progressions and power level extraction
// ===========================================================================
/**
 * Known cultivation/power progression systems used in Chinese fantasy.
 * Each entry defines an ordered list of realm names from lowest to highest.
 * The detector uses these to detect level jumps and contradictions.
 */
const REALM_PROGRESSIONS = [
    // Xianxia / Xiuzhen (cultivation)
    {
        system: "仙侠",
        realms: [
            "炼气", "筑基", "金丹", "元婴", "化神",
            "炼虚", "合体", "大乘", "渡劫", "飞升",
        ],
    },
    // Douqi (Battle Through the Heavens style)
    {
        system: "斗气",
        realms: [
            "斗者", "斗师", "大斗师", "斗灵", "斗王",
            "斗皇", "斗宗", "斗尊", "斗圣", "斗帝",
        ],
    },
    // Wudao (martial arts)
    {
        system: "武道",
        realms: [
            "武徒", "武士", "武师", "武将", "武王",
            "武皇", "武帝", "武神",
        ],
    },
    // Wuxia (jianghu)
    {
        system: "武侠",
        realms: [
            "不入流", "三流", "二流", "一流", "后天",
            "先天", "宗师", "大宗师", "武圣",
        ],
    },
    // Magic / spiritual beast levels
    {
        system: "灵兽",
        realms: [
            "一阶", "二阶", "三阶", "四阶", "五阶",
            "六阶", "七阶", "八阶", "九阶", "十阶",
        ],
    },
    // God/Divine realm (common in later-stage xianxia)
    {
        system: "神界",
        realms: [
            "天神", "真神", "神王", "神皇", "神帝", "神尊",
        ],
    },
];
/** Letter grade progression (S is highest). */
const LETTER_GRADES = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];
/** Suffixes commonly appended to realm names. */
const REALM_SUFFIXES = ["期", "阶", "境", "层", "重", "品", "级"];
/**
 * Extract all power level mentions from text.
 *
 * Scans for:
 *   - Named realms from known progressions (e.g. "金丹期", "筑基")
 *   - Generic numeric levels (e.g. "五级", "三阶", "七层")
 *   - Letter grades (e.g. "S级", "A级")
 *
 * @returns Array of power level mentions with system and ordinal.
 */
function extractPowerLevels(text) {
    // Collect raw matches with their ranges (start + end offsets).
    // We filter out substrings of longer matches in post-processing.
    const rawMentions = [];
    const found = new Set(); // track start offsets to avoid exact duplicates
    // --- Named realms from known progressions ---
    for (const prog of REALM_PROGRESSIONS) {
        for (let i = 0; i < prog.realms.length; i++) {
            const realm = prog.realms[i];
            // Match realm name optionally followed by a suffix (期/阶/境/层/重/品/级).
            // No lookbehind — realm names in Chinese text are almost always
            // preceded by CJK characters (verbs, particles). Substring overlaps
            // (e.g. "斗师" inside "大斗师") are resolved in post-processing.
            const suffixGroup = REALM_SUFFIXES.join("|");
            const re = new RegExp(`(${escapeRegex(realm)})(${suffixGroup})?`, "g");
            let m;
            while ((m = re.exec(text)) !== null) {
                const offset = m.index;
                if (found.has(offset))
                    continue;
                found.add(offset);
                rawMentions.push({
                    raw: m[0],
                    level: realm,
                    system: prog.system,
                    ordinal: i,
                    offset,
                    end: offset + m[0].length,
                });
                if (m[0].length === 0)
                    re.lastIndex++;
            }
        }
    }
    // --- Generic numeric levels: X级, X阶, X层, X品, X重 ---
    const genericRe = /(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬億两]{1,8})(级|阶|层|品|重)(?![\u4e00-\u9fff])/g;
    let gm;
    while ((gm = genericRe.exec(text)) !== null) {
        const offset = gm.index;
        if (found.has(offset))
            continue;
        const numStr = gm[1];
        const unitStr = gm[2];
        const value = parseChineseNumber(numStr);
        if (value === null || value < 1)
            continue;
        found.add(offset);
        rawMentions.push({
            raw: gm[0],
            level: gm[0],
            system: "generic-" + unitStr,
            ordinal: value - 1, // 0-based
            offset,
            end: offset + gm[0].length,
        });
        if (gm[0].length === 0)
            genericRe.lastIndex++;
    }
    // --- Letter grades: S级, A级, B级, etc. ---
    const letterRe = /(SSS|SS|S|[A-F])(级|阶|class|rank)/gi;
    let lm;
    while ((lm = letterRe.exec(text)) !== null) {
        const offset = lm.index;
        if (found.has(offset))
            continue;
        const grade = lm[1].toUpperCase();
        const gradeIdx = LETTER_GRADES.indexOf(grade);
        if (gradeIdx < 0)
            continue;
        found.add(offset);
        rawMentions.push({
            raw: lm[0],
            level: grade,
            system: "letter-grade",
            ordinal: gradeIdx,
            offset,
            end: offset + lm[0].length,
        });
        if (lm[0].length === 0)
            letterRe.lastIndex++;
    }
    // --- Post-processing: remove substring matches ---
    // Sort by start offset ascending, then by length descending (longer first).
    // This ensures that when two matches overlap, the longer one wins.
    rawMentions.sort((a, b) => {
        if (a.offset !== b.offset)
            return a.offset - b.offset;
        return b.end - a.end; // longer match first at same offset
    });
    const mentions = [];
    let lastEnd = -1;
    for (const m of rawMentions) {
        // Skip if this match starts within a previous (longer) match.
        if (m.offset < lastEnd)
            continue;
        mentions.push({
            raw: m.raw,
            level: m.level,
            system: m.system,
            ordinal: m.ordinal,
            offset: m.offset,
        });
        lastEnd = Math.max(lastEnd, m.end);
    }
    // Already sorted by offset; return.
    return mentions;
}
// ===========================================================================
// Part 2: Helper utilities
// ===========================================================================
/** Escape special regex characters in a string. */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Extract the chapter number from a state projection header.
 * The header format is: "## 当前状态 (Chapter N)" or "## Current State (Chapter N)".
 * @returns The chapter number, or undefined if not found.
 */
function extractStateChapter(stateText) {
    if (!stateText)
        return undefined;
    const match = stateText.match(/Chapter\s+(\d+)/i);
    if (match)
        return parseInt(match[1], 10);
    return undefined;
}
/**
 * Create a rule-based audit issue with the standard label.
 */
function makeIssue(severity, scope, dimension, message, location, repairScope = "local", suggestion) {
    return {
        severity,
        scope,
        dimension,
        message,
        location,
        repairScope,
        label: "rule",
        suggestion,
    };
}
/**
 * Get a short context snippet around a character offset in text.
 * Used for the `location` field so the reviser can find the paragraph.
 */
function snippetAt(text, offset, radius = 15) {
    const start = Math.max(0, offset - radius);
    const end = Math.min(text.length, offset + radius);
    return text.slice(start, end);
}
// ===========================================================================
// Part 3: Detector 1 — Numeric contradiction detector
// ===========================================================================
/**
 * Detect numeric contradictions between chapter content and story state.
 *
 * Checks:
 *   - Age: a character's age should not decrease, and should not increase
 *     by more than the number of chapters elapsed (conservative heuristic).
 *   - Distance: same-subject measurements should not differ by more than 10x.
 *
 * Only flags clear contradictions — ambiguous cases are left to the LLM auditor.
 */
function detectNumericContradictions(chapterContent, currentState, chapterIndex) {
    const issues = [];
    if (!currentState)
        return issues;
    // --- Age contradictions ---
    const chapterAges = extractAges(chapterContent);
    const stateAges = extractAges(currentState);
    // Determine the state chapter for time-elapsed estimation.
    const stateChapter = extractStateChapter(currentState);
    const chaptersElapsed = stateChapter !== undefined && chapterIndex !== undefined
        ? Math.max(0, chapterIndex - stateChapter)
        : undefined;
    for (const chapterAge of chapterAges) {
        if (chapterAge.value === null)
            continue;
        // Filter out implausible ages (keep 1-200 range).
        if (chapterAge.value < 1 || chapterAge.value > 200)
            continue;
        for (const stateAge of stateAges) {
            if (stateAge.value === null)
                continue;
            if (stateAge.value < 1 || stateAge.value > 200)
                continue;
            // Match by subject if both have one; otherwise skip cross-checking
            // (too many false positives without a subject anchor).
            if (chapterAge.subject && stateAge.subject) {
                if (chapterAge.subject !== stateAge.subject)
                    continue;
            }
            else if (chapterAges.length > 1 || stateAges.length > 1) {
                // When there are multiple ages and no subject, skip to avoid
                // false positives from comparing unrelated ages.
                continue;
            }
            // Case 1: Age decreased — clear contradiction.
            if (chapterAge.value < stateAge.value) {
                const diff = stateAge.value - chapterAge.value;
                issues.push(makeIssue("error", "paragraph", "数值矛盾", `年龄矛盾：故事状态中记录为${stateAge.value}岁，但本章中写为${chapterAge.value}岁（减少${diff}岁）。角色年龄不应倒退。`, snippetAt(chapterContent, chapterAge.offset), "local", `请核对角色年龄，应为${stateAge.value}岁或考虑时间流逝后的合理年龄。`));
                break; // Only report once per chapter age.
            }
            // Case 2: Age increased — check if the increase is reasonable.
            if (chapterAge.value > stateAge.value) {
                const increase = chapterAge.value - stateAge.value;
                // Conservative heuristic: each chapter ~ at most 1 year.
                // If we don't know chapters elapsed, allow up to 5 years.
                const maxReasonable = chaptersElapsed !== undefined
                    ? Math.max(1, chaptersElapsed)
                    : 5;
                if (increase > maxReasonable) {
                    issues.push(makeIssue("warning", "paragraph", "数值矛盾", `年龄增长异常：故事状态（第${stateChapter ?? "?"}章）中记录为${stateAge.value}岁，本章（第${chapterIndex ?? "?"}章）写为${chapterAge.value}岁，增长${increase}岁。跨${chaptersElapsed ?? "?"}章增长${increase}岁可能不合理。`, snippetAt(chapterContent, chapterAge.offset), "local", `请确认是否有大跨度的时间跳跃，或年龄记录有误。`));
                    break;
                }
            }
        }
    }
    // --- Distance/measurement contradictions ---
    const chapterDists = extractDistances(chapterContent);
    const stateDists = extractDistances(currentState);
    for (const chapterDist of chapterDists) {
        if (chapterDist.value === null || chapterDist.value <= 0)
            continue;
        for (const stateDist of stateDists) {
            if (stateDist.value === null || stateDist.value <= 0)
                continue;
            // Only compare same-unit measurements.
            if (chapterDist.unit !== stateDist.unit)
                continue;
            // Match by subject when available.
            if (chapterDist.subject && stateDist.subject) {
                if (chapterDist.subject !== stateDist.subject)
                    continue;
            }
            // Flag when values differ by more than 10x (clear contradiction).
            const ratio = Math.max(chapterDist.value, stateDist.value) /
                Math.min(chapterDist.value, stateDist.value);
            if (ratio > 10) {
                issues.push(makeIssue("warning", "paragraph", "数值矛盾", `度量矛盾：故事状态中记录为${stateDist.value}${stateDist.unit}，但本章中写为${chapterDist.value}${chapterDist.unit}，差异超过10倍。`, snippetAt(chapterContent, chapterDist.offset), "local", `请核对数值，确保度量单位一致。`));
                break;
            }
        }
    }
    return issues;
}
// ===========================================================================
// Part 4: Detector 2 — Power scaling detector
// ===========================================================================
/**
 * Detect power scaling issues.
 *
 * Checks:
 *   - Same character jumping 2+ realm levels within the story (unexplained jump).
 *   - Same character mentioned at two different levels in the same chapter.
 *   - Power level contradicting previously established state.
 *
 * Conservative: only flags jumps of 2+ levels, not 1-level advances.
 */
function detectPowerScaling(chapterContent, currentState, chapterSummaries) {
    const issues = [];
    const chapterPowers = extractPowerLevels(chapterContent);
    if (chapterPowers.length === 0)
        return issues;
    // --- Internal consistency: same chapter, two different levels for same system ---
    // Group by system and check for contradictions within the chapter.
    const bySystem = new Map();
    for (const p of chapterPowers) {
        const arr = bySystem.get(p.system) ?? [];
        arr.push(p);
        bySystem.set(p.system, arr);
    }
    for (const [system, levels] of bySystem) {
        if (levels.length < 2)
            continue;
        // Find the max and min ordinal in this chapter for this system.
        const ordinals = levels.map((l) => l.ordinal);
        const maxOrd = Math.max(...ordinals);
        const minOrd = Math.min(...ordinals);
        // If the chapter mentions levels spanning 3+ ordinals (a jump of 2+),
        // it may describe a sudden power jump.
        if (maxOrd - minOrd >= 2) {
            // Find the mention with the highest level for the location.
            const highest = levels.find((l) => l.ordinal === maxOrd);
            const lowest = levels.find((l) => l.ordinal === minOrd);
            issues.push(makeIssue("warning", "paragraph", "战力突变", `境界跨度异常：本章同时提及"${lowest.level}"和"${highest.level}"（${system}体系跨${maxOrd - minOrd}级），可能存在未解释的战力跳跃。`, snippetAt(chapterContent, highest.offset), "local", `请确认是否有合理的突破/降境描写，或境界描述有误。`));
        }
    }
    // --- Cross-reference with story state ---
    const stateText = [currentState, chapterSummaries].filter(Boolean).join("\n");
    if (!stateText)
        return issues;
    const statePowers = extractPowerLevels(stateText);
    if (statePowers.length === 0)
        return issues;
    for (const chapterPower of chapterPowers) {
        // Find matching system in state.
        const matchingState = statePowers.filter((sp) => sp.system === chapterPower.system);
        if (matchingState.length === 0)
            continue;
        // Use the highest state level as the baseline.
        const stateMax = matchingState.reduce((max, sp) => Math.max(max, sp.ordinal), -1);
        if (stateMax < 0)
            continue;
        const jump = chapterPower.ordinal - stateMax;
        // Flag large forward jumps (3+ levels skipped).
        if (jump >= 3) {
            const stateLevel = matchingState.find((sp) => sp.ordinal === stateMax);
            issues.push(makeIssue("warning", "paragraph", "战力突变", `境界跳跃：故事状态中最高为"${stateLevel.level}"（${chapterPower.system}），本章中写为"${chapterPower.level}"，跨${jump}级，可能存在未解释的突破。`, snippetAt(chapterContent, chapterPower.offset), "local", `请确认是否有合理的连续突破描写，或境界记录有误。`));
        }
        // Flag backward contradictions (character at a lower level than established).
        // Only flag if the drop is 2+ levels (1-level drops could be context-dependent).
        if (jump <= -2) {
            const stateLevel = matchingState.find((sp) => sp.ordinal === stateMax);
            issues.push(makeIssue("warning", "paragraph", "战力矛盾", `境界倒退：故事状态中为"${stateLevel.level}"（${chapterPower.system}），本章中写为"${chapterPower.level}"，低了${-jump}级。`, snippetAt(chapterContent, chapterPower.offset), "local", `请确认是否有修为被封印/重创的描写，或境界描述有误。`));
        }
    }
    return issues;
}
// ===========================================================================
// Part 5: Detector 3 — Timeline contradiction detector
// ===========================================================================
/**
 * Detect timeline contradictions.
 *
 * Checks:
 *   - "X years ago" references that would make a character impossibly young
 *     or unborn.
 *   - Contradictory time references within the same chapter (e.g. "三天后"
 *     and "第二天" for the same event).
 *
 * Conservative: only flags clear impossibilities, not ambiguous timelines.
 */
function detectTimelineContradictions(chapterContent, currentState) {
    const issues = [];
    const timeRefs = extractTimeReferences(chapterContent);
    if (timeRefs.length === 0)
        return issues;
    // --- Check "X years ago" vs character ages ---
    const ages = extractAges(chapterContent);
    const stateAges = currentState ? extractAges(currentState) : [];
    const allAges = [...ages, ...stateAges];
    for (const timeRef of timeRefs) {
        if (timeRef.direction !== "past")
            continue;
        if (timeRef.value === null || timeRef.value <= 0)
            continue;
        if (timeRef.unit !== "年")
            continue;
        const yearsAgo = timeRef.value;
        // If any character age is known, check if they would have been
        // born X years ago.
        for (const age of allAges) {
            if (age.value === null || age.value <= 0)
                continue;
            const ageAtTime = age.value - yearsAgo;
            // Case 1: Character wasn't born yet.
            if (ageAtTime < 0) {
                issues.push(makeIssue("error", "paragraph", "时间线矛盾", `时间线矛盾：${timeRef.raw}，但角色年龄为${age.value}岁，彼时角色尚未出生（${ageAtTime}岁）。`, snippetAt(chapterContent, timeRef.offset), "local", `请核对时间跨度或角色年龄。`));
                break;
            }
            // Case 2: Character would have been very young (< 3 years old) but
            // the text near the time reference describes adult-like activities.
            if (ageAtTime >= 0 && ageAtTime < 3) {
                // Check if the context around the time reference mentions
                // adult activities (战斗, 修炼, 独自, etc.).
                const context = snippetAt(chapterContent, timeRef.offset, 30);
                const adultKeywords = ["战斗", "修炼", "独自", "闯荡", "游历", "从军", "拜师", "学艺", "教书", "成婚", "当家"];
                const hasAdultContext = adultKeywords.some((kw) => context.includes(kw));
                if (hasAdultContext) {
                    issues.push(makeIssue("warning", "paragraph", "时间线矛盾", `时间线存疑：${timeRef.raw}时角色仅${ageAtTime}岁，但上下文涉及成人才有的活动。`, snippetAt(chapterContent, timeRef.offset), "local", `请核对时间跨度或角色年龄。`));
                    break;
                }
            }
        }
    }
    // --- Check contradictory time references within the chapter ---
    // Look for pairs of future-pointing time references that disagree.
    const futureRefs = timeRefs.filter((t) => t.direction === "future" && t.value !== null && t.value > 0);
    for (let i = 0; i < futureRefs.length; i++) {
        for (let j = i + 1; j < futureRefs.length; j++) {
            const a = futureRefs[i];
            const b = futureRefs[j];
            // Only compare same-unit references.
            if (a.unit !== b.unit)
                continue;
            // If two future references differ by more than 5x for the same unit,
            // they may be referring to different events inconsistently.
            // But this is very ambiguous — only flag extreme cases (10x difference)
            // and only when they're within 200 characters of each other (likely
            // referring to the same event).
            const dist = Math.abs(a.offset - b.offset);
            if (dist > 200)
                continue;
            const ratio = Math.max(a.value, b.value) / Math.min(a.value, b.value);
            if (ratio >= 10) {
                issues.push(makeIssue("info", "paragraph", "时间线存疑", `时间表述不一致：相近位置同时出现"${a.raw}"和"${b.raw}"，差异较大，可能指代不同事件。`, snippetAt(chapterContent, Math.min(a.offset, b.offset)), "local", `请确认两个时间指代的是否为同一事件。`));
            }
        }
    }
    return issues;
}
// ===========================================================================
// Part 6: Detector 4 — Character presence detector
// ===========================================================================
/** Speech verbs commonly used in Chinese dialogue attribution. */
const SPEECH_VERBS = [
    "说道", "说", "道", "问", "答", "喊", "叫", "笑道", "冷笑道",
    "冷声道", "低声道", "低声说", "大声道", "大声说", "怒道", "叹道", "叹气",
    "沉声道", "淡淡道", "缓缓道", "朗声道", "厉声道", "柔声道", "苦笑道",
    "大笑道", "惊呼", "惊叫", "追问", "回答", "反驳", "补充", "嘟囔", "嘀咕",
    "低语", "喃喃", "高呼", "呼喊", "嘶吼", "咆哮", "轻声说", "微笑道",
];
/**
 * Extract dialogue attributions from text.
 * Finds patterns like "XXX说", "XXX道", "XXX笑道" both before and after
 * dialogue quotes.
 *
 * @returns Array of { name, offset } for each attributed speaker.
 */
function extractDialogueSpeakers(text) {
    const speakers = [];
    const found = new Set();
    // Build a regex for speech verbs.
    // Create a mutable copy and sort longest-first for greedy matching.
    const verbPattern = [...SPEECH_VERBS]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegex)
        .join("|");
    // Pattern 1: After closing quote — "..."XXX说
    // Closing quotes: " 」 』 " '
    const afterRe = new RegExp(`["」』"']\\s*([\\u4e00-\\u9fff]{2,6})\\s*(${verbPattern})`, "g");
    let m;
    while ((m = afterRe.exec(text)) !== null) {
        const name = m[1];
        const nameOffset = m.index + m[0].indexOf(name);
        if (!found.has(nameOffset)) {
            found.add(nameOffset);
            speakers.push({ name, offset: nameOffset });
        }
        if (m[0].length === 0)
            afterRe.lastIndex++;
    }
    // Pattern 2: Before opening quote — XXX说："..."
    // Opening quotes: " 「 『 " '
    const beforeRe = new RegExp(`([\\u4e00-\\u9fff]{2,6})\\s*(${verbPattern})\\s*[:：]\\s*["「『"']`, "g");
    while ((m = beforeRe.exec(text)) !== null) {
        const name = m[1];
        const nameOffset = m.index;
        if (!found.has(nameOffset)) {
            found.add(nameOffset);
            speakers.push({ name, offset: nameOffset });
        }
        if (m[0].length === 0)
            beforeRe.lastIndex++;
    }
    return speakers;
}
/** Generic pronouns and common words that are not character names. */
const GENERIC_NAMES = new Set([
    "他", "她", "它", "我", "你", "这", "那", "其", "此", "某", "该",
    "他们", "她们", "它们", "我们", "你们", "大家", "众人", "所有人",
    "对方", "旁人", "他人", "一人", "另一", "少年", "少女",
    "老者", "青年", "男子", "女子", "孩子", "老人", "书生", "将军",
    "师父", "师傅", "师尊", "师兄", "师弟", "师姐", "师妹", "前辈",
    "晚辈", "阁下", "在下", "本座", "本宫", "朕", "寡人", "贫道",
    "贫僧", "老夫", "老朽", "小子", "丫头", "臭小子", "死丫头",
]);
/**
 * Detect character presence issues.
 *
 * Checks if characters who speak in dialogue were established as present.
 * Uses the asset catalog to identify known characters.
 *
 * Conservative: only flags speakers who are (a) not in the asset catalog
 * AND (b) not mentioned anywhere in the chapter before their first dialogue.
 * This catches characters who appear in dialogue "out of nowhere".
 */
function detectCharacterPresence(chapterContent, assetCatalog) {
    const issues = [];
    if (!assetCatalog)
        return issues;
    // Build a set of known character names + aliases.
    const knownNames = new Set();
    for (const char of assetCatalog.characters ?? []) {
        if (char.name)
            knownNames.add(char.name);
        for (const alias of char.aliases ?? []) {
            if (alias)
                knownNames.add(alias);
        }
    }
    if (knownNames.size === 0)
        return issues;
    const speakers = extractDialogueSpeakers(chapterContent);
    if (speakers.length === 0)
        return issues;
    // Track which names have been flagged (report once per name).
    const flagged = new Set();
    for (const speaker of speakers) {
        // Skip generic pronouns and common words.
        if (GENERIC_NAMES.has(speaker.name))
            continue;
        // Skip if this is a known character.
        if (knownNames.has(speaker.name))
            continue;
        // Skip if already flagged.
        if (flagged.has(speaker.name))
            continue;
        // Check if the name appears earlier in the chapter (before the dialogue).
        // This would indicate the character was introduced before speaking.
        const beforeDialogue = chapterContent.slice(0, speaker.offset);
        if (beforeDialogue.includes(speaker.name))
            continue;
        // Also check if the name appears in the asset catalog's aliases
        // using partial matching (the speaker name might be a substring).
        const isKnownAlias = [...knownNames].some((kn) => kn.includes(speaker.name) || speaker.name.includes(kn));
        if (isKnownAlias)
            continue;
        // Flag as info — the character speaks but was never introduced.
        flagged.add(speaker.name);
        issues.push(makeIssue("info", "paragraph", "角色出场", `角色"${speaker.name}"在对话中出现，但未在场景中交代其出场，且不在已知角色列表中。`, snippetAt(chapterContent, speaker.offset), "local", `请在对话前补充该角色的出场描写，或确认是否为新登场角色。`));
    }
    return issues;
}
// ===========================================================================
// Part 7: Main orchestrator
// ===========================================================================
/**
 * Run all rule-based detectors on the chapter content.
 *
 * This is the main entry point for the rule-based audit engine. It runs
 * each detector that has sufficient input data and merges the results.
 *
 * All detection is pure string/regex/number analysis — no LLM calls.
 *
 * @param input The audit input with chapter content and optional context.
 * @returns A RuleAuditResult with all detected issues.
 */
export function runRuleAudit(input) {
    const allIssues = [];
    let detectorCount = 0;
    // Detector 1: Numeric contradictions
    // Requires: chapterContent + currentState
    if (input.currentState) {
        detectorCount++;
        try {
            const numericIssues = detectNumericContradictions(input.chapterContent, input.currentState, input.chapterIndex);
            allIssues.push(...numericIssues);
        }
        catch (e) {
            // Detector failures are non-fatal — continue with other detectors.
            console.warn("[rule-auditor] numeric-contradiction detector failed:", e);
        }
    }
    // Detector 2: Power scaling
    // Requires: chapterContent (always run if there are power mentions)
    detectorCount++;
    try {
        const powerIssues = detectPowerScaling(input.chapterContent, input.currentState, input.chapterSummaries);
        allIssues.push(...powerIssues);
    }
    catch (e) {
        // Non-fatal.
        console.warn("[rule-auditor] power-scaling detector failed:", e);
    }
    // Detector 3: Timeline contradictions
    // Requires: chapterContent (always run if there are time references)
    detectorCount++;
    try {
        const timelineIssues = detectTimelineContradictions(input.chapterContent, input.currentState);
        allIssues.push(...timelineIssues);
    }
    catch (e) {
        // Non-fatal.
        console.warn("[rule-auditor] timeline-contradiction detector failed:", e);
    }
    // Detector 4: Character presence
    // Requires: chapterContent + assetCatalog
    if (input.assetCatalog) {
        detectorCount++;
        try {
            const presenceIssues = detectCharacterPresence(input.chapterContent, input.assetCatalog);
            allIssues.push(...presenceIssues);
        }
        catch (e) {
            // Non-fatal.
            console.warn("[rule-auditor] character-presence detector failed:", e);
        }
    }
    // Sort issues by offset (approximate, using location snippet length
    // as a tiebreaker — not critical since the reviser locates by text).
    // We leave them in detection order for readability.
    const summary = allIssues.length === 0
        ? `规则审计完成：运行${detectorCount}个检测器，未发现问题`
        : `规则审计完成：运行${detectorCount}个检测器，发现${allIssues.length}个问题` +
            `（错误${allIssues.filter((i) => i.severity === "error").length} / ` +
            `警告${allIssues.filter((i) => i.severity === "warning").length} / ` +
            `提示${allIssues.filter((i) => i.severity === "info").length}）`;
    return {
        issues: allIssues,
        detectorCount,
        summary,
    };
}
/**
 * Create a configured rule auditor function.
 *
 * Returns a function that accepts RuleAuditInput and returns RuleAuditResult,
 * with the specified detectors enabled or disabled.
 */
export function createRuleAuditor(config) {
    const enableNumeric = config?.enableNumericContradiction ?? true;
    const enablePower = config?.enablePowerScaling ?? true;
    const enableTimeline = config?.enableTimeline ?? true;
    const enablePresence = config?.enableCharacterPresence ?? true;
    return function audit(input) {
        const allIssues = [];
        let detectorCount = 0;
        if (enableNumeric && input.currentState) {
            detectorCount++;
            try {
                allIssues.push(...detectNumericContradictions(input.chapterContent, input.currentState, input.chapterIndex));
            }
            catch { /* non-fatal */ }
        }
        if (enablePower) {
            detectorCount++;
            try {
                allIssues.push(...detectPowerScaling(input.chapterContent, input.currentState, input.chapterSummaries));
            }
            catch { /* non-fatal */ }
        }
        if (enableTimeline) {
            detectorCount++;
            try {
                allIssues.push(...detectTimelineContradictions(input.chapterContent, input.currentState));
            }
            catch { /* non-fatal */ }
        }
        if (enablePresence && input.assetCatalog) {
            detectorCount++;
            try {
                allIssues.push(...detectCharacterPresence(input.chapterContent, input.assetCatalog));
            }
            catch { /* non-fatal */ }
        }
        const summary = allIssues.length === 0
            ? `规则审计完成：运行${detectorCount}个检测器，未发现问题`
            : `规则审计完成：运行${detectorCount}个检测器，发现${allIssues.length}个问题`;
        return { issues: allIssues, detectorCount, summary };
    };
}
//# sourceMappingURL=rule-auditor.js.map