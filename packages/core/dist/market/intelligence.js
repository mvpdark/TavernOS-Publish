// packages/core/src/market/intelligence.ts
//
// Market Intelligence engine — synthesizes market trends and reader
// preferences into actionable recommendations for story planning.
//
// The engine is data-source agnostic: it queries pluggable MarketDataSource
// implementations (crawler APIs, manual data files, third-party analytics)
// and merges their results into a single MarketReport. Reports are cached
// for a configurable TTL and optionally persisted to disk so they survive
// process restarts.
//
// Primary consumer: the Architect agent, which calls getGenreRecommendations()
// to inject trend-aware context into story blueprint generation.
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { MarketReportSchema, } from "./types.js";
import { FileMarketSource } from "./file-source.js";
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
/** Default cache TTL: 24 hours (in milliseconds). */
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000;
/** Default maximum number of trends to retain in a report. */
const DEFAULT_MAX_TRENDS = 50;
/** Subdirectory for TavernOS internal files. */
const TAVERNOS_DIR = ".tavernos";
/** Cache file name (stored under {projectRoot}/.tavernos/). */
const CACHE_FILE_NAME = "market-cache.json";
/** Bundled default trends file (shipped with the module). */
const DEFAULT_TRENDS_FILE = "default-trends.json";
/** User-maintained trends file name (under {projectRoot}/.tavernos/). */
const USER_TRENDS_FILE = "market-trends.json";
/** Directory of this module — used to locate the bundled default-trends.json. */
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
// ---------------------------------------------------------------------------
// Cache file schema (for persistence)
// ---------------------------------------------------------------------------
const CacheFileSchema = z.object({
    report: MarketReportSchema,
    cacheTime: z.number(),
});
// ---------------------------------------------------------------------------
// EmptyMarketSource — default no-op data source
// ---------------------------------------------------------------------------
/**
 * Default empty data source. Returns no trends and no preferences.
 *
 * Used when no external data sources are configured so the engine still
 * produces a valid (empty) report without crashing. This allows the
 * market intelligence layer to be integrated into the pipeline immediately,
 * with real data sources added later as they become available.
 */
export class EmptyMarketSource {
    name = "empty";
    async fetchTrends() {
        return [];
    }
    async fetchPreferences() {
        return [];
    }
    async isAvailable() {
        return true;
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Map a trendDirection enum value to a Chinese label for display. */
function directionLabel(direction) {
    switch (direction) {
        case "rising":
            return "上升";
        case "peak":
            return "巅峰";
        case "declining":
            return "下降";
        case "stable":
        default:
            return "稳定";
    }
}
/**
 * Check whether a trend is related to the given genre string.
 * Matches on trend name (contains), genre (contains trend name), or
 * related tags (includes the genre).
 */
function isTrendRelatedToGenre(trend, genre) {
    if (!genre)
        return false;
    return (trend.name.includes(genre) ||
        genre.includes(trend.name) ||
        trend.relatedTags.some((tag) => tag.includes(genre) || genre.includes(tag)));
}
// ---------------------------------------------------------------------------
// MarketIntelligence engine
// ---------------------------------------------------------------------------
/**
 * Market Intelligence engine.
 *
 * Queries pluggable data sources, synthesizes a MarketReport with trends
 * and reader preferences, and provides genre-specific recommendations for
 * the Architect agent. Reports are cached for the configured TTL and
 * optionally persisted to {projectRoot}/.tavernos/market-cache.json.
 */
export class MarketIntelligence {
    config;
    sources;
    cache;
    cacheTime;
    constructor(config) {
        this.config = {
            cacheTTL: config?.cacheTTL ?? DEFAULT_CACHE_TTL,
            maxTrends: config?.maxTrends ?? DEFAULT_MAX_TRENDS,
            projectRoot: config?.projectRoot,
        };
        if (config?.sources?.length) {
            this.sources = [...config.sources];
        }
        else {
            // Default to FileMarketSource: read user-maintained trends file from
            // {projectRoot}/.tavernos/market-trends.json, falling back to the
            // bundled default-trends.json when the user file doesn't exist.
            const defaultTrendsPath = join(MODULE_DIR, DEFAULT_TRENDS_FILE);
            const userTrendsPath = this.config.projectRoot
                ? join(this.config.projectRoot, TAVERNOS_DIR, USER_TRENDS_FILE)
                : defaultTrendsPath;
            this.sources = [
                new FileMarketSource({
                    filePath: userTrendsPath,
                    fallbackPath: defaultTrendsPath,
                }),
            ];
        }
        this.cache = null;
        this.cacheTime = 0;
        // Attempt to load persisted cache asynchronously (fire-and-forget).
        // The loaded cache will be available on the next getReport() call if
        // the file read completes in time; otherwise a fresh fetch occurs.
        void this.loadPersistedCache();
    }
    /**
     * Create a MarketIntelligence instance with the default file-based data
     * source. Reads trend data from {projectRoot}/.tavernos/market-trends.json,
     * falling back to the bundled default-trends.json if the user file doesn't
     * exist.
     *
     * @param projectRoot Optional project root for user trends file & cache.
     * @returns A MarketIntelligence instance backed by FileMarketSource.
     */
    static createDefault(projectRoot) {
        const defaultTrendsPath = join(MODULE_DIR, DEFAULT_TRENDS_FILE);
        const userTrendsPath = projectRoot
            ? join(projectRoot, TAVERNOS_DIR, USER_TRENDS_FILE)
            : defaultTrendsPath;
        const source = new FileMarketSource({
            filePath: userTrendsPath,
            fallbackPath: defaultTrendsPath,
        });
        return new MarketIntelligence({ sources: [source], projectRoot });
    }
    /**
     * Query all available data sources and synthesize a market report.
     * Results are cached for the configured TTL period.
     */
    async getReport() {
        try {
            const now = Date.now();
            const ttl = this.config.cacheTTL ?? DEFAULT_CACHE_TTL;
            if (this.cache && this.cacheTime + ttl > now) {
                return this.cache;
            }
            return await this.refreshReport();
        }
        catch {
            // If refresh fails, return the stale cache or an empty report.
            return this.cache ?? this.buildEmptyReport();
        }
    }
    /**
     * Force-refresh the cache by querying all sources again.
     * Individual source failures are swallowed — the report is built from
     * whichever sources responded successfully.
     */
    async refreshReport() {
        try {
            // Determine which sources are currently available.
            const availableSources = [];
            for (const source of this.sources) {
                try {
                    if (await source.isAvailable()) {
                        availableSources.push(source);
                    }
                }
                catch {
                    // Availability check failed — skip this source.
                }
            }
            // Concurrently fetch trends and preferences from each source.
            // Each source's fetch is isolated so one failure doesn't block others.
            const sourceResults = await Promise.all(availableSources.map(async (source) => {
                const [trends, prefs] = await Promise.all([
                    source.fetchTrends().catch(() => []),
                    source.fetchPreferences().catch(() => []),
                ]);
                return { trends, prefs };
            }));
            // Merge all results.
            const allTrends = sourceResults.flatMap((r) => r.trends);
            const allPrefs = sourceResults.flatMap((r) => r.prefs);
            // Sort by heatScore descending and cap at maxTrends.
            const maxTrends = this.config.maxTrends ?? DEFAULT_MAX_TRENDS;
            const sortedTrends = allTrends
                .slice()
                .sort((a, b) => b.heatScore - a.heatScore)
                .slice(0, maxTrends);
            // Top genres (category === "genre").
            const topGenres = sortedTrends.filter((t) => t.category === "genre");
            // Rising tags (trendDirection === "rising").
            const risingTags = sortedTrends.filter((t) => t.trendDirection === "rising");
            // Calculate total sample size across all trends.
            const totalSampleSize = sortedTrends.reduce((sum, t) => sum + (t.sampleSize ?? 0), 0);
            // Determine confidence level from source count and sample size.
            const confidenceLevel = this.calculateConfidence(availableSources.length, totalSampleSize);
            // Generate Chinese recommendation strings.
            const recommendations = this.generateRecommendations(topGenres, risingTags, allPrefs);
            // Describe data freshness for the report consumer.
            const dataFreshness = this.describeDataFreshness(availableSources.length, totalSampleSize);
            const report = {
                generatedAt: new Date().toISOString(),
                topGenres,
                risingTags,
                readerPreferences: allPrefs,
                recommendations,
                confidenceLevel,
                dataFreshness,
            };
            // Update in-memory cache.
            this.cache = report;
            this.cacheTime = Date.now();
            // Persist cache to disk (best-effort).
            await this.persistCache();
            return report;
        }
        catch {
            // Catastrophic failure — return stale cache or empty report.
            return this.cache ?? this.buildEmptyReport();
        }
    }
    /**
     * Get trend recommendations for a specific genre.
     * Used by the Architect agent to inform story planning.
     */
    async getGenreRecommendations(genre) {
        try {
            const report = await this.getReport();
            // Filter trends related to the specified genre.
            const relatedTopGenres = report.topGenres.filter((t) => isTrendRelatedToGenre(t, genre));
            const relatedRising = report.risingTags.filter((t) => isTrendRelatedToGenre(t, genre));
            // If no data at all, return the default fallback message.
            if (relatedTopGenres.length === 0 &&
                relatedRising.length === 0 &&
                report.topGenres.length === 0) {
                return [`暂无${genre}题材的市场数据，建议参考经典作品设定`];
            }
            const recommendations = [];
            // Genre-specific trend heat and direction.
            for (const trend of relatedTopGenres.slice(0, 3)) {
                recommendations.push(`当前「${genre}」题材热度 ${trend.heatScore}/100，处于${directionLabel(trend.trendDirection)}趋势`);
                if (trend.relatedTags.length > 0) {
                    recommendations.push(`建议融入热门标签：${trend.relatedTags.slice(0, 5).join("、")}`);
                }
            }
            // Rising tags related to the genre.
            for (const trend of relatedRising.slice(0, 2)) {
                recommendations.push(`上升趋势：「${trend.name}」热度 ${trend.heatScore}/100，增长率 ${trend.growthRate.toFixed(1)}%`);
            }
            // Reader preferences.
            for (const pref of report.readerPreferences.slice(0, 3)) {
                recommendations.push(`读者偏好：${pref.preference}（权重 ${pref.weight.toFixed(2)}）`);
            }
            // If no genre-specific data but general market data exists, provide
            // overall market trends as reference.
            if (relatedTopGenres.length === 0 && relatedRising.length === 0) {
                recommendations.push(`暂无${genre}题材的精准市场数据，以下为整体市场参考：`);
                for (const trend of report.topGenres.slice(0, 3)) {
                    recommendations.push(`热门题材「${trend.name}」热度 ${trend.heatScore}/100，${directionLabel(trend.trendDirection)}趋势`);
                }
            }
            return recommendations.length > 0
                ? recommendations
                : [`暂无${genre}题材的市场数据，建议参考经典作品设定`];
        }
        catch {
            return [`暂无${genre}题材的市场数据，建议参考经典作品设定`];
        }
    }
    /**
     * Register a custom data source.
     * The source will be queried on the next report refresh.
     */
    registerSource(source) {
        this.sources.push(source);
    }
    /**
     * Check if any data source is available.
     */
    async isAvailable() {
        try {
            for (const source of this.sources) {
                try {
                    if (await source.isAvailable())
                        return true;
                }
                catch {
                    // Availability check failed — continue to next source.
                }
            }
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Get the cached report without refreshing.
     * Returns null if cache is empty or stale.
     */
    getCachedReport() {
        const now = Date.now();
        const ttl = this.config.cacheTTL ?? DEFAULT_CACHE_TTL;
        if (this.cache && this.cacheTime + ttl > now) {
            return this.cache;
        }
        return null;
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /** Build an empty report for fallback scenarios. */
    buildEmptyReport() {
        return {
            generatedAt: new Date().toISOString(),
            topGenres: [],
            risingTags: [],
            readerPreferences: [],
            recommendations: [],
            confidenceLevel: "low",
            dataFreshness: "暂无可用数据源",
        };
    }
    /**
     * Calculate confidence level based on source count and total sample size.
     *
     * - high:   3+ available sources AND total sample size > 1000
     * - medium: 1-2 sources OR total sample size > 100
     * - low:    otherwise
     */
    calculateConfidence(sourceCount, totalSampleSize) {
        if (sourceCount >= 3 && totalSampleSize > 1000)
            return "high";
        if ((sourceCount >= 1 && sourceCount <= 2) || totalSampleSize > 100) {
            return "medium";
        }
        return "low";
    }
    /**
     * Generate Chinese recommendation strings from trends and preferences.
     * These are consumed by the Architect agent and displayed to the user.
     */
    generateRecommendations(topGenres, risingTags, prefs) {
        const recs = [];
        // Top genre heat and direction.
        for (const trend of topGenres.slice(0, 5)) {
            recs.push(`热门题材「${trend.name}」热度 ${trend.heatScore}/100，${directionLabel(trend.trendDirection)}趋势`);
        }
        // Rising tags with growth rate.
        for (const trend of risingTags.slice(0, 5)) {
            recs.push(`上升标签「${trend.name}」热度 ${trend.heatScore}/100，增长率 ${trend.growthRate.toFixed(1)}%`);
            if (trend.relatedTags.length > 0) {
                recs.push(`相关热门标签：${trend.relatedTags.slice(0, 5).join("、")}`);
            }
        }
        // Reader preference highlights.
        for (const pref of prefs.slice(0, 3)) {
            recs.push(`读者偏好：${pref.preference}（权重 ${pref.weight.toFixed(2)}）`);
        }
        return recs;
    }
    /** Describe data freshness in Chinese for the report consumer. */
    describeDataFreshness(sourceCount, totalSampleSize) {
        if (sourceCount === 0)
            return "暂无可用数据源";
        const parts = [];
        parts.push(`数据源 ${sourceCount} 个`);
        parts.push(`样本量 ${totalSampleSize}`);
        parts.push(`生成于 ${new Date().toLocaleString("zh-CN")}`);
        return parts.join("，");
    }
    /** Resolve the cache file path, or null if projectRoot is not set. */
    cacheFilePath() {
        if (!this.config.projectRoot)
            return null;
        return join(this.config.projectRoot, TAVERNOS_DIR, CACHE_FILE_NAME);
    }
    /**
     * Load the persisted cache from disk into memory.
     * Silently ignores missing or invalid cache files.
     */
    async loadPersistedCache() {
        const filePath = this.cacheFilePath();
        if (!filePath)
            return;
        try {
            const raw = await fs.readFile(filePath, "utf8");
            const parsed = CacheFileSchema.safeParse(JSON.parse(raw));
            if (parsed.success) {
                this.cache = parsed.data.report;
                this.cacheTime = parsed.data.cacheTime;
            }
        }
        catch {
            // Cache file missing or invalid — start with empty cache.
        }
    }
    /**
     * Persist the current cache to disk.
     * Best-effort: write failures are silently ignored.
     */
    async persistCache() {
        const filePath = this.cacheFilePath();
        if (!filePath || !this.cache)
            return;
        try {
            await fs.mkdir(dirname(filePath), { recursive: true });
            const payload = JSON.stringify({ report: this.cache, cacheTime: this.cacheTime }, null, 2);
            await fs.writeFile(filePath, payload, "utf8");
        }
        catch {
            // Cache persistence is best-effort — ignore write failures.
        }
    }
}
//# sourceMappingURL=intelligence.js.map