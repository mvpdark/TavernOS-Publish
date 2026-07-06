// Prompt template enhancer — applies curated templates to generation prompts.
//
// This module bridges the prompt-template library (110+ curated templates) and
// the video generation pipeline. When a promptTemplateId is supplied in
// VideoPipelineInput, the enhancer combines the clip's original prompt with
// the template's visualPrompt and actingPrompt to produce a richer, more
// cinematographic generation prompt.
//
// Usage:
//   const enhanced = enhancePromptWithTemplate({
//     templateId: "romance-closeup-tender",
//     clip: myClip,
//   });
//
// The enhancer is idempotent: if the template's visualPrompt is already
// present in the clip's prompt, it is not duplicated.
import { getTemplateById, recommendTemplates, } from "./prompt-templates.js";
// ---------------------------------------------------------------------------
// Enhancer functions
// ---------------------------------------------------------------------------
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
export function enhancePromptWithTemplate(options) {
    if (!options.templateId)
        return options.clip.prompt;
    const template = getTemplateById(options.templateId);
    if (!template)
        return options.clip.prompt;
    // Combine original prompt with template's visual and acting prompts
    const parts = [options.clip.prompt];
    // Add template visual prompt if not already included
    if (template.visualPrompt && !options.clip.prompt.includes(template.visualPrompt)) {
        parts.push(template.visualPrompt);
    }
    // Add acting prompt
    if (template.actingPrompt) {
        parts.push(`表演指导: ${template.actingPrompt}`);
    }
    return parts.join("\n\n");
}
/**
 * Find the best-matching template for a given shot context.
 *
 * Uses the recommendTemplates scoring algorithm to find the most relevant
 * template based on emotion, scene type, and character count.
 *
 * @param shot - Shot context with optional emotion, sceneType, and characterCount.
 * @returns The best-matching template, or undefined if no match.
 */
export function getTemplateForShot(shot) {
    const results = recommendTemplates({
        emotion: shot.emotion,
        sceneType: shot.sceneType,
        characterCount: shot.characterCount,
    });
    return results[0];
}
//# sourceMappingURL=prompt-template-enhancer.js.map