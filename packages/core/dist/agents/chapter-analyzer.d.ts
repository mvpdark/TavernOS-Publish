import { type StoryStateDelta } from "../models/story-state.js";
import { type AgentContext, type AgentChatOptions } from "./base.js";
import { type ExtractedFact } from "./fact-taxonomy.js";
/** Result of the unified chapter analysis. */
export interface ChapterAnalysisResult {
    /** Extracted story state delta for Truth Files persistence. */
    delta: StoryStateDelta;
    /** Extracted facts for FactVault ingestion. */
    facts: ExtractedFact[];
    /** True when the delta could not be parsed (minimal fallback used). */
    deltaDegraded: boolean;
    /** True when the facts array could not be parsed (empty fallback used). */
    factsDegraded: boolean;
    /** Error message when analysis degraded due to a thrown error (undefined on success). */
    readonly error?: string;
}
/** Chapter analyzer agent produced by the factory (compose pattern). */
export interface ChapterAnalyzer {
    readonly name: string;
    analyze(input: ChapterAnalyzerInput, options?: AgentChatOptions): Promise<ChapterAnalysisResult>;
}
/** Input for chapter analysis. */
export interface ChapterAnalyzerInput {
    /** Raw text content of the chapter to scan. */
    chapterContent: string;
    /** 1-based chapter index. */
    chapter: number;
    /** Story bible / setting context. */
    storyBible: string;
    /** Current story state projection (Markdown). */
    currentState: string;
    /** Active hooks / plot threads (Markdown). */
    activeHooks: string;
    /** Brief summary of facts already in the vault, to avoid duplicates. */
    existingFactsSummary: string;
}
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
export declare function createChapterAnalyzer(ctx: AgentContext): ChapterAnalyzer;
//# sourceMappingURL=chapter-analyzer.d.ts.map