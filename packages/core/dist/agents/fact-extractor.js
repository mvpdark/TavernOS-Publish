import { createAgentRuntime } from "./base.js";
import { buildTaxonomyText, parseFacts, } from "./fact-taxonomy.js";
// ---------------------------------------------------------------------------
// System prompt (Chinese) — built once at module load.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = "你是一个故事事实抽取智能体。你的任务是从给定的章节内容中提取关键故事事实，并以 JSON 数组的形式输出。\n\n" +
    "只输出有效的 JSON 数组，不要使用 markdown 代码块，不要添加任何解释文字。\n\n" +
    `事实分类体系（输出的 domain 与 category 必须使用下列英文值，且 category 必须属于所选 domain）：\n${buildTaxonomyText()}\n\n` +
    "抽取重点：\n" +
    "- 人物身份/性格/能力/关系的揭示与变化\n" +
    "- 世界观规则的揭示\n" +
    "- 新地点的出现\n" +
    "- 情节伏笔/悬念的埋设\n" +
    "- 时间线里程碑\n" +
    "- 主题冲突\n\n" +
    "每个事实对象包含以下字段：\n" +
    "- domain: 字符串，上述 6 个域之一\n" +
    "- category: 字符串，上述类别之一，必须属于所选 domain\n" +
    '- label: 简短标签（如 "杨过-身世"）\n' +
    "- content: 完整的事实陈述\n" +
    "- weight: 数值 0-100，重要性\n" +
    "- certainty: 数值 0-1，确信度\n" +
    "- triggers: 字符串数组，用于检索的关键词\n" +
    "- emotionalWeight: 数值 -1 到 1，情感权重（-1=负面，0=中性，1=正面）\n\n" +
    "只提取本章新出现或有显著变化的事实，避免与已有事实重复。若本章无可提取事实，输出空数组 []。";
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Factory: build a FactExtractor agent by composing a shared runtime.
 * Mirrors the createStateExtractor() pattern in consolidator.ts.
 *
 * Extracts structured StoryFacts from chapter content by constructing an
 * inline prompt asking the LLM to produce a JSON array, then parses the
 * response defensively. On total failure, returns an empty array flagged
 * as degraded so the caller can skip ingestion and flag the chapter.
 */
export function createFactExtractor(ctx) {
    const runtime = createAgentRuntime(ctx);
    const name = "fact-extractor";
    async function extract(input, options) {
        const userContent = `## 第 ${input.chapter} 章\n\n${input.chapterContent}\n\n` +
            `## 故事设定\n${input.storyBible}\n\n` +
            `## 已有事实摘要（避免重复）\n${input.existingFactsSummary}\n\n` +
            "请从上述章节内容中提取关键故事事实，输出为 JSON 数组。";
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
        ];
        try {
            const response = await runtime.chat(messages, options);
            const facts = parseFacts(response.content);
            if (facts !== null) {
                return { facts, degraded: false };
            }
        }
        catch (e) {
            // LLM call failed — surface the error on the degraded fallback so the
            // caller can log/diagnose without a silent swallow.
            return {
                facts: [],
                degraded: true,
                error: e instanceof Error ? e.message : String(e),
            };
        }
        // Fallback: empty facts, marked as degraded so the caller can skip
        // ingestion and flag the chapter for retry.
        return { facts: [], degraded: true };
    }
    return { name, extract };
}
//# sourceMappingURL=fact-extractor.js.map