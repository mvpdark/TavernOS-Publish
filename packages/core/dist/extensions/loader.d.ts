import type { ExtensionLoadResult } from "./types.js";
/**
 * Validate a plain object as an extension.
 *
 * Performs two-stage validation:
 *  1. Zod validation of the manifest (name, version, description, capabilities).
 *  2. Structural validation of lifecycle methods, pipeline hooks, and narrative processors.
 *
 * @returns An ExtensionLoadResult with success=true and the extension, or
 *          success=false and an error message.
 */
export declare function loadExtensionFromObject(obj: unknown): ExtensionLoadResult;
/**
 * Load an extension from a dynamically imported ES module.
 *
 * The module must export an `extension` named export (or a default export
 * that is an Extension object).  This enables loading extensions from
 * file paths at runtime.
 *
 * @param modulePath  File path or module specifier to import.
 * @returns An ExtensionLoadResult.
 *
 * @example
 * ```ts
 * const result = await loadExtensionFromModule("./extensions/my-ext/index.js");
 * if (result.success) {
 *   registry.register(result.extension);
 * }
 * ```
 */
export declare function loadExtensionFromModule(modulePath: string): Promise<ExtensionLoadResult>;
/**
 * Convenience: validate an extension object and return a human-readable
 * error message, or null if valid.  Useful for pre-flight checks.
 */
export declare function validateExtension(obj: unknown): string | null;
//# sourceMappingURL=loader.d.ts.map