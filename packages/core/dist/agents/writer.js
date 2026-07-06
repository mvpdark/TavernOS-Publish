import { loadPrompt } from "../prompts/loader.js";
import { createAgentRuntime } from "./base.js";
import { extractPromptMessages } from "./json-utils.js";
// ---------------------------------------------------------------------------
// Writing preset guides — pacing/style modulation for the writer
// ---------------------------------------------------------------------------
const WRITING_PRESET_GUIDES = {
    fast: "快节奏模式：加速剧情推进，减少环境描写和内心独白，多用短句和动作描写，每幕必有冲突或转折，适合高潮章节和战斗场景。",
    slow: "慢节奏模式：注重氛围营造和感官细节，大量环境描写和心理活动，节奏舒缓沉浸，适合过渡章节和情感铺垫。",
    memory: "回忆模式：以闪回为核心叙事手法，过去与现在交织，注重时间线的模糊感与情感的层层递进，适合角色背景揭示。",
    emotion: "情感模式：聚焦角色内心世界，强化情感张力和人际冲突，对话富有潜台词，适合关系转折和高情感浓度场景。",
    dialogue: "对话驱动模式：以角色对话为主要叙事手段，减少旁白叙述，通过对话推进剧情和揭示性格，适合社交场景和密室推理。",
    suspense: "悬疑模式：埋设伏笔和线索，控制信息释放节奏，营造未知和紧张感，适合谜题章节和反转铺垫。",
};
/**
 * Factory: build a NarrativeWriter agent by composing a shared runtime.
 * Replaces the former `class NarrativeWriter extends BaseAgent`.
 *
 * The writer focuses solely on creative narrative output.
 * State delta extraction is handled by the StateExtractor agent
 * (see consolidator.ts) which is invoked by the StoryOrchestrator
 * after the writer completes.
 *
 * Two-stage mode: when `skeletonCtx` is provided, the writer first generates a
 * structural skeleton (scene beats, action line) using the skeleton context's
 * model (e.g. Kimi), then expands it into full narrative with emotional depth
 * using the flesh context's model (e.g. Claude). This division of labor puts
 * each model where it excels — long-context structural coherence vs. literary
 * emotional prose. When `skeletonCtx` is omitted, the writer runs single-stage
 * (backward compatible).
 *
 * @param fleshCtx context for the narrative/flesh stage (always required).
 * @param skeletonCtx optional context for the skeleton stage.
 */
export function createNarrativeWriter(fleshCtx, skeletonCtx) {
    const fleshRuntime = createAgentRuntime(fleshCtx);
    const skeletonRuntime = skeletonCtx ? createAgentRuntime(skeletonCtx) : null;
    const name = "writer";
    async function generate(input, options) {
        const minWords = input.minWords ?? 1500;
        const targetWords = input.targetWords ?? 2000;
        // Context layers are appended to the story bible as additional sections.
        // This keeps prompt templates unchanged while giving the writer matched
        // lore (keyword-triggered) and relevant previous-chapter excerpts
        // (vector-retrieved) for the current chapter.
        //
        // Budget control: each context layer is capped to prevent prompt bloat.
        // The total context budget is 8000 characters, allocated proportionally:
        //   styleProfile: 15% (1200) | lorebook: 15% (1200) | vectorContext: 25% (2000)
        //   conversationSummary: 10% (800) | authorNote: 5% (400) | genreRules: 5% (400)
        // narrativeContext is EXEMPT from the proportional split: it is the output
        // of NarrativeEngine.assemblePreWriteContext(), which InjectionPolicy already
        // budgeted to INJECTION_TOTAL_BUDGET (6000 chars) across its own sections.
        // Re-slicing it here to 2000 would discard 2/3 of that carefully allocated
        // context, so we cap it at the same 6000-char ceiling instead.
        // Layers exceeding their budget are truncated at the character level.
        const CONTEXT_BUDGET = 8000;
        // Must match packages/core/src/pipeline/narrative-engine.ts INJECTION_TOTAL_BUDGET.
        const NARRATIVE_CONTEXT_BUDGET = 6000;
        const BUDGETS = {
            styleProfile: Math.floor(CONTEXT_BUDGET * 0.15),
            lorebook: Math.floor(CONTEXT_BUDGET * 0.15),
            vectorContext: Math.floor(CONTEXT_BUDGET * 0.25),
            narrativeContext: NARRATIVE_CONTEXT_BUDGET,
            conversationSummary: Math.floor(CONTEXT_BUDGET * 0.10),
            authorNote: Math.floor(CONTEXT_BUDGET * 0.05),
            genreRules: Math.floor(CONTEXT_BUDGET * 0.05),
        };
        const truncate = (text, budget) => text.length <= budget ? text : text.slice(0, budget - 1) + "…";
        let storyBible = input.storyBible;
        if (input.styleProfile) {
            storyBible += `\n\n${truncate(input.styleProfile, BUDGETS.styleProfile)}`;
        }
        if (input.lorebook) {
            storyBible += `\n\n【相关世界观词条（按关键词触发注入）】\n${truncate(input.lorebook, BUDGETS.lorebook)}`;
        }
        if (input.vectorContext) {
            storyBible += `\n\n【相关前文片段（向量检索召回）】\n${truncate(input.vectorContext, BUDGETS.vectorContext)}`;
        }
        if (input.narrativeContext) {
            storyBible += `\n\n${truncate(input.narrativeContext, BUDGETS.narrativeContext)}`;
        }
        if (input.conversationSummary) {
            storyBible += `\n\n【作者近期创作意图（从对话中提取）】\n${truncate(input.conversationSummary, BUDGETS.conversationSummary)}`;
        }
        // Phase F: Author's Note — direct creative directive for this chapter only
        if (input.authorNote && input.authorNote.trim()) {
            storyBible += `\n\n【作者批注（仅影响本章，不持久化）】\n${truncate(input.authorNote.trim(), BUDGETS.authorNote)}`;
        }
        // Writing preset modulation — appended as a style directive
        if (input.writingPreset && input.writingPreset !== "default") {
            const presetGuide = WRITING_PRESET_GUIDES[input.writingPreset];
            if (presetGuide) {
                storyBible += `\n\n【叙事节奏指引】\n${presetGuide}`;
            }
        }
        // Three-layer genre rules — injected as a 【创作规则】 section so the
        // LLM follows universal + genre-specific + book-specific writing rules.
        if (input.genreRules && input.genreRules.trim()) {
            storyBible += `\n\n【创作规则】\n${truncate(input.genreRules.trim(), BUDGETS.genreRules)}`;
        }
        // --- Two-stage: skeleton → flesh ---
        if (skeletonRuntime) {
            const skeletonPrompt = await loadPrompt("writer-skeleton", {
                chapter: String(input.chapter),
                storyBible,
                currentState: input.currentState,
                activeHooks: input.activeHooks,
                chapterOutline: input.chapterOutline,
                minWords: String(minWords),
                targetWords: String(targetWords),
            });
            const { system: skSystem, user: skUser } = extractPromptMessages(skeletonPrompt);
            const skMessages = [
                { role: "system", content: skSystem },
                { role: "user", content: skUser },
            ];
            const skeletonResponse = await skeletonRuntime.chat(skMessages, options);
            const skeleton = skeletonResponse.content.trim();
            // Abort check between skeleton and flesh stages
            if (options?.signal?.aborted)
                throw new Error("aborted");
            // Flesh stage: expand the skeleton into full emotional narrative.
            const fleshPrompt = await loadPrompt("writer-flesh", {
                chapter: String(input.chapter),
                storyBible,
                currentState: input.currentState,
                activeHooks: input.activeHooks,
                chapterOutline: input.chapterOutline,
                skeleton,
                minWords: String(minWords),
                targetWords: String(targetWords),
            });
            const { system: flSystem, user: flUser } = extractPromptMessages(fleshPrompt);
            const flMessages = [
                { role: "system", content: flSystem },
                { role: "user", content: flUser },
            ];
            const fleshResponse = await fleshRuntime.chat(flMessages, options);
            return { narrative: fleshResponse.content.trim(), skeleton };
        }
        // --- Single-stage (backward compatible) ---
        const promptText = await loadPrompt("writer", {
            chapter: String(input.chapter),
            storyBible,
            currentState: input.currentState,
            activeHooks: input.activeHooks,
            chapterOutline: input.chapterOutline,
            minWords: String(minWords),
            targetWords: String(targetWords),
        });
        const { system, user } = extractPromptMessages(promptText);
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        const response = await fleshRuntime.chat(messages, options);
        return { narrative: response.content.trim() };
    }
    return { name, generate };
}
//# sourceMappingURL=writer.js.map