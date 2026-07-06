import { loadPrompt } from "../prompts/loader.js";
import { createAgentRuntime } from "./base.js";
import { parseSections, extractPromptMessages } from "./json-utils.js";
/** Default threshold: a thread is stale if not advanced for this many chapters. */
export const STALE_THREAD_THRESHOLD = 5;
/**
 * Find plot threads that have not been advanced for too long.
 * A thread is stale if its status is not "resolved" and the gap between
 * the current chapter and its lastAdvancedChapter meets or exceeds the threshold.
 */
export function findStaleThreads(threads, currentChapter, threshold = STALE_THREAD_THRESHOLD) {
    return threads.filter((t) => t.status !== "resolved" && currentChapter - t.lastAdvancedChapter >= threshold);
}
/**
 * Format an array of PlotThreads into a human-readable string for LLM prompts.
 */
export function formatPlotThreads(threads) {
    if (threads.length === 0)
        return "无伏笔线索";
    return threads
        .map((t) => {
        const parts = [
            `- [${t.status}] ${t.hookId}: ${t.type}`,
            `起始:第${t.startChapter}章`,
            `最后推进:第${t.lastAdvancedChapter}章`,
        ];
        if (t.expectedPayoff)
            parts.push(`预期回收:${t.expectedPayoff}`);
        if (t.payoffTiming)
            parts.push(`回收时机:${t.payoffTiming}`);
        if (t.notes)
            parts.push(`备注:${t.notes}`);
        return parts.join(", ");
    })
        .join("\n");
}
/**
 * Factory: build a Planner agent by composing a shared runtime.
 *
 * The Planner prepares context for the Writer by:
 * 1. Detecting stale foreshadowing threads (deterministic, local logic)
 * 2. Using the LLM to generate a chapter outline and filter relevant context
 * 3. Merging stale threads into the activeHooks output so the Writer
 *    is reminded to advance forgotten foreshadowing
 */
export function createPlanner(ctx) {
    const runtime = createAgentRuntime(ctx);
    const name = "planner";
    async function plan(input, options) {
        // Step 1: Find stale threads (deterministic local logic)
        const staleThreads = findStaleThreads(input.plotThreads, input.currentChapter);
        const staleThreadsText = formatPlotThreads(staleThreads);
        const allThreadsText = formatPlotThreads(input.plotThreads);
        // Step 2: Call LLM to generate chapter outline and filter context
        const promptText = await loadPrompt("planner", {
            title: input.bookMeta.title,
            genre: input.bookMeta.genre,
            language: input.bookMeta.language,
            currentChapter: String(input.currentChapter),
            storyState: input.storyState,
            plotThreads: allThreadsText,
            recentChapters: input.recentChapters,
            chapterGoal: input.chapterGoal,
            staleThreads: staleThreadsText,
        });
        const { system, user } = extractPromptMessages(promptText);
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        const response = await runtime.chat(messages, options);
        const sections = parseSections(response.content);
        // Step 3: Build PlannedContext with fallbacks for missing sections
        const storyBible = sections.get("storyBible") ?? input.storyState;
        const currentState = sections.get("currentState") ?? input.storyState;
        // Merge LLM-produced activeHooks with stale thread reminders
        const llmActiveHooks = sections.get("activeHooks") ?? "";
        let activeHooks;
        if (llmActiveHooks && staleThreads.length > 0) {
            activeHooks = `${llmActiveHooks}\n\n## 需要推进的遗漏伏笔\n${staleThreadsText}`;
        }
        else if (llmActiveHooks) {
            activeHooks = llmActiveHooks;
        }
        else if (staleThreads.length > 0) {
            activeHooks = `## 需要推进的遗漏伏笔\n${staleThreadsText}\n\n## 全部伏笔\n${allThreadsText}`;
        }
        else {
            activeHooks = allThreadsText;
        }
        const chapterOutline = sections.get("chapterOutline") ?? input.chapterGoal;
        return {
            storyBible,
            currentState,
            activeHooks,
            chapterOutline,
            staleThreads,
        };
    }
    return { name, plan };
}
//# sourceMappingURL=planner.js.map