// packages/cli/src/context.ts
// Shared CLI context barrel — re-exports all helpers from focused modules
// and provides the CliContext type + resolveCliContext/resolveBookId logic
// that ties project discovery, LLM client creation, and book lookup together.
//
// This file was split from a single 367-line module into focused single-
// responsibility modules (paths, fs-utils, output, project, llm-factory,
// books, chapters). It remains a barrel so command modules keep importing
// from "../context.js" without any changes.

import { type ProjectConfig, type LLMClient } from "@tavernos/core";
import { findProjectRoot, loadProjectConfig } from "./project.js";
import { createClientFromConfig } from "./llm-factory.js";
import { listBookIds } from "./books.js";

// ---------------------------------------------------------------------------
// Re-exports for backward compatibility
// ---------------------------------------------------------------------------

// Path constants + book directory helper (chaptersDir/chapterFileName stay
// internal to paths/chapters modules — they were never part of the public API).
export {
  CONFIG_FILE,
  BOOKS_DIR,
  PERSONAS_DIR,
  LOREBOOK_DIR,
  CHAPTERS_DIR,
  STORY_DIR,
  EXPORTS_DIR,
  bookDir,
} from "./paths.js";

// File-system helpers.
export { ensureDir, readJson, writeJson, writeText } from "./fs-utils.js";

// Console output helpers.
export { info, success, error } from "./output.js";

// Project discovery & config.
export { findProjectRoot, loadProjectConfig, saveProjectConfig } from "./project.js";

// LLM client factory.
export { createClientFromConfig } from "./llm-factory.js";

// Book management.
export { listBookIds, loadBookConfig, saveBookConfig, loadBookMeta } from "./books.js";

// Chapter management.
export {
  loadChapter,
  saveChapter,
  listChapters,
  nextChapterNumber,
} from "./chapters.js";

// ---------------------------------------------------------------------------
// CLI context object
// ---------------------------------------------------------------------------

/**
 * Resolved CLI context — bundles everything a command handler needs.
 */
export interface CliContext {
  projectRoot: string;
  config: ProjectConfig;
  client: LLMClient;
  model: string;
}

/**
 * Resolve the CLI context by finding the project root and loading config.
 * Throws with a user-friendly message when not inside a project.
 */
export async function resolveCliContext(): Promise<CliContext> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error(
      "Not inside a TavernOS project. Run `tavernos init <name>` to create one.",
    );
  }
  const config = await loadProjectConfig(projectRoot);
  const { client, model } = createClientFromConfig(config);
  return { projectRoot, config, client, model };
}

/**
 * Resolve a book id: use the explicit argument, or fall back to the only
 * book in the project, or throw if ambiguous.
 */
export async function resolveBookId(
  ctx: CliContext,
  explicit?: string,
): Promise<string> {
  if (explicit) return explicit;
  const ids = await listBookIds(ctx.projectRoot);
  if (ids.length === 0) {
    throw new Error("No books found. Run `tavernos book create <title>` first.");
  }
  if (ids.length === 1) return ids[0]!;
  throw new Error(
    `Multiple books found (${ids.join(", ")}). Specify --book <id>.`,
  );
}
