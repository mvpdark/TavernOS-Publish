import { type MarketTrend, type ReaderPreference, type MarketDataSource } from "./types.js";
export interface FileSourceConfig {
    /** Path to the JSON file containing trend data. */
    filePath: string;
    /**
     * Optional fallback path — used when the primary file does not exist.
     * Typically points to the bundled default-trends.json.
     */
    fallbackPath?: string;
    /**
     * Whether to watch the file for changes (default: true).
     * Since the file is re-read on every fetch, changes are picked up
     * automatically. This flag is reserved for future optimizations
     * (e.g. in-memory caching with fs.watch invalidation).
     */
    watch?: boolean;
}
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
export declare class FileMarketSource implements MarketDataSource {
    readonly name = "file";
    private readonly config;
    constructor(config: FileSourceConfig);
    fetchTrends(): Promise<MarketTrend[]>;
    fetchPreferences(): Promise<ReaderPreference[]>;
    isAvailable(): Promise<boolean>;
    /**
     * Read and parse the trends JSON file.
     * Tries the primary path first, then the fallback path.
     * Returns null if neither file exists or parsing fails.
     */
    private readFile;
    /**
     * Read raw file contents from the primary path, falling back to
     * the fallback path if the primary file is missing.
     */
    private readRaw;
}
//# sourceMappingURL=file-source.d.ts.map