import { type ProjectConfig, type LLMClient } from "@tavernos/core";
export { CONFIG_FILE, BOOKS_DIR, PERSONAS_DIR, LOREBOOK_DIR, CHAPTERS_DIR, STORY_DIR, EXPORTS_DIR, bookDir, } from "./paths.js";
export { ensureDir, readJson, writeJson, writeText } from "./fs-utils.js";
export { info, success, error } from "./output.js";
export { findProjectRoot, loadProjectConfig, saveProjectConfig } from "./project.js";
export { createClientFromConfig } from "./llm-factory.js";
export { listBookIds, loadBookConfig, saveBookConfig, loadBookMeta } from "./books.js";
export { loadChapter, saveChapter, listChapters, nextChapterNumber, } from "./chapters.js";
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
export declare function resolveCliContext(): Promise<CliContext>;
/**
 * Resolve a book id: use the explicit argument, or fall back to the only
 * book in the project, or throw if ambiguous.
 */
export declare function resolveBookId(ctx: CliContext, explicit?: string): Promise<string>;
//# sourceMappingURL=context.d.ts.map