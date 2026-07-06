import { z } from "zod";
/** Supported behavior-event types — every user action maps to one of these. */
export declare const BehaviorEventTypeSchema: z.ZodEnum<["clip_generated", "clip_reviewed", "clip_accepted", "clip_rejected", "clip_rerolled", "clip_edited", "template_selected", "template_rated", "model_switched", "export_done", "publish_done"]>;
export type BehaviorEventType = z.infer<typeof BehaviorEventTypeSchema>;
/**
 * Zod schema for a single behavior event (one user action).
 *
 * Events are immutable once written. Optional fields are populated only when
 * relevant to the event type (e.g. `rating` for `template_rated`).
 */
export declare const BehaviorEventSchema: z.ZodObject<{
    /** Stable unique identifier (UUIDv4). */
    id: z.ZodString;
    /** ISO-8601 timestamp of when the event was recorded. */
    timestamp: z.ZodString;
    /** Project this event belongs to. */
    projectId: z.ZodString;
    /** Event type — determines which optional fields are meaningful. */
    eventType: z.ZodEnum<["clip_generated", "clip_reviewed", "clip_accepted", "clip_rejected", "clip_rerolled", "clip_edited", "template_selected", "template_rated", "model_switched", "export_done", "publish_done"]>;
    /** Clip id for clip-related events. */
    clipId: z.ZodOptional<z.ZodString>;
    /** Template id for template-related events. */
    templateId: z.ZodOptional<z.ZodString>;
    /** Provider id (e.g. "seedance" | "grok" | "jimeng"). */
    provider: z.ZodOptional<z.ZodString>;
    /** Model name (e.g. "seedance-2.0"). */
    model: z.ZodOptional<z.ZodString>;
    /** User rating 1–5 (for `template_rated` and similar feedback events). */
    rating: z.ZodOptional<z.ZodNumber>;
    /** Free-text user feedback. */
    userFeedback: z.ZodOptional<z.ZodString>;
    /** Arbitrary metadata payload for extensibility. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: string;
    projectId: string;
    eventType: "clip_generated" | "clip_reviewed" | "clip_accepted" | "clip_rejected" | "clip_rerolled" | "clip_edited" | "template_selected" | "template_rated" | "model_switched" | "export_done" | "publish_done";
    provider?: string | undefined;
    model?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    clipId?: string | undefined;
    rating?: number | undefined;
    templateId?: string | undefined;
    userFeedback?: string | undefined;
}, {
    id: string;
    timestamp: string;
    projectId: string;
    eventType: "clip_generated" | "clip_reviewed" | "clip_accepted" | "clip_rejected" | "clip_rerolled" | "clip_edited" | "template_selected" | "template_rated" | "model_switched" | "export_done" | "publish_done";
    provider?: string | undefined;
    model?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    clipId?: string | undefined;
    rating?: number | undefined;
    templateId?: string | undefined;
    userFeedback?: string | undefined;
}>;
export type BehaviorEvent = z.infer<typeof BehaviorEventSchema>;
/**
 * Zod schema for aggregated model performance statistics.
 *
 * Computed by {@link DataFlywheel.getModelPerformance} from raw events.
 * All rates are 0–1 floats; costs are in integer cents.
 */
export declare const ModelPerformanceSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
    totalGenerated: z.ZodNumber;
    successRate: z.ZodNumber;
    averageScore: z.ZodNumber;
    averageDuration: z.ZodNumber;
    acceptRate: z.ZodNumber;
    rerollRate: z.ZodNumber;
    averageRating: z.ZodNumber;
    totalCost: z.ZodNumber;
    costPerAccept: z.ZodNumber;
    lastUsedAt: z.ZodString;
    usageTrend: z.ZodEnum<["up", "down", "stable"]>;
}, "strip", z.ZodTypeAny, {
    provider: string;
    model: string;
    successRate: number;
    totalCost: number;
    totalGenerated: number;
    averageScore: number;
    averageDuration: number;
    acceptRate: number;
    rerollRate: number;
    averageRating: number;
    costPerAccept: number;
    lastUsedAt: string;
    usageTrend: "stable" | "up" | "down";
}, {
    provider: string;
    model: string;
    successRate: number;
    totalCost: number;
    totalGenerated: number;
    averageScore: number;
    averageDuration: number;
    acceptRate: number;
    rerollRate: number;
    averageRating: number;
    costPerAccept: number;
    lastUsedAt: string;
    usageTrend: "stable" | "up" | "down";
}>;
export type ModelPerformance = z.infer<typeof ModelPerformanceSchema>;
/**
 * Zod schema for a model recommendation — a scored suggestion with a
 * human-readable rationale.
 */
export declare const ModelRecommendationSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
    /** Recommendation score 0–100 (higher is better). */
    score: z.ZodNumber;
    /** Human-readable reason for this recommendation. */
    reason: z.ZodString;
    estimatedCost: z.ZodNumber;
    estimatedQuality: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    provider: string;
    model: string;
    score: number;
    reason: string;
    estimatedCost: number;
    estimatedQuality: number;
}, {
    provider: string;
    model: string;
    score: number;
    reason: string;
    estimatedCost: number;
    estimatedQuality: number;
}>;
export type ModelRecommendation = z.infer<typeof ModelRecommendationSchema>;
/**
 * Zod schema for flywheel configuration — controls recommendation weights
 * and data retention.
 */
export declare const FlywheelConfigSchema: z.ZodObject<{
    /** Whether the flywheel is enabled (tracks + recommends). */
    enabled: z.ZodBoolean;
    /** Minimum data points before recommendations are generated. */
    minDataPoints: z.ZodNumber;
    /** Recommendation scoring weights (should sum to ~1.0). */
    weights: z.ZodObject<{
        quality: z.ZodNumber;
        cost: z.ZodNumber;
        speed: z.ZodNumber;
        userPreference: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        speed: number;
        quality: number;
        cost: number;
        userPreference: number;
    }, {
        speed: number;
        quality: number;
        cost: number;
        userPreference: number;
    }>;
    /** Data retention period in days; older events are purged by cleanup(). */
    retentionDays: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    minDataPoints: number;
    weights: {
        speed: number;
        quality: number;
        cost: number;
        userPreference: number;
    };
    retentionDays: number;
}, {
    enabled: boolean;
    minDataPoints: number;
    weights: {
        speed: number;
        quality: number;
        cost: number;
        userPreference: number;
    };
    retentionDays: number;
}>;
export type FlywheelConfig = z.infer<typeof FlywheelConfigSchema>;
/**
 * Default flywheel configuration.
 *
 * Weights sum to 1.0: quality 40%, cost 30%, speed 20%, user preference 10%.
 * The flywheel starts collecting recommendations only after `minDataPoints`
 * (default 50) events have been recorded, to avoid noisy early suggestions.
 */
export declare const DEFAULT_FLYWHEEL_CONFIG: FlywheelConfig;
/**
 * In-memory behavior-event store with model-performance aggregation and
 * a weighted recommendation engine.
 *
 * Responsibilities:
 *   - `track`: append a {@link BehaviorEvent} for each user action.
 *   - `getModelPerformance`: aggregate per-(provider, model) stats.
 *   - `recommend`: score and rank models for a given scene/context.
 *   - `getPreferredTemplates`: surface the most-used / highest-rated templates.
 *   - `getUsageTrend`: daily generation volume + accept-rate + cost trend.
 *   - `cleanup`: purge events older than `retentionDays`.
 *   - `toJSON` / `fromJSON` / `save` / `load`: JSON persistence to disk.
 *
 * The flywheel is not thread-safe; callers sharing an instance across async
 * boundaries should serialise writes externally.
 */
export declare class DataFlywheel {
    /** Version tag emitted in serialised output. */
    static readonly VERSION = "1.0.0";
    private events;
    private config;
    /**
     * @param config Partial config overrides merged onto {@link DEFAULT_FLYWHEEL_CONFIG}.
     */
    constructor(config?: Partial<FlywheelConfig>);
    /**
     * Record a single user-behavior event.
     *
     * Generates a UUID and timestamp automatically. When the flywheel is
     * disabled (`config.enabled === false`) the event is still returned (so
     * callers can chain) but is not stored.
     *
     * @param event Event details (without `id` / `timestamp`).
     * @returns The fully-formed {@link BehaviorEvent}.
     */
    track(event: Omit<BehaviorEvent, "id" | "timestamp">): BehaviorEvent;
    /**
     * Produce aggregated performance statistics per (provider, model) pair.
     *
     * When `provider` / `model` are specified, only matching models are
     * included; otherwise all models with at least one generation event are
     * returned.
     *
     * Stats are derived from raw events:
     *   - `successRate`: successful generations / total generations.
     *   - `averageScore`: mean review score (from `clip_reviewed` metadata).
     *   - `averageDuration`: mean generation duration (from metadata, seconds).
     *   - `acceptRate`: accepted / generated.
     *   - `rerollRate`: rerolled / generated.
     *   - `averageRating`: mean user rating (1–5).
     *   - `costPerAccept`: totalCost / max(1, accepted count).
     *   - `usageTrend`: recent vs. early generation volume.
     *
     * @param provider Optional provider filter.
     * @param model    Optional model filter.
     * @returns Array of {@link ModelPerformance}.
     */
    getModelPerformance(provider?: string, model?: string): ModelPerformance[];
    /**
     * Recommend the best models for a given scene / context.
     *
     * Scoring algorithm:
     *   1. Gather {@link ModelPerformance} for all models.
     *   2. If fewer than `config.minDataPoints` total events exist, return an
     *      empty list (insufficient data for reliable recommendations).
     *   3. For each model compute four sub-scores:
     *      - quality:      averageScore / 100 × weights.quality
     *      - cost:         (1 - normalizedCost) × weights.cost
     *      - speed:        (1 - normalizedDuration) × weights.speed
     *      - userPref:     acceptRate × weights.userPreference
     *   4. Total score = sum of sub-scores, scaled to 0–100.
     *   5. Filter by `maxCost` if provided.
     *   6. Sort descending; return top recommendations with a reason string.
     *
     * @param params Optional scene constraints.
     * @returns Ranked array of {@link ModelRecommendation} (highest score first).
     */
    recommend(params: {
        sceneType?: string;
        duration?: number;
        maxCost?: number;
    }): ModelRecommendation[];
    /**
     * Build a human-readable recommendation reason by identifying the
     * model's strongest dimension.
     */
    private buildRecommendationReason;
    /**
     * Get the user's most-preferred prompt templates by usage and rating.
     *
     * Ranks templates by a composite score: usageCount × 0.6 +
     * averageRating × 0.4 (normalised to a 0–5 scale).
     *
     * @param limit Maximum number of templates to return (default 10).
     * @returns Ranked template usage summaries.
     */
    getPreferredTemplates(limit?: number): Array<{
        templateId: string;
        usageCount: number;
        averageRating: number;
    }>;
    /**
     * Get daily usage trends over the last `days` (default 30).
     *
     * For each day in the range, returns:
     *   - `generations`: number of `clip_generated` events.
     *   - `acceptRate`: accepted / generated (0 when no generations).
     *   - `averageCost`: mean cost per generation (cents, 0 when no generations).
     *
     * @param days Number of days to look back (default 30).
     * @returns Array of daily trend entries (oldest first).
     */
    getUsageTrend(days?: number): Array<{
        date: string;
        generations: number;
        acceptRate: number;
        averageCost: number;
    }>;
    /**
     * Purge events older than `config.retentionDays`.
     *
     * @returns The number of events removed.
     */
    cleanup(): number;
    /**
     * Serialise the flywheel (events + config) to a JSON string.
     *
     * The output is validated against {@link SerializedFlywheelSchema} before
     * encoding so corrupt in-memory state cannot produce invalid JSON.
     *
     * @returns Pretty-printed JSON string.
     */
    toJSON(): string;
    /**
     * Reconstruct a DataFlywheel from a JSON string.
     *
     * The input is validated against {@link SerializedFlywheelSchema}. If
     * validation fails a Zod error is thrown.
     *
     * @param json JSON string produced by {@link toJSON} or compatible source.
     * @returns A populated DataFlywheel.
     */
    static fromJSON(json: string): DataFlywheel;
    /**
     * Persist the flywheel to a JSON file on disk.
     *
     * Creates parent directories as needed (mkdir -p).
     *
     * @param filePath Absolute or relative path to the output file.
     */
    save(filePath: string): Promise<void>;
    /**
     * Load a DataFlywheel from a JSON file on disk.
     *
     * Returns a fresh empty flywheel when the file does not exist, so callers
     * can call `load` unconditionally on startup.
     *
     * @param filePath Path to a file previously written by {@link save}.
     * @returns A populated DataFlywheel.
     */
    static load(filePath: string): Promise<DataFlywheel>;
    /** Total number of tracked events. */
    get eventCount(): number;
    /** Current configuration (read-only snapshot). */
    getConfig(): FlywheelConfig;
}
//# sourceMappingURL=data-flywheel.d.ts.map