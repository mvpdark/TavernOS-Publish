import { z } from "zod";
export declare const MarketTrendSchema: z.ZodObject<{
    id: z.ZodString;
    category: z.ZodEnum<["genre", "tag", "topic", "trope", "audience"]>;
    name: z.ZodString;
    heatScore: z.ZodNumber;
    trendDirection: z.ZodDefault<z.ZodEnum<["rising", "peak", "declining", "stable"]>>;
    growthRate: z.ZodDefault<z.ZodNumber>;
    sampleSize: z.ZodDefault<z.ZodNumber>;
    relatedTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    description: z.ZodDefault<z.ZodString>;
    firstSeen: z.ZodString;
    lastUpdated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    category: "genre" | "tag" | "topic" | "trope" | "audience";
    heatScore: number;
    trendDirection: "rising" | "peak" | "stable" | "declining";
    growthRate: number;
    sampleSize: number;
    relatedTags: string[];
    firstSeen: string;
    lastUpdated: string;
}, {
    id: string;
    name: string;
    category: "genre" | "tag" | "topic" | "trope" | "audience";
    heatScore: number;
    firstSeen: string;
    lastUpdated: string;
    description?: string | undefined;
    trendDirection?: "rising" | "peak" | "stable" | "declining" | undefined;
    growthRate?: number | undefined;
    sampleSize?: number | undefined;
    relatedTags?: string[] | undefined;
}>;
export type MarketTrend = z.infer<typeof MarketTrendSchema>;
export declare const ReaderPreferenceSchema: z.ZodObject<{
    category: z.ZodEnum<["genre", "pacing", "length", "tone", "protagonist", "theme"]>;
    preference: z.ZodString;
    weight: z.ZodNumber;
    sampleSize: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes: string;
    category: "length" | "genre" | "protagonist" | "theme" | "pacing" | "tone";
    weight: number;
    sampleSize: number;
    preference: string;
}, {
    category: "length" | "genre" | "protagonist" | "theme" | "pacing" | "tone";
    weight: number;
    preference: string;
    notes?: string | undefined;
    sampleSize?: number | undefined;
}>;
export type ReaderPreference = z.infer<typeof ReaderPreferenceSchema>;
export declare const MarketReportSchema: z.ZodObject<{
    generatedAt: z.ZodString;
    topGenres: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        category: z.ZodEnum<["genre", "tag", "topic", "trope", "audience"]>;
        name: z.ZodString;
        heatScore: z.ZodNumber;
        trendDirection: z.ZodDefault<z.ZodEnum<["rising", "peak", "declining", "stable"]>>;
        growthRate: z.ZodDefault<z.ZodNumber>;
        sampleSize: z.ZodDefault<z.ZodNumber>;
        relatedTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        description: z.ZodDefault<z.ZodString>;
        firstSeen: z.ZodString;
        lastUpdated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        trendDirection: "rising" | "peak" | "stable" | "declining";
        growthRate: number;
        sampleSize: number;
        relatedTags: string[];
        firstSeen: string;
        lastUpdated: string;
    }, {
        id: string;
        name: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        firstSeen: string;
        lastUpdated: string;
        description?: string | undefined;
        trendDirection?: "rising" | "peak" | "stable" | "declining" | undefined;
        growthRate?: number | undefined;
        sampleSize?: number | undefined;
        relatedTags?: string[] | undefined;
    }>, "many">>;
    risingTags: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        category: z.ZodEnum<["genre", "tag", "topic", "trope", "audience"]>;
        name: z.ZodString;
        heatScore: z.ZodNumber;
        trendDirection: z.ZodDefault<z.ZodEnum<["rising", "peak", "declining", "stable"]>>;
        growthRate: z.ZodDefault<z.ZodNumber>;
        sampleSize: z.ZodDefault<z.ZodNumber>;
        relatedTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        description: z.ZodDefault<z.ZodString>;
        firstSeen: z.ZodString;
        lastUpdated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        trendDirection: "rising" | "peak" | "stable" | "declining";
        growthRate: number;
        sampleSize: number;
        relatedTags: string[];
        firstSeen: string;
        lastUpdated: string;
    }, {
        id: string;
        name: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        firstSeen: string;
        lastUpdated: string;
        description?: string | undefined;
        trendDirection?: "rising" | "peak" | "stable" | "declining" | undefined;
        growthRate?: number | undefined;
        sampleSize?: number | undefined;
        relatedTags?: string[] | undefined;
    }>, "many">>;
    readerPreferences: z.ZodDefault<z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["genre", "pacing", "length", "tone", "protagonist", "theme"]>;
        preference: z.ZodString;
        weight: z.ZodNumber;
        sampleSize: z.ZodDefault<z.ZodNumber>;
        notes: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        notes: string;
        category: "length" | "genre" | "protagonist" | "theme" | "pacing" | "tone";
        weight: number;
        sampleSize: number;
        preference: string;
    }, {
        category: "length" | "genre" | "protagonist" | "theme" | "pacing" | "tone";
        weight: number;
        preference: string;
        notes?: string | undefined;
        sampleSize?: number | undefined;
    }>, "many">>;
    recommendations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    confidenceLevel: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    dataFreshness: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    generatedAt: string;
    topGenres: {
        id: string;
        name: string;
        description: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        trendDirection: "rising" | "peak" | "stable" | "declining";
        growthRate: number;
        sampleSize: number;
        relatedTags: string[];
        firstSeen: string;
        lastUpdated: string;
    }[];
    risingTags: {
        id: string;
        name: string;
        description: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        trendDirection: "rising" | "peak" | "stable" | "declining";
        growthRate: number;
        sampleSize: number;
        relatedTags: string[];
        firstSeen: string;
        lastUpdated: string;
    }[];
    readerPreferences: {
        notes: string;
        category: "length" | "genre" | "protagonist" | "theme" | "pacing" | "tone";
        weight: number;
        sampleSize: number;
        preference: string;
    }[];
    recommendations: string[];
    confidenceLevel: "high" | "medium" | "low";
    dataFreshness: string;
}, {
    generatedAt: string;
    topGenres?: {
        id: string;
        name: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        firstSeen: string;
        lastUpdated: string;
        description?: string | undefined;
        trendDirection?: "rising" | "peak" | "stable" | "declining" | undefined;
        growthRate?: number | undefined;
        sampleSize?: number | undefined;
        relatedTags?: string[] | undefined;
    }[] | undefined;
    risingTags?: {
        id: string;
        name: string;
        category: "genre" | "tag" | "topic" | "trope" | "audience";
        heatScore: number;
        firstSeen: string;
        lastUpdated: string;
        description?: string | undefined;
        trendDirection?: "rising" | "peak" | "stable" | "declining" | undefined;
        growthRate?: number | undefined;
        sampleSize?: number | undefined;
        relatedTags?: string[] | undefined;
    }[] | undefined;
    readerPreferences?: {
        category: "length" | "genre" | "protagonist" | "theme" | "pacing" | "tone";
        weight: number;
        preference: string;
        notes?: string | undefined;
        sampleSize?: number | undefined;
    }[] | undefined;
    recommendations?: string[] | undefined;
    confidenceLevel?: "high" | "medium" | "low" | undefined;
    dataFreshness?: string | undefined;
}>;
export type MarketReport = z.infer<typeof MarketReportSchema>;
/**
 * Pluggable data source for market intelligence.
 *
 * Implementations may wrap crawler APIs, manual data files, or third-party
 * analytics services. The engine queries all registered sources and merges
 * their results, so a failing source never blocks the report.
 */
export interface MarketDataSource {
    /** Human-readable name of the data source. */
    readonly name: string;
    /** Fetch current trending genres/tags. */
    fetchTrends(): Promise<MarketTrend[]>;
    /** Fetch reader preference data. */
    fetchPreferences(): Promise<ReaderPreference[]>;
    /** Check if the data source is available. */
    isAvailable(): Promise<boolean>;
}
/**
 * Configuration for the MarketIntelligence engine.
 * All fields are optional — sensible defaults are applied when omitted.
 */
export interface MarketIntelligenceConfig {
    /** Data sources to query (pluggable). */
    sources?: MarketDataSource[];
    /** Cache duration in milliseconds (default: 24 hours). */
    cacheTTL?: number;
    /** Maximum number of trends to retain. */
    maxTrends?: number;
    /** Project root for cache persistence. */
    projectRoot?: string;
}
//# sourceMappingURL=types.d.ts.map