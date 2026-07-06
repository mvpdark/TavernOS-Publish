// packages/cli/src/commands/pipeline-helpers.ts
// Shared helpers for pipeline commands (write, draft, audit, revise).
// Extracts story context assembly and writer input construction.
import { listChapters, loadChapter } from "../context.js";
/**
 * Assemble story context from existing chapters and book config.
 * Reads the last N chapters and builds text summaries for the pipeline.
 *
 * NOTE: The CLI uses a simple "last N chapters" sliding context window.
 * RAG-based retrieval (vector search over the full chapter corpus) is
 * available in the Studio web app but is intentionally not bundled with the
 * CLI, to keep it dependency-free and offline-friendly.
 */
export async function buildStoryContext(projectRoot, bookId, bookConfig) {
    const chapterList = await listChapters(projectRoot, bookId);
    const recentCount = Math.min(chapterList.length, 5);
    const recentMetas = chapterList.slice(-recentCount);
    // Load full chapter bodies for the recent chapters
    const recentChapters = [];
    for (const meta of recentMetas) {
        const ch = await loadChapter(projectRoot, bookId, meta.number);
        if (ch)
            recentChapters.push(ch);
    }
    // Build story bible from book config
    const storyBible = [
        `# ${bookConfig.title}`,
        `类型: ${bookConfig.genre}`,
        `平台: ${bookConfig.platform}`,
        `状态: ${bookConfig.status}`,
        `目标章数: ${bookConfig.targetChapters}`,
        `每章字数: ${bookConfig.chapterWordCount}`,
        `语言: ${bookConfig.language}`,
    ].join("\n");
    // Build current state from recent chapter summaries
    const currentState = recentChapters.length > 0
        ? recentChapters.map((ch) => `[第${ch.number}章] ${ch.body.slice(0, 200)}...`).join("\n\n")
        : "（故事刚开始，暂无前文状态）";
    // Build active hooks (placeholder — full hook tracking is a future feature)
    const activeHooks = recentChapters.length > 0
        ? "（暂无活跃伏笔追踪）"
        : "（故事开始）";
    // Build chapter summaries (recent only — see RAG note above)
    const recentChapterSummaries = recentChapters.length > 0
        ? recentChapters.map((ch) => `第${ch.number}章: ${ch.body.slice(0, 500)}...`).join("\n\n")
        : "（无前序章节）";
    return {
        storyBible,
        currentState,
        activeHooks,
        recentChapterSummaries,
        recentChapters,
    };
}
// ---------------------------------------------------------------------------
// Writer input construction
// ---------------------------------------------------------------------------
/**
 * Build the WriterInput for the narrative writer agent.
 * Uses the story context and an optional outline/intent from the user.
 */
export function buildWriterInput(chapterNumber, storyCtx, outline) {
    return {
        chapter: chapterNumber,
        storyBible: storyCtx.storyBible,
        currentState: storyCtx.currentState,
        activeHooks: storyCtx.activeHooks,
        chapterOutline: outline ?? `继续推进第 ${chapterNumber} 章的情节发展。`,
    };
}
// ---------------------------------------------------------------------------
// Word counting (CJK-aware)
// ---------------------------------------------------------------------------
/** Count words: CJK characters counted individually, Latin words split by whitespace. */
export function countWords(text) {
    const cjkMatches = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
    const cjkCount = cjkMatches ? cjkMatches.length : 0;
    const latinText = text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ");
    const latinWords = latinText.split(/\s+/).filter((w) => w.length > 0);
    return cjkCount + latinWords.length;
}
//# sourceMappingURL=pipeline-helpers.js.map