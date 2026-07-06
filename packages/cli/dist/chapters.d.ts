import { type Chapter, type ChapterMeta } from "@tavernos/core";
/**
 * Load a single chapter (including body) from disk.
 * Returns null if the chapter file does not exist.
 */
export declare function loadChapter(projectRoot: string, bookId: string, number: number): Promise<Chapter | null>;
/** Save a chapter (including body) to disk. */
export declare function saveChapter(projectRoot: string, bookId: string, chapter: Chapter): Promise<void>;
/**
 * List all chapters for a book, sorted by chapter number.
 * Loads only metadata (excludes body) for efficiency.
 */
export declare function listChapters(projectRoot: string, bookId: string): Promise<ChapterMeta[]>;
/** Return the next chapter number (max existing + 1, or 1 if none exist). */
export declare function nextChapterNumber(projectRoot: string, bookId: string): Promise<number>;
//# sourceMappingURL=chapters.d.ts.map