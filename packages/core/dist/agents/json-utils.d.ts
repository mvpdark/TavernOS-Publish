import type { ZodTypeAny } from "zod";
/**
 * Parse a JSON object from an LLM response using a 4-level fallback strategy:
 * 1. JSON.parse() on the full response text
 * 2. Extract JSON object between `{` and `}` (greedy) using regex
 * 3. Extract JSON from a ```json ... ``` code block
 * 4. Return null (caller falls back to a default)
 *
 * Used by: StateExtractor, AssetExtractor, VideoReviewer.
 */
export declare function parseJsonObject(text: string): unknown | null;
/**
 * Parse a JSON array from an LLM response using a 4-level fallback strategy:
 * 1. JSON.parse() on the full response text (must be an array)
 * 2. Extract JSON array between `[` and `]` using regex
 * 3. Extract individual JSON objects via balanced-brace scanning
 * 4. Return an empty array
 *
 * Used by: Sentinel (auditor).
 */
export declare function parseJsonArray(text: string): unknown[];
/**
 * Parse a JSON object from text and validate it against a Zod schema.
 * Combines {@link parseJsonObject} with `schema.safeParse()`, returning the
 * validated data on success or `null` when parsing or validation fails.
 *
 * Used by: StateExtractor, AssetExtractor, VideoReviewer.
 */
export declare function parseAndValidate<S extends ZodTypeAny>(text: string, schema: S): S["_output"] | null;
/**
 * Parse a JSON array from text and validate each element against a Zod
 * schema. Elements that fail validation are silently skipped.
 * Combines {@link parseJsonArray} with per-element `schema.safeParse()`.
 *
 * Used by: Sentinel (auditor).
 */
export declare function parseAndValidateArray<S extends ZodTypeAny>(text: string, schema: S): S["_output"][];
/**
 * Extract the `system:` and `user:` literal-block parts from a prompt YAML string.
 * This avoids a full YAML parser dependency while handling the predictable
 * two-key structure used by TavernOS prompt templates.
 *
 * Used by: OutlinePlanner, Scribe, Sentinel, Planner.
 */
export declare function extractPromptMessages(promptText: string): {
    system: string;
    user: string;
};
/**
 * Parse "## SECTION: <name>" blocks from text into a Map.
 * Each block's content is the text between its header and the next header (or end).
 *
 * Used by: OutlinePlanner, Planner.
 */
export declare function parseSections(text: string): Map<string, string>;
//# sourceMappingURL=json-utils.d.ts.map