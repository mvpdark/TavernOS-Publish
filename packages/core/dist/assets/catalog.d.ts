import { type AssetCatalog, type AssetExtractionResult } from "./types.js";
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
     * Generate common Chinese nickname / appellation variants for a name.
     *
     * Handles the most frequent patterns conservatively to avoid false matches:
     *  - "小李" / "老李" (prefix 小/老 + surname) → extract surname character
     *  - 2-3 character Chinese names → generate "小+firstChar" and "老+firstChar"
     *
     * Does NOT generate 哥/姐/总/教授/老师 variants because those attach to
     * either surname or given name ambiguously and would produce too many false
     * positives when two different characters share a surname.
     */
    private static generateNicknameVariants;
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
     */
    private static isMatch;
    /**
     * Collect all names (canonical + aliases) for an asset, normalized to
     * a canonical comparison form, plus generated Chinese nickname variants
     * (小+姓, 老+姓, bare surname for 小X/老X).
     */
    private static allNames;
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
}
//# sourceMappingURL=catalog.d.ts.map