import { z } from "zod";
/** Input context from various pipeline stages. */
export declare const InjectionContextSchema: z.ZodObject<{
    pinnedFactsBlock: z.ZodString;
    innerVoiceBlock: z.ZodString;
    contextBlock: z.ZodString;
    timelineBlock: z.ZodString;
    paceRecommendation: z.ZodString;
    totalBudget: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pinnedFactsBlock: string;
    innerVoiceBlock: string;
    contextBlock: string;
    timelineBlock: string;
    paceRecommendation: string;
    totalBudget: number;
}, {
    pinnedFactsBlock: string;
    innerVoiceBlock: string;
    contextBlock: string;
    timelineBlock: string;
    paceRecommendation: string;
    totalBudget: number;
}>;
export type InjectionContext = z.infer<typeof InjectionContextSchema>;
/** A single section in the assembled prompt. */
export interface PromptSection {
    readonly name: string;
    readonly content: string;
    readonly originalLength: number;
    readonly truncated: boolean;
}
/** The fully assembled prompt with metadata. */
export declare const AssembledPromptSchema: z.ZodObject<{
    prompt: z.ZodString;
    sections: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        content: z.ZodString;
        originalLength: z.ZodNumber;
        truncated: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        name: string;
        content: string;
        originalLength: number;
        truncated: boolean;
    }, {
        name: string;
        content: string;
        originalLength: number;
        truncated: boolean;
    }>, "many">;
    truncated: z.ZodBoolean;
    totalChars: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    sections: {
        name: string;
        content: string;
        originalLength: number;
        truncated: boolean;
    }[];
    truncated: boolean;
    totalChars: number;
}, {
    prompt: string;
    sections: {
        name: string;
        content: string;
        originalLength: number;
        truncated: boolean;
    }[];
    truncated: boolean;
    totalChars: number;
}>;
export type AssembledPrompt = z.infer<typeof AssembledPromptSchema>;
export declare class InjectionPolicy {
    /**
     * Assemble the final LLM prompt from the injection context.
     *
     * Allocates the character budget across sections according to the fixed
     * percentages, truncates each section to fit, and concatenates them with
     * Chinese section markers.
     *
     * @param context the injection context from various pipeline stages.
     * @returns the assembled prompt with per-section metadata.
     */
    assemble(context: InjectionContext): AssembledPrompt;
    /**
     * Truncate a section's content to fit within its character budget.
     *
     * If the content exceeds the budget, it is cut at the budget boundary and
     * an ellipsis ("…") is appended (if there is room for it) to signal
     * truncation to the LLM.
     *
     * @param name       the section name (marker).
     * @param content    the raw content string.
     * @param budget     the maximum number of characters allowed.
     * @returns a PromptSection with the (possibly truncated) content.
     */
    private truncateSection;
}
//# sourceMappingURL=injection-policy.d.ts.map