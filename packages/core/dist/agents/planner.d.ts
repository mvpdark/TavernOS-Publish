import { type AgentContext, type AgentChatOptions } from "./base.js";
import type { PlotThread } from "../models/story-state.js";
/** Default threshold: a thread is stale if not advanced for this many chapters. */
export declare const STALE_THREAD_THRESHOLD = 5;
export interface PlannerInput {
    /** Book metadata for context. */
    bookMeta: {
        title: string;
        genre: string;
        language: string;
    };
    /** Combined story state text (story bible + current state). */
    storyState: string;
    /** Structured plot threads from the story state. */
    plotThreads: PlotThread[];
    /** Serialized recent chapter summaries. */
    recentChapters: string;
    /** What this chapter should accomplish. */
    chapterGoal: string;
    /** The chapter number being planned. */
    currentChapter: number;
}
export interface PlannedContext {
    /** Filtered story bible relevant to this chapter. */
    storyBible: string;
    /** Filtered current state relevant to this chapter. */
    currentState: string;
    /** Active hooks including stale threads that need advancement. */
    activeHooks: string;
    /** Generated chapter outline. */
    chapterOutline: string;
    /** Foreshadowing threads that have not been advanced for too long. */
    staleThreads: PlotThread[];
}
/** Planner agent produced by the factory (compose pattern). */
export interface Planner {
    readonly name: string;
    plan(input: PlannerInput, options?: AgentChatOptions): Promise<PlannedContext>;
}
/**
 * Find plot threads that have not been advanced for too long.
 * A thread is stale if its status is not "resolved" and the gap between
 * the current chapter and its lastAdvancedChapter meets or exceeds the threshold.
 */
export declare function findStaleThreads(threads: ReadonlyArray<PlotThread>, currentChapter: number, threshold?: number): PlotThread[];
/**
 * Format an array of PlotThreads into a human-readable string for LLM prompts.
 */
export declare function formatPlotThreads(threads: ReadonlyArray<PlotThread>): string;
/**
 * Factory: build a Planner agent by composing a shared runtime.
 *
 * The Planner prepares context for the Writer by:
 * 1. Detecting stale foreshadowing threads (deterministic, local logic)
 * 2. Using the LLM to generate a chapter outline and filter relevant context
 * 3. Merging stale threads into the activeHooks output so the Writer
 *    is reminded to advance forgotten foreshadowing
 */
export declare function createPlanner(ctx: AgentContext): Planner;
//# sourceMappingURL=planner.d.ts.map