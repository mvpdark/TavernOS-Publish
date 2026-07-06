import type { Shot } from "../agents/storyboard.js";
export interface PromptBuildOptions {
    /** Provider model id (affects prompt language/style). */
    model?: string;
    /** Whether to use Chinese acting cues (jimeng/seedance) or English (grok). */
    language?: "zh" | "en";
    /** Whether this is for jimeng-direct omni_reference mode (uses @image_file_N refs). */
    omniReference?: boolean;
    /** Number of reference images being passed (for @image_file_N generation). */
    referenceImageCount?: number;
}
export interface BuiltPrompt {
    /** Final prompt string ready for VideoGenClient.generate(). */
    prompt: string;
    /** Ordered list of reference image URLs (storyboard first, then characters, then scene). */
    referenceImageUrls: string[];
}
/**
 * Assemble a complete video generation prompt from a Shot.
 *
 * @param shot - The shot to build the prompt for.
 * @param options - Build options (language, model, omni mode).
 * @returns BuiltPrompt with final prompt string and reference image URLs.
 */
export declare function buildVideoPrompt(shot: Shot, options?: PromptBuildOptions): BuiltPrompt;
/**
 * Build an enhanced prompt for jimeng-direct omni_reference mode.
 * Prepends @image_file_N role description lines.
 */
export declare function buildOmniPrompt(shot: Shot, referenceImageUrls: string[], referenceRoles?: string[]): BuiltPrompt;
/**
 * Determine the optimal language for a given model id.
 * Jimeng/Seedance models work best with Chinese acting cues;
 * Grok/MJ Video models work best with English.
 */
export declare function detectPromptLanguage(model: string | undefined): "zh" | "en";
//# sourceMappingURL=prompt-builder.d.ts.map