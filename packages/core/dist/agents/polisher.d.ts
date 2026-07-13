import { type AgentContext, type AgentChatOptions } from "./base.js";
import type { SentinelIssue } from "./sentinel.js";
/** A single paragraph that was revised by the polisher. */
export interface PolishedParagraph {
    location: string;
    originalText: string;
    revisedText: string;
}
export interface PolisherOutput {
    revisedContent: string;
    appliedFixes: string[];
    revisedParagraphs: PolishedParagraph[];
    /** Aggregated token usage from all LLM calls (paragraph revisions + full-text). */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
/** Polisher agent produced by the factory (compose pattern). */
export interface Polisher {
    readonly name: string;
    revise(input: {
        chapterContent: string;
        auditIssues: SentinelIssue[];
    }, options?: AgentChatOptions): Promise<PolisherOutput>;
}
/**
 * Split chapter text into paragraphs by double newlines.
 * Handles both LF and CRLF line endings. Empty segments are filtered out.
 */
export declare function splitIntoParagraphs(text: string): string[];
/**
 * Locate a paragraph index (0-based) from a location string.
 *
 * Tries two strategies in order:
 * 1. Extract a number from the location string and use it as a 1-based paragraph index.
 *    Supports formats like "paragraph 2", "para 1", "3", "第2段", "段落3".
 * 2. Search for the location string as a text snippet within each paragraph.
 *
 * Returns -1 if no paragraph can be located.
 */
export declare function locateParagraph(paragraphs: string[], location: string): number;
/**
 * Factory: build an Polisher by composing a shared runtime.
 * Replaces the former `class Polisher extends BaseAgent`.
 *
 * Paragraph-level revision: when SentinelIssue has scope="paragraph" and a
 * locatable `location`, only that paragraph is sent to the LLM for rewriting.
 * Issues with scope="global" or unlocatable locations fall back to full-text
 * revision. This preserves the author's style in unaffected paragraphs.
 */
export declare function createPolisher(ctx: AgentContext): Polisher;
//# sourceMappingURL=polisher.d.ts.map