// Asset extraction module: types and Zod schemas.
//
// Extracts structured assets (characters, scenes, props) from chapter
// content during the writing phase — before any video production.
// This is superior to MJ's approach (which binds assets at the video stage)
// because TavernOS builds the asset catalog at writing/audit time.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Asset kind enum
// ---------------------------------------------------------------------------

export const AssetKindSchema = z.enum(["character", "scene", "prop"]);
export type AssetKind = z.infer<typeof AssetKindSchema>;

// ---------------------------------------------------------------------------
// Single asset entry
// ---------------------------------------------------------------------------

export const AssetSchema = z.object({
  /** Stable identifier (auto-generated or LLM-provided). */
  id: z.string().min(1),
  /** Which category the asset belongs to. */
  kind: AssetKindSchema,
  /** Canonical name of the asset (e.g. character name, scene name). */
  name: z.string().min(1),
  /** Alternative names, nicknames, or aliases used in the text. */
  aliases: z.array(z.string()).default([]),
  /** Free-text description (appearance, personality, visual features, etc.). */
  description: z.string().default(""),
  /** First chapter where this asset appeared. */
  firstChapter: z.number().int().min(1).default(1),
  /** Last chapter where this asset appeared (updated on each extraction). */
  lastChapter: z.number().int().min(1).default(1),
  /** Key-value attribute pairs (e.g. { "age": "25", "hair": "black" }). */
  attributes: z.record(z.string(), z.string()).default({}),
  /** Number of chapters in which this asset has appeared. */
  appearanceCount: z.number().int().min(1).default(1),
});
export type Asset = z.infer<typeof AssetSchema>;

// ---------------------------------------------------------------------------
// Asset catalog (grouped by kind)
// ---------------------------------------------------------------------------

export const AssetCatalogSchema = z.object({
  characters: z.array(AssetSchema).default([]),
  scenes: z.array(AssetSchema).default([]),
  props: z.array(AssetSchema).default([]),
});
export type AssetCatalog = z.infer<typeof AssetCatalogSchema>;

// ---------------------------------------------------------------------------
// Extraction result
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helper: empty catalog
// ---------------------------------------------------------------------------

/** Returns a fresh empty catalog (used as a fallback when extraction fails). */
export function emptyCatalog(): AssetCatalog {
  return AssetCatalogSchema.parse({});
}
