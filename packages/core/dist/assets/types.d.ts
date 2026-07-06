import { z } from "zod";
export declare const AssetKindSchema: z.ZodEnum<["character", "scene", "prop"]>;
export type AssetKind = z.infer<typeof AssetKindSchema>;
export declare const AssetSchema: z.ZodObject<{
    /** Stable identifier (auto-generated or LLM-provided). */
    id: z.ZodString;
    /** Which category the asset belongs to. */
    kind: z.ZodEnum<["character", "scene", "prop"]>;
    /** Canonical name of the asset (e.g. character name, scene name). */
    name: z.ZodString;
    /** Alternative names, nicknames, or aliases used in the text. */
    aliases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Free-text description (appearance, personality, visual features, etc.). */
    description: z.ZodDefault<z.ZodString>;
    /** First chapter where this asset appeared. */
    firstChapter: z.ZodDefault<z.ZodNumber>;
    /** Last chapter where this asset appeared (updated on each extraction). */
    lastChapter: z.ZodDefault<z.ZodNumber>;
    /** Key-value attribute pairs (e.g. { "age": "25", "hair": "black" }). */
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** Number of chapters in which this asset has appeared. */
    appearanceCount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    aliases: string[];
    kind: "character" | "scene" | "prop";
    firstChapter: number;
    lastChapter: number;
    attributes: Record<string, string>;
    appearanceCount: number;
}, {
    id: string;
    name: string;
    kind: "character" | "scene" | "prop";
    description?: string | undefined;
    aliases?: string[] | undefined;
    firstChapter?: number | undefined;
    lastChapter?: number | undefined;
    attributes?: Record<string, string> | undefined;
    appearanceCount?: number | undefined;
}>;
export type Asset = z.infer<typeof AssetSchema>;
export declare const AssetCatalogSchema: z.ZodObject<{
    characters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Stable identifier (auto-generated or LLM-provided). */
        id: z.ZodString;
        /** Which category the asset belongs to. */
        kind: z.ZodEnum<["character", "scene", "prop"]>;
        /** Canonical name of the asset (e.g. character name, scene name). */
        name: z.ZodString;
        /** Alternative names, nicknames, or aliases used in the text. */
        aliases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text description (appearance, personality, visual features, etc.). */
        description: z.ZodDefault<z.ZodString>;
        /** First chapter where this asset appeared. */
        firstChapter: z.ZodDefault<z.ZodNumber>;
        /** Last chapter where this asset appeared (updated on each extraction). */
        lastChapter: z.ZodDefault<z.ZodNumber>;
        /** Key-value attribute pairs (e.g. { "age": "25", "hair": "black" }). */
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        /** Number of chapters in which this asset has appeared. */
        appearanceCount: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        aliases: string[];
        kind: "character" | "scene" | "prop";
        firstChapter: number;
        lastChapter: number;
        attributes: Record<string, string>;
        appearanceCount: number;
    }, {
        id: string;
        name: string;
        kind: "character" | "scene" | "prop";
        description?: string | undefined;
        aliases?: string[] | undefined;
        firstChapter?: number | undefined;
        lastChapter?: number | undefined;
        attributes?: Record<string, string> | undefined;
        appearanceCount?: number | undefined;
    }>, "many">>;
    scenes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Stable identifier (auto-generated or LLM-provided). */
        id: z.ZodString;
        /** Which category the asset belongs to. */
        kind: z.ZodEnum<["character", "scene", "prop"]>;
        /** Canonical name of the asset (e.g. character name, scene name). */
        name: z.ZodString;
        /** Alternative names, nicknames, or aliases used in the text. */
        aliases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text description (appearance, personality, visual features, etc.). */
        description: z.ZodDefault<z.ZodString>;
        /** First chapter where this asset appeared. */
        firstChapter: z.ZodDefault<z.ZodNumber>;
        /** Last chapter where this asset appeared (updated on each extraction). */
        lastChapter: z.ZodDefault<z.ZodNumber>;
        /** Key-value attribute pairs (e.g. { "age": "25", "hair": "black" }). */
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        /** Number of chapters in which this asset has appeared. */
        appearanceCount: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        aliases: string[];
        kind: "character" | "scene" | "prop";
        firstChapter: number;
        lastChapter: number;
        attributes: Record<string, string>;
        appearanceCount: number;
    }, {
        id: string;
        name: string;
        kind: "character" | "scene" | "prop";
        description?: string | undefined;
        aliases?: string[] | undefined;
        firstChapter?: number | undefined;
        lastChapter?: number | undefined;
        attributes?: Record<string, string> | undefined;
        appearanceCount?: number | undefined;
    }>, "many">>;
    props: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Stable identifier (auto-generated or LLM-provided). */
        id: z.ZodString;
        /** Which category the asset belongs to. */
        kind: z.ZodEnum<["character", "scene", "prop"]>;
        /** Canonical name of the asset (e.g. character name, scene name). */
        name: z.ZodString;
        /** Alternative names, nicknames, or aliases used in the text. */
        aliases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text description (appearance, personality, visual features, etc.). */
        description: z.ZodDefault<z.ZodString>;
        /** First chapter where this asset appeared. */
        firstChapter: z.ZodDefault<z.ZodNumber>;
        /** Last chapter where this asset appeared (updated on each extraction). */
        lastChapter: z.ZodDefault<z.ZodNumber>;
        /** Key-value attribute pairs (e.g. { "age": "25", "hair": "black" }). */
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        /** Number of chapters in which this asset has appeared. */
        appearanceCount: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        aliases: string[];
        kind: "character" | "scene" | "prop";
        firstChapter: number;
        lastChapter: number;
        attributes: Record<string, string>;
        appearanceCount: number;
    }, {
        id: string;
        name: string;
        kind: "character" | "scene" | "prop";
        description?: string | undefined;
        aliases?: string[] | undefined;
        firstChapter?: number | undefined;
        lastChapter?: number | undefined;
        attributes?: Record<string, string> | undefined;
        appearanceCount?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    characters: {
        id: string;
        name: string;
        description: string;
        aliases: string[];
        kind: "character" | "scene" | "prop";
        firstChapter: number;
        lastChapter: number;
        attributes: Record<string, string>;
        appearanceCount: number;
    }[];
    scenes: {
        id: string;
        name: string;
        description: string;
        aliases: string[];
        kind: "character" | "scene" | "prop";
        firstChapter: number;
        lastChapter: number;
        attributes: Record<string, string>;
        appearanceCount: number;
    }[];
    props: {
        id: string;
        name: string;
        description: string;
        aliases: string[];
        kind: "character" | "scene" | "prop";
        firstChapter: number;
        lastChapter: number;
        attributes: Record<string, string>;
        appearanceCount: number;
    }[];
}, {
    characters?: {
        id: string;
        name: string;
        kind: "character" | "scene" | "prop";
        description?: string | undefined;
        aliases?: string[] | undefined;
        firstChapter?: number | undefined;
        lastChapter?: number | undefined;
        attributes?: Record<string, string> | undefined;
        appearanceCount?: number | undefined;
    }[] | undefined;
    scenes?: {
        id: string;
        name: string;
        kind: "character" | "scene" | "prop";
        description?: string | undefined;
        aliases?: string[] | undefined;
        firstChapter?: number | undefined;
        lastChapter?: number | undefined;
        attributes?: Record<string, string> | undefined;
        appearanceCount?: number | undefined;
    }[] | undefined;
    props?: {
        id: string;
        name: string;
        kind: "character" | "scene" | "prop";
        description?: string | undefined;
        aliases?: string[] | undefined;
        firstChapter?: number | undefined;
        lastChapter?: number | undefined;
        attributes?: Record<string, string> | undefined;
        appearanceCount?: number | undefined;
    }[] | undefined;
}>;
export type AssetCatalog = z.infer<typeof AssetCatalogSchema>;
export interface AssetExtractionResult {
    /** The parsed and validated asset catalog. */
    readonly catalog: AssetCatalog;
    /** The raw LLM response text (for debugging and audit trails). */
    readonly rawResponse: string;
    /** true when the catalog is a best-effort fallback (e.g. parse failure).
     *  Always a boolean — `false` on a successful extraction. */
    readonly degraded: boolean;
    /** Error message when extraction degraded due to a thrown error (undefined on success). */
    readonly error?: string;
}
/** Returns a fresh empty catalog (used as a fallback when extraction fails). */
export declare function emptyCatalog(): AssetCatalog;
//# sourceMappingURL=types.d.ts.map