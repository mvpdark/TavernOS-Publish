/** Recursively create a directory if it does not exist. */
export declare function ensureDir(dir: string): Promise<void>;
/**
 * Read and parse a JSON file.
 *
 * Returns `null` only when the file does not exist (ENOENT). Any other
 * error (e.g. a malformed JSON payload or an I/O failure) is re-thrown
 * with context so data corruption is not silently masked.
 */
export declare function readJson<T>(filePath: string): Promise<T | null>;
/** Serialize data as pretty-printed JSON and write it to disk. */
export declare function writeJson(filePath: string, data: unknown): Promise<void>;
/** Write plain text to a file, creating parent directories as needed. */
export declare function writeText(filePath: string, text: string): Promise<void>;
//# sourceMappingURL=fs-utils.d.ts.map