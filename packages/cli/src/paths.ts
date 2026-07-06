// packages/cli/src/paths.ts
// Pure path constants and path helpers — no filesystem or @tavernos/core deps.
// Shared by project, books, and chapters modules to avoid circular dependencies.

import { join } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CONFIG_FILE = "tavernos.json";
export const BOOKS_DIR = "books";
export const PERSONAS_DIR = "personas";
export const LOREBOOK_DIR = "lorebook";
export const CHAPTERS_DIR = "chapters";
export const STORY_DIR = "story";
export const EXPORTS_DIR = "exports";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Return the directory path for a given book id. */
export function bookDir(projectRoot: string, bookId: string): string {
  return join(projectRoot, BOOKS_DIR, bookId);
}

/** Return the directory path for chapters of a given book. */
export function chaptersDir(projectRoot: string, bookId: string): string {
  return join(bookDir(projectRoot, bookId), CHAPTERS_DIR);
}

/** Generate a zero-padded filename for a chapter number. */
export function chapterFileName(number: number): string {
  return `${String(number).padStart(3, "0")}.json`;
}
