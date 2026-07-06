// packages/core/src/style/style-analyzer.ts
// Pure-statistics style analysis — no LLM, zero cost, deterministic.
// Ported and extended from InkOS's analyzeStyle() algorithm.
// -------------------------------------------------------------------------
// Rhetorical feature patterns (regex)
// -------------------------------------------------------------------------
const ZH_RHETORICAL = [
    { name: "比喻", pattern: /[像如仿佛似](?:是|同|一般|一样)/ },
    { name: "排比", pattern: /[，。；]([^，。；]{2,6})[，。；]\1/ },
    { name: "反问", pattern: /难道|怎么可能|岂不是|何尝不/ },
    { name: "夸张", pattern: /天崩地裂|惊天动地|翻天覆地|震耳欲聋|排山倒海/ },
    { name: "拟人", pattern: /[风雨雪月花树草石](?:在|像|仿佛).*?(?:笑|哭|叹|呻|吟|怒|舞)/ },
    { name: "短句节奏", pattern: /[。！？][^。！？]{1,8}[。！？]/ },
    { name: "对偶", pattern: /([^，。；]{2,8})[，，]([^，。；]{2,8})[。！？]/ },
];
const EN_RHETORICAL = [
    { name: "simile", pattern: /\b(?:like|as if|as though)\b/i },
    { name: "rhetorical question", pattern: /\b(?:why|what|how|who)\b.*?\?/i },
    { name: "tricolon", pattern: /[^.]{3,20},[^.]{3,20},[^.]{3,20}\./ },
    { name: "short punchy rhythm", pattern: /[.!]\s[A-Z][^.!?]{3,15}[.!]/ },
];
// -------------------------------------------------------------------------
// Core statistics
// -------------------------------------------------------------------------
/**
 * Detect language from text content.
 * If >30% of characters are CJK, treat as Chinese; otherwise English.
 */
export function detectLanguage(text) {
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
    const totalAlpha = (text.match(/[a-zA-Z]/g) ?? []).length;
    if (cjkChars > 0 && cjkChars / (cjkChars + totalAlpha) > 0.3)
        return "zh";
    return "en";
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
 * Count words/chars for a sentence (language-aware).
 * Chinese: count CJK characters (no whitespace).
 * English: count words.
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
 * Extract top sentence-opening patterns.
 * Chinese: first 2 characters.
 * English: first word.
 */
function extractTopPatterns(sentences, lang) {
    const freq = new Map();
    for (const s of sentences) {
        let prefix;
        if (lang === "zh") {
            prefix = s.substring(0, 2);
        }
        else {
            const match = s.match(/[A-Za-z]+/);
            prefix = match ? match[0].toLowerCase() : "";
        }
        if (prefix.length < 1)
            continue;
        freq.set(prefix, (freq.get(prefix) ?? 0) + 1);
    }
    return Array.from(freq.entries())
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([prefix, count]) => {
        const display = lang === "zh" ? `${prefix}…` : prefix;
        return `${display}(${count}次)`;
    });
}
/**
 * Detect rhetorical features in text.
 */
function detectRhetorical(text, lang) {
    const patterns = lang === "zh" ? ZH_RHETORICAL : EN_RHETORICAL;
    const results = [];
    for (const { name, pattern } of patterns) {
        const matches = text.match(new RegExp(pattern.source, pattern.flags + "g"));
        const count = matches ? matches.length : 0;
        if (count >= 2) {
            const label = lang === "zh" ? name : name;
            results.push(`${label}(${count}处)`);
        }
    }
    return results;
}
/**
 * Calculate Type-Token Ratio (vocabulary diversity).
 * Chinese: character-level TTR.
 * English: word-level TTR.
 */
function calculateTTR(text, lang) {
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
// -------------------------------------------------------------------------
// Main analysis function
// -------------------------------------------------------------------------
/**
 * Analyze a text and produce a statistical style profile.
 * Pure function — no LLM, no I/O, deterministic.
 *
 * @param text The reference text to analyze (min 500 chars recommended).
 * @param sourceName Optional name of the source file/author.
 * @param language Optional language override (auto-detected if omitted).
 */
export function analyzeStyle(text, sourceName, language) {
    const lang = language ?? detectLanguage(text);
    const trimmed = text.trim();
    // Split into sentences and paragraphs
    const sentences = splitSentences(trimmed, lang);
    const paragraphs = splitParagraphs(trimmed);
    // Sentence lengths
    const sentenceLengths = sentences.map((s) => countUnits(s, lang));
    const avgSentenceLength = sentenceLengths.length > 0
        ? sentenceLengths.reduce((s, v) => s + v, 0) / sentenceLengths.length
        : 0;
    const sentenceLengthStdDev = stdDev(sentenceLengths);
    // Paragraph lengths
    const paragraphLengths = paragraphs.map((p) => countUnits(p, lang));
    const avgParagraphLength = paragraphLengths.length > 0
        ? paragraphLengths.reduce((s, v) => s + v, 0) / paragraphLengths.length
        : 0;
    const paragraphLengthRange = {
        min: paragraphLengths.length > 0 ? Math.min(...paragraphLengths) : 0,
        max: paragraphLengths.length > 0 ? Math.max(...paragraphLengths) : 0,
    };
    // Vocabulary diversity
    const vocabularyDiversity = calculateTTR(trimmed, lang);
    // Top patterns
    const topPatterns = extractTopPatterns(sentences, lang);
    // Rhetorical features
    const rhetoricalFeatures = detectRhetorical(trimmed, lang);
    // Total chars
    const totalChars = trimmed.length;
    // Sample (first 200 chars)
    const sample = trimmed.substring(0, 200) + (trimmed.length > 200 ? "…" : "");
    const profile = {
        avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        sentenceLengthStdDev: Math.round(sentenceLengthStdDev * 10) / 10,
        avgParagraphLength: Math.round(avgParagraphLength),
        paragraphLengthRange,
        vocabularyDiversity: Math.round(vocabularyDiversity * 1000) / 1000,
        topPatterns,
        rhetoricalFeatures,
        language: lang,
        sourceName,
        analyzedAt: new Date().toISOString(),
    };
    return { profile, sample, totalChars };
}
/**
 * Format a style profile into a compact human-readable summary (for display).
 */
export function formatProfileSummary(profile) {
    const lines = [
        `语言: ${profile.language === "zh" ? "中文" : "English"}`,
        `平均句长: ${profile.avgSentenceLength} ${profile.language === "zh" ? "字" : "词"}`,
        `句长标准差: ${profile.sentenceLengthStdDev}（节奏${profile.sentenceLengthStdDev > 10 ? "强烈" : "平稳"}）`,
        `平均段落: ${profile.avgParagraphLength} ${profile.language === "zh" ? "字" : "词"}`,
        `段落范围: ${profile.paragraphLengthRange.min}-${profile.paragraphLengthRange.max}`,
        `词汇多样性 TTR: ${profile.vocabularyDiversity}${profile.vocabularyDiversity > 0.6 ? "（丰富）" : profile.vocabularyDiversity > 0.4 ? "（适中）" : "（简洁）"}`,
    ];
    if (profile.topPatterns.length > 0) {
        lines.push(`高频句首: ${profile.topPatterns.join(", ")}`);
    }
    if (profile.rhetoricalFeatures.length > 0) {
        lines.push(`修辞特征: ${profile.rhetoricalFeatures.join(", ")}`);
    }
    return lines.join("\n");
}
//# sourceMappingURL=style-analyzer.js.map