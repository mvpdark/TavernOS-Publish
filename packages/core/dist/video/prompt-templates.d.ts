/** Template category — maps to short-drama genre conventions. */
export type PromptCategory = "romance" | "revenge" | "business" | "family" | "mystery" | "historical" | "comedy" | "action" | "emotional" | "system" | "transition" | "atmosphere";
/** Template tag — shot-level metadata for filtering and search. */
export type PromptTag = "close-up" | "medium-shot" | "wide-shot" | "indoor" | "outdoor" | "night" | "day" | "male-focus" | "female-focus" | "duo" | "happy" | "sad" | "angry" | "tender" | "slow-motion" | "fast-cut" | "static" | "tension" | "relief" | "climax" | "ending";
/** A single prompt template ready for video generation. */
export interface PromptTemplate {
    id: string;
    category: PromptCategory;
    title: string;
    description: string;
    /** English visual prompt (for video generation models). */
    visualPrompt: string;
    /** Chinese acting / performance direction. */
    actingPrompt?: string;
    /** Recommended clip duration in seconds (4–15). */
    recommendedDuration?: number;
    /** Recommended shot type, e.g. "close-up" / "medium shot". */
    recommendedShotType?: string;
    /** Recommended camera movement, e.g. "slow push-in". */
    recommendedCameraMovement?: string;
    /** Tags for filtering. */
    tags: PromptTag[];
    /** Number of characters the template supports. */
    characterCount: 1 | 2 | 3 | 4;
    /** Usage count (for sorting popular templates). */
    usageCount?: number;
    /** Rating 0–5. */
    rating?: number;
}
/** Options for searching the template library. */
export interface PromptSearchOptions {
    category?: PromptCategory;
    tags?: PromptTag[];
    characterCount?: number;
    keyword?: string;
    sortBy?: "popular" | "rating" | "newest";
    limit?: number;
}
/** All categories with Chinese labels and emoji icons. */
export declare const PROMPT_CATEGORIES: {
    value: PromptCategory;
    label: string;
    icon: string;
}[];
/** All tags with Chinese labels. */
export declare const PROMPT_TAGS: {
    value: PromptTag;
    label: string;
}[];
/**
 * Search templates by category, tags, character count, and/or keyword.
 * Supports sorting by popularity, rating, or newest (highest id suffix).
 */
export declare function searchTemplates(options?: PromptSearchOptions): PromptTemplate[];
/**
 * Get a single template by its id.
 * @returns The template, or `undefined` if not found.
 */
export declare function getTemplateById(id: string): PromptTemplate | undefined;
/**
 * Get all templates belonging to a category.
 */
export declare function getTemplatesByCategory(category: PromptCategory): PromptTemplate[];
/**
 * Get the most popular templates (sorted by usage count).
 * @param limit - Max number to return (default 10).
 */
export declare function getPopularTemplates(limit?: number): PromptTemplate[];
/**
 * Recommend templates based on script context (emotion / scene type / character count).
 * Uses a weighted scoring algorithm to find the best matches.
 */
export declare function recommendTemplates(context: {
    emotion?: string;
    sceneType?: string;
    characterCount?: number;
    /** Desired shot type (e.g. "close-up", "medium shot") for cinematography-aware matching. */
    shotType?: string;
    /** Desired camera movement (e.g. "slow push-in", "static") for cinematography-aware matching. */
    cameraMovement?: string;
}): PromptTemplate[];
/**
 * Get random templates, optionally filtered by category.
 * @param category - Optional category filter.
 * @param limit - Max number to return (default 5).
 */
export declare function getRandomTemplates(category?: PromptCategory, limit?: number): PromptTemplate[];
/**
 * Get library statistics: total count and per-category breakdown.
 */
export declare function getTemplateStats(): {
    total: number;
    byCategory: Record<PromptCategory, number>;
};
//# sourceMappingURL=prompt-templates.d.ts.map