// Data flywheel module — collects user-behavior telemetry to optimise
// model scheduling and prompt-template selection.
//
// TavernOS generates videos across multiple AI providers, each with distinct
// cost / quality / speed trade-offs. The data flywheel closes the feedback
// loop: every user action (generate, review, accept, reject, reroll, edit,
// rate) is recorded as a BehaviorEvent. Aggregated statistics power a
// recommendation engine that suggests the best model for a given scene,
// balancing quality, cost, speed, and observed user preference.
//
// Design overview:
//   - BehaviorEvent: immutable record of a single user action.
//   - ModelPerformance: aggregated stats per (provider, model) pair.
//   - ModelRecommendation: scored model suggestion with human-readable reason.
//   - FlywheelConfig: weights + retention policy for the recommendation engine.
//   - DataFlywheel: in-memory event store with aggregation, recommendation,
//     trend analysis, and JSON persistence.
//
// The flywheel is intentionally in-memory and serialisable (toJSON / fromJSON /
// save / load) so it can be persisted to disk per-project, embedded in pipeline
// context, or synced to an external analytics database by a higher-level
// orchestrator. Recommendation quality improves monotonically as more events
// are collected — hence "flywheel".
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
// ---------------------------------------------------------------------------
// Zod schemas & types
// ---------------------------------------------------------------------------
/** Supported behavior-event types — every user action maps to one of these. */
export const BehaviorEventTypeSchema = z.enum([
    "clip_generated",
    "clip_reviewed",
    "clip_accepted",
    "clip_rejected",
    "clip_rerolled",
    "clip_edited",
    "template_selected",
    "template_rated",
    "model_switched",
    "export_done",
    "publish_done",
]);
/**
 * Zod schema for a single behavior event (one user action).
 *
 * Events are immutable once written. Optional fields are populated only when
 * relevant to the event type (e.g. `rating` for `template_rated`).
 */
export const BehaviorEventSchema = z.object({
    /** Stable unique identifier (UUIDv4). */
    id: z.string().min(1),
    /** ISO-8601 timestamp of when the event was recorded. */
    timestamp: z.string().min(1),
    /** Project this event belongs to. */
    projectId: z.string().min(1),
    /** Event type — determines which optional fields are meaningful. */
    eventType: BehaviorEventTypeSchema,
    // --- Associated resources (optional, event-type dependent) ---
    /** Clip id for clip-related events. */
    clipId: z.string().optional(),
    /** Template id for template-related events. */
    templateId: z.string().optional(),
    /** Provider id (e.g. "seedance" | "grok" | "jimeng"). */
    provider: z.string().optional(),
    /** Model name (e.g. "seedance-2.0"). */
    model: z.string().optional(),
    // --- Rating / feedback ---
    /** User rating 1–5 (for `template_rated` and similar feedback events). */
    rating: z.number().int().min(1).max(5).optional(),
    /** Free-text user feedback. */
    userFeedback: z.string().optional(),
    // --- Context ---
    /** Arbitrary metadata payload for extensibility. */
    metadata: z.record(z.string(), z.unknown()).optional(),
});
/**
 * Zod schema for aggregated model performance statistics.
 *
 * Computed by {@link DataFlywheel.getModelPerformance} from raw events.
 * All rates are 0–1 floats; costs are in integer cents.
 */
export const ModelPerformanceSchema = z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    totalGenerated: z.number().int().min(0),
    successRate: z.number().min(0).max(1),
    averageScore: z.number().min(0),
    averageDuration: z.number().min(0),
    acceptRate: z.number().min(0).max(1),
    rerollRate: z.number().min(0).max(1),
    averageRating: z.number().min(0).max(5),
    totalCost: z.number().min(0),
    costPerAccept: z.number().min(0),
    lastUsedAt: z.string(),
    usageTrend: z.enum(["up", "down", "stable"]),
});
/**
 * Zod schema for a model recommendation — a scored suggestion with a
 * human-readable rationale.
 */
export const ModelRecommendationSchema = z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    /** Recommendation score 0–100 (higher is better). */
    score: z.number().min(0).max(100),
    /** Human-readable reason for this recommendation. */
    reason: z.string().min(1),
    estimatedCost: z.number().min(0),
    estimatedQuality: z.number().min(0).max(100),
});
/**
 * Zod schema for flywheel configuration — controls recommendation weights
 * and data retention.
 */
export const FlywheelConfigSchema = z.object({
    /** Whether the flywheel is enabled (tracks + recommends). */
    enabled: z.boolean(),
    /** Minimum data points before recommendations are generated. */
    minDataPoints: z.number().int().min(0),
    /** Recommendation scoring weights (should sum to ~1.0). */
    weights: z.object({
        quality: z.number().min(0).max(1),
        cost: z.number().min(0).max(1),
        speed: z.number().min(0).max(1),
        userPreference: z.number().min(0).max(1),
    }),
    /** Data retention period in days; older events are purged by cleanup(). */
    retentionDays: z.number().int().min(1),
});
/** Zod schema for the serialised flywheel payload (toJSON / fromJSON / save / load). */
const SerializedFlywheelSchema = z.object({
    events: z.array(BehaviorEventSchema),
    config: FlywheelConfigSchema,
    version: z.string(),
});
// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------
/**
 * Default flywheel configuration.
 *
 * Weights sum to 1.0: quality 40%, cost 30%, speed 20%, user preference 10%.
 * The flywheel starts collecting recommendations only after `minDataPoints`
 * (default 50) events have been recorded, to avoid noisy early suggestions.
 */
export const DEFAULT_FLYWHEEL_CONFIG = {
    enabled: true,
    minDataPoints: 50,
    weights: {
        quality: 0.4,
        cost: 0.3,
        speed: 0.2,
        userPreference: 0.1,
    },
    retentionDays: 90,
};
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/** Extract the date portion (YYYY-MM-DD) from an ISO-8601 timestamp. */
function dateOf(isoTimestamp) {
    return isoTimestamp.slice(0, 10);
}
/** Current ISO-8601 timestamp. */
function nowIso() {
    return new Date().toISOString();
}
/**
 * Compute a usage trend ("up" | "down" | "stable") by comparing the number
 * of generation events in the recent half of a time window against the
 * earlier half.
 */
function computeUsageTrend(events, provider, model) {
    const genEvents = events.filter((e) => e.eventType === "clip_generated" &&
        e.provider === provider &&
        e.model === model);
    if (genEvents.length < 4)
        return "stable";
    // Split into two halves by timestamp; compare counts.
    const sorted = [...genEvents].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const midIndex = Math.floor(sorted.length / 2);
    const earlyCount = midIndex;
    const recentCount = sorted.length - midIndex;
    // 30% relative change threshold to filter noise.
    const ratio = recentCount / Math.max(1, earlyCount);
    if (ratio >= 1.3)
        return "up";
    if (ratio <= 0.77)
        return "down";
    return "stable";
}
// ---------------------------------------------------------------------------
// DataFlywheel
// ---------------------------------------------------------------------------
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
export class DataFlywheel {
    /** Version tag emitted in serialised output. */
    static VERSION = "1.0.0";
    events = [];
    config;
    /**
     * @param config Partial config overrides merged onto {@link DEFAULT_FLYWHEEL_CONFIG}.
     */
    constructor(config) {
        this.config = { ...DEFAULT_FLYWHEEL_CONFIG, ...config };
    }
    // -------------------------------------------------------------------------
    // Tracking
    // -------------------------------------------------------------------------
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
    track(event) {
        const record = {
            ...event,
            id: randomUUID(),
            timestamp: nowIso(),
        };
        if (this.config.enabled) {
            this.events.push(record);
        }
        return record;
    }
    // -------------------------------------------------------------------------
    // Model performance aggregation
    // -------------------------------------------------------------------------
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
    getModelPerformance(provider, model) {
        // Collect all unique (provider, model) pairs that have generation events.
        const pairs = new Map();
        for (const e of this.events) {
            if (e.eventType !== "clip_generated")
                continue;
            if (!e.provider || !e.model)
                continue;
            if (provider && e.provider !== provider)
                continue;
            if (model && e.model !== model)
                continue;
            const key = `${e.provider}::${e.model}`;
            if (!pairs.has(key)) {
                pairs.set(key, { provider: e.provider, model: e.model });
            }
        }
        const results = [];
        for (const { provider: p, model: m } of pairs.values()) {
            const genEvents = this.events.filter((e) => e.eventType === "clip_generated" &&
                e.provider === p &&
                e.model === m);
            const totalGenerated = genEvents.length;
            if (totalGenerated === 0)
                continue;
            // Success rate: metadata.success === true on clip_generated events.
            const successCount = genEvents.filter((e) => e.metadata?.success === true).length;
            const successRate = successCount / totalGenerated;
            // Average review score: from clip_reviewed events for this model.
            const reviewEvents = this.events.filter((e) => e.eventType === "clip_reviewed" &&
                e.provider === p &&
                e.model === m);
            const scores = reviewEvents
                .map((e) => e.metadata?.score ?? undefined)
                .filter((s) => typeof s === "number");
            const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            // Average generation duration (seconds) from metadata.
            const durations = genEvents
                .map((e) => e.metadata?.durationSeconds ?? undefined)
                .filter((d) => typeof d === "number");
            const averageDuration = durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : 0;
            // Accept / reroll rates.
            const acceptedCount = this.events.filter((e) => e.eventType === "clip_accepted" && e.provider === p && e.model === m).length;
            const rerolledCount = this.events.filter((e) => e.eventType === "clip_rerolled" && e.provider === p && e.model === m).length;
            const acceptRate = acceptedCount / totalGenerated;
            const rerollRate = rerolledCount / totalGenerated;
            // Average user rating (from template_rated or metadata.rating).
            const ratedEvents = this.events.filter((e) => e.provider === p && e.model === m && e.rating !== undefined);
            const averageRating = ratedEvents.length > 0
                ? ratedEvents.reduce((sum, e) => sum + (e.rating ?? 0), 0) /
                    ratedEvents.length
                : 0;
            // Cost (from metadata.cost, integer cents).
            const totalCost = genEvents.reduce((sum, e) => sum + (e.metadata?.cost ?? 0), 0);
            const costPerAccept = acceptedCount > 0 ? totalCost / acceptedCount : 0;
            // Last used timestamp.
            const lastUsedEvent = genEvents
                .slice()
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
            const lastUsedAt = lastUsedEvent?.timestamp ?? nowIso();
            const usageTrend = computeUsageTrend(this.events, p, m);
            results.push({
                provider: p,
                model: m,
                totalGenerated,
                successRate,
                averageScore,
                averageDuration,
                acceptRate,
                rerollRate,
                averageRating,
                totalCost,
                costPerAccept,
                lastUsedAt,
                usageTrend,
            });
        }
        return results;
    }
    // -------------------------------------------------------------------------
    // Recommendation engine
    // -------------------------------------------------------------------------
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
    recommend(params) {
        // Insufficient data — don't produce noisy recommendations.
        if (this.events.length < this.config.minDataPoints) {
            return [];
        }
        const performances = this.getModelPerformance();
        if (performances.length === 0)
            return [];
        // Pre-compute normalisation bounds for cost and duration.
        // 使用单次平均成本而非累计成本进行归一化，避免调用次数多的模型被错误惩罚
        const costs = performances.map((p) => p.totalCost / Math.max(1, p.totalGenerated));
        const durations = performances.map((p) => p.averageDuration);
        const maxCost = Math.max(1, ...costs);
        const maxDuration = Math.max(1, ...durations);
        const { weights } = this.config;
        const scored = performances
            .map((perf) => {
            // Estimate per-call cost for the requested duration (if given).
            // Falls back to costPerAccept as a proxy.
            const estimatedCost = params.duration !== undefined && perf.averageDuration > 0
                ? (perf.costPerAccept * params.duration) / Math.max(1, perf.averageDuration)
                : perf.costPerAccept;
            // Quality sub-score: review score normalised to 0–1.
            const qualityScore = (perf.averageScore / 100) * weights.quality;
            // Cost sub-score: lower cost → higher score (inverted + normalised).
            // 使用单次平均成本进行归一化
            const avgCost = perf.totalCost / Math.max(1, perf.totalGenerated);
            const normalizedCost = avgCost / maxCost;
            const costScore = (1 - normalizedCost) * weights.cost;
            // Speed sub-score: lower average duration → higher score.
            const normalizedDuration = perf.averageDuration / maxDuration;
            const speedScore = (1 - normalizedDuration) * weights.speed;
            // User-preference sub-score: accept rate directly.
            const userPrefScore = perf.acceptRate * weights.userPreference;
            const rawTotal = qualityScore + costScore + speedScore + userPrefScore;
            // Scale to 0–100. The theoretical max is weights sum (≈1.0).
            const score = Math.round(Math.min(100, rawTotal * 100));
            // Estimated quality on a 0–100 scale (same as averageScore).
            const estimatedQuality = Math.round(perf.averageScore);
            // Build a human-readable reason based on the dominant sub-score.
            const reason = this.buildRecommendationReason(perf, qualityScore, costScore, speedScore, userPrefScore);
            return {
                provider: perf.provider,
                model: perf.model,
                score,
                reason,
                estimatedCost: Math.round(estimatedCost),
                estimatedQuality,
            };
        })
            .filter((r) => (params.maxCost !== undefined ? r.estimatedCost <= params.maxCost : true))
            .sort((a, b) => b.score - a.score);
        return scored;
    }
    /**
     * Build a human-readable recommendation reason by identifying the
     * model's strongest dimension.
     */
    buildRecommendationReason(perf, qualityScore, costScore, speedScore, userPrefScore) {
        const dimensions = [
            { label: "质量最高", value: qualityScore },
            { label: "性价比最优", value: costScore },
            { label: "速度最快", value: speedScore },
            { label: "用户接受率最高", value: userPrefScore },
        ];
        // Pick the top dimension; tie-break by quality > cost > speed > pref.
        dimensions.sort((a, b) => b.value - a.value);
        const top = dimensions[0];
        const parts = [top.label];
        if (perf.acceptRate >= 0.7) {
            parts.push(`接受率${Math.round(perf.acceptRate * 100)}%`);
        }
        if (perf.successRate >= 0.9) {
            parts.push(`成功率${Math.round(perf.successRate * 100)}%`);
        }
        if (perf.usageTrend === "up") {
            parts.push("使用趋势上升");
        }
        return parts.join("，");
    }
    // -------------------------------------------------------------------------
    // Template preferences
    // -------------------------------------------------------------------------
    /**
     * Get the user's most-preferred prompt templates by usage and rating.
     *
     * Ranks templates by a composite score: usageCount × 0.6 +
     * averageRating × 0.4 (normalised to a 0–5 scale).
     *
     * @param limit Maximum number of templates to return (default 10).
     * @returns Ranked template usage summaries.
     */
    getPreferredTemplates(limit = 10) {
        const templateData = new Map();
        for (const e of this.events) {
            if (!e.templateId)
                continue;
            if (e.eventType === "template_selected") {
                const entry = templateData.get(e.templateId) ?? {
                    usageCount: 0,
                    ratingSum: 0,
                    ratingCount: 0,
                };
                entry.usageCount += 1;
                templateData.set(e.templateId, entry);
            }
            if (e.eventType === "template_rated" && e.rating !== undefined) {
                const entry = templateData.get(e.templateId) ?? {
                    usageCount: 0,
                    ratingSum: 0,
                    ratingCount: 0,
                };
                entry.ratingSum += e.rating;
                entry.ratingCount += 1;
                templateData.set(e.templateId, entry);
            }
        }
        // Pre-compute maxUsage once before sorting to avoid O(n²) recalculation
        const maxUsage = Math.max(1, ...Array.from(templateData.values()).map((d) => d.usageCount));
        return Array.from(templateData.entries())
            .map(([templateId, data]) => ({
            templateId,
            usageCount: data.usageCount,
            averageRating: data.ratingCount > 0 ? data.ratingSum / data.ratingCount : 0,
        }))
            .sort((a, b) => {
            // Composite: usage (normalised) + rating.
            const aScore = (a.usageCount / maxUsage) * 0.6 + (a.averageRating / 5) * 0.4;
            const bScore = (b.usageCount / maxUsage) * 0.6 + (b.averageRating / 5) * 0.4;
            return bScore - aScore;
        })
            .slice(0, limit);
    }
    // -------------------------------------------------------------------------
    // Usage trends
    // -------------------------------------------------------------------------
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
    getUsageTrend(days = 30) {
        const result = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const day = new Date(now);
            day.setUTCDate(day.getUTCDate() - i);
            const dateStr = day.toISOString().slice(0, 10);
            const dayGenEvents = this.events.filter((e) => e.eventType === "clip_generated" && dateOf(e.timestamp) === dateStr);
            const dayAcceptEvents = this.events.filter((e) => e.eventType === "clip_accepted" && dateOf(e.timestamp) === dateStr);
            const generations = dayGenEvents.length;
            const acceptRate = generations > 0 ? dayAcceptEvents.length / generations : 0;
            const totalCost = dayGenEvents.reduce((sum, e) => sum + (e.metadata?.cost ?? 0), 0);
            const averageCost = generations > 0 ? totalCost / generations : 0;
            result.push({ date: dateStr, generations, acceptRate, averageCost });
        }
        return result;
    }
    // -------------------------------------------------------------------------
    // Data cleanup
    // -------------------------------------------------------------------------
    /**
     * Purge events older than `config.retentionDays`.
     *
     * @returns The number of events removed.
     */
    cleanup() {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - this.config.retentionDays);
        const cutoffIso = cutoff.toISOString();
        const before = this.events.length;
        this.events = this.events.filter((e) => e.timestamp >= cutoffIso);
        return before - this.events.length;
    }
    // -------------------------------------------------------------------------
    // Serialisation & persistence
    // -------------------------------------------------------------------------
    /**
     * Serialise the flywheel (events + config) to a JSON string.
     *
     * The output is validated against {@link SerializedFlywheelSchema} before
     * encoding so corrupt in-memory state cannot produce invalid JSON.
     *
     * @returns Pretty-printed JSON string.
     */
    toJSON() {
        const payload = {
            events: this.events,
            config: this.config,
            version: DataFlywheel.VERSION,
        };
        const validated = SerializedFlywheelSchema.parse(payload);
        return JSON.stringify(validated, null, 2);
    }
    /**
     * Reconstruct a DataFlywheel from a JSON string.
     *
     * The input is validated against {@link SerializedFlywheelSchema}. If
     * validation fails a Zod error is thrown.
     *
     * @param json JSON string produced by {@link toJSON} or compatible source.
     * @returns A populated DataFlywheel.
     */
    static fromJSON(json) {
        const parsed = SerializedFlywheelSchema.parse(JSON.parse(json));
        const flywheel = new DataFlywheel(parsed.config);
        flywheel.events = parsed.events;
        return flywheel;
    }
    /**
     * Persist the flywheel to a JSON file on disk.
     *
     * Creates parent directories as needed (mkdir -p).
     *
     * @param filePath Absolute or relative path to the output file.
     */
    async save(filePath) {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, this.toJSON(), "utf8");
    }
    /**
     * Load a DataFlywheel from a JSON file on disk.
     *
     * Returns a fresh empty flywheel when the file does not exist, so callers
     * can call `load` unconditionally on startup.
     *
     * @param filePath Path to a file previously written by {@link save}.
     * @returns A populated DataFlywheel.
     */
    static async load(filePath) {
        try {
            const data = await readFile(filePath, "utf8");
            return DataFlywheel.fromJSON(data);
        }
        catch {
            // File missing or corrupt — start fresh.
            return new DataFlywheel();
        }
    }
    // -------------------------------------------------------------------------
    // Accessors (for testing / introspection)
    // -------------------------------------------------------------------------
    /** Total number of tracked events. */
    get eventCount() {
        return this.events.length;
    }
    /** Current configuration (read-only snapshot). */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=data-flywheel.js.map