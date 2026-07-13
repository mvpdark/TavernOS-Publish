import { type Asset, type AssetCatalog, type AssetExtractionResult } from "./types.js";
/**
 * Static utility class for managing asset catalogs.
 *
 * - mergeCatalog: accumulate new extraction results into an existing catalog
 * - serializeCatalog / parseCatalog: JSON round-trip with Zod validation
 */
export declare class AssetCatalogManager {
    /**
     * Merge a new extraction result into an existing catalog.
     *
     * Matching is performed per-kind (characters, scenes, props) using
     * case-insensitive name and alias comparison. When a match is found the
     * existing entry is updated (lastChapter, appearanceCount, attributes,
     * description, aliases). Unmatched entries are appended as new assets.
     *
     * @param existing  The accumulated catalog from prior chapters.
     * @param newEntries  The latest extraction result (catalog + raw response).
     * @returns A new merged catalog (the inputs are not mutated).
     */
    static mergeCatalog(existing: AssetCatalog, newEntries: AssetExtractionResult): AssetCatalog;
    /**
     * Perform a full deduplication pass on a catalog.
     *
     * After mergeCatalog, the catalog may still contain duplicate entries that
     * escaped matching during incremental merge (e.g. LLM returned different
     * IDs and names for the same entity in different chapters). This method
     * scans all assets within each kind bucket and merges any duplicates found
     * using the same isMatch logic (including fuzzy matching).
     *
     * Unlike mergeCatalog (which increments appearanceCount by 1 per merge),
     * normalizeCatalog takes the max appearanceCount of the two duplicates to
     * avoid inflating counts from same-batch redundant entries.
     *
     * @returns A new deduplicated catalog (the input is not mutated).
     */
    static normalizeCatalog(catalog: AssetCatalog): AssetCatalog;
    /**
     * Serialize a catalog to a pretty-printed JSON string.
     */
    static serializeCatalog(catalog: AssetCatalog): string;
    /**
     * Parse a JSON string into a validated AssetCatalog.
     *
     * On parse failure or schema validation failure, an empty catalog is
     * returned (never throws).
     */
    static parseCatalog(json: string): AssetCatalog;
    /**
     * Normalize a name string for comparison: trim, lowercase, replace
     * full-width / Unicode whitespace with ASCII space, strip mid-dots and
     * common punctuation that appear in Chinese nicknames (e.g. "李·明",
     * "小明·同学").
     */
    private static normalizeName;
    /**
     * Extract the "surname key" from a Chinese name for heuristic matching.
     * Returns null if the name doesn't look like a Chinese surname-style
     * reference (e.g. English names, scene names, prop names).
     *
     * Recognised patterns:
     *  - "小李", "老李" → "李"
     *  - "李哥", "李姐", "李总", "李教授", "李老师" → "李"
     *  - "李明", "李白" (2-char name) → "李"
     *  - Single-character references that look like a surname → the char itself
     */
    private static extractSurnameKey;
    /**
     * Check whether two assets refer to the same entity by comparing names
     * and aliases (case-insensitive, trimmed, with CJK normalization and
     * nickname variant expansion).
     *
     * After exact normalized-name matching, a conservative surname heuristic
     * is applied for character-type assets: if one side is a short appellation
     * (小李/老李/李哥 etc.) and the other side is a full name whose surname
     * matches, they are considered the same entity. To prevent false matches
     * between two different characters who share a surname, the heuristic
     * only fires when exactly ONE side is an appellation (not both full names).
     *
     * Public so that asset-extractor's mergePhaseResults can use the same
     * matching logic to deduplicate Phase 1 + Phase 2 results before
     * mergeCatalog.
     */
    static isMatch(a: Asset, b: Asset): boolean;
    /**
     * Collect all names (canonical + aliases) for an asset, normalized to
     * a canonical comparison form. Does NOT include generated nickname
     * variants — those are handled exclusively by Phase 2's surname
     * heuristic (with the aIsAppel !== bIsAppel guard) to prevent
     * same-surname different-name characters from being incorrectly merged.
     */
    private static allNames;
    /**
     * Merge alias lists from two assets into a deduplicated union.
     * Excludes the canonical name, and adds the update's name as an alias
     * if it differs from the canonical name.
     * Shared by mergeAsset and normalizeMergeAsset to avoid duplication.
     */
    private static mergeAliases;
    /**
     * Merge a new asset into an existing one, producing an updated copy.
     *
     * - id, kind, firstChapter: preserved from existing
     * - lastChapter: max of existing and new
     * - appearanceCount: existing + 1 (this is a new chapter appearance)
     * - attributes: existing merged with new (new overrides)
     * - description: new if non-empty, else existing
     * - aliases: union of existing and new (deduplicated, case-preserving)
     */
    private static mergeAsset;
    /**
     * Merge two duplicate assets found during normalizeCatalog.
     *
     * Same as mergeAsset except appearanceCount takes the max of the two
     * (rather than existing + 1) because both entries accumulated counts
     * independently and we don't want to inflate or double-count.
     */
    private static normalizeMergeAsset;
    /** Weight for name similarity signal. */
    private static readonly NAME_WEIGHT;
    /** Weight for description similarity signal. */
    private static readonly DESC_WEIGHT;
    /** Weight for attribute overlap signal. */
    private static readonly ATTR_WEIGHT;
    /** Combined score threshold for a positive match. */
    private static readonly MATCH_THRESHOLD;
    /** Name similarity above this auto-triggers a match. */
    private static readonly NAME_AUTO_MATCH;
    /**
     * Multi-signal fuzzy match. Returns true if the combined weighted score
     * of name similarity, description similarity, and attribute overlap
     * exceeds the match threshold.
     */
    private static isFuzzyMatch;
    /**
     * Compute the best normalized Levenshtein similarity across all name
     * variants (canonical name + aliases) of two assets.
     *
     * Returns a value in [0, 1] where 1 means identical names.
     */
    private static bestNameSimilarity;
    /**
     * Normalized Levenshtein similarity: 1 - editDistance / max(len).
     *
     * More precise than substring containment:
     *  - "黑影" vs "无面黑影" → 1 - 2/4 = 0.50 (moderate)
     *  - "森林" vs "森林精灵" → 1 - 2/4 = 0.50 (moderate, won't match alone)
     *  - "剑" vs "剑客" → 1 - 1/2 = 0.50 (moderate, needs other signals)
     *  - "李明" vs "李明" → 1.0 (exact)
     *  - "张三" vs "李四" → 1 - 2/2 = 0.0 (completely different)
     */
    private static normalizedLevenshtein;
    /**
     * Classic Levenshtein edit distance (character-level).
     * Uses a memory-efficient two-row DP implementation.
     */
    private static levenshteinDistance;
    /**
     * Compute description similarity as max(Jaccard, TF-IDF cosine).
     *
     * Jaccard captures set overlap (good for short texts where every shared
     * character matters), while TF-IDF cosine down-weights common terms and
     * up-weights distinctive ones (good for longer descriptions). Taking the
     * max ensures we get the best of both metrics.
     *
     * Since we only have two descriptions at match time (no full corpus),
     * we use smoothed IDF: IDF = 1 + log(N / df). The +1 ensures shared
     * terms always have positive weight (contributing to the dot product),
     * while the log component gives slightly higher weight to terms unique
     * to one description (more discriminative).
     */
    private static descriptionSimilarity;
    /**
     * Extract term frequencies from text using Chinese 1-grams, 2-grams,
     * 3-grams, and English word tokens (length ≥ 2).
     *
     * 1-grams (single CJK characters) are included to improve matching on
     * short descriptions where individual characters carry significant
     * semantic meaning.
     */
    private static termFrequency;
    /**
     * Jaccard similarity on attribute key-value pairs.
     * Treats each "key=value" string as a set element.
     *
     * When BOTH assets have no attributes, returns 0.5 (neutral) instead of
     * 0 — missing attributes should not penalize the match score, since the
     * LLM may simply not have extracted attributes for either entry.
     */
    private static attributeOverlap;
    /**
     * Calculate Jaccard similarity between two sets.
     * Returns a value in [0, 1] where 1 means identical sets.
     */
    private static jaccardSimilarity;
}
/**
 * Build a compact text representation of the asset catalog for Scribe
 * injection. Only includes id, name, and aliases — no descriptions (to
 * minimize token consumption).
 *
 * Format:
 *   角色: 林墨白 (别名: 林大夫), 赵铁柱 (别名: 老猎人), 苏雪瑶
 *   场景: 林氏诊所, 北山道, 黑雾边界
 *   道具: 祖父的日记 (别名: 旧日记), 古铜罗盘
 *
 * Returns an empty string when the catalog is empty.
 */
export declare function buildAssetRosterText(catalog: AssetCatalog): string;
//# sourceMappingURL=catalog.d.ts.map