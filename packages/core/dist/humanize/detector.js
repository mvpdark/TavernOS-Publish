// packages/core/src/humanize/detector.ts
// Style detection engine — scans Chinese creative writing for AI-flavored
// patterns: fatigue words, structural cliches, and formulaic sentence patterns.
import { FATIGUE_TERMS, CLICHE_PATTERNS, SYNONYM_GROUPS } from "./lexicon.js";
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/** Severity → score deduction weight. */
const SEVERITY_WEIGHT = {
    high: 8,
    medium: 5,
    low: 2,
};
/** Maximum issues reported per individual term or pattern (prevents noise). */
const MAX_ISSUES_PER_SOURCE = 5;
/** Context window radius (characters before and after a match). */
const CONTEXT_RADIUS = 12;
/**
 * Extract a short context string around a match.
 * The result includes up to CONTEXT_RADIUS characters on each side.
 */
function extractContext(text, offset, length) {
    const start = Math.max(0, offset - CONTEXT_RADIUS);
    const end = Math.min(text.length, offset + length + CONTEXT_RADIUS);
    return text.slice(start, end);
}
/**
 * Find all occurrences of `needle` in `haystack`.
 * Returns an array of { offset, length } for each non-overlapping match.
 */
function findAllOccurrences(haystack, needle) {
    const results = [];
    if (needle.length === 0)
        return results;
    let searchFrom = 0;
    while (searchFrom <= haystack.length - needle.length) {
        const idx = haystack.indexOf(needle, searchFrom);
        if (idx === -1)
            break;
        results.push({ offset: idx, length: needle.length });
        searchFrom = idx + needle.length;
    }
    return results;
}
/**
 * Calculate the effective occurrences per 1000 characters.
 */
function perThousand(count, textLength) {
    if (textLength === 0)
        return 0;
    return (count / textLength) * 1000;
}
// ---------------------------------------------------------------------------
// Detection sub-engines
// ---------------------------------------------------------------------------
/**
 * Scan text for all fatigue terms.
 * Each term is searched exhaustively; results are capped per term to
 * MAX_ISSUES_PER_SOURCE to keep the report readable.
 *
 * Low-severity "比喻标记" terms (仿佛, 犹如, etc.) are only flagged when
 * they appear more than twice — occasional use is natural.
 */
function detectFatigueTerms(text, terms) {
    const issues = [];
    for (const ft of terms) {
        const occurrences = findAllOccurrences(text, ft.term);
        // Simile markers: only flag when used more than twice.
        if (ft.category === "比喻标记" && occurrences.length <= 2) {
            continue;
        }
        // Cap issues per term.
        const capped = occurrences.slice(0, MAX_ISSUES_PER_SOURCE);
        for (const occ of capped) {
            issues.push({
                category: "fatigue",
                severity: ft.severity,
                match: ft.term,
                offset: occ.offset,
                length: occ.length,
                suggestion: ft.suggestion,
                context: extractContext(text, occ.offset, occ.length),
                label: ft.category,
            });
        }
    }
    return issues;
}
/**
 * Scan text for structural cliche patterns.
 * A pattern fires when its match frequency exceeds thresholdPer1k.
 * When threshold is 0, every match is flagged.
 */
function detectClichePatterns(text, patterns) {
    const issues = [];
    for (const pat of patterns) {
        // Reset lastIndex for global regex.
        const regex = new RegExp(pat.regex.source, pat.regex.flags);
        const matches = [];
        let m;
        while ((m = regex.exec(text)) !== null) {
            matches.push({
                offset: m.index,
                length: m[0].length,
                match: m[0],
            });
            // Prevent infinite loop on zero-length matches.
            if (m[0].length === 0)
                regex.lastIndex++;
        }
        if (matches.length === 0)
            continue;
        // Check frequency threshold.
        const freq = perThousand(matches.length, text.length);
        if (pat.thresholdPer1k > 0 && freq <= pat.thresholdPer1k) {
            continue;
        }
        // Cap issues per pattern.
        const capped = matches.slice(0, MAX_ISSUES_PER_SOURCE);
        for (const mt of capped) {
            // Trim long matches for display.
            const displayMatch = mt.match.length > 30 ? mt.match.slice(0, 30) + "…" : mt.match;
            issues.push({
                category: "cliche",
                severity: pat.severity,
                match: displayMatch,
                offset: mt.offset,
                length: mt.length,
                suggestion: pat.suggestion,
                context: extractContext(text, mt.offset, mt.length),
                label: pat.id,
            });
        }
    }
    return issues;
}
// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------
/**
 * Compute a 0–100 human-likeness score from detected issues.
 * Starts at 100 and deducts based on issue severity, then clamps.
 */
function computeScore(issues) {
    let score = 100;
    for (const issue of issues) {
        score -= SEVERITY_WEIGHT[issue.severity];
    }
    return Math.max(0, Math.min(100, score));
}
// ---------------------------------------------------------------------------
// Burstiness (突发性) detection
// ---------------------------------------------------------------------------
//
// Burstiness measures variety in sentence length and structure. AI-generated
// text tends to be highly uniform (low burstiness), while human writing varies
// a lot (high burstiness). We compute:
//   1. Sentence-length coefficient of variation (CV = std / mean).
//   2. Uniform runs — 3+ consecutive sentences whose lengths differ by ≤ 20%.
//   3. Three-piece parallelism (三件套) — consecutive clauses sharing an
//      identical structural template (e.g. "XX的XX，XX的XX").
//   4. Synonym rotation (同义词轮换) — multiple synonyms for the same referent
//      within one paragraph (主角→主人公→中心人物→英雄).
/** Sentence terminators (Chinese + ASCII). */
const SENTENCE_TERMINATORS = /[。！？!?]/;
/** Clause delimiters: terminators + commas / semicolons / enumeration comma. */
const CLAUSE_DELIMITERS = /[。！？!?，；;,、]/;
/** Global variant for stripping all delimiters from a clause. */
const CLAUSE_DELIMITERS_G = /[。！？!?，；;,、]/g;
/** CV thresholds for burstiness labeling. */
const CV_LOW = 0.3; // CV < 0.3 → AI-flavored uniformity
const CV_HIGH = 0.6; // CV > 0.6 → human-like variety
/** Relative length spread below which a window of sentences is "uniform". */
const UNIFORM_SPREAD = 0.2;
/** Minimum clause length (content chars) for parallelism detection. */
const MIN_CLAUSE_LEN = 3;
/**
 * Split text into sentences using Chinese/ASCII terminators (。！？!?).
 * Each sentence records its trimmed text, start offset, and content length.
 */
function splitSentences(text) {
    const sentences = [];
    const re = /[^。！？!?]+[。！？!?]?/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const raw = m[0];
        const leadWS = raw.length - raw.trimStart().length;
        const trimmed = raw.trim();
        if (trimmed.length === 0)
            continue;
        let len = 0;
        for (const ch of trimmed) {
            if (SENTENCE_TERMINATORS.test(ch))
                continue;
            if (/\s/.test(ch))
                continue;
            len++;
        }
        sentences.push({
            text: trimmed,
            offset: m.index + leadWS,
            length: Math.max(1, len),
        });
    }
    return sentences;
}
/**
 * Structural particles preserved (not collapsed) in clause templates.
 * These are the skeleton markers that define a sentence's shape; everything
 * else (nouns, verbs, pronouns, adjectives) is masked to "C".
 */
const STRUCTURAL_PARTICLES = new Set(["的", "了", "着", "过", "地", "得"]);
/**
 * Compute the structural template of a clause. Every maximal run of CJK
 * characters that are NOT structural particles is collapsed to a single "C";
 * particles (的/了/着/过/地/得) and all non-CJK characters are preserved.
 * Thus "苍白的月光" → "C的C" and "冰冷的寒风" → "C的C", so the two clauses
 * share an identical template and can be flagged as parallelism.
 *
 * Note: we cannot simply replace all CJK runs because particles like 的 are
 * themselves CJK ideographs (U+7684) and would be collapsed along with the
 * surrounding content, destroying the structural signal.
 */
function clauseTemplate(clause) {
    let out = "";
    let inRun = false;
    for (const ch of clause) {
        if (/[\u4e00-\u9fff]/.test(ch) && !STRUCTURAL_PARTICLES.has(ch)) {
            if (!inRun) {
                out += "C";
                inRun = true;
            }
            // else: still inside a content run — keep collapsing.
        }
        else {
            inRun = false;
            out += ch;
        }
    }
    return out;
}
/**
 * Split text into clauses using terminators and commas/semicolons.
 */
function splitClauses(text) {
    const clauses = [];
    const re = /[^。！？!?，；;,、]+[。！？!?，；;,、]?/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const raw = m[0];
        const leadWS = raw.length - raw.trimStart().length;
        const trimmed = raw.trim();
        if (trimmed.length === 0)
            continue;
        let contentLen = 0;
        for (const ch of trimmed) {
            if (CLAUSE_DELIMITERS.test(ch))
                continue;
            if (/\s/.test(ch))
                continue;
            contentLen++;
        }
        // Template is computed from the delimiter-stripped content so that
        // clauses ending in different delimiters (，vs 。) still compare equal.
        const stripped = trimmed.replace(CLAUSE_DELIMITERS_G, "");
        clauses.push({
            text: trimmed,
            offset: m.index + leadWS,
            template: clauseTemplate(stripped),
            contentLen,
        });
    }
    return clauses;
}
/**
 * A template is "specific enough" for parallelism detection when it contains
 * at least two CJK placeholders AND a structural particle or punctuation.
 * This filters out trivial templates like "C" or "CC" that match everything.
 */
function isSpecificTemplate(tpl) {
    if (!/C.*C/.test(tpl))
        return false;
    return /的|了|着|过|地|得/.test(tpl) || /[，；;,、。！？!?]/.test(tpl);
}
/**
 * Detect runs of 3+ consecutive sentences whose lengths are within
 * UNIFORM_SPREAD (20%) of each other. Maximal runs are reported as a single
 * "均匀段落" issue.
 */
function detectUniformRuns(text, sentences) {
    const issues = [];
    const n = sentences.length;
    if (n < 3)
        return issues;
    // isUniformWindow[i] = sentences[i..i+2] form a uniform window.
    const isUniformWindow = new Array(Math.max(0, n - 2)).fill(false);
    for (let i = 0; i <= n - 3; i++) {
        const a = sentences[i].length;
        const b = sentences[i + 1].length;
        const c = sentences[i + 2].length;
        const mn = Math.min(a, b, c);
        const mx = Math.max(a, b, c);
        const avg = (a + b + c) / 3;
        if (avg > 0 && (mx - mn) / avg <= UNIFORM_SPREAD) {
            isUniformWindow[i] = true;
        }
    }
    // Merge consecutive true windows into maximal runs.
    let i = 0;
    while (i < isUniformWindow.length) {
        if (!isUniformWindow[i]) {
            i++;
            continue;
        }
        let j = i;
        while (j + 1 < isUniformWindow.length && isUniformWindow[j + 1])
            j++;
        // Windows i..j cover sentences i .. j+2.
        const startInfo = sentences[i];
        const endInfo = sentences[j + 2];
        const offset = startInfo.offset;
        const span = endInfo.offset + endInfo.text.length - startInfo.offset;
        const display = span > 40 ? text.slice(offset, offset + 40) + "…" : text.slice(offset, offset + span);
        issues.push({
            category: "burstiness",
            severity: "medium",
            match: display,
            offset,
            length: span,
            suggestion: "连续多句长度过于接近，节奏均匀成「模板感」；打碎其中一两句的长短或结构，制造长短交替",
            context: extractContext(text, offset, span),
            label: "均匀段落",
        });
        i = j + 1;
    }
    return issues;
}
/**
 * Detect "三件套" parallelism: 3+ consecutive clauses sharing an identical
 * structural template (e.g. "C的C，C的C"). Identical-text runs (pure
 * repetition) are skipped — that is a different issue.
 */
function detectParallelism(text) {
    const issues = [];
    const clauses = splitClauses(text);
    const cl = clauses.length;
    let i = 0;
    while (i < cl) {
        const tpl = clauses[i].template;
        if (!isSpecificTemplate(tpl) || clauses[i].contentLen < MIN_CLAUSE_LEN) {
            i++;
            continue;
        }
        // Extend a maximal run of clauses with the same template.
        let j = i;
        while (j + 1 < cl &&
            clauses[j + 1].template === tpl &&
            clauses[j + 1].contentLen >= MIN_CLAUSE_LEN) {
            j++;
        }
        const runLen = j - i + 1;
        if (runLen >= 3) {
            // Skip pure repetition (all clauses identical text).
            const texts = new Set();
            for (let k = i; k <= j; k++)
                texts.add(clauses[k].text);
            if (texts.size >= 2) {
                const startInfo = clauses[i];
                const endInfo = clauses[j];
                const offset = startInfo.offset;
                const span = endInfo.offset + endInfo.text.length - startInfo.offset;
                const display = span > 40
                    ? text.slice(offset, offset + 40) + "…"
                    : text.slice(offset, offset + span);
                issues.push({
                    category: "parallelism",
                    severity: "medium",
                    match: display,
                    offset,
                    length: span,
                    suggestion: "连续使用结构完全相同的排比句（三件套），AI 味较重；变换其中部分句式或合并改写",
                    context: extractContext(text, offset, span),
                    label: "三件套排比",
                });
            }
        }
        i = j + 1;
    }
    return issues;
}
/**
 * Detect "同义词轮换": within a single paragraph, 3+ distinct synonyms from
 * the same group are used to refer to the same referent.
 */
function detectSynonymRotation(text) {
    const issues = [];
    const paraRe = /[^\n]+/g;
    let m;
    while ((m = paraRe.exec(text)) !== null) {
        const para = m[0];
        const paraOffset = m.index;
        for (const group of SYNONYM_GROUPS) {
            const found = [];
            for (const term of group.terms) {
                const idx = para.indexOf(term);
                if (idx !== -1) {
                    found.push({ term, offset: paraOffset + idx });
                }
            }
            if (found.length >= 3) {
                found.sort((a, b) => a.offset - b.offset);
                const first = found[0];
                const chain = found.map((f) => f.term).join("→");
                issues.push({
                    category: "synonym",
                    severity: "low",
                    match: chain,
                    offset: first.offset,
                    length: first.term.length,
                    suggestion: `同一段落内用多个词指代同一对象（${chain}），AI 常见套路；选定一个主称呼保持一致`,
                    context: extractContext(text, first.offset, first.term.length),
                    label: "同义词轮换",
                });
            }
        }
    }
    return issues;
}
/**
 * Compute burstiness (突发性) of the given text.
 *
 * Returns a 0–100 score (higher = more human-like variety), a human-readable
 * label, and a list of detected style issues:
 *   - uniform sentence-length runs (均匀段落)
 *   - three-piece parallelism (三件套排比)
 *   - synonym rotation (同义词轮换)
 *
 * Scoring uses the coefficient of variation of sentence lengths
 * (CV = std / mean): CV < 0.3 → low burstiness (AI-flavored),
 * CV > 0.6 → high burstiness (human-like).
 */
export function computeBurstiness(text) {
    const sentences = splitSentences(text);
    let score;
    let label;
    if (sentences.length < 2) {
        // Not enough sentences to compute a meaningful CV. We still run the
        // structure-based detectors (parallelism, synonym rotation) below.
        score = 100;
        label = "样本不足（少于 2 句），无法计算句长突发性";
    }
    else {
        const lengths = sentences.map((s) => s.length);
        const n = lengths.length;
        const mean = lengths.reduce((a, b) => a + b, 0) / n;
        const variance = lengths.reduce((acc, x) => acc + (x - mean) ** 2, 0) / n;
        const std = Math.sqrt(variance);
        const cv = mean > 0 ? std / mean : 0;
        // Map CV to a 0–100 score: CV = 0 → 0, CV = 0.6 → 100 (clamped).
        score = Math.max(0, Math.min(100, Math.round((cv / CV_HIGH) * 100)));
        if (cv < CV_LOW) {
            label = `低突发性（CV=${cv.toFixed(2)}，AI 味重，句长高度均匀）`;
        }
        else if (cv > CV_HIGH) {
            label = `高突发性（CV=${cv.toFixed(2)}，人类感，句长富于变化）`;
        }
        else {
            label = `中等突发性（CV=${cv.toFixed(2)}，句长有一定变化）`;
        }
    }
    const issues = [
        ...detectUniformRuns(text, sentences),
        ...detectParallelism(text),
        ...detectSynonymRotation(text),
    ].sort((a, b) => a.offset - b.offset);
    return { score, label, issues };
}
/**
 * Create a style detector with optional custom terms and patterns.
 * The detector merges user-supplied data with the built-in lexicon.
 */
export function createStyleDetector(config) {
    const allTerms = [
        ...FATIGUE_TERMS,
        ...(config?.extraFatigueTerms ?? []),
    ];
    const allPatterns = [
        ...CLICHE_PATTERNS,
        ...(config?.extraClichePatterns ?? []),
    ];
    return {
        /**
         * Analyze text and return a full style report.
         */
        analyze(text) {
            const fatigueIssues = detectFatigueTerms(text, allTerms);
            const clicheIssues = detectClichePatterns(text, allPatterns);
            const allIssues = [...fatigueIssues, ...clicheIssues].sort((a, b) => a.offset - b.offset);
            const score = computeScore(allIssues);
            const fatigueCount = fatigueIssues.length;
            const clicheCount = clicheIssues.length;
            const highCount = allIssues.filter((i) => i.severity === "high").length;
            const medCount = allIssues.filter((i) => i.severity === "medium").length;
            const lowCount = allIssues.filter((i) => i.severity === "low").length;
            const summary = allIssues.length === 0
                ? `未检测到 AI 味问题，评分：${score}/100`
                : `检测到 ${allIssues.length} 个问题（高 ${highCount} / 中 ${medCount} / 低 ${lowCount}），AI 味评分：${score}/100`;
            return {
                issues: allIssues,
                score,
                fatigueCount,
                clicheCount,
                patternCount: clicheCount,
                summary,
            };
        },
        /** Access the merged term list (read-only). */
        get terms() {
            return allTerms;
        },
        /** Access the merged pattern list (read-only). */
        get patterns() {
            return allPatterns;
        },
    };
}
/**
 * Convenience function: analyze text with the default detector.
 */
export function detectStyle(text) {
    return createStyleDetector().analyze(text);
}
//# sourceMappingURL=detector.js.map