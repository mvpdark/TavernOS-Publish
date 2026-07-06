/** A single fact extracted by the LLM, normalised and clamped to valid ranges. */
export interface ExtractedFact {
    /** One of the 6 StoryDomain values. */
    domain: string;
    /** One of the 22 StoryCategory values; must belong to `domain`. */
    category: string;
    /** Short tag, e.g. "杨过-身世". */
    label: string;
    /** Full fact statement. */
    content: string;
    /** Importance, clamped to 0-100. */
    weight: number;
    /** Confidence, clamped to 0-1. */
    certainty: number;
    /** Retrieval keywords. */
    triggers: string[];
    /** Emotional valence, clamped to -1..1 (-1 negative, 0 neutral, 1 positive). */
    emotionalWeight: number;
}
type DomainKey = "character" | "world" | "location" | "plot_thread" | "timeline" | "theme";
export declare const DOMAIN_CATEGORIES_MAP: Readonly<Record<DomainKey, readonly string[]>>;
export declare const DOMAIN_LABELS_ZH: Readonly<Record<DomainKey, string>>;
export declare const CATEGORY_LABELS_ZH: Readonly<Record<string, string>>;
export declare const VALID_DOMAIN_SET: ReadonlySet<string>;
export declare const VALID_CATEGORY_SET: ReadonlySet<string>;
/** Build the taxonomy description block used in the system prompt. */
export declare function buildTaxonomyText(): string;
/** Clamp a value into [min, max], falling back when it is not a finite number. */
export declare function clampNumber(value: unknown, min: number, max: number, fallback: number): number;
/**
 * Validate and normalise a single raw object into an ExtractedFact.
 * Returns null when the object is missing required fields or uses an
 * unknown domain/category (or a category that does not belong to its domain).
 */
export declare function coerceFact(raw: unknown): ExtractedFact | null;
/**
 * Parse the LLM response into a list of validated facts.
 *
 * Returns `null` when the response could not be parsed into a usable array
 * (so the caller can flag the result as degraded). Returns an empty array
 * for a genuine `[]` response. Uses {@link parseJsonArray} for defensive
 * extraction (handles markdown fences and surrounding prose), then validates
 * each element with {@link coerceFact}.
 */
export declare function parseFacts(text: string): ExtractedFact[] | null;
export {};
//# sourceMappingURL=fact-taxonomy.d.ts.map