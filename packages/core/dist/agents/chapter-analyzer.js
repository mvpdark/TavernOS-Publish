// packages/core/src/agents/chapter-analyzer.ts
//
// ChapterAnalyzer — unified LLM agent that combines the responsibilities of
// the former Consolidator (StoryStateDelta extraction) and FactExtractor
// (StoryFact extraction) into a SINGLE LLM call.
//
// This merger eliminates the redundant double-LLM-call pattern where two
// agents read the same chapter content and produce structurally similar
// outputs. The ChapterAnalyzer asks the LLM to produce a single JSON object
// with two top-level keys:
//   - "delta":  the StoryStateDelta (for Truth Files persistence)
//   - "facts":  an array of ExtractedFact (for FactVault ingestion)
//
// Design principles:
//   • Mirrors the factory/compose pattern of consolidator.ts and fact-extractor.ts
//   • Defensive parsing: degrades gracefully on any parse failure
//   • Each section (delta/facts) can independently succeed or fail
//   • Backward-compatible: callers can access .delta and .facts separately
import { StoryStateDeltaSchema, PlotThreadSchema, NewThreadCandidateSchema, } from "../models/story-state.js";
import { createAgentRuntime } from "./base.js";
import { parseAndValidate } from "./json-utils.js";
import { buildTaxonomyText, coerceFact, parseFacts, } from "./fact-taxonomy.js";
// ---------------------------------------------------------------------------
// System prompt — unified extraction in a single LLM call
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = "你是一个章节分析智能体。你的任务是同时完成两项分析，并输出一个 JSON 对象：\n" +
    "1. 故事状态增量（delta）— 用于更新全局故事状态\n" +
    "2. 故事事实列表（facts）— 用于动态记忆库\n\n" +
    "只输出有效的 JSON 对象，不要使用 markdown 代码块，不要添加任何解释文字。\n\n" +
    "输出格式：\n" +
    '{\n' +
    '  "delta": { /* StoryStateDelta 对象 */ },\n' +
    '  "facts": [ /* ExtractedFact 数组，可为空 */ ]\n' +
    '}\n\n' +
    "delta 字段说明（StoryStateDelta）：\n" +
    '- chapter: 当前章节号\n' +
    '- currentStatePatch: 当前状态补丁数组（subject/predicate/object 三元组）\n' +
    '- hookOps: 伏笔操作 { upsert, mention, resolve, defer }\n' +
    '- newHookCandidates: 新伏笔候选\n' +
    '- chapterSummary: 章节摘要 { title, characters, events, stateChanges, hookActivity, mood, chapterType }\n' +
    '- subplotOps, emotionalArcOps, characterMatrixOps: 可选\n' +
    '- notes: 备注\n\n' +
    `facts 字段说明（事实分类体系，domain 和 category 必须使用下列英文值）：\n${buildTaxonomyText()}\n\n` +
    "每个 fact 对象包含：\n" +
    '- domain: 上述 6 个域之一\n' +
    '- category: 上述类别之一，必须属于所选 domain\n' +
    '- label: 简短标签\n' +
    '- content: 完整的事实陈述\n' +
    '- weight: 数值 0-100，重要性\n' +
    '- certainty: 数值 0-1，确信度\n' +
    '- triggers: 字符串数组，用于检索的关键词\n' +
    '- emotionalWeight: 数值 -1 到 1，情感权重\n\n' +
    "抽取重点（facts）：\n" +
    "- 人物身份/性格/能力/关系的揭示与变化\n" +
    "- 世界观规则的揭示\n" +
    "- 新地点的出现\n" +
    "- 情节伏笔/悬念的埋设\n" +
    "- 时间线里程碑\n" +
    "- 主题冲突\n\n" +
    "只提取本章新出现或有显著变化的事实，避免与已有事实重复。若本章无可提取事实，facts 输出空数组 []。";
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Factory: build a ChapterAnalyzer agent by composing a shared runtime.
 *
 * Replaces the former separate createStateExtractor() + createFactExtractor()
 * pattern with a single unified LLM call that produces both the
 * StoryStateDelta (for Truth Files) and the ExtractedFact[] (for FactVault).
 *
 * On any parse failure, each section degrades independently:
 *   - delta failure → minimal valid delta with chapter number, deltaDegraded=true
 *   - facts failure → empty array, factsDegraded=true
 */
export function createChapterAnalyzer(ctx) {
    const runtime = createAgentRuntime(ctx);
    const name = "chapter-analyzer";
    async function analyze(input, options) {
        const userContent = `## 第 ${input.chapter} 章\n\n${input.chapterContent}\n\n` +
            `## 故事设定\n${input.storyBible}\n\n` +
            `## 当前状态\n${input.currentState}\n\n` +
            `## 活跃伏笔\n${input.activeHooks}\n\n` +
            `## 已有事实摘要（避免重复）\n${input.existingFactsSummary}\n\n` +
            `请同时提取故事状态增量（delta）和故事事实列表（facts），输出为 JSON 对象。delta 的 chapter 字段必须为 ${input.chapter}。`;
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
        ];
        // Defaults for degraded fallback.
        let delta = StoryStateDeltaSchema.parse({ chapter: input.chapter });
        let facts = [];
        let deltaDegraded = true;
        let factsDegraded = true;
        try {
            const response = await runtime.chat(messages, options);
            const raw = response.content.trim();
            // Try to parse as a unified JSON object with "delta" and "facts" keys.
            // Strategy:
            // 1. Try parseAndValidate against a permissive schema { delta, facts }
            // 2. If that fails, try parsing delta and facts separately from the
            //    raw text (some LLMs may output them as separate JSON blocks).
            // Attempt 1: unified object
            try {
                const unified = JSON.parse(raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, ""));
                if (unified && typeof unified === "object") {
                    // Parse delta
                    if (unified.delta && typeof unified.delta === "object") {
                        // First attempt: strict validation of the full delta
                        const parsedDelta = parseAndValidate(JSON.stringify(unified.delta), StoryStateDeltaSchema);
                        if (parsedDelta) {
                            delta = parsedDelta;
                            deltaDegraded = false;
                        }
                        else {
                            // Fallback: aggressively repair common LLM type mismatches.
                            // LLMs often return: strings instead of objects in arrays,
                            // arrays instead of objects, missing required fields, etc.
                            const rawDelta = typeof unified.delta === "object" && unified.delta !== null
                                ? { ...unified.delta }
                                : {};
                            // Log the exact Zod validation errors for diagnosis.
                            const diagResult = StoryStateDeltaSchema.safeParse(rawDelta);
                            if (!diagResult.success) {
                                const issues = diagResult.error.issues
                                    .map((i) => `${i.path.join(".")}: ${i.message} (code=${i.code})`)
                                    .slice(0, 10);
                                console.warn(`[chapter-analyzer] delta Zod errors: ${issues.join("; ")}`);
                            }
                            // 1. Coerce chapter field (string → number)
                            if (rawDelta.chapter !== undefined && typeof rawDelta.chapter === "string") {
                                rawDelta.chapter = parseInt(rawDelta.chapter, 10);
                            }
                            if (rawDelta.chapter === undefined || isNaN(rawDelta.chapter)) {
                                rawDelta.chapter = input.chapter;
                            }
                            // 2. Repair hookOps: filter out string elements, coerce numeric
                            // string fields and Chinese status in object elements.
                            const hookOps = rawDelta.hookOps;
                            if (hookOps && Array.isArray(hookOps.upsert)) {
                                hookOps.upsert = hookOps.upsert
                                    .filter((t) => t && typeof t === "object")
                                    .map((t) => {
                                    const thread = { ...t };
                                    for (const numField of ["startChapter", "lastAdvancedChapter"]) {
                                        if (typeof thread[numField] === "string") {
                                            thread[numField] = parseInt(thread[numField], 10);
                                        }
                                    }
                                    const statusMap = {
                                        "开放": "open", "进行中": "progressing", "延后": "deferred",
                                        "已解决": "resolved", "完成": "resolved", "暂停": "deferred",
                                    };
                                    if (typeof thread.status === "string" && statusMap[thread.status]) {
                                        thread.status = statusMap[thread.status];
                                    }
                                    return thread;
                                })
                                    .filter((t) => PlotThreadSchema.safeParse(t).success);
                            }
                            // Ensure hookOps arrays exist
                            if (!hookOps || typeof hookOps !== "object") {
                                rawDelta.hookOps = { upsert: [], mention: [], resolve: [], defer: [] };
                            }
                            else {
                                for (const key of ["mention", "resolve", "defer"]) {
                                    if (!Array.isArray(hookOps[key]))
                                        hookOps[key] = [];
                                }
                            }
                            // 3. Repair newHookCandidates: filter out string elements
                            if (Array.isArray(rawDelta.newHookCandidates)) {
                                rawDelta.newHookCandidates = rawDelta.newHookCandidates
                                    .filter((t) => t && typeof t === "object")
                                    .filter((t) => NewThreadCandidateSchema.safeParse(t).success);
                            }
                            else {
                                rawDelta.newHookCandidates = [];
                            }
                            // 4. Repair chapterSummary: fix missing chapter, array → string
                            const chapterSummary = rawDelta.chapterSummary;
                            if (chapterSummary) {
                                if (typeof chapterSummary.chapter === "string") {
                                    chapterSummary.chapter = parseInt(chapterSummary.chapter, 10);
                                }
                                if (chapterSummary.chapter === undefined || isNaN(chapterSummary.chapter)) {
                                    chapterSummary.chapter = input.chapter;
                                }
                                // LLMs often return string fields as arrays — coerce all
                                // known string fields that should be joined.
                                for (const strField of ["characters", "events", "stateChanges", "hookActivity", "mood", "chapterType", "title"]) {
                                    if (Array.isArray(chapterSummary[strField])) {
                                        chapterSummary[strField] = chapterSummary[strField]
                                            .map(String).join(", ");
                                    }
                                }
                            }
                            // 5. Repair notes: string → array
                            if (typeof rawDelta.notes === "string") {
                                rawDelta.notes = [rawDelta.notes];
                            }
                            // 6. Repair currentStatePatch: array → undefined (can't safely coerce)
                            if (Array.isArray(rawDelta.currentStatePatch)) {
                                delete rawDelta.currentStatePatch;
                            }
                            // 7. Ensure array fields exist with defaults
                            for (const key of ["subplotOps", "emotionalArcOps", "characterMatrixOps"]) {
                                if (!Array.isArray(rawDelta[key]))
                                    rawDelta[key] = [];
                            }
                            const retryParsed = parseAndValidate(JSON.stringify(rawDelta), StoryStateDeltaSchema);
                            if (retryParsed) {
                                delta = retryParsed;
                                deltaDegraded = false;
                                console.warn("[chapter-analyzer] delta recovered after aggressive repair");
                            }
                            else {
                                // Final diagnosis: log remaining errors
                                const finalDiag = StoryStateDeltaSchema.safeParse(rawDelta);
                                if (!finalDiag.success) {
                                    const remaining = finalDiag.error.issues
                                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                                        .slice(0, 5);
                                    console.warn(`[chapter-analyzer] delta still invalid after repair: ${remaining.join("; ")}`);
                                }
                                console.warn("[chapter-analyzer] delta validation failed even after aggressive repair — falling back to minimal delta");
                            }
                        }
                    }
                    // Parse facts
                    if (Array.isArray(unified.facts)) {
                        const parsedFacts = [];
                        for (const f of unified.facts) {
                            const fact = coerceFact(f);
                            if (fact)
                                parsedFacts.push(fact);
                        }
                        if (parsedFacts.length > 0 || Array.isArray(unified.facts)) {
                            facts = parsedFacts;
                            factsDegraded = false;
                        }
                    }
                }
            }
            catch {
                // Not a single JSON object — try separate parsing below.
            }
            // Attempt 2: if delta or facts still degraded, try parsing from
            // the raw text independently (handles cases where LLM outputs
            // two separate JSON blocks).
            if (deltaDegraded) {
                const parsedDelta = parseAndValidate(raw, StoryStateDeltaSchema);
                if (parsedDelta) {
                    delta = parsedDelta;
                    deltaDegraded = false;
                }
            }
            if (factsDegraded) {
                const parsedFacts = parseFacts(raw);
                if (parsedFacts !== null) {
                    facts = parsedFacts;
                    factsDegraded = false;
                }
            }
            if (deltaDegraded) {
                console.warn("[chapter-analyzer] delta validation failed — using minimal delta");
            }
        }
        catch (e) {
            // LLM call failed — keep degraded defaults, but surface the error so
            // the caller can log/diagnose without a silent swallow.
            return {
                delta,
                facts,
                deltaDegraded,
                factsDegraded,
                error: e instanceof Error ? e.message : String(e),
            };
        }
        return { delta, facts, deltaDegraded, factsDegraded };
    }
    return { name, analyze };
}
//# sourceMappingURL=chapter-analyzer.js.map