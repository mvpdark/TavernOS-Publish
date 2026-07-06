import { type AgentContext, type AgentChatOptions } from "./base.js";
import { type ExtractedFact } from "./fact-taxonomy.js";
export type { ExtractedFact } from "./fact-taxonomy.js";
/** Input for fact extraction. */
export interface FactExtractorInput {
    /** Raw text content of the chapter to scan. */
    chapterContent: string;
    /** 1-based chapter index. */
    chapter: number;
    /** Story bible / setting context to ground the extraction. */
    storyBible: string;
    /** Brief summary of facts already in the vault, used to avoid duplicates. */
    existingFactsSummary: string;
}
/** Result of fact extraction, including a degraded flag for rollback. */
export interface FactExtractorResult {
    /** Extracted facts (empty on failure). */
    facts: ExtractedFact[];
    /** True when the LLM response could not be parsed and an empty fallback was used. */
    degraded: boolean;
    /** Error message when extraction degraded due to a thrown error (undefined on success). */
    readonly error?: string;
}
/** Fact extractor agent produced by the factory (compose pattern). */
export interface FactExtractor {
    readonly name: string;
    extract(input: FactExtractorInput, options?: AgentChatOptions): Promise<FactExtractorResult>;
}
/**
 * Factory: build a FactExtractor agent by composing a shared runtime.
 * Mirrors the createStateExtractor() pattern in consolidator.ts.
 *
 * Extracts structured StoryFacts from chapter content by constructing an
 * inline prompt asking the LLM to produce a JSON array, then parses the
 * response defensively. On total failure, returns an empty array flagged
 * as degraded so the caller can skip ingestion and flag the chapter.
 */
export declare function createFactExtractor(ctx: AgentContext): FactExtractor;
//# sourceMappingURL=fact-extractor.d.ts.map