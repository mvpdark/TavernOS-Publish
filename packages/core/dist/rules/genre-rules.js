// packages/core/src/rules/genre-rules.ts
//
// Genre rules registry — the three-layer genre rules system.
//
// Layer 1: Universal rules (apply to every book)
//   Basic writing quality rules: no list-style narrative, show-don't-tell,
//   sentence length variation, no meta-commentary.
//
// Layer 2: Genre-specific rules (apply based on the book's genre)
//   玄幻/仙侠: power scaling, cultivation naming, no modern slang
//   都市: modern setting consistency, no unexplained supernatural, social hierarchy
//   科幻: tech consistency, no unexplained magic, scientific plausibility
//   悬疑/推理: fair play mystery, no sudden revelations, timeline consistency
//   言情: relationship consistency, emotional pacing, no forced conflict
//
// Layer 3: Book-specific rules (from book-rules.md)
//   Custom rules authored per-book. Read from the existing book-rules.md
//   file and integrated into the prompt. Checks are passthrough (the
//   book-rules.md is free-form markdown; string matching is impractical).
//
// All checks are string-based (regex/keyword matching), NOT LLM calls.
// Rules are conservative — they only flag clear violations.
/**
 * Alias mapping from free-form genre strings to canonical genre ids.
 * The genre field in a Blueprint is free-form text (e.g. "玄幻", "都市异能",
 * "sci-fi"), so we normalize it to a canonical id before selecting rules.
 */
const GENRE_ALIASES = {
    xuanhuan: [
        "玄幻", "仙侠", "修仙", "修真", "奇幻", "东方玄幻", "异世大陆",
        "xuanhuan", "xianxia", "fantasy",
    ],
    urban: [
        "都市", "现代", "都市言情", "都市异能", "现实", "青春",
        "urban", "modern", "contemporary",
    ],
    scifi: [
        "科幻", "末世", "星际", "未来", "赛博", "废土",
        "scifi", "sci-fi", "science fiction", "cyberpunk",
    ],
    mystery: [
        "悬疑", "推理", "侦探", "探案", "惊悚",
        "mystery", "detective", "thriller", "suspense",
    ],
    romance: [
        "言情", "纯爱", "恋爱", "甜文", "虐恋",
        "romance", "love", "yaoi", "bl", "gl",
    ],
};
/**
 * Normalize a free-form genre string to a canonical genre id.
 * Returns undefined when the genre doesn't match any known category.
 *
 * @example
 * normalizeGenre("玄幻") // "xuanhuan"
 * normalizeGenre("都市异能") // "urban"
 * normalizeGenre("未知类型") // undefined
 */
export function normalizeGenre(genre) {
    const lower = genre.toLowerCase().trim();
    if (!lower)
        return undefined;
    for (const [canonical, aliases] of Object.entries(GENRE_ALIASES)) {
        if (aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
            return canonical;
        }
    }
    return undefined;
}
// ---------------------------------------------------------------------------
// Helper: safe regex matcher
// ---------------------------------------------------------------------------
/**
 * Find all matches of a regex in text, returning an array of match strings.
 * Wrapped in try/catch so a malformed regex never crashes a rule check.
 */
function safeMatchAll(text, pattern) {
    try {
        const matches = [];
        // Reset lastIndex for sticky/global regexes.
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(text)) !== null) {
            matches.push(m[0]);
            // Prevent infinite loop on zero-length matches.
            if (m.index === pattern.lastIndex)
                pattern.lastIndex++;
        }
        return matches;
    }
    catch {
        return [];
    }
}
// ---------------------------------------------------------------------------
// Layer 1: Universal rules (apply to every book)
// ---------------------------------------------------------------------------
/**
 * Universal rule: no list-style structure in narrative.
 * Flags markdown-style numbered or bulleted lists that indicate the writer
 * is structuring the narrative as a list rather than prose.
 */
const noListStructureRule = {
    id: "universal-no-list-structure",
    description: "正文不得使用列表式结构（如1. 2. 3.或- *开头的条目），应以散文体叙事",
    severity: "error",
    layer: "universal",
    check: (text) => {
        // Match lines that start with a number-dot or bullet, but only when
        // there are at least 2 such lines (a single bullet might be dialogue).
        const listPattern = /^\s*(?:\d+[.、]\s+|[-*•]\s+)/gm;
        const matches = safeMatchAll(text, listPattern);
        if (matches.length < 2)
            return [];
        return matches.slice(0, 5).map((match) => ({
            ruleId: "universal-no-list-structure",
            severity: "error",
            message: `列表式结构出现在正文中（${matches.length}处），应改为散文体叙述`,
            location: match.trim(),
        }));
    },
};
/**
 * Universal rule: show don't tell for emotions.
 * Flags direct emotion statements ("他感到很愤怒") that should instead be
 * conveyed through action and detail. Conservative: only flags the most
 * common "telling" patterns.
 */
const showDontTellRule = {
    id: "universal-show-dont-tell",
    description: "展示而非陈述情感——用动作、表情、细节传达情绪，避免直接说「他感到很XX」",
    severity: "warning",
    layer: "universal",
    check: (text) => {
        // Match common "telling" patterns for emotions.
        const tellPattern = /(?:他|她|它|这|那)(?:个)?(?:感到|觉得|感觉|心中|内心)(?:很|十分|非常|特别|无比)?(?:愤怒|高兴|悲伤|害怕|紧张|激动|失望|惊讶|开心|难过|愤怒|恐惧|焦虑|兴奋|孤独|寂寞|幸福|温暖|寒冷|痛苦|快乐|欣慰|无奈|尴尬|羞愧|自豪|嫉妒|羡慕)/g;
        const matches = safeMatchAll(text, tellPattern);
        if (matches.length === 0)
            return [];
        // Conservative: only flag when there are 3+ instances (once or twice
        // is acceptable; a pattern of telling is the real problem).
        if (matches.length < 3)
            return [];
        return matches.slice(0, 5).map((match) => ({
            ruleId: "universal-show-dont-tell",
            severity: "warning",
            message: `情感陈述过多（${matches.length}处"感到/觉得"式直白表达），建议用动作和细节展示情感`,
            location: match,
        }));
    },
};
/**
 * Universal rule: vary sentence length.
 * Flags chapters where all sentences are nearly the same length, which
 * produces a monotonous rhythm. Checks the standard deviation of sentence
 * lengths; flags when it's very low.
 */
const varySentenceLengthRule = {
    id: "universal-vary-sentence-length",
    description: "句子长度应有变化——长短句交替，避免所有句子长度一致导致节奏单调",
    severity: "info",
    layer: "universal",
    check: (text) => {
        // Split into sentences by Chinese sentence-ending punctuation.
        const sentences = text
            .split(/[。！？\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        if (sentences.length < 10)
            return [];
        const lengths = sentences.map((s) => s.length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        if (mean < 5)
            return [];
        const variance = lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) /
            lengths.length;
        const stddev = Math.sqrt(variance);
        // Flag when the coefficient of variation is very low (< 0.3 means
        // sentences are nearly uniform in length).
        const cv = stddev / mean;
        if (cv >= 0.3)
            return [];
        return [
            {
                ruleId: "universal-vary-sentence-length",
                severity: "info",
                message: `句子长度变化不足（平均${mean.toFixed(0)}字，标准差${stddev.toFixed(1)}），建议长短句交替增强节奏感`,
                location: `${sentences[0].slice(0, 20)}...`,
            },
        ];
    },
};
/**
 * Universal rule: no meta-commentary.
 * Flags phrases where the narrator breaks the fourth wall or references
 * the writing itself ("本章", "读者", "作者", "下一章").
 */
const noMetaCommentaryRule = {
    id: "universal-no-meta-commentary",
    description: "禁止元叙事/打破第四面墙——不得出现「第X章」「本章」「读者」「作者」「下一章」「悬念钩子」「章节钩子」「短句加速」等元评论或写作笔记",
    severity: "error",
    layer: "universal",
    check: (text) => {
        const metaPatterns = [
            // Basic fourth-wall breaks
            /(?:本章|下一章|上一章|读者|作者|本书|故事到此|前文提到|后文|下文将|如前所述|本章小结|至此)/g,
            // Chapter number references in prose (e.g. "第十八章", "第18章", "第二十章")
            // These should NEVER appear in narrative prose — they are context-injection
            // artifacts that the model copies from the "### 第N章" context headers.
            /(?:第[一二三四五六七八九十百零\d]+章)/g,
            // "从第X章的..." — the most common context-injection artifact pattern
            /从第[一二三四五六七八九十百零\d]+章/g,
            // Writing-note leakage (CRITICAL: these are author/editor notes that must never appear in prose)
            /(?:悬念钩子|章节钩子|钩子埋下|伏笔埋下|短句加速|比喻减速|动作场景中|计划分三步|下一步计划|本章完|待续)/g,
            // Director/Outline language
            /(?:战斗在[^。！？]{0,10}(?:展开|升级|拉锯|高潮|继续))/g,
            /(?:场景切换|镜头一转|画外音|旁白)/g,
        ];
        const matches = [];
        for (const pat of metaPatterns) {
            const found = safeMatchAll(text, pat);
            matches.push(...found);
        }
        if (matches.length === 0)
            return [];
        return matches.slice(0, 5).map((match) => ({
            ruleId: "universal-no-meta-commentary",
            severity: "error",
            message: `元叙事/写作笔记泄漏："${match.trim()}"——这是作者笔记或导演指令，绝对不能出现在小说正文中`,
            location: match.trim(),
        }));
    },
};
/** All universal rules, applied to every book. */
export const UNIVERSAL_RULES = [
    noListStructureRule,
    showDontTellRule,
    varySentenceLengthRule,
    noMetaCommentaryRule,
];
// ---------------------------------------------------------------------------
// Layer 2: Genre-specific rules
// ---------------------------------------------------------------------------
// --- 玄幻/仙侠 (xuanhuan) ---
/**
 * Xuanhuan rule: no modern slang in ancient settings.
 * Flags modern technology terms and internet slang that break immersion
 * in a cultivation/ancient-fantasy setting.
 */
const xuanhuanNoModernSlangRule = {
    id: "xuanhuan-no-modern-slang",
    description: "玄幻/仙侠不得出现现代词汇——如「手机」「网络」「OK」「点赞」等，保持古风语境",
    severity: "error",
    layer: "genre",
    genre: "xuanhuan",
    check: (text) => {
        const modernTerms = [
            "手机", "电脑", "网络", "互联网", "微信", "QQ", "微博",
            "朋友圈", "直播", "网红", "粉丝", "点赞", "wifi", "WiFi",
            "OK", "ok", "cool", "APP", "app", "视频", "短视频",
            "快递", "外卖", "支付宝", "淘宝", "京东",
            "程序", "代码", "服务器", "数据库",
        ];
        const found = [];
        for (const term of modernTerms) {
            if (text.includes(term))
                found.push(term);
        }
        if (found.length === 0)
            return [];
        return found.slice(0, 5).map((term) => ({
            ruleId: "xuanhuan-no-modern-slang",
            severity: "error",
            message: `玄幻/仙侠背景中出现现代词汇"${term}"，破坏古风语境`,
            location: term,
        }));
    },
};
/**
 * Xuanhuan rule: power scaling consistency.
 * Flags potential power-level jumps where a character defeats an opponent
 * described as far stronger without any explanation keywords (breakthrough,
 * epiphany, treasure, inheritance, etc.).
 */
const xuanhuanPowerScalingRule = {
    id: "xuanhuan-power-scaling",
    description: "战力体系不得无故跳级——击败远超自身境界的对手必须有合理解释（突破/奇遇/秘宝/传承等）",
    severity: "warning",
    layer: "genre",
    genre: "xuanhuan",
    check: (text) => {
        // Look for patterns where someone defeats a much stronger opponent.
        const defeatPattern = /(?:击杀|击败|斩杀|打败|秒杀|碾压)(.{0,30}?)(?:境|阶|级|重)的/g;
        const explanationKeywords = [
            "突破", "顿悟", "奇遇", "机缘", "秘宝", "传承", "觉醒",
            "血脉", "吞噬", "炼化", "融合", "晋升", "进阶", "越级",
        ];
        const matches = safeMatchAll(text, defeatPattern);
        if (matches.length === 0)
            return [];
        // Check if any explanation keyword appears within a window around the match.
        const violations = [];
        for (const match of matches) {
            const idx = text.indexOf(match);
            if (idx < 0)
                continue;
            const window = text.slice(Math.max(0, idx - 100), idx + 100);
            const hasExplanation = explanationKeywords.some((kw) => window.includes(kw));
            if (!hasExplanation) {
                violations.push({
                    ruleId: "xuanhuan-power-scaling",
                    severity: "warning",
                    message: `疑似战力跳级（"${match.trim()}"），未发现突破/奇遇/秘宝等解释`,
                    location: match.trim(),
                });
            }
        }
        return violations.slice(0, 3);
    },
};
/**
 * Xuanhuan rule: cultivation stage naming consistency.
 * Flags mixed naming conventions for cultivation stages (e.g. using both
 * "练气期" and "炼气境" in the same text).
 */
const xuanhuanCultivationNamingRule = {
    id: "xuanhuan-cultivation-naming",
    description: "修炼境界命名需统一——如使用「练气期」则全书一致，不得混用「练气境」「练气阶」等",
    severity: "info",
    layer: "genre",
    genre: "xuanhuan",
    check: (text) => {
        // Common cultivation stages and their suffix variants.
        const stagePrefixes = [
            "练气", "炼气", "筑基", "金丹", "元婴", "化神",
            "炼虚", "合体", "大乘", "渡劫", "凡人", "散仙",
        ];
        const suffixVariants = ["期", "境", "阶", "层", "级"];
        const suffixCounts = {};
        for (const prefix of stagePrefixes) {
            for (const suffix of suffixVariants) {
                const term = `${prefix}${suffix}`;
                if (text.includes(term)) {
                    if (!suffixCounts[suffix])
                        suffixCounts[suffix] = new Set();
                    suffixCounts[suffix].add(prefix);
                }
            }
        }
        const usedSuffixes = Object.keys(suffixCounts);
        if (usedSuffixes.length <= 1)
            return [];
        // Flag when multiple suffix conventions are used for the same stages.
        return [
            {
                ruleId: "xuanhuan-cultivation-naming",
                severity: "info",
                message: `修炼境界后缀不统一（同时使用${usedSuffixes.map((s) => `"${s}"`).join("、")}），建议全书统一`,
                location: usedSuffixes.join("/"),
            },
        ];
    },
};
// --- 都市 (urban) ---
/**
 * Urban rule: no unexplained supernatural elements.
 * Flags cultivation/supernatural terms in a modern urban setting unless
 * the story bible establishes them as part of the world.
 */
const urbanNoSupernaturalRule = {
    id: "urban-no-supernatural",
    description: "都市背景除非设定中明确建立超自然体系，否则不得出现修炼/灵气/法术等超自然元素",
    severity: "warning",
    layer: "genre",
    genre: "urban",
    check: (text, context) => {
        // If the story bible mentions supernatural elements, skip this check.
        const bible = context?.storyBible ?? "";
        const supernaturalKeywords = [
            "修炼", "灵气", "仙", "魔", "法术", "内力", "真气",
            "丹药", "阵法", "符箓", "妖兽", "灵石", "境界",
        ];
        const bibleHasSupernatural = supernaturalKeywords.some((kw) => bible.includes(kw));
        if (bibleHasSupernatural)
            return [];
        // Check the chapter text for supernatural terms.
        const found = [];
        for (const kw of supernaturalKeywords) {
            if (text.includes(kw))
                found.push(kw);
        }
        if (found.length === 0)
            return [];
        return found.slice(0, 3).map((kw) => ({
            ruleId: "urban-no-supernatural",
            severity: "warning",
            message: `都市背景出现超自然元素"${kw}"，但故事设定未建立超自然体系`,
            location: kw,
        }));
    },
};
/**
 * Urban rule: modern setting consistency.
 * Info-level prompt rule ensuring the modern setting details are consistent.
 */
const urbanModernConsistencyRule = {
    id: "urban-modern-consistency",
    description: "都市背景需保持现代社会设定一致性——科技水平、社会制度、法律体系应与现实相符",
    severity: "info",
    layer: "genre",
    genre: "urban",
    check: () => [],
};
/**
 * Urban rule: realistic social hierarchy.
 * Info-level prompt rule ensuring social interactions are realistic.
 */
const urbanSocialHierarchyRule = {
    id: "urban-social-hierarchy",
    description: "都市文社会关系需符合现实逻辑——职场层级、家庭关系、社交礼仪应真实可信",
    severity: "info",
    layer: "genre",
    genre: "urban",
    check: () => [],
};
// --- 科幻 (scifi) ---
/**
 * Scifi rule: no unexplained magic.
 * Flags magic/cultivation terms in a sci-fi setting unless explained as
 * technology or established in the story bible.
 */
const scifiNoMagicRule = {
    id: "scifi-no-magic",
    description: "科幻背景不得出现魔法/修仙等超自然元素，除非以科技原理解释（如基因改造、纳米技术、量子效应）",
    severity: "warning",
    layer: "genre",
    genre: "scifi",
    check: (text, context) => {
        const bible = context?.storyBible ?? "";
        const magicKeywords = [
            "魔法", "法术", "修仙", "灵气", "仙", "魔",
            "咒语", "施法", "法力", "神力", "神术",
        ];
        // If the story bible establishes magic as tech-based, skip.
        const techExplanationKeywords = [
            "基因", "纳米", "量子", "科技", "技术", "改造",
            "植入", "芯片", "能量场", "力场", "生物技术",
        ];
        const bibleExplainsMagic = magicKeywords.some((kw) => bible.includes(kw)) && techExplanationKeywords.some((kw) => bible.includes(kw));
        if (bibleExplainsMagic)
            return [];
        const found = [];
        for (const kw of magicKeywords) {
            if (text.includes(kw))
                found.push(kw);
        }
        if (found.length === 0)
            return [];
        return found.slice(0, 3).map((kw) => ({
            ruleId: "scifi-no-magic",
            severity: "warning",
            message: `科幻背景出现超自然元素"${kw}"，未以科技原理解释`,
            location: kw,
        }));
    },
};
/**
 * Scifi rule: technology consistency.
 * Info-level prompt rule ensuring technology is consistent.
 */
const scifiTechConsistencyRule = {
    id: "scifi-tech-consistency",
    description: "科幻设定中的技术水平需前后一致——已设定的科技能力不得无故消失或矛盾",
    severity: "info",
    layer: "genre",
    genre: "scifi",
    check: () => [],
};
/**
 * Scifi rule: scientific plausibility.
 * Info-level prompt rule ensuring scientific plausibility.
 */
const scifiScientificPlausibilityRule = {
    id: "scifi-scientific-plausibility",
    description: "科幻设定应有科学合理性——即使虚构也需自洽，避免明显违背物理常识的设定",
    severity: "info",
    layer: "genre",
    genre: "scifi",
    check: () => [],
};
// --- 悬疑/推理 (mystery) ---
/**
 * Mystery rule: no sudden revelations without setup.
 * Flags "sudden realization" patterns that introduce key plot elements
 * without prior setup, violating fair-play mystery conventions.
 */
const mysteryNoSuddenRevelationRule = {
    id: "mystery-no-sudden-revelation",
    description: "悬疑/推理禁止突兀揭秘——关键线索和真相必须有前置铺垫，不得靠「突然发现」「猛然想起」推进",
    severity: "warning",
    layer: "genre",
    genre: "mystery",
    check: (text) => {
        const suddenPattern = /(?:突然|忽然|猛然|猛地|蓦然|霎时)(?:发现|想起|意识到|忆起|察觉|明白|想通了)/g;
        const matches = safeMatchAll(text, suddenPattern);
        if (matches.length === 0)
            return [];
        // Conservative: only flag when there are 2+ sudden revelation patterns.
        if (matches.length < 2)
            return [];
        return matches.slice(0, 3).map((match) => ({
            ruleId: "mystery-no-sudden-revelation",
            severity: "warning",
            message: `悬疑文中出现${matches.length}处"突然发现/想起"式揭秘，关键信息应前置铺垫`,
            location: match,
        }));
    },
};
/**
 * Mystery rule: fair play mystery.
 * Info-level prompt rule ensuring all clues are present for the reader.
 */
const mysteryFairPlayRule = {
    id: "mystery-fair-play",
    description: "推理需遵循公平原则——所有破案线索必须在揭秘前呈现给读者，不得隐瞒关键证据",
    severity: "info",
    layer: "genre",
    genre: "mystery",
    check: () => [],
};
/**
 * Mystery rule: timeline consistency.
 * Info-level prompt rule ensuring timeline consistency.
 */
const mysteryTimelineConsistencyRule = {
    id: "mystery-timeline-consistency",
    description: "悬疑/推理时间线必须严密一致——事件发生顺序、时间间隔不得矛盾",
    severity: "info",
    layer: "genre",
    genre: "mystery",
    check: () => [],
};
// --- 言情 (romance) ---
/**
 * Romance rule: no forced conflict.
 * Flags forced misunderstanding patterns that create artificial conflict
 * without emotional basis.
 */
const romanceNoForcedConflictRule = {
    id: "romance-no-forced-conflict",
    description: "言情文禁止强行制造冲突——不得用「突然误会」「无端争吵」等生硬方式制造矛盾",
    severity: "warning",
    layer: "genre",
    genre: "romance",
    check: (text) => {
        const forcedPattern = /(?:突然|无端|莫名|无缘无故)(?:误会|争吵|吵架|翻脸|生气|发火|冷战)/g;
        const matches = safeMatchAll(text, forcedPattern);
        if (matches.length === 0)
            return [];
        return matches.slice(0, 3).map((match) => ({
            ruleId: "romance-no-forced-conflict",
            severity: "warning",
            message: `言情文中出现生硬冲突制造（"${match}"），矛盾应有情感基础`,
            location: match,
        }));
    },
};
/**
 * Romance rule: relationship consistency.
 * Info-level prompt rule ensuring character relationships are consistent.
 */
const romanceRelationshipConsistencyRule = {
    id: "romance-relationship-consistency",
    description: "角色关系发展需连贯一致——感情升温有铺垫，不得突然亲密或无缘疏远",
    severity: "info",
    layer: "genre",
    genre: "romance",
    check: () => [],
};
/**
 * Romance rule: emotional pacing.
 * Info-level prompt rule ensuring emotional pacing is appropriate.
 */
const romanceEmotionalPacingRule = {
    id: "romance-emotional-pacing",
    description: "情感节奏需合理把控——甜蜜与虐心交替有度，避免情绪密度过高或过低",
    severity: "info",
    layer: "genre",
    genre: "romance",
    check: () => [],
};
// ---------------------------------------------------------------------------
// Genre rules registry
// ---------------------------------------------------------------------------
/**
 * All genre-specific rules, keyed by canonical genre id.
 * Access via GENRE_RULES[canonicalGenre] to get the rules for a genre.
 */
export const GENRE_RULES = {
    xuanhuan: [
        xuanhuanNoModernSlangRule,
        xuanhuanPowerScalingRule,
        xuanhuanCultivationNamingRule,
    ],
    urban: [
        urbanNoSupernaturalRule,
        urbanModernConsistencyRule,
        urbanSocialHierarchyRule,
    ],
    scifi: [
        scifiNoMagicRule,
        scifiTechConsistencyRule,
        scifiScientificPlausibilityRule,
    ],
    mystery: [
        mysteryNoSuddenRevelationRule,
        mysteryFairPlayRule,
        mysteryTimelineConsistencyRule,
    ],
    romance: [
        romanceNoForcedConflictRule,
        romanceRelationshipConsistencyRule,
        romanceEmotionalPacingRule,
    ],
};
// ---------------------------------------------------------------------------
// Layer 3: Book-specific rules (from book-rules.md)
// ---------------------------------------------------------------------------
/**
 * Parse book-rules.md content into rule descriptions (bullet points).
 * Extracts lines starting with "-" from the markdown and returns them as
 * description strings. These are injected into the writer prompt but do
 * not have check functions (book-rules.md is free-form; regex matching
 * is impractical for author-authored rules).
 *
 * @returns array of rule description strings extracted from book-rules.md
 */
export function parseBookRules(bookRulesText) {
    if (!bookRulesText?.trim())
        return [];
    const lines = bookRulesText.split("\n");
    const rules = [];
    for (const line of lines) {
        const trimmed = line.trim();
        // Match bullet points: "- text" or "* text"
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const ruleText = trimmed.slice(2).trim();
            if (ruleText)
                rules.push(ruleText);
        }
    }
    return rules;
}
// ---------------------------------------------------------------------------
// Prompt assembly — for the writer's 【创作规则】 section
// ---------------------------------------------------------------------------
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
export function assembleGenreRulesPrompt(params) {
    const lines = [];
    // Layer 1: Universal rules
    for (const rule of UNIVERSAL_RULES) {
        lines.push(`- ${rule.description}`);
    }
    // Layer 2: Genre-specific rules
    const canonical = params.genre ? normalizeGenre(params.genre) : undefined;
    if (canonical) {
        const genreRules = GENRE_RULES[canonical] ?? [];
        for (const rule of genreRules) {
            lines.push(`- ${rule.description}`);
        }
    }
    // Layer 3: Book-specific rules (from book-rules.md)
    const bookRuleDescriptions = parseBookRules(params.bookRules ?? "");
    for (const desc of bookRuleDescriptions) {
        lines.push(`- ${desc}`);
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Check runner — for the auditor's post-LLM genre rule checks
// ---------------------------------------------------------------------------
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
export function runGenreRuleChecks(params) {
    const { text, context } = params;
    const rules = [...UNIVERSAL_RULES];
    // Add genre-specific rules.
    const canonical = params.genre ? normalizeGenre(params.genre) : undefined;
    if (canonical && GENRE_RULES[canonical]) {
        rules.push(...GENRE_RULES[canonical]);
    }
    const violations = [];
    for (const rule of rules) {
        try {
            const ruleViolations = rule.check(text, context);
            violations.push(...ruleViolations);
        }
        catch {
            // Individual rule check failures are non-fatal — skip and continue.
        }
    }
    return violations;
}
/**
 * Get all applicable rules for a given genre (universal + genre-specific).
 * Useful for introspection and UI display.
 *
 * @param genre free-form genre string
 * @returns array of all applicable GenreRule objects
 */
export function getApplicableRules(genre) {
    const rules = [...UNIVERSAL_RULES];
    const canonical = genre ? normalizeGenre(genre) : undefined;
    if (canonical && GENRE_RULES[canonical]) {
        rules.push(...GENRE_RULES[canonical]);
    }
    return rules;
}
//# sourceMappingURL=genre-rules.js.map