// ---------------------------------------------------------------------------
// Lorebook context loader — shared by the pipeline and short-story routes.
//
// Loads a project's lorebook entries + scan config from disk, runs the
// LoreEngine keyword-matching scan against the current chapter haystack,
// and returns the injected world-settings string for the writer prompt.
//
// This is the Phase A context layer: keyword-triggered lore injection.
// Returns an empty string when there are no entries or no matches, so
// callers can simply do `if (lore) writerInput.lorebook = lore`.
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  LoreEngine,
  LoreEntrySchema,
  LoreScanConfigSchema,
  type LoreEntry,
  type LoreScanConfig,
} from "@tavernos/core";
import { DATA_DIR, ensureDir, readJson } from "./context.js";

const CONFIG_FILE = "lorebook-config.json";

const DEFAULT_CONFIG: LoreScanConfig = {
  recursionEnabled: false,
  maxRecursionSteps: 0,
  scanDepth: 2,
  recursionDepth: 1,
  budgetPercentage: 25,
  budgetCap: 0,
  minActivations: 0,
  sortFn: "order",
};

/**
 * Load lorebook entries + scan config for a project, then run the LoreEngine
 * keyword scan against `haystack` to produce matched, budget-bounded world
 * settings text.
 *
 * @param projectId  Project directory id.
 * @param haystack   The text to scan for keyword matches (typically the
 *                   chapter outline + recent narrative context).
 * @param maxContextTokens  Token budget ceiling for injected entries.
 * @returns Injected lorebook text, or "" if no entries / no matches.
 */
export async function loadLorebookContext(
  projectId: string,
  haystack: string,
  maxContextTokens = 4000,
): Promise<string> {
  try {
    const loreDir = join(DATA_DIR, projectId, "lorebook");
    await ensureDir(loreDir);

    const files = await fs.readdir(loreDir);
    const entryFiles = files.filter(
      (f) => f.endsWith(".json") && f !== CONFIG_FILE,
    );
    if (entryFiles.length === 0) return "";

    // Parallel load + validate all entry files.
    const raws = await Promise.all(
      entryFiles.map((file) => readJson<unknown>(join(loreDir, file))),
    );
    const entries: LoreEntry[] = [];
    for (const raw of raws) {
      if (!raw) continue;
      const parsed = LoreEntrySchema.safeParse(raw);
      if (parsed.success) entries.push(parsed.data);
    }
    if (entries.length === 0) return "";

    // Load scan config (fall back to defaults if missing/invalid).
    const configRaw = await readJson<unknown>(join(loreDir, CONFIG_FILE));
    const config: LoreScanConfig =
      configRaw && LoreScanConfigSchema.safeParse(configRaw).success
        ? (LoreScanConfigSchema.parse(configRaw) as LoreScanConfig)
        : DEFAULT_CONFIG;

    const engine = new LoreEngine(config);
    const result = engine.scan({
      entries,
      messages: [haystack],
      config,
      maxContextTokens,
    });
    return result.injectedContent ?? "";
  } catch {
    // Lorebook is best-effort context — never block writing on it.
    return "";
  }
}
