// packages/studio/server/character-sync.ts
//
// Character card sync — bridges the asset catalog (from the writing pipeline)
// to the characters/ directory (used by character chat).
//
// After each chapter is written and the asset-catalog.json is persisted,
// this module synchronizes newly extracted or updated character assets
// into PersonaCardV2 JSON files in the characters/ directory.
//
// Sync rules:
//   1. NEW character in asset-catalog → Create a new card (autoSynced=true)
//   2. EXISTING card with autoSynced=true → Update (description, personality, etc.)
//   3. EXISTING card with autoSynced=false → SKIP (user manually created/edited)
//
// All operations are best-effort: failures are logged but never block
// the writing pipeline.

import { join } from "node:path";
import {
  assetToCard,
  assetToFilename,
  isAutoSyncedCard,
  mergeAssetIntoCard,
  type Asset,
  type PersonaCardV2,
  PersonaCardV2Schema,
} from "@tavernos/core";
import { DATA_DIR, ensureDir, readValidatedCard, writeJson } from "./context.js";
import { syncCharacter } from "./sync/sync.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of a character card sync operation. */
export interface SyncResult {
  /** Number of new character cards created. */
  created: number;
  /** Number of existing auto-synced cards updated. */
  updated: number;
  /** Number of manually created cards skipped (not overwritten). */
  skipped: number;
  /** Total characters processed from the asset catalog. */
  total: number;
  /** Filenames of created/updated cards. */
  syncedFiles: string[];
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Synchronize character assets from the asset catalog to the characters/
 * directory as PersonaCardV2 JSON files.
 *
 * This function is called after the writing pipeline persists the merged
 * asset-catalog.json. It reads the catalog, compares it with existing
 * character cards on disk, and creates/updates cards as needed.
 *
 * @param projectId   Project directory id.
 * @param characters  Character assets from the merged asset catalog.
 * @param storyBible  Optional story bible text (injected as scenario context).
 * @returns Sync result summary.
 */
export async function syncCharacterCards(
  projectId: string,
  characters: readonly Asset[],
  storyBible?: string,
): Promise<SyncResult> {
  const charDir = join(DATA_DIR, projectId, "characters");
  await ensureDir(charDir);

  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    total: characters.length,
    syncedFiles: [],
  };

  for (const asset of characters) {
    try {
      const filename = assetToFilename(asset);
      const filePath = join(charDir, filename);
      const existing = await readValidatedCard(filePath);

      if (existing) {
        // Card already exists on disk.
        const existingV2 = existing as PersonaCardV2;
        if (isAutoSyncedCard(existingV2)) {
          // Auto-synced card — safe to update.
          const merged = mergeAssetIntoCard(existingV2, asset, storyBible);
          const validated = PersonaCardV2Schema.parse(merged);
          await writeJson(filePath, validated);
          syncCharacter(projectId, filename);
          result.updated++;
          result.syncedFiles.push(filename);
        } else {
          // Manually created/edited card — skip to preserve user's work.
          result.skipped++;
        }
      } else {
        // No existing card — create a new one.
        const card = assetToCard(asset, storyBible);
        const validated = PersonaCardV2Schema.parse(card);
        await writeJson(filePath, validated);
        syncCharacter(projectId, filename);
        result.created++;
        result.syncedFiles.push(filename);
      }
    } catch (err) {
      // Individual character sync failures are non-fatal.
      console.warn(
        `[character-sync] Failed to sync character "${asset.name}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  if (result.created > 0 || result.updated > 0) {
    console.log(
      `[character-sync] Synced ${result.created} new + ${result.updated} updated character cards` +
      (result.skipped > 0 ? ` (${result.skipped} manually edited, skipped)` : ""),
    );
  }

  return result;
}
