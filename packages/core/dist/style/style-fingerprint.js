// packages/core/src/style/style-fingerprint.ts
// Style fingerprinting & clone analysis — generates a unique "fingerprint"
// of an author's writing style and computes similarity between styles.
// Used for style cloning: analyze a reference text, generate a fingerprint,
// then guide the writer to match the target style.
//
// Pure statistics, zero LLM cost.
import { detectLanguage } from "./style-analyzer.js";
// -------------------------------------------------------------------------
// Lexicon — sensory & emotional word lists
// -------------------------------------------------------------------------
/** Chinese sensory words: sight, sound, touch, smell, taste, temperature. */
const ZH_SENSORY_WORDS = [
    "看", "见", "望", "瞧", "瞅", "瞄", "瞪", "盯",
    "听", "闻", "尝", "触", "摸", "感", "觉",
    "冷", "热", "温", "凉", "寒", "烫",
    "痛", "痒", "酸", "麻", "软", "硬",
    "滑", "粗糙", "光滑", "黏",
    "香", "臭", "腥", "甜", "苦", "辣", "咸", "淡",
    "亮", "暗", "明", "响", "静", "刺眼", "耀眼",
];
/** Chinese emotional words: anger, joy, sadness, fear, surprise, love, hate, worry. */
const ZH_EMOTIONAL_WORDS = [
    "怒", "愤", "恼", "躁",
    "喜", "乐", "欢", "愉", "悦",
    "悲", "哀", "伤", "痛", "泣", "泪",
    "恐", "惧", "怕", "慌",
    "惊", "讶", "愣", "骇",
    "爱", "恋", "慕",
    "恨", "怨", "仇",
    "忧", "愁", "虑",
    "悔", "憾", "愧", "羞", "耻",
    "妒", "嫉",
    "慰", "欣",
    "悸", "颤", "抖",
    "狂", "醉", "痴",
];
/** English sensory words (subset for English text support). */
const EN_SENSORY_WORDS = [
    "see", "saw", "look", "watch", "stare", "gaze", "glance",
    "hear", "listen", "sound",
    "smell", "scent", "aroma",
    "taste", "flavor",
    "touch", "feel", "warm", "cold", "hot", "cool",
    "soft", "hard", "smooth", "rough", "sharp",
    "bright", "dark", "loud", "quiet", "silent",
];
/** English emotional words (subset). */
const EN_EMOTIONAL_WORDS = [
    "angry", "fury", "rage", "annoyed",
    "happy", "joy", "glad", "delight",
    "sad", "sorrow", "grief", "cry", "tear",
    "fear", "afraid", "scared", "terrified", "panic",
    "surprise", "shock", "astonish", "stun",
    "love", "adore", "cherish",
    "hate", "resent", "despise",
    "worry", "anxious", "concern",
    "regret", "guilt", "shame",
    "envy", "jealous",
];
// -------------------------------------------------------------------------
// Rhetorical patterns (count-based, for fingerprint use)
// -------------------------------------------------------------------------
const ZH_RHETORICAL_PATTERNS = [
    { name: "比喻", pattern: /[像如仿佛似](?:是|同|一般|一样)/g },
    { name: "排比", pattern: /[，。；]([^，。；]{2,6})[，。；]\1/g },
    { name: "反问", pattern: /难道|怎么可能|岂不是|何尝不/g },
    { name: "夸张", pattern: /天崩地裂|惊天动地|翻天覆地|震耳欲聋|排山倒海/g },
    { name: "拟人", pattern: /[风雨雪月花树草石](?:在|像|仿佛).*?(?:笑|哭|叹|呻|吟|怒|舞)/g },
    { name: "短句节奏", pattern: /[。！？][^。！？]{1,8}[。！？]/g },
    { name: "对偶", pattern: /([^，。；]{2,8})[，]([^，。；]{2,8})[。！？]/g },
];
const EN_RHETORICAL_PATTERNS = [
    { name: "simile", pattern: /\b(?:like|as if|as though)\b/gi },
    { name: "rhetorical question", pattern: /\b(?:why|what|how|who)\b.*?\?/gi },
    { name: "tricolon", pattern: /[^.]{3,20},[^.]{3,20},[^.]{3,20}\./g },
    { name: "short punchy rhythm", pattern: /[.!]\s[A-Z][^.!?]{3,15}[.!]/g },
];
// -------------------------------------------------------------------------
// Utility functions
// -------------------------------------------------------------------------
/**
 * Count occurrences of a list of keyword/character patterns in text.
 * Each entry in the list is matched as a substring search.
 */
function countKeywordMatches(text, words) {
    let count = 0;
    for (const word of words) {
        let idx = text.indexOf(word);
        while (idx !== -1) {
            count++;
            idx = text.indexOf(word, idx + word.length);
        }
    }
    return count;
}
/**
 * Split text into sentences.
 * Chinese: split on 。！？\n
 * English: split on .!?\n
 */
function splitSentences(text, lang) {
    const delimiter = lang === "zh" ? /[。！？\n]+/ : /[.!?\n]+/;
    return text
        .split(delimiter)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
/**
 * Split text into paragraphs (double newline).
 */
function splitParagraphs(text) {
    return text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
}
/**
 * Count units (chars for Chinese, words for English) in a text segment.
 */
function countUnits(text, lang) {
    if (lang === "zh") {
        return (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
    }
    return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}
/**
 * Calculate standard deviation.
 */
function stdDev(values) {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}
/**
 * Extract dialogue segments from text.
 * Supports Chinese quotes "" and '' and English quotes "" and ''.
 * Returns an array of dialogue text (content inside quotes).
 */
function extractDialogue(text) {
    const segments = [];
    // Chinese full-width quotes: "..." and '...'
    const zhDouble = text.match(/[\u201c\u300c\u300e].*?[\u201d\u300d\u300f]/g);
    if (zhDouble)
        segments.push(...zhDouble);
    // Also match straight quotes used as dialogue: "..."
    const enDouble = text.match(/"[^"]*"/g);
    if (enDouble)
        segments.push(...enDouble);
    return segments;
}
/**
 * Detect rhetorical features and return name+count pairs.
 */
function detectRhetoricalCounts(text, lang) {
    const patterns = lang === "zh" ? ZH_RHETORICAL_PATTERNS : EN_RHETORICAL_PATTERNS;
    const results = [];
    for (const { name, pattern } of patterns) {
        const matches = text.match(pattern);
        const count = matches ? matches.length : 0;
        if (count > 0) {
            results.push({ name, count });
        }
    }
    return results.sort((a, b) => b.count - a.count).slice(0, 10);
}
/**
 * Calculate vocabulary richness (Type-Token Ratio).
 * Chinese: character-level. English: word-level.
 */
function calculateVocabularyRichness(text, lang) {
    if (lang === "zh") {
        const chars = text.replace(/[\s\d\p{P}]/gu, "").split("");
        if (chars.length === 0)
            return 0;
        return new Set(chars).size / chars.length;
    }
    const words = (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).map((w) => w.toLowerCase());
    if (words.length === 0)
        return 0;
    return new Set(words).size / words.length;
}
/**
 * Count punctuation characters in text.
 */
function countPunctuation(text) {
    return (text.match(/[\p{P}]/gu) ?? []).length;
}
/**
 * Compute FNV-1a hash (32-bit) and return the first 8 hex characters.
 */
function fnv1aHash(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        // FNV prime multiplication: hash *= 0x01000193, keeping 32-bit.
        hash = Math.imul(hash, 0x01000193);
    }
    // Convert to unsigned 32-bit hex string.
    return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}
// -------------------------------------------------------------------------
// Main fingerprint generation
// -------------------------------------------------------------------------
/**
 * Generate a style fingerprint from text.
 * Pure statistics, zero LLM cost.
 *
 * @param text The text to fingerprint.
 * @param profile Optional pre-computed style profile (used for language hint).
 */
export function generateFingerprint(text, profile) {
    const lang = profile?.language ?? detectLanguage(text);
    const trimmed = text.trim();
    // --- Sentence length buckets ---
    const sentences = splitSentences(trimmed, lang);
    const sentenceLengths = sentences.map((s) => countUnits(s, lang));
    const totalSentences = sentenceLengths.length;
    const buckets = [0, 0, 0, 0, 0];
    for (const len of sentenceLengths) {
        if (len <= 10)
            buckets[0]++;
        else if (len <= 20)
            buckets[1]++;
        else if (len <= 40)
            buckets[2]++;
        else if (len <= 60)
            buckets[3]++;
        else
            buckets[4]++;
    }
    const sentenceLengthBuckets = totalSentences > 0
        ? [
            buckets[0] / totalSentences,
            buckets[1] / totalSentences,
            buckets[2] / totalSentences,
            buckets[3] / totalSentences,
            buckets[4] / totalSentences,
        ]
        : [0, 0, 0, 0, 0];
    // --- Paragraph length ---
    const paragraphs = splitParagraphs(trimmed);
    const paragraphLengths = paragraphs.map((p) => countUnits(p, lang));
    const paragraphLength = {
        avg: paragraphLengths.length > 0
            ? paragraphLengths.reduce((s, v) => s + v, 0) / paragraphLengths.length
            : 0,
        std: stdDev(paragraphLengths),
    };
    // --- Dialogue analysis ---
    const dialogueSegments = extractDialogue(trimmed);
    const dialogueCharCount = dialogueSegments.reduce((sum, seg) => sum + seg.length, 0);
    const totalChars = trimmed.length;
    const dialogueRatio = totalChars > 0 ? dialogueCharCount / totalChars : 0;
    const avgDialogueLength = dialogueSegments.length > 0
        ? dialogueCharCount / dialogueSegments.length
        : 0;
    const narrativeToDialogue = dialogueRatio > 0 && dialogueRatio < 1
        ? (1 - dialogueRatio) / dialogueRatio
        : dialogueRatio === 0 ? Infinity : 0;
    // Clamp narrativeToDialogue to a finite value for hash stability.
    const narrativeToDialogueFinite = Number.isFinite(narrativeToDialogue)
        ? Math.round(narrativeToDialogue * 100) / 100
        : 99.99;
    // --- Rhetorical features ---
    const topRhetorical = detectRhetoricalCounts(trimmed, lang);
    // --- Vocabulary richness ---
    const vocabularyRichness = calculateVocabularyRichness(trimmed, lang);
    // --- Punctuation density ---
    const punctCount = countPunctuation(trimmed);
    const punctuationDensity = totalChars > 0 ? punctCount / totalChars : 0;
    // --- Sensory & emotional density (per 1000 chars) ---
    const sensoryWords = lang === "zh" ? ZH_SENSORY_WORDS : EN_SENSORY_WORDS;
    const emotionalWords = lang === "zh" ? ZH_EMOTIONAL_WORDS : EN_EMOTIONAL_WORDS;
    const sensoryCount = countKeywordMatches(trimmed, sensoryWords);
    const emotionalCount = countKeywordMatches(trimmed, emotionalWords);
    const sensoryDensity = totalChars > 0 ? (sensoryCount / totalChars) * 1000 : 0;
    const emotionalDensity = totalChars > 0 ? (emotionalCount / totalChars) * 1000 : 0;
    // --- Hash ---
    const hashInput = [
        sentenceLengthBuckets.map((b) => b.toFixed(3)).join(","),
        paragraphLength.avg.toFixed(1),
        dialogueRatio.toFixed(3),
        vocabularyRichness.toFixed(3),
        punctuationDensity.toFixed(3),
        sensoryDensity.toFixed(2),
        emotionalDensity.toFixed(2),
        topRhetorical.map((r) => `${r.name}:${r.count}`).join(","),
    ].join("|");
    const hash = fnv1aHash(hashInput);
    return {
        hash,
        sentenceLengthBuckets,
        paragraphLength,
        dialogueRatio,
        topRhetorical,
        vocabularyRichness,
        avgDialogueLength,
        narrativeToDialogue: narrativeToDialogueFinite,
        punctuationDensity,
        sensoryDensity,
        emotionalDensity,
    };
}
// -------------------------------------------------------------------------
// Similarity computation
// -------------------------------------------------------------------------
/**
 * Compute a normalized difference in [0, 1] for two scalar values.
 * For values already in [0, 1], this is simply |a - b|.
 * For unbounded values, uses |a - b| / (1 + max(a, b)).
 */
function normalizedDiff(a, b) {
    return Math.abs(a - b) / (1 + Math.max(a, b));
}
/**
 * Compute Euclidean distance between two 5-element bucket vectors,
 * normalized to [0, 1].
 */
function bucketDistance(a, b) {
    let sumSq = 0;
    for (let i = 0; i < 5; i++) {
        sumSq += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sumSq) / Math.sqrt(5);
}
/**
 * Compute rhetorical similarity between two top-rhetorical lists.
 * Uses count-based comparison across the union of device names.
 * Returns a difference in [0, 1] (0 = identical, 1 = completely different).
 */
function rhetoricalDistance(a, b) {
    if (a.length === 0 && b.length === 0)
        return 0;
    const mapA = new Map(a.map((r) => [r.name, r.count]));
    const mapB = new Map(b.map((r) => [r.name, r.count]));
    const allNames = new Set([...mapA.keys(), ...mapB.keys()]);
    let sumSqDiff = 0;
    const maxCount = Math.max(...a.map((r) => r.count), ...b.map((r) => r.count), 1);
    for (const name of allNames) {
        const ca = mapA.get(name) ?? 0;
        const cb = mapB.get(name) ?? 0;
        sumSqDiff += ((ca - cb) / maxCount) ** 2;
    }
    return Math.sqrt(sumSqDiff) / Math.sqrt(allNames.size);
}
/**
 * Compute similarity between two style fingerprints (0-1).
 * Uses weighted Euclidean distance across normalized dimensions.
 *
 * Weights:
 * - sentenceLengthBuckets: 20%
 * - dialogueRatio:         20%
 * - rhetorical:            15%
 * - vocabularyRichness:    15%
 * - sensoryDensity:        15%
 * - emotionalDensity:      15%
 */
export function fingerprintSimilarity(a, b) {
    const dSentence = bucketDistance(a.sentenceLengthBuckets, b.sentenceLengthBuckets);
    const dDialogue = Math.abs(a.dialogueRatio - b.dialogueRatio);
    const dRhetorical = rhetoricalDistance(a.topRhetorical, b.topRhetorical);
    const dVocabulary = Math.abs(a.vocabularyRichness - b.vocabularyRichness);
    const dSensory = normalizedDiff(a.sensoryDensity, b.sensoryDensity);
    const dEmotional = normalizedDiff(a.emotionalDensity, b.emotionalDensity);
    const weightedDistance = dSentence * 0.20 +
        dDialogue * 0.20 +
        dRhetorical * 0.15 +
        dVocabulary * 0.15 +
        dSensory * 0.15 +
        dEmotional * 0.15;
    // Convert distance to similarity: similarity = 1 - distance (clamped to [0, 1]).
    return Math.max(0, Math.min(1, 1 - weightedDistance));
}
// -------------------------------------------------------------------------
// Style guide generation
// -------------------------------------------------------------------------
/** Format a percentage value for display. */
function pct(value) {
    return `${Math.round(value * 100)}%`;
}
/** Format a density value (per 1000 chars) for display. */
function density(value) {
    return value.toFixed(1);
}
/**
 * Generate a style matching guide for the writer.
 * Compares target fingerprint with current text fingerprint,
 * produces actionable Chinese recommendations.
 *
 * @param target The desired style fingerprint (from reference text).
 * @param current The current text's fingerprint.
 * @returns Array of Chinese recommendation strings.
 */
export function generateStyleGuide(target, current) {
    const guide = [];
    // --- Dialogue ratio ---
    const dialogueDiff = target.dialogueRatio - current.dialogueRatio;
    if (Math.abs(dialogueDiff) > 0.05) {
        if (dialogueDiff > 0) {
            guide.push(`对话占比偏低（当前 ${pct(current.dialogueRatio)}，目标 ${pct(target.dialogueRatio)}），建议增加角色对话`);
        }
        else {
            guide.push(`对话占比偏高（当前 ${pct(current.dialogueRatio)}，目标 ${pct(target.dialogueRatio)}），建议适当增加叙述描写`);
        }
    }
    // --- Short sentence ratio (bucket 0: 0-10 units) ---
    const shortDiff = target.sentenceLengthBuckets[0] - current.sentenceLengthBuckets[0];
    if (Math.abs(shortDiff) > 0.05) {
        if (shortDiff > 0) {
            guide.push(`短句使用不足（当前 ${pct(current.sentenceLengthBuckets[0])}，目标 ${pct(target.sentenceLengthBuckets[0])}），建议在紧张场景使用短句增加节奏感`);
        }
        else {
            guide.push(`短句使用过多（当前 ${pct(current.sentenceLengthBuckets[0])}，目标 ${pct(target.sentenceLengthBuckets[0])}），建议适当使用长句增加细节描写`);
        }
    }
    // --- Long sentence ratio (bucket 4: 60+ units) ---
    const longDiff = target.sentenceLengthBuckets[4] - current.sentenceLengthBuckets[4];
    if (Math.abs(longDiff) > 0.05) {
        if (longDiff > 0) {
            guide.push(`长句使用不足（当前 ${pct(current.sentenceLengthBuckets[4])}，目标 ${pct(target.sentenceLengthBuckets[4])}），建议在抒情或场景描写时使用长句`);
        }
        else {
            guide.push(`长句使用过多（当前 ${pct(current.sentenceLengthBuckets[4])}，目标 ${pct(target.sentenceLengthBuckets[4])}），建议拆分过长的句子以提升可读性`);
        }
    }
    // --- Sensory density ---
    const sensoryDiff = target.sensoryDensity - current.sensoryDensity;
    if (Math.abs(sensoryDiff) > 0.5) {
        if (sensoryDiff > 0) {
            guide.push(`感官描写偏少（当前 ${density(current.sensoryDensity)}/千字，目标 ${density(target.sensoryDensity)}/千字），建议增加视觉/听觉/触觉描写`);
        }
        else {
            guide.push(`感官描写偏多（当前 ${density(current.sensoryDensity)}/千字，目标 ${density(target.sensoryDensity)}/千字），建议适当精简感官细节`);
        }
    }
    // --- Emotional density ---
    const emotionalDiff = target.emotionalDensity - current.emotionalDensity;
    if (Math.abs(emotionalDiff) > 0.5) {
        if (emotionalDiff > 0) {
            guide.push(`情感词汇偏少（当前 ${density(current.emotionalDensity)}/千字，目标 ${density(target.emotionalDensity)}/千字），建议增加情感表达以增强感染力`);
        }
        else {
            guide.push(`情感词汇偏多（当前 ${density(current.emotionalDensity)}/千字，目标 ${density(target.emotionalDensity)}/千字），建议适当克制情感直抒，多用行为暗示`);
        }
    }
    // --- Vocabulary richness ---
    const vocabDiff = target.vocabularyRichness - current.vocabularyRichness;
    if (Math.abs(vocabDiff) > 0.05) {
        if (vocabDiff > 0) {
            guide.push(`词汇多样性偏低（当前 ${current.vocabularyRichness.toFixed(3)}，目标 ${target.vocabularyRichness.toFixed(3)}），建议丰富用词避免重复`);
        }
        else {
            guide.push(`词汇多样性偏高（当前 ${current.vocabularyRichness.toFixed(3)}，目标 ${target.vocabularyRichness.toFixed(3)}），建议适当简化用词保持风格统一`);
        }
    }
    // --- Punctuation density ---
    const punctDiff = target.punctuationDensity - current.punctuationDensity;
    if (Math.abs(punctDiff) > 0.02) {
        if (punctDiff > 0) {
            guide.push(`标点密度偏低（当前 ${pct(current.punctuationDensity)}，目标 ${pct(target.punctuationDensity)}），建议增加标点断句以提升节奏感`);
        }
        else {
            guide.push(`标点密度偏高（当前 ${pct(current.punctuationDensity)}，目标 ${pct(target.punctuationDensity)}），建议减少碎句，适当合并长句`);
        }
    }
    // --- Rhetorical features ---
    const targetRhetNames = new Set(target.topRhetorical.map((r) => r.name));
    const currentRhetNames = new Set(current.topRhetorical.map((r) => r.name));
    const missingRhet = [...targetRhetNames].filter((n) => !currentRhetNames.has(n));
    if (missingRhet.length > 0) {
        guide.push(`缺少目标风格的常用修辞（${missingRhet.join("、")}），建议在合适场景运用以贴合风格`);
    }
    // --- Overall similarity ---
    const similarity = fingerprintSimilarity(target, current);
    guide.push(`当前风格相似度：${pct(similarity)}${similarity > 0.85 ? "（高度吻合）" : similarity > 0.7 ? "（较为接近）" : similarity > 0.5 ? "（部分匹配）" : "（差异较大）"}`);
    return guide;
}
//# sourceMappingURL=style-fingerprint.js.map