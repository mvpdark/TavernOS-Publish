import type { BookConfig, Chapter, ScribeInput } from "@tavernos/core";
export interface StoryContext {
    storyBible: string;
    currentState: string;
    activeHooks: string;
    /** Summaries of the most recent chapters (last N), not the whole book. */
    recentChapterSummaries: string;
    recentChapters: Chapter[];
}
/**
 * Assemble story context from existing chapters and book config.
 * Reads the last N chapters and builds text summaries for the pipeline.
 *
 * NOTE: The CLI uses a simple "last N chapters" sliding context window.
 * RAG-based retrieval (vector search over the full chapter corpus) is
 * available in the Studio web app but is intentionally not bundled with the
 * CLI, to keep it dependency-free and offline-friendly.
 */
export declare function buildStoryContext(projectRoot: string, bookId: string, bookConfig: BookConfig): Promise<StoryContext>;
/**
 * Build the ScribeInput for the narrative scribe agent.
 * Uses the story context and an optional outline/intent from the user.
 */
export declare function buildScribeInput(chapterNumber: number, storyCtx: StoryContext, outline?: string): ScribeInput;
/** Count words: CJK characters counted individually, Latin words split by whitespace. */
export declare function countWords(text: string): number;
//# sourceMappingURL=pipeline-helpers.d.ts.map