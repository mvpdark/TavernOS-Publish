// packages/cli/src/project.ts
// Project discovery and config loading/saving.

import { promises as fs } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { type ProjectConfig, ProjectConfigSchema } from "@tavernos/core";
import { readJson, writeJson } from "./fs-utils.js";
import { CONFIG_FILE } from "./paths.js";

/**
 * Walk upward from `cwd` to find the nearest `tavernos.json`.
 * Returns the absolute path to the project root, or null if not found.
 */
export async function findProjectRoot(
  cwd: string = process.cwd(),
): Promise<string | null> {
  let current = resolve(cwd);
  for (;;) {
    const candidate = join(current, CONFIG_FILE);
    try {
      await fs.access(candidate);
      return current;
    } catch {
      // not found here — go up
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Load and validate the project config from `tavernos.json`.
 * Throws when the file is missing or fails schema validation.
 */
export async function loadProjectConfig(
  projectRoot: string,
): Promise<ProjectConfig> {
  const raw = await readJson<unknown>(join(projectRoot, CONFIG_FILE));
  if (raw === null) {
    throw new Error(`Project config not found at ${join(projectRoot, CONFIG_FILE)}`);
  }
  const result = ProjectConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid project config:\n${issues}`);
  }
  return result.data;
}

/** Save the project config to `tavernos.json`. */
export async function saveProjectConfig(
  projectRoot: string,
  config: ProjectConfig,
): Promise<void> {
  await writeJson(join(projectRoot, CONFIG_FILE), config);
}
