// packages/core/src/audit/hook-density.ts
// Pure rule-based hook & cool-point density analyzer — zero-LLM-cost
// detection of narrative hooks (章末悬念/钩子) and cool points (爽点)
// in Chinese web fiction.
//
// All detection is performed via pure string/regex analysis. No LLM
// calls are made. The analyzer scans chapter content for established
// hook and cool-point patterns and computes density / distribution
// metrics useful for pacing diagnosis.
//
// Hook detectors:
//   1. cliffhanger       — chapter-end suspense / abrupt cuts
//   2. suspense_opening  — chapter-open questions or crises
//   3. mystery_question  — rhetorical / mystery question phrasing
//   4. foreshadow        — foreshadowing / dramatic-irony cues
//
// Cool-point detectors:
//   1. face_slap   — underdog reversal that shocks onlookers
//   2. power_up    — breakthrough / level-up / awakening
//   3. reveal      — identity / conspiracy unmasking
//   4. revenge     — vengeance / payback
//   5. turnaround  — desperate comeback / reversal
//   6. recognition — gained respect / reputation boost
// --- Hook patterns ---------------------------------------------------------
// Cliffhanger: searched in the chapter tail region.
const CLIFFHANGER_PATTERNS = [
    { source: "(未完|待续|究竟如何|何去何从|且听下回|下回分解|欲知后事|后事如何|结局如何)", confidence: 0.95 },
    { source: "(突然|忽然|猛然|蓦地|猝不及防).{0,20}?(消失|不见|倒下|倒地|眼前一黑|失去意识|昏死|昏厥)", confidence: 0.7 },
    { source: "(戛然而止|欲言又止|话到嘴边|来不及说|来不及)", confidence: 0.6 },
    { source: "(倒吸一口凉气|背后一凉|不寒而栗|毛骨悚然|心惊肉跳)", confidence: 0.6 },
];
// Suspense opening: searched in the chapter head region.
const SUSPENSE_OPENING_PATTERNS = [
    { source: "(突然|蓦地|刹那间|霎时间|就在这时|话音刚落|猝不及防|毫无征兆)", confidence: 0.7 },
    { source: "(究竟|到底|为何|何故|怎么回事|发生了什么|出什么事|怎会)", confidence: 0.7 },
    { source: "(危险|危机|杀机|杀意|大事不妙|大事不好|出事了|惨叫|尖叫|求救|救命)", confidence: 0.75 },
    { source: "(究竟|到底|为何|怎么会|怎么能|怎会|难道|岂能|何曾).{0,30}?[？?]", confidence: 0.8 },
    { source: "(尸体|倒在.{0,6}?血泊|满地.{0,4}?血|一地.{0,4}?血|血流成河)", confidence: 0.7 },
];
// Mystery question: searched across the whole chapter.
const MYSTERY_QUESTION_PATTERNS = [
    { source: "(究竟|到底|为何|何故|何人|何事|何物|何方)", confidence: 0.65 },
    { source: "(怎么会|怎么可能|为何会|为什么|怎会|怎能|岂能|难道)", confidence: 0.7 },
    { source: "(谜团|谜题|疑团|疑云|不解之谜|未解之谜)", confidence: 0.8 },
    { source: "(究竟|到底).{0,30}?[？?]", confidence: 0.75 },
];
// Foreshadow: searched across the whole chapter.
const FORESHADOW_PATTERNS = [
    { source: "(殊不知|哪知|哪知道|岂知|岂料|谁知|谁知道|谁料)", confidence: 0.85 },
    { source: "(谁也没想到|谁能想到|谁曾想到|谁料想|谁又能想到)", confidence: 0.85 },
    { source: "(埋下.{0,8}?种子|伏笔|暗藏|隐患|暗流涌动|山雨欲来|草蛇灰线)", confidence: 0.8 },
    { source: "(日后|后来|多年后|数年后).{0,20}?(后悔|追悔|种下|埋下|酿成)", confidence: 0.7 },
    { source: "(此时此刻|与此同时|而在此刻|就在此时)", confidence: 0.5 },
];
// --- Cool-point patterns ---------------------------------------------------
const FACE_SLAP_PATTERNS = [
    { source: "(打脸|啪啪打脸|响亮.{0,4}?耳光|一记耳光)", confidence: 0.9 },
    { source: "(废物|废柴|蠢货|无能之辈|饭桶).{0,30}?(震惊|惊呆|目瞪口呆|不敢相信|傻眼)", confidence: 0.8 },
    { source: "(不过如此|不过尔尔|区区|雕虫小技|班门弄斧)", confidence: 0.7 },
    { source: "(哑口无言|无言以对|面红耳赤|无地自容|羞愧难当|下不来台)", confidence: 0.7 },
    { source: "(大跌眼镜|跌破.{0,4}?眼镜|惊掉.{0,4}?下巴)", confidence: 0.75 },
];
const POWER_UP_PATTERNS = [
    { source: "(突破|晋升|进阶|升阶|跨入.{0,6}?境|踏入.{0,6}?境)", confidence: 0.9 },
    { source: "(觉醒|血脉.{0,6}?觉醒|觉醒.{0,6}?血脉|觉醒.{0,6}?天赋|天赋觉醒)", confidence: 0.85 },
    { source: "(实力.{0,8}?暴涨|修为.{0,8}?暴涨|实力.{0,8}?大增|突飞猛进|一日千里)", confidence: 0.85 },
    { source: "(领悟|参悟|顿悟|感悟.{0,8}?大道|领悟.{0,8}?法则|掌握.{0,8}?法则)", confidence: 0.8 },
    { source: "(脱胎换骨|浴火重生|涅槃|涅槃重生|蜕变|洗髓|伐骨)", confidence: 0.75 },
];
const REVEAL_PATTERNS = [
    { source: "(身份.{0,8}?揭露|身份.{0,8}?曝光|身份.{0,8}?败露|真实身份)", confidence: 0.9 },
    { source: "(真相.{0,8}?大白|真相.{0,8}?揭晓|真相.{0,8}?浮出水面|真相.{0,8}?水落石出)", confidence: 0.9 },
    { source: "(原来.{0,20}?就是|没想到.{0,20}?竟然|居然.{0,20}?就是|竟然是|(?<!究)竟是)", confidence: 0.75 },
    { source: "(阴谋.{0,8}?揭穿|诡计.{0,8}?败露|诡计.{0,8}?被识破|图穷匕见|狐狸尾巴)", confidence: 0.8 },
    { source: "(不为人知.{0,10}?秘密|隐藏.{0,8}?多年|尘封.{0,8}?往事|尘封.{0,8}?秘密)", confidence: 0.65 },
];
const REVENGE_PATTERNS = [
    { source: "(复仇|报仇|雪恨|以牙还牙|以眼还眼|血债血偿|以血还血)", confidence: 0.9 },
    { source: "(报仇雪恨|一雪前耻|洗刷.{0,8}?耻辱|洗雪.{0,8}?耻辱)", confidence: 0.85 },
    { source: "(新仇旧恨|君子报仇|十年不晚|此仇.{0,10}?必报|此恨.{0,10}?必报)", confidence: 0.8 },
    { source: "(讨回.{0,8}?公道|清算.{0,8}?旧账|连本带利|加倍奉还)", confidence: 0.7 },
    { source: "(罪有应得|恶有恶报|自食其果|咎由自取|报应)", confidence: 0.7 },
];
const TURNAROUND_PATTERNS = [
    { source: "(绝境.{0,8}?翻盘|绝地.{0,8}?反击|反败为胜|扭转乾坤|逆风翻盘|绝地翻盘)", confidence: 0.9 },
    { source: "(峰回路转|柳暗花明|绝处逢生|起死回生|化险为夷)", confidence: 0.85 },
    { source: "(后来居上|反超|逆转.{0,8}?局势|扭转.{0,8}?战局|扭转.{0,8}?败局)", confidence: 0.8 },
    { source: "(绝地.{0,6}?重生|置之死地.{0,8}?而后生|背水一战|破釜沉舟)", confidence: 0.8 },
    { source: "(出乎.{0,5}?意料|意想不到.{0,8}?反转|惊天.{0,5}?逆转|惊天.{0,5}?反转)", confidence: 0.75 },
];
const RECOGNITION_PATTERNS = [
    { source: "(刮目相看|另眼相看|刮目|肃然起敬|心生敬畏|敬畏)", confidence: 0.85 },
    { source: "(名声.{0,8}?大噪|声名.{0,8}?鹊起|名扬.{0,8}?天下|一战成名|名动.{0,8}?四方)", confidence: 0.85 },
    { source: "(心服口服|甘拜下风|叹服|折服|心悦诚服|心服)", confidence: 0.8 },
    { source: "(威名|威望|声望.{0,8}?提升|威震.{0,8}?四方|名震.{0,8}?四方|威名远扬)", confidence: 0.75 },
    { source: "(认可|肯定|赞许|称赞|交口称赞|赞不绝口|嘉许)", confidence: 0.7 },
];
// ===========================================================================
// Part 3: Helper utilities
// ===========================================================================
/** Round to 2 decimal places. */
function round2(x) {
    return Math.round(x * 100) / 100;
}
/** Round to 3 decimal places. */
function round3(x) {
    return Math.round(x * 1000) / 1000;
}
/**
 * Build an excerpt: `radius` characters of context before the match,
 * the match itself, and `radius` characters after.
 */
function excerptAt(text, offset, matchLen, radius = 15) {
    const start = Math.max(0, offset - radius);
    const end = Math.min(text.length, offset + matchLen + radius);
    return text.slice(start, end);
}
/** Index of the last non-whitespace character, or -1 if the text is blank. */
function lastNonWhitespaceIndex(text) {
    for (let i = text.length - 1; i >= 0; i--) {
        if (!/\s/.test(text[i]))
            return i;
    }
    return -1;
}
/**
 * Scan a region of `text` for all matches of the given patterns.
 *
 * Matches starting at the same offset are de-duplicated, keeping the
 * one with the highest confidence (longest match wins on ties).
 *
 * @returns Raw hits with absolute offsets into `text`.
 */
function scanPatterns(text, patterns, region) {
    const { start, end } = region;
    if (start >= end)
        return [];
    const slice = text.slice(start, end);
    const hits = new Map();
    for (const pat of patterns) {
        const re = new RegExp(pat.source, "g");
        let m;
        while ((m = re.exec(slice)) !== null) {
            if (m[0].length === 0) {
                re.lastIndex++;
                continue;
            }
            const offset = start + m.index;
            const existing = hits.get(offset);
            if (!existing ||
                pat.confidence > existing.confidence ||
                (pat.confidence === existing.confidence &&
                    m[0].length > existing.matchLen)) {
                hits.set(offset, {
                    matchLen: m[0].length,
                    confidence: pat.confidence,
                });
            }
        }
    }
    const result = [];
    for (const [offset, info] of hits) {
        result.push({
            offset,
            matchLen: info.matchLen,
            confidence: info.confidence,
        });
    }
    return result;
}
/**
 * De-duplicate signals that share the same offset across different
 * sub-types, keeping the highest-confidence one. Positional types
 * (cliffhanger / suspense_opening) win ties over non-positional ones.
 */
function dedupeByOffset(signals, priority) {
    const byOffset = new Map();
    for (const s of signals) {
        const existing = byOffset.get(s.offset);
        if (!existing) {
            byOffset.set(s.offset, s);
            continue;
        }
        const sp = priority(s.type);
        const ep = priority(existing.type);
        if (s.confidence > existing.confidence ||
            (s.confidence === existing.confidence && sp > ep)) {
            byOffset.set(s.offset, s);
        }
    }
    return [...byOffset.values()].sort((a, b) => a.offset - b.offset);
}
/** Priority for hook sub-types (positional hooks win ties). */
function hookPriority(type) {
    switch (type) {
        case "cliffhanger":
            return 4;
        case "suspense_opening":
            return 3;
        case "foreshadow":
            return 2;
        case "mystery_question":
            return 1;
        default:
            return 0;
    }
}
/** All cool-point sub-types are equally specific. */
function coolPointPriority(_type) {
    return 1;
}
// ===========================================================================
// Part 4: Hook detectors
// ===========================================================================
/**
 * Detect cliffhanger hooks in the chapter tail.
 *
 * Scans the last ~15% (at least 300 chars) of the chapter for explicit
 * continuation markers and abrupt-cut cues, then applies structural
 * end-of-text checks (trailing ellipsis / em-dash / question mark) when
 * no strong signal already sits at the very end.
 */
function detectCliffhanger(text) {
    const signals = [];
    const tailLen = Math.min(text.length, Math.max(300, Math.floor(text.length * 0.15)));
    const region = { start: text.length - tailLen, end: text.length };
    for (const h of scanPatterns(text, CLIFFHANGER_PATTERNS, region)) {
        signals.push({
            type: "cliffhanger",
            offset: h.offset,
            excerpt: excerptAt(text, h.offset, h.matchLen),
            confidence: h.confidence,
        });
    }
    // Structural end-of-text checks.
    const endIdx = lastNonWhitespaceIndex(text);
    if (endIdx >= 0) {
        const hasNearEndSignal = signals.some((s) => s.offset <= endIdx && endIdx - s.offset < 30);
        if (!hasNearEndSignal) {
            const tail6 = text.slice(Math.max(0, endIdx - 5), endIdx + 1);
            if (/[…]+$/.test(tail6) || /\.{3,}$/.test(tail6)) {
                signals.push({
                    type: "cliffhanger",
                    offset: endIdx,
                    excerpt: excerptAt(text, endIdx, 1),
                    confidence: 0.7,
                });
            }
            else if (/—{1,2}$/.test(tail6) || /──$/.test(tail6)) {
                signals.push({
                    type: "cliffhanger",
                    offset: endIdx,
                    excerpt: excerptAt(text, endIdx, 1),
                    confidence: 0.7,
                });
            }
            else if (/[？?]$/.test(tail6)) {
                signals.push({
                    type: "cliffhanger",
                    offset: endIdx,
                    excerpt: excerptAt(text, endIdx, 1),
                    confidence: 0.65,
                });
            }
        }
    }
    return signals;
}
/**
 * Detect suspense-opening hooks in the chapter head.
 *
 * Scans the first ~10% (at least 200 chars) of the chapter for opening
 * crises, questions, and danger cues.
 */
function detectSuspenseOpening(text) {
    const headLen = Math.min(text.length, Math.max(200, Math.floor(text.length * 0.1)));
    const region = { start: 0, end: headLen };
    const signals = [];
    for (const h of scanPatterns(text, SUSPENSE_OPENING_PATTERNS, region)) {
        signals.push({
            type: "suspense_opening",
            offset: h.offset,
            excerpt: excerptAt(text, h.offset, h.matchLen),
            confidence: h.confidence,
        });
    }
    return signals;
}
/** Detect mystery-question hooks across the whole chapter. */
function detectMysteryQuestion(text) {
    const region = { start: 0, end: text.length };
    return scanPatterns(text, MYSTERY_QUESTION_PATTERNS, region).map((h) => ({
        type: "mystery_question",
        offset: h.offset,
        excerpt: excerptAt(text, h.offset, h.matchLen),
        confidence: h.confidence,
    }));
}
/** Detect foreshadowing cues across the whole chapter. */
function detectForeshadow(text) {
    const region = { start: 0, end: text.length };
    return scanPatterns(text, FORESHADOW_PATTERNS, region).map((h) => ({
        type: "foreshadow",
        offset: h.offset,
        excerpt: excerptAt(text, h.offset, h.matchLen),
        confidence: h.confidence,
    }));
}
const COOL_POINT_PATTERN_SETS = [
    { type: "face_slap", patterns: FACE_SLAP_PATTERNS },
    { type: "power_up", patterns: POWER_UP_PATTERNS },
    { type: "reveal", patterns: REVEAL_PATTERNS },
    { type: "revenge", patterns: REVENGE_PATTERNS },
    { type: "turnaround", patterns: TURNAROUND_PATTERNS },
    { type: "recognition", patterns: RECOGNITION_PATTERNS },
];
/**
 * Detect all cool-point types across the whole chapter.
 * Each pattern set is scanned independently and merged.
 */
function detectCoolPoints(text) {
    const region = { start: 0, end: text.length };
    const signals = [];
    for (const set of COOL_POINT_PATTERN_SETS) {
        for (const h of scanPatterns(text, set.patterns, region)) {
            signals.push({
                type: set.type,
                offset: h.offset,
                excerpt: excerptAt(text, h.offset, h.matchLen),
                confidence: h.confidence,
            });
        }
    }
    return signals;
}
// ===========================================================================
// Part 6: Density and distribution calculation
// ===========================================================================
/**
 * Compute the distribution of signals across three equal segments of the
 * chapter. Returns the share (0-1) of signals in each segment.
 */
function computeDistribution(signals, textLength) {
    if (textLength <= 0 || signals.length === 0) {
        return { beginning: 0, middle: 0, ending: 0 };
    }
    const third = Math.max(1, Math.floor(textLength / 3));
    let b = 0;
    let mid = 0;
    let e = 0;
    for (const s of signals) {
        if (s.offset < third)
            b++;
        else if (s.offset < third * 2)
            mid++;
        else
            e++;
    }
    const total = b + mid + e;
    return {
        beginning: round3(b / total),
        middle: round3(mid / total),
        ending: round3(e / total),
    };
}
// ===========================================================================
// Part 7: Summary generation
// ===========================================================================
const HOOK_LABELS = {
    cliffhanger: "悬念结尾",
    suspense_opening: "悬念开头",
    mystery_question: "谜题",
    foreshadow: "伏笔",
};
const COOL_POINT_LABELS = {
    face_slap: "打脸",
    power_up: "升级",
    reveal: "揭露",
    revenge: "复仇",
    turnaround: "逆转",
    recognition: "认可",
};
/** Build a "label×count、label×count" breakdown string. */
function breakdown(signals, labels) {
    const counts = new Map();
    for (const s of signals) {
        counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    }
    if (counts.size === 0)
        return "无";
    return [...counts.entries()]
        .map(([t, c]) => `${labels[t]}×${c}`)
        .join("、");
}
/**
 * Build a Chinese-language summary of the density analysis, including
 * counts, per-thousand-character densities, score, distribution, and a
 * brief pacing note.
 */
function buildSummary(hooks, coolPoints, hookDensity, coolPointDensity, densityScore, distribution) {
    const pct = (x) => `${Math.round(x * 100)}%`;
    const hookBreakdown = breakdown(hooks, HOOK_LABELS);
    const cpBreakdown = breakdown(coolPoints, COOL_POINT_LABELS);
    let note;
    if (densityScore < 0.3) {
        note = "节奏偏缓，爽点与悬念密度偏低，建议适度增加钩子与高潮。";
    }
    else if (densityScore > 0.7) {
        note = "节奏紧凑，爽点与悬念密集，注意避免审美疲劳。";
    }
    else {
        note = "节奏适中。";
    }
    const vals = [
        distribution.beginning,
        distribution.middle,
        distribution.ending,
    ];
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    if (maxV - minV > 0.4) {
        note += " 分布不均，存在明显的爽点/悬念集中段。";
    }
    return (`爽点密度分析：检测到${hooks.length}个Hook（${hookBreakdown}）与` +
        `${coolPoints.length}个爽点（${cpBreakdown}）；每千字Hook ` +
        `${round2(hookDensity).toFixed(2)}个、爽点` +
        `${round2(coolPointDensity).toFixed(2)}个，密度评分` +
        `${round2(densityScore).toFixed(2)}。分布：前段` +
        `${pct(distribution.beginning)}、中段${pct(distribution.middle)}、` +
        `后段${pct(distribution.ending)}。${note}`);
}
// ===========================================================================
// Part 8: Main orchestrator
// ===========================================================================
/** Empty result returned for blank / whitespace-only input. */
function emptyResult() {
    return {
        hooks: [],
        coolPoints: [],
        hookCount: 0,
        coolPointCount: 0,
        hookDensity: 0,
        coolPointDensity: 0,
        densityScore: 0,
        distribution: { beginning: 0, middle: 0, ending: 0 },
        summary: "爽点密度分析：文本为空，无检测结果。",
    };
}
/**
 * Analyze the hook and cool-point density of a chapter.
 *
 * This is the main entry point for the zero-LLM hook-density analyzer.
 * It scans the chapter content for narrative hooks and cool points using
 * pure regex/string patterns, then computes per-thousand-character
 * densities, a combined 0-1 density score, and a three-segment
 * distribution.
 *
 * @param chapterContent The full text of the chapter.
 * @param wordCount      Optional character count; defaults to
 *                       `chapterContent.length`. Pass an explicit value
 *                       when the caller already has a normalized count.
 * @returns A HookDensityResult with signals, metrics, and summary.
 */
export function analyzeHookDensity(chapterContent, wordCount) {
    const text = chapterContent ?? "";
    if (text.trim().length === 0) {
        return emptyResult();
    }
    // --- Hooks ---
    const rawHooks = [
        ...detectCliffhanger(text),
        ...detectSuspenseOpening(text),
        ...detectMysteryQuestion(text),
        ...detectForeshadow(text),
    ];
    const hooks = dedupeByOffset(rawHooks, hookPriority);
    // --- Cool points ---
    const rawCoolPoints = detectCoolPoints(text);
    const coolPoints = dedupeByOffset(rawCoolPoints, coolPointPriority);
    // --- Metrics ---
    const hookCount = hooks.length;
    const coolPointCount = coolPoints.length;
    const wc = wordCount ?? text.length;
    const kchars = wc > 0 ? wc / 1000 : 0;
    const hookDensity = kchars > 0 ? hookCount / kchars : 0;
    const coolPointDensity = kchars > 0 ? coolPointCount / kchars : 0;
    const densityScore = Math.min(1, (hookDensity * 0.4 + coolPointDensity * 0.6) / 3);
    // --- Distribution (hooks + cool points combined) ---
    const distribution = computeDistribution([...hooks, ...coolPoints], text.length);
    const summary = buildSummary(hooks, coolPoints, hookDensity, coolPointDensity, densityScore, distribution);
    return {
        hooks,
        coolPoints,
        hookCount,
        coolPointCount,
        hookDensity: round2(hookDensity),
        coolPointDensity: round2(coolPointDensity),
        densityScore: round2(densityScore),
        distribution,
        summary,
    };
}
//# sourceMappingURL=hook-density.js.map