// Character Asset Library module — canonical store of character definitions,
// reference images, three-view sheets, and face-embedding feature vectors.
//
// Character consistency is a core competitive differentiator for TavernOS
// (competitors like 星月梦AI claim ~95% consistency). This library provides
// the single source of truth that the consistency checker, prompt builder,
// and video pipeline reference to keep characters visually stable across
// every generated clip.
//
// Design overview:
//   - CharacterAsset: full definition (appearance / personality / clothing) +
//     reference images + three-view (front / side / back) + face embedding.
//   - CharacterLibrary: in-memory Map<string, CharacterAsset> store with CRUD
//     operations, JSON import/export, and a fromScriptCharacters factory that
//     bulk-creates assets from script-parser output.
//   - All mutations refresh `updatedAt`; the library never mutates assets
//     in place — updates produce shallow copies to keep references stable.
//
// The store is intentionally in-memory and serialisable so it can be persisted
// to disk (toJSON / fromJSON), embedded in a pipeline context, or synced to an
// external asset database by a higher-level orchestrator.
import { z } from "zod";
import { randomUUID } from "node:crypto";
// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
// Explicit interfaces are exported as the canonical types; Zod schemas are
// provided for runtime validation of imported/serialised data and for
// pipeline-level schema composition (see index.ts re-exports).
/** Reference-image type — describes the purpose of a single reference image. */
export const CharacterReferenceImageTypeSchema = z.enum([
    "portrait",
    "full_body",
    "action",
    "expression",
]);
/** Zod schema for a single character reference image. */
export const CharacterReferenceImageSchema = z.object({
    url: z.string().min(1),
    type: CharacterReferenceImageTypeSchema,
    label: z.string().optional(),
});
/** Zod schema for the three-view image set (front / side / back). */
export const ThreeViewImagesSchema = z.object({
    front: z.string().min(1),
    side: z.string().min(1),
    back: z.string().min(1),
});
/** Zod schema for a full character asset. */
export const CharacterAssetSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    gender: z.enum(["male", "female"]),
    ageRange: z.string(),
    role: z.string(),
    appearance: z.string(),
    personality: z.string(),
    clothing: z.string(),
    referenceImages: z.array(CharacterReferenceImageSchema).default([]),
    threeView: ThreeViewImagesSchema.optional(),
    featureVector: z.array(z.number()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
/** Zod schema for the entire serialised library. */
export const CharacterAssetLibrarySchema = z.object({
    characters: z.array(CharacterAssetSchema),
    version: z.string(),
});
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Normalise a free-form gender string (from script-parser or user input) into
 * the canonical "male" | "female" enum. Accepts English and Chinese tokens.
 * Returns "female" as a permissive default when the value is unrecognisable,
 * since the caller is expected to provide a meaningful gender — this avoids
 * hard failures during bulk import.
 */
function normalizeGender(raw) {
    const g = raw.trim().toLowerCase();
    if (g === "male" || g === "男" || g === "男性" || g === "男主")
        return "male";
    if (g === "female" || g === "女" || g === "女性" || g === "女主") {
        return "female";
    }
    return "female";
}
// ---------------------------------------------------------------------------
// CharacterLibrary
// ---------------------------------------------------------------------------
/**
 * In-memory character asset library.
 *
 * Stores characters keyed by their unique `id` and provides CRUD operations,
 * reference-image / three-view / feature-vector management, JSON
 * (de)serialisation, and a bulk factory for creating assets from parsed
 * script characters.
 *
 * The library is not thread-safe; callers that share an instance across
 * async boundaries should serialise writes externally.
 */
export class CharacterLibrary {
    /** Version tag emitted in serialised output. */
    static VERSION = "1.0.0";
    library = new Map();
    /**
     * Add a new character to the library.
     *
     * A unique `id` (UUIDv4) and ISO timestamps are generated automatically.
     *
     * @param asset Character definition without id / createdAt / updatedAt.
     * @returns The fully-formed CharacterAsset that was stored.
     */
    addCharacter(asset) {
        const now = new Date().toISOString();
        const full = {
            ...asset,
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        this.library.set(full.id, full);
        return full;
    }
    /**
     * Retrieve a character by its unique id.
     *
     * @param id Character id.
     * @returns The character, or `undefined` if not found.
     */
    getCharacter(id) {
        return this.library.get(id);
    }
    /**
     * Retrieve the first character whose name matches (case-sensitive, exact).
     *
     * @param name Character name to search for.
     * @returns The first matching character, or `undefined`.
     */
    getCharacterByName(name) {
        for (const asset of this.library.values()) {
            if (asset.name === name)
                return asset;
        }
        return undefined;
    }
    /**
     * Update an existing character with a partial patch.
     *
     * `id`, `createdAt` are preserved; `updatedAt` is refreshed. A shallow copy
     * is stored so previously-held references remain stable.
     *
     * @param id Character id.
     * @param updates Partial fields to merge into the stored character.
     * @returns The updated CharacterAsset.
     * @throws If the character id is not found.
     */
    updateCharacter(id, updates) {
        const existing = this.library.get(id);
        if (!existing) {
            throw new Error(`Character not found: ${id}`);
        }
        const updated = {
            ...existing,
            ...updates,
            // Preserve immutable identity fields — they must never be overwritten.
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString(),
        };
        this.library.set(id, updated);
        return updated;
    }
    /**
     * Remove a character from the library.
     *
     * @param id Character id.
     * @returns `true` if a character was removed, `false` if not found.
     */
    removeCharacter(id) {
        return this.library.delete(id);
    }
    /**
     * List all characters currently in the library.
     *
     * @returns A new array of all character assets (order is insertion order).
     */
    listCharacters() {
        return Array.from(this.library.values());
    }
    /**
     * Append a reference image to a character's reference list.
     *
     * @param characterId Target character id.
     * @param image The reference image to add.
     * @throws If the character is not found.
     */
    addReferenceImage(characterId, image) {
        const existing = this.library.get(characterId);
        if (!existing) {
            throw new Error(`Character not found: ${characterId}`);
        }
        const updated = {
            ...existing,
            referenceImages: [...existing.referenceImages, image],
            updatedAt: new Date().toISOString(),
        };
        this.library.set(characterId, updated);
    }
    /**
     * Set (or replace) the three-view image set for a character.
     *
     * @param characterId Target character id.
     * @param threeView The front / side / back image URLs.
     * @throws If the character is not found.
     */
    setThreeView(characterId, threeView) {
        const existing = this.library.get(characterId);
        if (!existing) {
            throw new Error(`Character not found: ${characterId}`);
        }
        const updated = {
            ...existing,
            threeView,
            updatedAt: new Date().toISOString(),
        };
        this.library.set(characterId, updated);
    }
    /**
     * Set (or replace) the face-embedding feature vector for a character.
     *
     * @param characterId Target character id.
     * @param vector The extracted feature vector (e.g. 512-dim face embedding).
     * @throws If the character is not found.
     */
    setFeatureVector(characterId, vector) {
        const existing = this.library.get(characterId);
        if (!existing) {
            throw new Error(`Character not found: ${characterId}`);
        }
        const updated = {
            ...existing,
            featureVector: vector,
            updatedAt: new Date().toISOString(),
        };
        this.library.set(characterId, updated);
    }
    /**
     * Serialise the entire library to a JSON string.
     *
     * The output is validated against {@link CharacterAssetLibrarySchema} before
     * encoding so corrupt in-memory state cannot produce invalid JSON.
     *
     * @returns JSON string of the library.
     */
    toJSON() {
        const payload = {
            characters: this.listCharacters(),
            version: CharacterLibrary.VERSION,
        };
        // Validate before serialising — guards against accidental corruption.
        const validated = CharacterAssetLibrarySchema.parse(payload);
        return JSON.stringify(validated, null, 2);
    }
    /**
     * Reconstruct a CharacterLibrary from a JSON string.
     *
     * The input is validated against {@link CharacterAssetLibrarySchema}. If
     * validation fails a Zod error is thrown.
     *
     * @param json JSON string produced by {@link toJSON} or compatible source.
     * @returns A populated CharacterLibrary.
     */
    static fromJSON(json) {
        const parsed = CharacterAssetLibrarySchema.parse(JSON.parse(json));
        const lib = new CharacterLibrary();
        for (const character of parsed.characters) {
            lib.library.set(character.id, character);
        }
        return lib;
    }
    /**
     * Bulk-create a library from script-parser character descriptions.
     *
     * Each input character is normalised (gender coerced to the canonical enum,
     * missing optional fields defaulted) and added to a fresh library. This is
     * the primary entry point for wiring the asset library into the video
     * pipeline: after the script parser extracts characters, this factory
     * produces the initial asset set that downstream stages enrich with
     * reference images, three-views, and feature vectors.
     *
     * @param characters Array of raw character descriptors (gender is a
     *   free-form string accepting "male"/"female"/"男"/"女"/"男主"/"女主").
     * @returns A new CharacterLibrary pre-populated with the given characters.
     */
    static fromScriptCharacters(characters) {
        const lib = new CharacterLibrary();
        for (const c of characters) {
            lib.addCharacter({
                name: c.name,
                gender: normalizeGender(c.gender),
                ageRange: c.ageRange ?? "",
                role: c.role,
                appearance: c.appearance ?? "",
                personality: c.personality,
                clothing: "",
                referenceImages: [],
            });
        }
        return lib;
    }
}
//# sourceMappingURL=character-asset-library.js.map