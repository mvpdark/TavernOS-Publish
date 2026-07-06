// packages/core/src/market/file-source.ts
// File-based market data source — reads trend data from a local JSON file.
// Allows users to manually maintain market trend data without needing
// an external API. The file is re-read on each fetch, so users can update
// it at runtime (effective file watching without fs.watch overhead).
import { promises as fs } from "node:fs";
import { MarketTrendSchema, ReaderPreferenceSchema, } from "./types.js";
/**
 * File-based market data source.
 *
 * Reads a JSON file with the following structure:
 * {
 *   "trends": [ { "id": "...", "category": "genre", "name": "系统流", ... } ],
 *   "preferences": [ { "category": "genre", "preference": "快节奏", ... } ]
 * }
 *
 * The file is re-read on each fetch, so users can update it at runtime.
 * If the primary `filePath` does not exist, the source falls back to
 * `fallbackPath` (if configured) so that sensible default data is always
 * available.
 */
export class FileMarketSource {
    name = "file";
    config;
    constructor(config) {
        this.config = { watch: config.watch ?? true, ...config };
    }
    async fetchTrends() {
        const data = await this.readFile();
        if (!data)
            return [];
        const result = MarketTrendSchema.array().safeParse(data.trends);
        return result.success ? result.data : [];
    }
    async fetchPreferences() {
        const data = await this.readFile();
        if (!data)
            return [];
        const result = ReaderPreferenceSchema.array().safeParse(data.preferences);
        return result.success ? result.data : [];
    }
    async isAvailable() {
        try {
            await fs.access(this.config.filePath);
            return true;
        }
        catch {
            if (this.config.fallbackPath) {
                try {
                    await fs.access(this.config.fallbackPath);
                    return true;
                }
                catch {
                    return false;
                }
            }
            return false;
        }
    }
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    /**
     * Read and parse the trends JSON file.
     * Tries the primary path first, then the fallback path.
     * Returns null if neither file exists or parsing fails.
     */
    async readFile() {
        const raw = await this.readRaw();
        if (raw === null)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            // Invalid JSON — silently return null so callers get empty arrays.
            return null;
        }
    }
    /**
     * Read raw file contents from the primary path, falling back to
     * the fallback path if the primary file is missing.
     */
    async readRaw() {
        // Try primary file first.
        try {
            return await fs.readFile(this.config.filePath, "utf8");
        }
        catch {
            // Primary file not found or unreadable — try fallback.
        }
        if (this.config.fallbackPath) {
            try {
                return await fs.readFile(this.config.fallbackPath, "utf8");
            }
            catch {
                // Fallback also missing — return null.
            }
        }
        return null;
    }
}
//# sourceMappingURL=file-source.js.map