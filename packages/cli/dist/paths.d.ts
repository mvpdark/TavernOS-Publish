export declare const CONFIG_FILE = "tavernos.json";
export declare const BOOKS_DIR = "books";
export declare const PERSONAS_DIR = "personas";
export declare const LOREBOOK_DIR = "lorebook";
export declare const CHAPTERS_DIR = "chapters";
export declare const STORY_DIR = "story";
export declare const EXPORTS_DIR = "exports";
/** Return the directory path for a given book id. */
export declare function bookDir(projectRoot: string, bookId: string): string;
/** Return the directory path for chapters of a given book. */
export declare function chaptersDir(projectRoot: string, bookId: string): string;
/** Generate a zero-padded filename for a chapter number. */
export declare function chapterFileName(number: number): string;
//# sourceMappingURL=paths.d.ts.map