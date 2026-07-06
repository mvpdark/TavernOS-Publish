// Multi-model unified billing module — tracks per-call costs across all
// video generation providers (Seedance / Grok / Jimeng / Doubao / Wav2Lip / LLM).
//
// TavernOS integrates multiple video-generation backends, each with distinct
// pricing models (per-second, per-request, per-frame). This module provides a
// single source of truth for call-cost tracking, giving users transparency
// over spending across providers, operations, and projects.
//
// Design overview:
//   - BillingRecord: immutable ledger entry for one API call (success or fail).
//   - ModelPricing: configurable per-model unit price + free quota + discount.
//   - BillingTracker: in-memory ledger with cost calculation, summary
//     aggregation, free-quota enforcement, alerting, and JSON persistence.
//   - All monetary amounts are stored as integer cents (CNY_cents / USD_cents)
//     to avoid floating-point rounding errors — never store raw yuan/dollar.
//   - The pricing table is fully configurable; DEFAULT_PRICING_TABLE is only
//     a built-in starting point and can be overridden per-tracker instance.
//
// The tracker is intentionally in-memory and serialisable (toJSON / fromJSON /
// save / load) so it can be persisted to disk, embedded in pipeline context,
// or synced to an external billing database by a higher-level orchestrator.
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
// ---------------------------------------------------------------------------
// Zod schemas & types
// ---------------------------------------------------------------------------
// Explicit interfaces are exported as the canonical types; Zod schemas are
// provided for runtime validation of imported/serialised data and for
// pipeline-level schema composition (see index.ts re-exports).
/** Supported currency units — always integer cents to avoid float errors. */
export const CurrencySchema = z.enum(["CNY_cents", "USD_cents"]);
/** Pricing model describing how a single call is charged. */
export const PricingTypeSchema = z.enum([
    "per_second",
    "per_request",
    "per_frame",
    "per_1k_frames",
]);
/**
 * Zod schema for a single billing record (one ledger entry).
 *
 * A record is created for every tracked API call — successful or failed —
 * and is immutable once written. Costs are always integer cents.
 */
export const BillingRecordSchema = z.object({
    /** Stable unique identifier (UUIDv4). */
    id: z.string().min(1),
    /** ISO-8601 timestamp of when the call was recorded. */
    timestamp: z.string().min(1),
    /** Project this call belongs to. */
    projectId: z.string().min(1),
    // --- Model information ---
    /** Provider id, e.g. "seedance" | "grok" | "jimeng" | "doubao". */
    provider: z.string().min(1),
    /** Specific model name, e.g. "seedance-2.0". */
    model: z.string().min(1),
    /** Operation type, e.g. "video_generation" | "image_generation" | "lip_sync" | "review". */
    operation: z.string().min(1),
    // --- Usage ---
    /** Video duration in seconds (for per-second billing). */
    durationSeconds: z.number().min(0).optional(),
    /** Resolution label, e.g. "1080p" | "720p". */
    resolution: z.string().optional(),
    /** Number of frames generated (for per-frame billing). */
    framesGenerated: z.number().int().min(0).optional(),
    // --- Cost ---
    /** Cost in integer cents (avoid floating-point rounding). */
    cost: z.number().int().min(0),
    /** Currency unit of `cost`. */
    costUnit: CurrencySchema,
    // --- Result ---
    /** Whether the call succeeded. */
    success: z.boolean(),
    /** Error message when `success` is false. */
    errorMessage: z.string().optional(),
    // --- Metadata ---
    /** Upstream request id for traceability. */
    requestId: z.string().optional(),
    /** Number of clips produced by this call (for multi-clip generations). */
    clipsGenerated: z.number().int().min(0).optional(),
});
/**
 * Zod schema for a model pricing entry.
 *
 * The pricing table is a flat array of these entries; lookups match on the
 * (provider, model, operation) triple. `freeQuota` is a daily free-call
 * allowance — calls within the quota are zero-cost.
 */
export const ModelPricingSchema = z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    operation: z.string().min(1),
    /** How the unit price is applied. */
    pricingType: PricingTypeSchema,
    /** Unit price in integer cents. */
    unitPrice: z.number().int().min(0),
    /** Currency of `unitPrice`. */
    currency: CurrencySchema,
    /** Daily free-call allowance (calls within quota are free). */
    freeQuota: z.number().int().min(0).optional(),
    /** Discount multiplier, 0–1 (0.8 = 八折). Applied to the raw cost. */
    discount: z.number().min(0).max(1).optional(),
    /** ISO-8601 timestamp from which this pricing is effective. */
    effectiveFrom: z.string().optional(),
    /** ISO-8601 timestamp after which this pricing is no longer effective. */
    effectiveTo: z.string().optional(),
});
/** Aggregation bucket for per-provider summary. */
const ProviderSummarySchema = z.object({
    cost: z.number().min(0),
    requests: z.number().int().min(0),
    successRate: z.number().min(0).max(1),
});
/** Aggregation bucket for per-operation summary. */
const OperationSummarySchema = z.object({
    cost: z.number().min(0),
    requests: z.number().int().min(0),
});
/** Aggregation bucket for per-date summary. */
const DateSummarySchema = z.object({
    cost: z.number().min(0),
    requests: z.number().int().min(0),
});
/**
 * Zod schema for a cost summary (aggregated view of billing records).
 *
 * All three groupings (byProvider / byOperation / byDate) are always
 * populated regardless of the `groupBy` query hint.
 */
export const CostSummarySchema = z.object({
    totalCost: z.number().min(0),
    totalRequests: z.number().int().min(0),
    successCount: z.number().int().min(0),
    failureCount: z.number().int().min(0),
    byProvider: z.record(z.string(), ProviderSummarySchema),
    byOperation: z.record(z.string(), OperationSummarySchema),
    byDate: z.record(z.string(), DateSummarySchema),
    startDate: z.string(),
    endDate: z.string(),
});
/**
 * Zod schema for billing-tracker configuration.
 */
export const BillingConfigSchema = z.object({
    /** Whether billing tracking is enabled. */
    enabled: z.boolean(),
    /** Default currency for records without an explicit pricing match. */
    defaultCurrency: CurrencySchema,
    /** Storage path (relative to project data directory). */
    storagePath: z.string(),
    /** Whether to record failed requests in the ledger. */
    trackFailures: z.boolean(),
    /** Cost threshold (cents) above which {@link BillingTracker.shouldAlert} returns true. */
    alertThreshold: z.number().int().min(0),
});
/**
 * Zod schema for the serialised tracker payload (toJSON / fromJSON / save / load).
 */
const SerializedBillingSchema = z.object({
    records: z.array(BillingRecordSchema),
    pricingTable: z.array(ModelPricingSchema),
    config: BillingConfigSchema,
    version: z.string(),
});
// ---------------------------------------------------------------------------
// Built-in pricing table & default config
// ---------------------------------------------------------------------------
/**
 * Built-in default pricing table.
 *
 * Prices are in integer cents. This is only a starting point — a tracker
 * instance may be constructed with a custom table to override or extend
 * these entries. Daily free quotas (`freeQuota`) grant zero-cost calls up
 * to the allowance per (provider, model) per day.
 */
export const DEFAULT_PRICING_TABLE = [
    // Seedance
    {
        provider: "seedance",
        model: "seedance-2.0",
        operation: "video_generation",
        pricingType: "per_second",
        unitPrice: 50, // 0.5元/秒
        currency: "CNY_cents",
        freeQuota: 10,
    },
    {
        provider: "seedance",
        model: "seedance-1.0",
        operation: "video_generation",
        pricingType: "per_second",
        unitPrice: 30, // 0.3元/秒
        currency: "CNY_cents",
        freeQuota: 20,
    },
    // Grok
    {
        provider: "grok",
        model: "grok-video",
        operation: "video_generation",
        pricingType: "per_request",
        unitPrice: 200, // 2元/次
        currency: "CNY_cents",
        freeQuota: 5,
    },
    // 即梦 (Jimeng)
    {
        provider: "jimeng",
        model: "jimeng-pro",
        operation: "video_generation",
        pricingType: "per_second",
        unitPrice: 40, // 0.4元/秒
        currency: "CNY_cents",
        freeQuota: 15,
    },
    {
        provider: "jimeng",
        model: "jimeng-standard",
        operation: "video_generation",
        pricingType: "per_second",
        unitPrice: 20, // 0.2元/秒
        currency: "CNY_cents",
        freeQuota: 30,
    },
    // 豆包 (Doubao)
    {
        provider: "doubao",
        model: "doubao-video",
        operation: "video_generation",
        pricingType: "per_second",
        unitPrice: 35, // 0.35元/秒
        currency: "CNY_cents",
        freeQuota: 20,
    },
    // 口型同步 (Lip-sync)
    {
        provider: "wav2lip",
        model: "wav2lip-gan",
        operation: "lip_sync",
        pricingType: "per_request",
        unitPrice: 0, // 本地部署，免费
        currency: "CNY_cents",
    },
    {
        provider: "seedance",
        model: "seedance-2.0",
        operation: "lip_sync",
        pricingType: "per_request",
        unitPrice: 50, // 0.5元/次
        currency: "CNY_cents",
    },
    // 审核 (LLM review)
    {
        provider: "llm",
        model: "default",
        operation: "review",
        pricingType: "per_request",
        unitPrice: 5, // 0.05元/次
        currency: "CNY_cents",
    },
];
/**
 * Default billing configuration.
 *
 * `alertThreshold` defaults to 100000 cents (1000元) — projects exceeding
 * this cumulative cost trigger {@link BillingTracker.shouldAlert}.
 */
export const DEFAULT_BILLING_CONFIG = {
    enabled: true,
    defaultCurrency: "CNY_cents",
    storagePath: "billing",
    trackFailures: true,
    alertThreshold: 100_000, // 1000元警告
};
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Extract the date portion (YYYY-MM-DD) from an ISO-8601 timestamp.
 *
 * Used for per-day aggregation and free-quota reset boundaries.
 */
function dateOf(isoTimestamp) {
    return isoTimestamp.slice(0, 10);
}
/** Current date as YYYY-MM-DD (UTC). */
function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/**
 * Format an integer-cent amount as a human-readable currency string.
 *
 * @example formatCost(500, "CNY_cents") → "¥5.00"
 * @example formatCost(199, "USD_cents") → "$1.99"
 *
 * @param cents    Amount in integer cents.
 * @param currency Currency unit ("CNY_cents" | "USD_cents").
 * @returns Formatted string with currency symbol.
 */
export function formatCost(cents, currency) {
    const value = (cents / 100).toFixed(2);
    switch (currency) {
        case "CNY_cents":
            return `¥${value}`;
        case "USD_cents":
            return `$${value}`;
        default:
            return value;
    }
}
/**
 * Look up a pricing entry from the {@link DEFAULT_PRICING_TABLE}.
 *
 * Matches on the (provider, model, operation) triple. Returns `undefined`
 * when no entry matches — callers should treat unknown models as zero-cost
 * or surface a warning.
 *
 * @param provider  Provider id.
 * @param model     Model name.
 * @param operation Operation type.
 * @returns The matching pricing entry, or `undefined`.
 */
export function getPricing(provider, model, operation) {
    return DEFAULT_PRICING_TABLE.find((p) => p.provider === provider && p.model === model && p.operation === operation);
}
/**
 * List all available models and their pricing from the default table.
 *
 * Convenience for UI rendering (e.g. a model-picker with price badges).
 *
 * @returns Array of flat pricing summaries.
 */
export function listAvailableModels() {
    return DEFAULT_PRICING_TABLE.map((p) => ({
        provider: p.provider,
        model: p.model,
        operation: p.operation,
        unitPrice: p.unitPrice,
        currency: p.currency,
        pricingType: p.pricingType,
    }));
}
// ---------------------------------------------------------------------------
// BillingTracker
// ---------------------------------------------------------------------------
/**
 * In-memory billing ledger tracking per-call costs across all video
 * generation providers.
 *
 * Responsibilities:
 *   - `record`: append a {@link BillingRecord} for each API call, applying
 *     free-quota and discount rules to compute the final cost.
 *   - `calculateCost`: compute the raw cost for a hypothetical call (before
 *     free-quota deduction) — useful for pre-flight estimates.
 *   - `getSummary`: aggregate records by provider / operation / date within
 *     an optional time range and project filter.
 *   - `checkFreeQuota`: inspect remaining daily free calls for a model.
 *   - `shouldAlert`: threshold-based cost alerting for projects.
 *   - `toJSON` / `fromJSON` / `save` / `load`: JSON persistence to disk.
 *
 * The tracker is not thread-safe; callers sharing an instance across async
 * boundaries should serialise writes externally.
 */
export class BillingTracker {
    /** Version tag emitted in serialised output. */
    static VERSION = "1.0.0";
    records = [];
    pricingTable;
    config;
    /**
     * @param config       Partial config overrides merged onto {@link DEFAULT_BILLING_CONFIG}.
     * @param pricingTable Custom pricing table; defaults to {@link DEFAULT_PRICING_TABLE}.
     */
    constructor(config, pricingTable) {
        this.config = { ...DEFAULT_BILLING_CONFIG, ...config };
        this.pricingTable = pricingTable ?? DEFAULT_PRICING_TABLE;
    }
    // -------------------------------------------------------------------------
    // Pricing lookup
    // -------------------------------------------------------------------------
    /**
     * Find the pricing entry for a (provider, model, operation) triple from
     * this tracker's configured table.
     *
     * @param provider  Provider id.
     * @param model     Model name.
     * @param operation Operation type.
     * @returns The matching entry, or `undefined`.
     */
    findPricing(provider, model, operation) {
        return this.pricingTable.find((p) => p.provider === provider &&
            p.model === model &&
            p.operation === operation);
    }
    // -------------------------------------------------------------------------
    // Recording
    // -------------------------------------------------------------------------
    /**
     * Record a single API call in the ledger.
     *
     * Cost logic:
     *   1. Compute the raw cost via {@link calculateCost}.
     *   2. If the call succeeded and the (provider, model) still has free
     *      quota remaining today, the cost is zeroed (free call).
     *   3. Failed calls are never charged (cost = 0).
     *   4. When billing is disabled (`config.enabled === false`) the record is
     *      returned but not stored. When `trackFailures` is false, failed
     *      calls are not stored either.
     *
     * @param params Call details.
     * @returns The fully-formed {@link BillingRecord}.
     */
    record(params) {
        const timestamp = new Date().toISOString();
        const pricing = this.findPricing(params.provider, params.model, params.operation);
        const currency = pricing?.currency ?? this.config.defaultCurrency;
        const rawCost = this.calculateCost({
            provider: params.provider,
            model: params.model,
            operation: params.operation,
            durationSeconds: params.durationSeconds,
            framesGenerated: params.framesGenerated,
        });
        let cost = 0;
        if (params.success) {
            const quota = this.checkFreeQuota(params.provider, params.model, params.operation);
            cost = quota.remaining > 0 ? 0 : rawCost;
        }
        const record = {
            id: randomUUID(),
            timestamp,
            projectId: params.projectId,
            provider: params.provider,
            model: params.model,
            operation: params.operation,
            durationSeconds: params.durationSeconds,
            resolution: params.resolution,
            framesGenerated: params.framesGenerated,
            cost,
            costUnit: currency,
            success: params.success,
            errorMessage: params.errorMessage,
            requestId: params.requestId,
            clipsGenerated: params.clipsGenerated,
        };
        if (this.config.enabled) {
            if (params.success || this.config.trackFailures) {
                this.records.push(record);
            }
        }
        return record;
    }
    // -------------------------------------------------------------------------
    // Cost calculation
    // -------------------------------------------------------------------------
    /**
     * Compute the raw cost (in cents) for a hypothetical call, before
     * free-quota deduction.
     *
     * Pricing rules by `pricingType`:
     *   - `per_second`:     unitPrice × durationSeconds
     *   - `per_request`:    unitPrice (flat)
     *   - `per_frame`:      unitPrice × framesGenerated
     *   - `per_1k_frames`:  unitPrice × framesGenerated / 1000
     *
     * A `discount` multiplier (0–1) is applied when present. The result is
     * rounded to the nearest integer cent and clamped to ≥ 0. Returns 0 when
     * no pricing entry matches.
     *
     * @param params Call parameters relevant to pricing.
     * @returns Cost in integer cents.
     */
    calculateCost(params) {
        const pricing = this.findPricing(params.provider, params.model, params.operation);
        if (!pricing)
            return 0;
        let cost = 0;
        switch (pricing.pricingType) {
            case "per_second":
                cost = pricing.unitPrice * (params.durationSeconds ?? 0);
                break;
            case "per_request":
                cost = pricing.unitPrice;
                break;
            case "per_frame":
                cost = pricing.unitPrice * (params.framesGenerated ?? 0);
                break;
            case "per_1k_frames":
                cost = (pricing.unitPrice * (params.framesGenerated ?? 0)) / 1000;
                break;
        }
        if (pricing.discount !== undefined) {
            cost *= pricing.discount;
        }
        return Math.max(0, Math.round(cost));
    }
    // -------------------------------------------------------------------------
    // Aggregation / queries
    // -------------------------------------------------------------------------
    /**
     * Produce an aggregated cost summary over the (optionally filtered) ledger.
     *
     * Records can be filtered by `projectId` and a `[startDate, endDate]` ISO
     * timestamp range. All three groupings (byProvider / byOperation / byDate)
     * are always populated; the `groupBy` hint is reserved for future use and
     * does not restrict the output.
     *
     * @param params Optional filter + grouping hint.
     * @returns A populated {@link CostSummary}.
     */
    getSummary(params) {
        let filtered = this.records;
        if (params.projectId) {
            filtered = filtered.filter((r) => r.projectId === params.projectId);
        }
        if (params.startDate) {
            filtered = filtered.filter((r) => r.timestamp >= params.startDate);
        }
        if (params.endDate) {
            filtered = filtered.filter((r) => r.timestamp <= params.endDate);
        }
        const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);
        const totalRequests = filtered.length;
        const successCount = filtered.filter((r) => r.success).length;
        const failureCount = totalRequests - successCount;
        // --- by provider ---
        const byProvider = {};
        for (const r of filtered) {
            const bucket = byProvider[r.provider] ?? {
                cost: 0,
                requests: 0,
                successRate: 0,
            };
            bucket.cost += r.cost;
            bucket.requests += 1;
            byProvider[r.provider] = bucket;
        }
        for (const key of Object.keys(byProvider)) {
            const b = byProvider[key];
            b.successRate = b.requests > 0 ? successCountFor(filtered, key) / b.requests : 0;
        }
        // --- by operation ---
        const byOperation = {};
        for (const r of filtered) {
            const bucket = byOperation[r.operation] ?? { cost: 0, requests: 0 };
            bucket.cost += r.cost;
            bucket.requests += 1;
            byOperation[r.operation] = bucket;
        }
        // --- by date ---
        const byDate = {};
        for (const r of filtered) {
            const day = dateOf(r.timestamp);
            const bucket = byDate[day] ?? { cost: 0, requests: 0 };
            bucket.cost += r.cost;
            bucket.requests += 1;
            byDate[day] = bucket;
        }
        // --- time range ---
        const timestamps = filtered
            .map((r) => r.timestamp)
            .sort((a, b) => a.localeCompare(b));
        const startDate = timestamps[0] ?? params.startDate ?? new Date().toISOString();
        const endDate = timestamps[timestamps.length - 1] ?? params.endDate ?? startDate;
        return {
            totalCost,
            totalRequests,
            successCount,
            failureCount,
            byProvider,
            byOperation,
            byDate,
            startDate,
            endDate,
        };
    }
    /**
     * Get the cumulative cost (cents) for a single project.
     *
     * @param projectId Project id.
     * @returns Total cost in cents across all of the project's records.
     */
    getProjectCost(projectId) {
        return this.records
            .filter((r) => r.projectId === projectId)
            .reduce((sum, r) => sum + r.cost, 0);
    }
    /**
     * Get today's cost (cents), optionally scoped to a project.
     *
     * "Today" is determined by the UTC date portion of each record's timestamp.
     *
     * @param projectId Optional project filter.
     * @returns Total cost in cents for today.
     */
    getTodayCost(projectId) {
        const today = todayDateString();
        return this.records
            .filter((r) => dateOf(r.timestamp) === today)
            .filter((r) => (projectId ? r.projectId === projectId : true))
            .reduce((sum, r) => sum + r.cost, 0);
    }
    // -------------------------------------------------------------------------
    // Free quota
    // -------------------------------------------------------------------------
    /**
     * Check the remaining daily free quota for a (provider, model, operation) triple.
     *
     * Free quota is per (provider, model, operation) per UTC day and is consumed
     * only by successful calls. The quota allowance comes from the first pricing
     * entry for this (provider, model, operation) that defines a `freeQuota`.
     *
     * @param provider  Provider id.
     * @param model     Model name.
     * @param operation Operation type.
     * @returns `{ remaining, used, total }` (all call counts).
     */
    checkFreeQuota(provider, model, operation) {
        const pricing = this.pricingTable.find((p) => p.provider === provider &&
            p.model === model &&
            p.operation === operation &&
            p.freeQuota !== undefined);
        const total = pricing?.freeQuota ?? 0;
        const today = todayDateString();
        const used = this.records.filter((r) => r.provider === provider &&
            r.model === model &&
            r.operation === operation &&
            r.success &&
            dateOf(r.timestamp) === today).length;
        return { remaining: Math.max(0, total - used), used, total };
    }
    // -------------------------------------------------------------------------
    // Alerting
    // -------------------------------------------------------------------------
    /**
     * Check whether a project's cumulative cost has reached the alert
     * threshold (`config.alertThreshold`).
     *
     * @param projectId Project id.
     * @returns `true` when the project cost ≥ alert threshold.
     */
    shouldAlert(projectId) {
        return this.getProjectCost(projectId) >= this.config.alertThreshold;
    }
    // -------------------------------------------------------------------------
    // Serialisation & persistence
    // -------------------------------------------------------------------------
    /**
     * Serialise the tracker (records + pricing table + config) to a JSON string.
     *
     * The output is validated against {@link SerializedBillingSchema} before
     * encoding so corrupt in-memory state cannot produce invalid JSON.
     *
     * @returns Pretty-printed JSON string.
     */
    toJSON() {
        const payload = {
            records: this.records,
            pricingTable: this.pricingTable,
            config: this.config,
            version: BillingTracker.VERSION,
        };
        const validated = SerializedBillingSchema.parse(payload);
        return JSON.stringify(validated, null, 2);
    }
    /**
     * Reconstruct a BillingTracker from a JSON string.
     *
     * The input is validated against {@link SerializedBillingSchema}. If
     * validation fails a Zod error is thrown.
     *
     * @param json JSON string produced by {@link toJSON} or compatible source.
     * @returns A populated BillingTracker.
     */
    static fromJSON(json) {
        const parsed = SerializedBillingSchema.parse(JSON.parse(json));
        const tracker = new BillingTracker(parsed.config, parsed.pricingTable);
        tracker.records = parsed.records;
        return tracker;
    }
    /**
     * Persist the tracker to a JSON file on disk.
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
     * Load a BillingTracker from a JSON file on disk.
     *
     * @param filePath Path to a file previously written by {@link save}.
     * @returns A populated BillingTracker.
     */
    static async load(filePath) {
        const data = await readFile(filePath, "utf8");
        return BillingTracker.fromJSON(data);
    }
}
// ---------------------------------------------------------------------------
// Local helpers (module-private)
// ---------------------------------------------------------------------------
/**
 * Count successful records matching a provider key, used by
 * {@link BillingTracker.getSummary} for success-rate computation.
 */
function successCountFor(records, provider) {
    return records.filter((r) => r.provider === provider && r.success).length;
}
//# sourceMappingURL=billing.js.map