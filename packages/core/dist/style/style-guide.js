// packages/core/src/style/style-guide.ts
// LLM-powered qualitative style guide generation.
// Takes a reference text + statistical profile, outputs a human-readable
// writing style guide that can be injected into the Writer agent's prompt.
import { formatProfileSummary } from "./style-analyzer.js";
/**
 * Generate a qualitative style guide from a reference text + statistical profile.
 *
 * The guide is a markdown document that tells the Writer agent HOW to write
 * in this style — sentence rhythm, vocabulary preferences, rhetorical
 * tendencies, paragraph structure, and what to avoid.
 *
 * @param client LLM client for guide generation.
 * @param model Model to use (e.g., "claude-sonnet-4-6").
 * @param text Reference text (first ~3000 chars used).
 * @param profile Statistical profile from analyzeStyle().
 * @param sourceName Optional name of the source/author.
 * @returns Markdown style guide string.
 */
export async function generateStyleGuide(client, model, text, profile, sourceName) {
    const langLabel = profile.language === "zh" ? "中文" : "English";
    const sampleText = text.substring(0, 4000);
    const systemPrompt = `你是一位专业的文学编辑和文体学专家。你的任务是分析一段参考文本的写作风格，生成一份详细、可执行的写作风格指南。

要求：
1. 用中文输出（无论参考文本是中文还是英文）
2. 输出为 Markdown 格式
3. 指南必须具体、可执行，避免空泛描述
4. 包含以下章节：
   - 总体风格概述（1-2句）
   - 句式特征（句长偏好、长短句交替规律）
   - 词汇偏好（用词倾向、高频词类、应避免的词）
   - 修辞倾向（常用修辞手法及密度）
   - 段落结构（段落长度、开篇/收尾习惯）
   - 节奏与韵律（叙事节奏、对话/叙述比）
   - 情感与语气（整体基调、情感表达方式）
   - 写作戒律（该风格下必须避免的做法）

统计指纹（已由算法提取，供参考）：
${formatProfileSummary(profile)}`;
    const userPrompt = `请分析以下${langLabel}参考文本的写作风格，生成风格指南。

${sourceName ? `来源：${sourceName}` : ""}

参考文本（节选）：
---
${sampleText}
---

请生成详细的写作风格指南。`;
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];
    const response = await client.chat(model, messages, {
        temperature: 0.3,
        maxTokens: 2000,
    });
    return response.content.trim();
}
/**
 * Build the style injection block for the Writer agent's prompt.
 * This is the text that gets appended to the storyBible context.
 *
 * @param guide The qualitative style guide (from generateStyleGuide).
 * @param profile The statistical profile (for numeric targets).
 * @returns Formatted injection string.
 */
export function buildStyleInjection(guide, profile) {
    const unit = profile.language === "zh" ? "字" : "词";
    return `【文风仿写指南（必须遵循）】
以下是目标写作风格的特征，请在写作中严格遵循：

${guide}

---
统计目标（硬性约束）：
- 句长约 ${profile.avgSentenceLength}±${profile.sentenceLengthStdDev} ${unit}
- 段落约 ${profile.avgParagraphLength} ${unit}
- 词汇多样性 TTR 目标: ${profile.vocabularyDiversity}
${profile.rhetoricalFeatures.length > 0 ? `- 必用修辞: ${profile.rhetoricalFeatures.join(", ")}` : ""}
${profile.topPatterns.length > 0 ? `- 句首偏好: ${profile.topPatterns.join(", ")}` : ""}`;
}
//# sourceMappingURL=style-guide.js.map