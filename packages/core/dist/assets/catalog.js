// Asset catalog manager: merge, serialize, and parse asset catalogs.
//
// Provides the AssetCatalogManager class with static methods for accumulating
// assets across chapters. The merge logic matches by name + aliases
// (case-insensitive) so that recurring characters/scenes/props are updated
// rather than duplicated.
import { AssetCatalogSchema, emptyCatalog, } from "./types.js";
// ---------------------------------------------------------------------------
// AssetCatalogManager
// ---------------------------------------------------------------------------
/**
 * Static utility class for managing asset catalogs.
 *
 * - mergeCatalog: accumulate new extraction results into an existing catalog
 * - serializeCatalog / parseCatalog: JSON round-trip with Zod validation
 */
export class AssetCatalogManager {
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
    static mergeCatalog(existing, newEntries) {
        const merged = {
            characters: [...existing.characters],
            scenes: [...existing.scenes],
            props: [...existing.props],
        };
        const buckets = ["characters", "scenes", "props"];
        for (const bucket of buckets) {
            const newList = newEntries.catalog[bucket];
            for (const newAsset of newList) {
                const matchIndex = merged[bucket].findIndex((existing) => AssetCatalogManager.isMatch(newAsset, existing));
                if (matchIndex >= 0) {
                    // Update existing asset in-place (immutably via spread).
                    merged[bucket][matchIndex] = AssetCatalogManager.mergeAsset(merged[bucket][matchIndex], newAsset);
                }
                else {
                    // New asset — append a copy.
                    merged[bucket].push({ ...newAsset });
                }
            }
        }
        return merged;
    }
    /**
     * Serialize a catalog to a pretty-printed JSON string.
     */
    static serializeCatalog(catalog) {
        return JSON.stringify(catalog, null, 2);
    }
    /**
     * Parse a JSON string into a validated AssetCatalog.
     *
     * On parse failure or schema validation failure, an empty catalog is
     * returned (never throws).
     */
    static parseCatalog(json) {
        try {
            const parsed = JSON.parse(json);
            const result = AssetCatalogSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }
        }
        catch {
            // fall through to empty catalog
        }
        return emptyCatalog();
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    /**
     * Normalize a name string for comparison: trim, lowercase, replace
     * full-width / Unicode whitespace with ASCII space, strip mid-dots and
     * common punctuation that appear in Chinese nicknames (e.g. "李·明",
     * "小明·同学").
     */
    static normalizeName(s) {
        return s
            .trim()
            .toLowerCase()
            // Full-width space (U+3000) and other Unicode whitespace → ASCII space
            .replace(/[\u3000\s]+/g, " ")
            .trim()
            // Remove mid-dot (·), interpunct, and common punctuation used as separators
            .replace(/[·・\.\,\;\:\!\?\。\，\、\；\：\！\？\"\"''\'\（\）\【\】\《\》]/g, "")
            // Collapse remaining spaces
            .replace(/\s+/g, "")
            .trim();
    }
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
    static generateNicknameVariants(name) {
        const variants = new Set();
        const normalized = AssetCatalogManager.normalizeName(name);
        if (!normalized)
            return [];
        // Only generate variants for Chinese-looking names (CJK characters, no spaces)
        const cjkOnly = /^[\u4e00-\u9fff]+$/.test(normalized);
        if (!cjkOnly)
            return [];
        // Case 1: name already starts with 小/老 (e.g. "小李", "老李") — the
        // character after the prefix is the surname; add the bare surname.
        if ((normalized.startsWith("小") || normalized.startsWith("老")) && normalized.length >= 2) {
            const surname = normalized.slice(1, 2); // single-character surname
            variants.add(surname);
        }
        // Case 2: 2-3 character Chinese names — generate 小+surname and 老+surname
        // (surname is conventionally the first character).
        if (normalized.length >= 2 && normalized.length <= 3) {
            const surname = normalized[0];
            // Don't re-add if the name already IS 小X or 老X (avoid duplicates)
            if (!(normalized.length === 2 && (normalized[0] === "小" || normalized[0] === "老"))) {
                variants.add("小" + surname);
                variants.add("老" + surname);
            }
        }
        return [...variants];
    }
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
    static extractSurnameKey(name) {
        const n = AssetCatalogManager.normalizeName(name);
        if (!n)
            return null;
        const cjkOnly = /^[\u4e00-\u9fff]+$/.test(n);
        if (!cjkOnly)
            return null;
        // 小/老 + single char surname (e.g. 小李, 老李)
        if ((n.startsWith("小") || n.startsWith("老")) && n.length >= 2) {
            return n[1];
        }
        // Surname + title (哥/姐/总/教授/老师) e.g. 李哥, 李姐, 李总
        const titlePatterns = ["哥", "姐", "总", "教授", "老师", "师傅", "先生", "女士", "同学", "医生", "博士"];
        for (const title of titlePatterns) {
            if (n.endsWith(title) && n.length > title.length) {
                return n.slice(0, n.length - title.length);
            }
        }
        // 2-3 character full name: first character is conventionally the surname
        if (n.length >= 2 && n.length <= 3) {
            return n[0];
        }
        return null;
    }
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
    static isMatch(a, b) {
        const namesA = AssetCatalogManager.allNames(a);
        const namesB = AssetCatalogManager.allNames(b);
        // Phase 1: exact normalized match
        for (const na of namesA) {
            for (const nb of namesB) {
                if (na === nb)
                    return true;
            }
        }
        // Phase 2: conservative surname heuristic for characters only.
        // Only triggers when at least one side is a short appellation-style
        // reference (length ≤ 3 AND matches a known 小/老/title pattern),
        // never for two full 2-3 char names (which would cause 李A vs 李B false match).
        if (a.kind === "character" && b.kind === "character") {
            const isAppellation = (n) => {
                const norm = AssetCatalogManager.normalizeName(n);
                if (!norm || !/^[\u4e00-\u9fff]+$/.test(norm))
                    return false;
                if (norm.length > 3)
                    return false;
                // Starts with 小/老 → appellation
                if (norm.startsWith("小") || norm.startsWith("老"))
                    return true;
                // Ends with a known title suffix
                const titles = ["哥", "姐", "总", "教授", "老师", "师傅", "先生", "女士", "同学", "医生", "博士"];
                return titles.some(t => norm.endsWith(t) && norm.length > t.length);
            };
            const aIsAppel = isAppellation(a.name) || a.aliases.some(isAppellation);
            const bIsAppel = isAppellation(b.name) || b.aliases.some(isAppellation);
            // Only match if EXACTLY one side is an appellation (avoids 小李 vs 老李
            // both being surnames → matching two different people both called by surname).
            if (aIsAppel !== bIsAppel) {
                const appelNames = aIsAppel ? [a.name, ...a.aliases] : [b.name, ...b.aliases];
                const fullNames = aIsAppel ? [b.name, ...b.aliases] : [a.name, ...a.aliases];
                for (const an of appelNames) {
                    const aKey = AssetCatalogManager.extractSurnameKey(an);
                    if (!aKey)
                        continue;
                    for (const fn of fullNames) {
                        const fKey = AssetCatalogManager.extractSurnameKey(fn);
                        if (fKey && aKey === fKey)
                            return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * Collect all names (canonical + aliases) for an asset, normalized to
     * a canonical comparison form, plus generated Chinese nickname variants
     * (小+姓, 老+姓, bare surname for 小X/老X).
     */
    static allNames(asset) {
        const raw = [asset.name, ...asset.aliases];
        const normalized = raw
            .map((n) => AssetCatalogManager.normalizeName(n))
            .filter((n) => n.length > 0);
        const variants = [];
        for (const n of normalized) {
            for (const v of AssetCatalogManager.generateNicknameVariants(n)) {
                if (v.length > 0)
                    variants.push(v);
            }
        }
        // Deduplicate while preserving order
        const seen = new Set();
        const result = [];
        for (const n of [...normalized, ...variants]) {
            if (!seen.has(n)) {
                seen.add(n);
                result.push(n);
            }
        }
        return result;
    }
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
    static mergeAsset(existing, update) {
        // Merge aliases: combine both lists, remove duplicates (case-insensitive),
        // and exclude the canonical name.
        const canonicalName = existing.name;
        const allAliases = [...existing.aliases, ...update.aliases];
        const seen = new Set();
        const mergedAliases = [];
        for (const alias of allAliases) {
            const key = alias.trim().toLowerCase();
            if (key === canonicalName.trim().toLowerCase())
                continue;
            if (seen.has(key))
                continue;
            seen.add(key);
            mergedAliases.push(alias);
        }
        return {
            id: existing.id,
            kind: existing.kind,
            name: existing.name,
            aliases: mergedAliases,
            description: update.description.trim().length > 0
                ? update.description
                : existing.description,
            firstChapter: existing.firstChapter,
            lastChapter: Math.max(existing.lastChapter, update.lastChapter),
            attributes: { ...existing.attributes, ...update.attributes },
            appearanceCount: existing.appearanceCount + 1,
        };
    }
}
//# sourceMappingURL=catalog.js.map