import type { LLMClient } from "../llm/client.js";
import type { StyleProfile } from "./types.js";
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
export declare function generateStyleGuide(client: LLMClient, model: string, text: string, profile: StyleProfile, sourceName?: string): Promise<string>;
/**
 * Build the style injection block for the Writer agent's prompt.
 * This is the text that gets appended to the storyBible context.
 *
 * @param guide The qualitative style guide (from generateStyleGuide).
 * @param profile The statistical profile (for numeric targets).
 * @returns Formatted injection string.
 */
export declare function buildStyleInjection(guide: string, profile: StyleProfile): string;
//# sourceMappingURL=style-guide.d.ts.map