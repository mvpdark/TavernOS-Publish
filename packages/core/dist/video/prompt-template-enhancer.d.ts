import { type PromptTemplate } from "./prompt-templates.js";
import type { VideoClip } from "./types.js";
/** Options for enhancing a clip prompt with a template. */
export interface TemplateEnhanceOptions {
    /** Template ID to look up. If omitted, the original prompt is returned. */
    templateId?: string;
    /** The clip whose prompt should be enhanced. */
    clip: VideoClip;
}
/**
 * Enhance a clip's generation prompt with a curated template.
 *
 * If no templateId is provided, or the template is not found, the original
 * clip prompt is returned unchanged. Otherwise the template's visualPrompt
 * and actingPrompt are appended (with deduplication for visualPrompt).
 *
 * @param options - Template ID and clip to enhance.
 * @returns The enhanced prompt string.
 */
export declare function enhancePromptWithTemplate(options: TemplateEnhanceOptions): string;
/**
 * Find the best-matching template for a given shot context.
 *
 * Uses the recommendTemplates scoring algorithm to find the most relevant
 * template based on emotion, scene type, and character count.
 *
 * @param shot - Shot context with optional emotion, sceneType, and characterCount.
 * @returns The best-matching template, or undefined if no match.
 */
export declare function getTemplateForShot(shot: {
    emotion?: string;
    sceneType?: string;
    characterCount?: number;
}): PromptTemplate | undefined;
//# sourceMappingURL=prompt-template-enhancer.d.ts.map