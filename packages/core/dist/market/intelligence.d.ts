import { type MarketReport, type MarketTrend, type ReaderPreference, type MarketDataSource, type MarketIntelligenceConfig } from "./types.js";
/**
 * Default empty data source. Returns no trends and no preferences.
 *
 * Used when no external data sources are configured so the engine still
 * produces a valid (empty) report without crashing. This allows the
 * market intelligence layer to be integrated into the pipeline immediately,
 * with real data sources added later as they become available.
 */
export declare class EmptyMarketSource implements MarketDataSource {
    readonly name = "empty";
    fetchTrends(): Promise<MarketTrend[]>;
    fetchPreferences(): Promise<ReaderPreference[]>;
    isAvailable(): Promise<boolean>;
}
/**
 * Market Intelligence engine.
 *
 * Queries pluggable data sources, synthesizes a MarketReport with trends
 * and reader preferences, and provides genre-specific recommendations for
 * the Architect agent. Reports are cached for the configured TTL and
 * optionally persisted to {projectRoot}/.tavernos/market-cache.json.
 */
export declare class MarketIntelligence {
    private readonly config;
    private readonly sources;
    private cache;
    private cacheTime;
    constructor(config?: MarketIntelligenceConfig);
    /**
     * Create a MarketIntelligence instance with the default file-based data
     * source. Reads trend data from {projectRoot}/.tavernos/market-trends.json,
     * falling back to the bundled default-trends.json if the user file doesn't
     * exist.
     *
     * @param projectRoot Optional project root for user trends file & cache.
     * @returns A MarketIntelligence instance backed by FileMarketSource.
     */
    static createDefault(projectRoot?: string): MarketIntelligence;
    /**
     * Query all available data sources and synthesize a market report.
     * Results are cached for the configured TTL period.
     */
    getReport(): Promise<MarketReport>;
    /**
     * Force-refresh the cache by querying all sources again.
     * Individual source failures are swallowed — the report is built from
     * whichever sources responded successfully.
     */
    refreshReport(): Promise<MarketReport>;
    /**
     * Get trend recommendations for a specific genre.
     * Used by the Architect agent to inform story planning.
     */
    getGenreRecommendations(genre: string): Promise<string[]>;
    /**
     * Register a custom data source.
     * The source will be queried on the next report refresh.
     */
    registerSource(source: MarketDataSource): void;
    /**
     * Check if any data source is available.
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get the cached report without refreshing.
     * Returns null if cache is empty or stale.
     */
    getCachedReport(): MarketReport | null;
    /** Build an empty report for fallback scenarios. */
    private buildEmptyReport;
    /**
     * Calculate confidence level based on source count and total sample size.
     *
     * - high:   3+ available sources AND total sample size > 1000
     * - medium: 1-2 sources OR total sample size > 100
     * - low:    otherwise
     */
    private calculateConfidence;
    /**
     * Generate Chinese recommendation strings from trends and preferences.
     * These are consumed by the Architect agent and displayed to the user.
     */
    private generateRecommendations;
    /** Describe data freshness in Chinese for the report consumer. */
    private describeDataFreshness;
    /** Resolve the cache file path, or null if projectRoot is not set. */
    private cacheFilePath;
    /**
     * Load the persisted cache from disk into memory.
     * Silently ignores missing or invalid cache files.
     */
    private loadPersistedCache;
    /**
     * Persist the current cache to disk.
     * Best-effort: write failures are silently ignored.
     */
    private persistCache;
}
//# sourceMappingURL=intelligence.d.ts.map