import type { Asset } from "./types.js";
import type { PersonaCardV2 } from "../character/types.js";
/**
 * Generate a safe filename for a character card from the asset name.
 * Matches the naming convention used by personas.ts:
 *   lowercase, non-alphanumeric (except CJK) replaced with hyphens.
 */
export declare function assetToFilename(asset: Asset): string;
/**
 * Convert a character Asset into a PersonaCardV2.
 *
 * This is a pure template transformation — no LLM calls. The resulting card
 * is marked with `extensions.tavernos.autoSynced = true` so the sync logic
 * knows it can safely overwrite it when the asset is updated.
 *
 * @param asset  The character asset from the asset catalog.
 * @param storyBible  Optional story bible text (used as scenario context).
 * @returns A PersonaCardV2 object ready for serialization.
 */
export declare function assetToCard(asset: Asset, storyBible?: string): PersonaCardV2;
/**
 * Check whether a PersonaCard was auto-synced from the asset pipeline.
 *
 * Auto-synced cards have `extensions.tavernos.autoSynced === true`.
 * Manually created or edited cards (no flag, or flag explicitly false)
 * are never overwritten by the sync logic.
 */
export declare function isAutoSyncedCard(card: PersonaCardV2): boolean;
/**
 * Merge an updated asset into an existing auto-synced card.
 *
 * Updates description, personality, system_prompt, and the tavernos
 * extension metadata. Preserves first_mes (to avoid resetting conversation
 * context) unless the description has changed dramatically (>50% growth).
 *
 * @param existing  The existing PersonaCardV2 (must be auto-synced).
 * @param asset     The updated asset from the catalog.
 * @param storyBible  Optional story bible text.
 * @returns An updated PersonaCardV2.
 */
export declare function mergeAssetIntoCard(existing: PersonaCardV2, asset: Asset, storyBible?: string): PersonaCardV2;
//# sourceMappingURL=to-card.d.ts.map