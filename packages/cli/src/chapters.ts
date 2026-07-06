// packages/cli/src/chapters.ts
// Chapter management — load, save, list, and number chapters on disk.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { type Chapter, type ChapterMeta } from "@tavernos/core";
import { readJson, writeJson } from "./fs-utils.js";
import { chaptersDir, chapterFileName } from "./paths.js";

/**
 * Load a single chapter (including body) from disk.
 * Returns null if the chapter file does not exist.
 */
export async function loadChapter(
  projectRoot: string,
  bookId: string,
  number: number,
): Promise<Chapter | null> {
  const filePath = join(chaptersDir(projectRoot, bookId), chapterFileName(number));
  return readJson<Chapter>(filePath);
}

/** Save a chapter (including body) to disk. */
export async function saveChapter(
  projectRoot: string,
  bookId: string,
  chapter: Chapter,
): Promise<void> {
  const filePath = join(chaptersDir(projectRoot, bookId), chapterFileName(chapter.number));
  await writeJson(filePath, chapter);
}

/**
 * List all chapters for a book, sorted by chapter number.
 * Loads only metadata (excludes body) for efficiency.
 */
export async function listChapters(
  projectRoot: string,
  bookId: string,
): Promise<ChapterMeta[]> {
  const dir = chaptersDir(projectRoot, bookId);
  try {
    const entries = await fs.readdir(dir);
    const chapters: ChapterMeta[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const full = await readJson<Chapter>(join(dir, entry));
      if (full) {
        // Return a metadata-only view: drop the (potentially large) body so
        // callers don't hold full chapter text in memory. NOTE: the full JSON
        // is still read from disk here; a future optimization could store
        // chapter metadata in a separate index file to avoid reading bodies
        // entirely when only listing is needed.
        const { body: _body, ...meta } = full;
        chapters.push(meta as ChapterMeta);
      }
    }
    return chapters.sort((a, b) => a.number - b.number);
  } catch {
    return [];
  }
}

/** Return the next chapter number (max existing + 1, or 1 if none exist). */
export async function nextChapterNumber(
  projectRoot: string,
  bookId: string,
): Promise<number> {
  const chapters = await listChapters(projectRoot, bookId);
  if (chapters.length === 0) return 1;
  return chapters[chapters.length - 1]!.number + 1;
}
