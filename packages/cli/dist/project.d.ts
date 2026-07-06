import { type ProjectConfig } from "@tavernos/core";
/**
 * Walk upward from `cwd` to find the nearest `tavernos.json`.
 * Returns the absolute path to the project root, or null if not found.
 */
export declare function findProjectRoot(cwd?: string): Promise<string | null>;
/**
 * Load and validate the project config from `tavernos.json`.
 * Throws when the file is missing or fails schema validation.
 */
export declare function loadProjectConfig(projectRoot: string): Promise<ProjectConfig>;
/** Save the project config to `tavernos.json`. */
export declare function saveProjectConfig(projectRoot: string, config: ProjectConfig): Promise<void>;
//# sourceMappingURL=project.d.ts.map