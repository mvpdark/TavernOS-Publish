import { type BookConfig, type BookMeta } from "@tavernos/core";
/** List all book ids in the project by scanning the books/ directory. */
export declare function listBookIds(projectRoot: string): Promise<string[]>;
/** Load a book configuration from disk. */
export declare function loadBookConfig(projectRoot: string, bookId: string): Promise<BookConfig>;
/** Save a book configuration to disk. */
export declare function saveBookConfig(projectRoot: string, bookId: string, config: BookConfig): Promise<void>;
/** Collect book metadata (config + chapter count + word count). */
export declare function loadBookMeta(projectRoot: string, bookId: string): Promise<BookMeta>;
//# sourceMappingURL=books.d.ts.map