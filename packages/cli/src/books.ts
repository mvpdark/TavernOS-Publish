// packages/cli/src/books.ts
// Book management — list, load, save book configs and metadata.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { type BookConfig, type BookMeta, BookConfigSchema } from "@tavernos/core";
import { readJson, writeJson } from "./fs-utils.js";
import { bookDir, BOOKS_DIR } from "./paths.js";
import { listChapters } from "./chapters.js";

/** List all book ids in the project by scanning the books/ directory. */
export async function listBookIds(projectRoot: string): Promise<string[]> {
  const dir = join(projectRoot, BOOKS_DIR);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/** Load a book configuration from disk. */
export async function loadBookConfig(
  projectRoot: string,
  bookId: string,
): Promise<BookConfig> {
  const raw = await readJson<unknown>(join(bookDir(projectRoot, bookId), "book.json"));
  if (raw === null) {
    throw new Error(`Book not found: ${bookId}`);
  }
  const result = BookConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid book config for ${bookId}`);
  }
  return result.data;
}

/** Save a book configuration to disk. */
export async function saveBookConfig(
  projectRoot: string,
  bookId: string,
  config: BookConfig,
): Promise<void> {
  await writeJson(join(bookDir(projectRoot, bookId), "book.json"), config);
}

/** Collect book metadata (config + chapter count + word count). */
export async function loadBookMeta(
  projectRoot: string,
  bookId: string,
): Promise<BookMeta> {
  const config = await loadBookConfig(projectRoot, bookId);
  const chapters = await listChapters(projectRoot, bookId);
  let totalWords = 0;
  for (const ch of chapters) {
    totalWords += ch.wordCount;
  }
  return {
    config,
    chapterCount: chapters.length,
    totalWords,
    lastChapterAt: chapters.length > 0
      ? chapters[chapters.length - 1]!.updatedAt
      : undefined,
    tags: [],
  };
}
