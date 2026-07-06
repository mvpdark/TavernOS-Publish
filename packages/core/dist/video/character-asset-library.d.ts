import { z } from "zod";
/** Reference-image type — describes the purpose of a single reference image. */
export declare const CharacterReferenceImageTypeSchema: z.ZodEnum<["portrait", "full_body", "action", "expression"]>;
export type CharacterReferenceImageType = z.infer<typeof CharacterReferenceImageTypeSchema>;
/** Zod schema for a single character reference image. */
export declare const CharacterReferenceImageSchema: z.ZodObject<{
    url: z.ZodString;
    type: z.ZodEnum<["portrait", "full_body", "action", "expression"]>;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "action" | "portrait" | "full_body" | "expression";
    url: string;
    label?: string | undefined;
}, {
    type: "action" | "portrait" | "full_body" | "expression";
    url: string;
    label?: string | undefined;
}>;
export type CharacterReferenceImage = z.infer<typeof CharacterReferenceImageSchema>;
/** Zod schema for the three-view image set (front / side / back). */
export declare const ThreeViewImagesSchema: z.ZodObject<{
    front: z.ZodString;
    side: z.ZodString;
    back: z.ZodString;
}, "strip", z.ZodTypeAny, {
    front: string;
    side: string;
    back: string;
}, {
    front: string;
    side: string;
    back: string;
}>;
export type ThreeViewImages = z.infer<typeof ThreeViewImagesSchema>;
/** Zod schema for a full character asset. */
export declare const CharacterAssetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    gender: z.ZodEnum<["male", "female"]>;
    ageRange: z.ZodString;
    role: z.ZodString;
    appearance: z.ZodString;
    personality: z.ZodString;
    clothing: z.ZodString;
    referenceImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        type: z.ZodEnum<["portrait", "full_body", "action", "expression"]>;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "action" | "portrait" | "full_body" | "expression";
        url: string;
        label?: string | undefined;
    }, {
        type: "action" | "portrait" | "full_body" | "expression";
        url: string;
        label?: string | undefined;
    }>, "many">>;
    threeView: z.ZodOptional<z.ZodObject<{
        front: z.ZodString;
        side: z.ZodString;
        back: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        front: string;
        side: string;
        back: string;
    }, {
        front: string;
        side: string;
        back: string;
    }>>;
    featureVector: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    personality: string;
    role: string;
    appearance: string;
    referenceImages: {
        type: "action" | "portrait" | "full_body" | "expression";
        url: string;
        label?: string | undefined;
    }[];
    gender: "male" | "female";
    ageRange: string;
    clothing: string;
    threeView?: {
        front: string;
        side: string;
        back: string;
    } | undefined;
    featureVector?: number[] | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    personality: string;
    role: string;
    appearance: string;
    gender: "male" | "female";
    ageRange: string;
    clothing: string;
    referenceImages?: {
        type: "action" | "portrait" | "full_body" | "expression";
        url: string;
        label?: string | undefined;
    }[] | undefined;
    threeView?: {
        front: string;
        side: string;
        back: string;
    } | undefined;
    featureVector?: number[] | undefined;
}>;
export type CharacterAsset = z.infer<typeof CharacterAssetSchema>;
/** Zod schema for the entire serialised library. */
export declare const CharacterAssetLibrarySchema: z.ZodObject<{
    characters: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        gender: z.ZodEnum<["male", "female"]>;
        ageRange: z.ZodString;
        role: z.ZodString;
        appearance: z.ZodString;
        personality: z.ZodString;
        clothing: z.ZodString;
        referenceImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            type: z.ZodEnum<["portrait", "full_body", "action", "expression"]>;
            label: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "action" | "portrait" | "full_body" | "expression";
            url: string;
            label?: string | undefined;
        }, {
            type: "action" | "portrait" | "full_body" | "expression";
            url: string;
            label?: string | undefined;
        }>, "many">>;
        threeView: z.ZodOptional<z.ZodObject<{
            front: z.ZodString;
            side: z.ZodString;
            back: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            front: string;
            side: string;
            back: string;
        }, {
            front: string;
            side: string;
            back: string;
        }>>;
        featureVector: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        name: string;
        personality: string;
        role: string;
        appearance: string;
        referenceImages: {
            type: "action" | "portrait" | "full_body" | "expression";
            url: string;
            label?: string | undefined;
        }[];
        gender: "male" | "female";
        ageRange: string;
        clothing: string;
        threeView?: {
            front: string;
            side: string;
            back: string;
        } | undefined;
        featureVector?: number[] | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        name: string;
        personality: string;
        role: string;
        appearance: string;
        gender: "male" | "female";
        ageRange: string;
        clothing: string;
        referenceImages?: {
            type: "action" | "portrait" | "full_body" | "expression";
            url: string;
            label?: string | undefined;
        }[] | undefined;
        threeView?: {
            front: string;
            side: string;
            back: string;
        } | undefined;
        featureVector?: number[] | undefined;
    }>, "many">;
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    version: string;
    characters: {
        id: string;
        createdAt: string;
        updatedAt: string;
        name: string;
        personality: string;
        role: string;
        appearance: string;
        referenceImages: {
            type: "action" | "portrait" | "full_body" | "expression";
            url: string;
            label?: string | undefined;
        }[];
        gender: "male" | "female";
        ageRange: string;
        clothing: string;
        threeView?: {
            front: string;
            side: string;
            back: string;
        } | undefined;
        featureVector?: number[] | undefined;
    }[];
}, {
    version: string;
    characters: {
        id: string;
        createdAt: string;
        updatedAt: string;
        name: string;
        personality: string;
        role: string;
        appearance: string;
        gender: "male" | "female";
        ageRange: string;
        clothing: string;
        referenceImages?: {
            type: "action" | "portrait" | "full_body" | "expression";
            url: string;
            label?: string | undefined;
        }[] | undefined;
        threeView?: {
            front: string;
            side: string;
            back: string;
        } | undefined;
        featureVector?: number[] | undefined;
    }[];
}>;
export type CharacterAssetLibrary = z.infer<typeof CharacterAssetLibrarySchema>;
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
export declare class CharacterLibrary {
    /** Version tag emitted in serialised output. */
    static readonly VERSION = "1.0.0";
    private readonly library;
    /**
     * Add a new character to the library.
     *
     * A unique `id` (UUIDv4) and ISO timestamps are generated automatically.
     *
     * @param asset Character definition without id / createdAt / updatedAt.
     * @returns The fully-formed CharacterAsset that was stored.
     */
    addCharacter(asset: Omit<CharacterAsset, "id" | "createdAt" | "updatedAt">): CharacterAsset;
    /**
     * Retrieve a character by its unique id.
     *
     * @param id Character id.
     * @returns The character, or `undefined` if not found.
     */
    getCharacter(id: string): CharacterAsset | undefined;
    /**
     * Retrieve the first character whose name matches (case-sensitive, exact).
     *
     * @param name Character name to search for.
     * @returns The first matching character, or `undefined`.
     */
    getCharacterByName(name: string): CharacterAsset | undefined;
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
    updateCharacter(id: string, updates: Partial<CharacterAsset>): CharacterAsset;
    /**
     * Remove a character from the library.
     *
     * @param id Character id.
     * @returns `true` if a character was removed, `false` if not found.
     */
    removeCharacter(id: string): boolean;
    /**
     * List all characters currently in the library.
     *
     * @returns A new array of all character assets (order is insertion order).
     */
    listCharacters(): CharacterAsset[];
    /**
     * Append a reference image to a character's reference list.
     *
     * @param characterId Target character id.
     * @param image The reference image to add.
     * @throws If the character is not found.
     */
    addReferenceImage(characterId: string, image: CharacterReferenceImage): void;
    /**
     * Set (or replace) the three-view image set for a character.
     *
     * @param characterId Target character id.
     * @param threeView The front / side / back image URLs.
     * @throws If the character is not found.
     */
    setThreeView(characterId: string, threeView: ThreeViewImages): void;
    /**
     * Set (or replace) the face-embedding feature vector for a character.
     *
     * @param characterId Target character id.
     * @param vector The extracted feature vector (e.g. 512-dim face embedding).
     * @throws If the character is not found.
     */
    setFeatureVector(characterId: string, vector: number[]): void;
    /**
     * Serialise the entire library to a JSON string.
     *
     * The output is validated against {@link CharacterAssetLibrarySchema} before
     * encoding so corrupt in-memory state cannot produce invalid JSON.
     *
     * @returns JSON string of the library.
     */
    toJSON(): string;
    /**
     * Reconstruct a CharacterLibrary from a JSON string.
     *
     * The input is validated against {@link CharacterAssetLibrarySchema}. If
     * validation fails a Zod error is thrown.
     *
     * @param json JSON string produced by {@link toJSON} or compatible source.
     * @returns A populated CharacterLibrary.
     */
    static fromJSON(json: string): CharacterLibrary;
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
    static fromScriptCharacters(characters: ReadonlyArray<{
        name: string;
        gender: string;
        ageRange?: string;
        role: string;
        personality: string;
        appearance?: string;
    }>): CharacterLibrary;
}
//# sourceMappingURL=character-asset-library.d.ts.map