// packages/core/src/market/types.ts
//
// Type definitions for the market intelligence layer.
//
// The market intelligence layer tracks trending genres/tags/topics in the
// web novel market, aggregates reader preferences, and synthesizes a
// MarketReport that the Architect agent can consult when planning a new
// story blueprint. All external data access is abstracted behind the
// pluggable MarketDataSource interface so the engine never depends on a
// specific crawler or analytics API.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Market Trend — trending genre/tag/topic in the web novel market
// ---------------------------------------------------------------------------
export const MarketTrendSchema = z.object({
    id: z.string(),
    category: z.enum(["genre", "tag", "topic", "trope", "audience"]),
    name: z.string(), // 趋势名称（如"系统流"、"重生逆袭"）
    heatScore: z.number().min(0).max(100), // 热度评分 0-100
    trendDirection: z.enum(["rising", "peak", "declining", "stable"]).default("stable"),
    growthRate: z.number().default(0), // 增长率（百分比）
    sampleSize: z.number().int().min(0).default(0), // 样本量
    relatedTags: z.array(z.string()).default([]),
    description: z.string().default(""),
    firstSeen: z.string(), // ISO date
    lastUpdated: z.string(),
});
// ---------------------------------------------------------------------------
// Reader Preference — aggregated reader preference data
// ---------------------------------------------------------------------------
export const ReaderPreferenceSchema = z.object({
    category: z.enum(["genre", "pacing", "length", "tone", "protagonist", "theme"]),
    preference: z.string(),
    weight: z.number().min(0).max(1), // 偏好权重
    sampleSize: z.number().int().min(0).default(0),
    notes: z.string().default(""),
});
// ---------------------------------------------------------------------------
// Market Intelligence Report — synthesized market analysis
// ---------------------------------------------------------------------------
export const MarketReportSchema = z.object({
    generatedAt: z.string(),
    topGenres: z.array(MarketTrendSchema).default([]),
    risingTags: z.array(MarketTrendSchema).default([]),
    readerPreferences: z.array(ReaderPreferenceSchema).default([]),
    recommendations: z.array(z.string()).default([]), // 中文建议列表
    confidenceLevel: z.enum(["high", "medium", "low"]).default("low"),
    dataFreshness: z.string().default(""), // 数据时效说明
});
//# sourceMappingURL=types.js.map