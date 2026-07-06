import { z } from "zod";
/** Supported currency units — always integer cents to avoid float errors. */
export declare const CurrencySchema: z.ZodEnum<["CNY_cents", "USD_cents"]>;
export type Currency = z.infer<typeof CurrencySchema>;
/** Pricing model describing how a single call is charged. */
export declare const PricingTypeSchema: z.ZodEnum<["per_second", "per_request", "per_frame", "per_1k_frames"]>;
export type PricingType = z.infer<typeof PricingTypeSchema>;
/**
 * Zod schema for a single billing record (one ledger entry).
 *
 * A record is created for every tracked API call — successful or failed —
 * and is immutable once written. Costs are always integer cents.
 */
export declare const BillingRecordSchema: z.ZodObject<{
    /** Stable unique identifier (UUIDv4). */
    id: z.ZodString;
    /** ISO-8601 timestamp of when the call was recorded. */
    timestamp: z.ZodString;
    /** Project this call belongs to. */
    projectId: z.ZodString;
    /** Provider id, e.g. "seedance" | "grok" | "jimeng" | "doubao". */
    provider: z.ZodString;
    /** Specific model name, e.g. "seedance-2.0". */
    model: z.ZodString;
    /** Operation type, e.g. "video_generation" | "image_generation" | "lip_sync" | "review". */
    operation: z.ZodString;
    /** Video duration in seconds (for per-second billing). */
    durationSeconds: z.ZodOptional<z.ZodNumber>;
    /** Resolution label, e.g. "1080p" | "720p". */
    resolution: z.ZodOptional<z.ZodString>;
    /** Number of frames generated (for per-frame billing). */
    framesGenerated: z.ZodOptional<z.ZodNumber>;
    /** Cost in integer cents (avoid floating-point rounding). */
    cost: z.ZodNumber;
    /** Currency unit of `cost`. */
    costUnit: z.ZodEnum<["CNY_cents", "USD_cents"]>;
    /** Whether the call succeeded. */
    success: z.ZodBoolean;
    /** Error message when `success` is false. */
    errorMessage: z.ZodOptional<z.ZodString>;
    /** Upstream request id for traceability. */
    requestId: z.ZodOptional<z.ZodString>;
    /** Number of clips produced by this call (for multi-clip generations). */
    clipsGenerated: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    provider: string;
    model: string;
    timestamp: string;
    success: boolean;
    projectId: string;
    operation: string;
    cost: number;
    costUnit: "CNY_cents" | "USD_cents";
    resolution?: string | undefined;
    durationSeconds?: number | undefined;
    framesGenerated?: number | undefined;
    errorMessage?: string | undefined;
    requestId?: string | undefined;
    clipsGenerated?: number | undefined;
}, {
    id: string;
    provider: string;
    model: string;
    timestamp: string;
    success: boolean;
    projectId: string;
    operation: string;
    cost: number;
    costUnit: "CNY_cents" | "USD_cents";
    resolution?: string | undefined;
    durationSeconds?: number | undefined;
    framesGenerated?: number | undefined;
    errorMessage?: string | undefined;
    requestId?: string | undefined;
    clipsGenerated?: number | undefined;
}>;
export type BillingRecord = z.infer<typeof BillingRecordSchema>;
/**
 * Zod schema for a model pricing entry.
 *
 * The pricing table is a flat array of these entries; lookups match on the
 * (provider, model, operation) triple. `freeQuota` is a daily free-call
 * allowance — calls within the quota are zero-cost.
 */
export declare const ModelPricingSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
    operation: z.ZodString;
    /** How the unit price is applied. */
    pricingType: z.ZodEnum<["per_second", "per_request", "per_frame", "per_1k_frames"]>;
    /** Unit price in integer cents. */
    unitPrice: z.ZodNumber;
    /** Currency of `unitPrice`. */
    currency: z.ZodEnum<["CNY_cents", "USD_cents"]>;
    /** Daily free-call allowance (calls within quota are free). */
    freeQuota: z.ZodOptional<z.ZodNumber>;
    /** Discount multiplier, 0–1 (0.8 = 八折). Applied to the raw cost. */
    discount: z.ZodOptional<z.ZodNumber>;
    /** ISO-8601 timestamp from which this pricing is effective. */
    effectiveFrom: z.ZodOptional<z.ZodString>;
    /** ISO-8601 timestamp after which this pricing is no longer effective. */
    effectiveTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: string;
    model: string;
    operation: string;
    pricingType: "per_second" | "per_request" | "per_frame" | "per_1k_frames";
    unitPrice: number;
    currency: "CNY_cents" | "USD_cents";
    freeQuota?: number | undefined;
    discount?: number | undefined;
    effectiveFrom?: string | undefined;
    effectiveTo?: string | undefined;
}, {
    provider: string;
    model: string;
    operation: string;
    pricingType: "per_second" | "per_request" | "per_frame" | "per_1k_frames";
    unitPrice: number;
    currency: "CNY_cents" | "USD_cents";
    freeQuota?: number | undefined;
    discount?: number | undefined;
    effectiveFrom?: string | undefined;
    effectiveTo?: string | undefined;
}>;
export type ModelPricing = z.infer<typeof ModelPricingSchema>;
/**
 * Zod schema for a cost summary (aggregated view of billing records).
 *
 * All three groupings (byProvider / byOperation / byDate) are always
 * populated regardless of the `groupBy` query hint.
 */
export declare const CostSummarySchema: z.ZodObject<{
    totalCost: z.ZodNumber;
    totalRequests: z.ZodNumber;
    successCount: z.ZodNumber;
    failureCount: z.ZodNumber;
    byProvider: z.ZodRecord<z.ZodString, z.ZodObject<{
        cost: z.ZodNumber;
        requests: z.ZodNumber;
        successRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        cost: number;
        requests: number;
        successRate: number;
    }, {
        cost: number;
        requests: number;
        successRate: number;
    }>>;
    byOperation: z.ZodRecord<z.ZodString, z.ZodObject<{
        cost: z.ZodNumber;
        requests: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        cost: number;
        requests: number;
    }, {
        cost: number;
        requests: number;
    }>>;
    byDate: z.ZodRecord<z.ZodString, z.ZodObject<{
        cost: z.ZodNumber;
        requests: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        cost: number;
        requests: number;
    }, {
        cost: number;
        requests: number;
    }>>;
    startDate: z.ZodString;
    endDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    totalCost: number;
    totalRequests: number;
    successCount: number;
    failureCount: number;
    byProvider: Record<string, {
        cost: number;
        requests: number;
        successRate: number;
    }>;
    byOperation: Record<string, {
        cost: number;
        requests: number;
    }>;
    byDate: Record<string, {
        cost: number;
        requests: number;
    }>;
    startDate: string;
    endDate: string;
}, {
    totalCost: number;
    totalRequests: number;
    successCount: number;
    failureCount: number;
    byProvider: Record<string, {
        cost: number;
        requests: number;
        successRate: number;
    }>;
    byOperation: Record<string, {
        cost: number;
        requests: number;
    }>;
    byDate: Record<string, {
        cost: number;
        requests: number;
    }>;
    startDate: string;
    endDate: string;
}>;
export type CostSummary = z.infer<typeof CostSummarySchema>;
/**
 * Zod schema for billing-tracker configuration.
 */
export declare const BillingConfigSchema: z.ZodObject<{
    /** Whether billing tracking is enabled. */
    enabled: z.ZodBoolean;
    /** Default currency for records without an explicit pricing match. */
    defaultCurrency: z.ZodEnum<["CNY_cents", "USD_cents"]>;
    /** Storage path (relative to project data directory). */
    storagePath: z.ZodString;
    /** Whether to record failed requests in the ledger. */
    trackFailures: z.ZodBoolean;
    /** Cost threshold (cents) above which {@link BillingTracker.shouldAlert} returns true. */
    alertThreshold: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    defaultCurrency: "CNY_cents" | "USD_cents";
    storagePath: string;
    trackFailures: boolean;
    alertThreshold: number;
}, {
    enabled: boolean;
    defaultCurrency: "CNY_cents" | "USD_cents";
    storagePath: string;
    trackFailures: boolean;
    alertThreshold: number;
}>;
export type BillingConfig = z.infer<typeof BillingConfigSchema>;
/**
 * Built-in default pricing table.
 *
 * Prices are in integer cents. This is only a starting point — a tracker
 * instance may be constructed with a custom table to override or extend
 * these entries. Daily free quotas (`freeQuota`) grant zero-cost calls up
 * to the allowance per (provider, model) per day.
 */
export declare const DEFAULT_PRICING_TABLE: ModelPricing[];
/**
 * Default billing configuration.
 *
 * `alertThreshold` defaults to 100000 cents (1000元) — projects exceeding
 * this cumulative cost trigger {@link BillingTracker.shouldAlert}.
 */
export declare const DEFAULT_BILLING_CONFIG: BillingConfig;
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
export declare function formatCost(cents: number, currency: string): string;
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
export declare function getPricing(provider: string, model: string, operation: string): ModelPricing | undefined;
/**
 * List all available models and their pricing from the default table.
 *
 * Convenience for UI rendering (e.g. a model-picker with price badges).
 *
 * @returns Array of flat pricing summaries.
 */
export declare function listAvailableModels(): Array<{
    provider: string;
    model: string;
    operation: string;
    unitPrice: number;
    currency: string;
    pricingType: string;
}>;
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
export declare class BillingTracker {
    /** Version tag emitted in serialised output. */
    static readonly VERSION = "1.0.0";
    private records;
    private readonly pricingTable;
    private readonly config;
    /**
     * @param config       Partial config overrides merged onto {@link DEFAULT_BILLING_CONFIG}.
     * @param pricingTable Custom pricing table; defaults to {@link DEFAULT_PRICING_TABLE}.
     */
    constructor(config?: Partial<BillingConfig>, pricingTable?: ModelPricing[]);
    /**
     * Find the pricing entry for a (provider, model, operation) triple from
     * this tracker's configured table.
     *
     * @param provider  Provider id.
     * @param model     Model name.
     * @param operation Operation type.
     * @returns The matching entry, or `undefined`.
     */
    private findPricing;
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
    record(params: {
        projectId: string;
        provider: string;
        model: string;
        operation: string;
        durationSeconds?: number;
        resolution?: string;
        framesGenerated?: number;
        clipsGenerated?: number;
        success: boolean;
        errorMessage?: string;
        requestId?: string;
    }): BillingRecord;
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
    calculateCost(params: {
        provider: string;
        model: string;
        operation: string;
        durationSeconds?: number;
        framesGenerated?: number;
    }): number;
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
    getSummary(params: {
        projectId?: string;
        startDate?: string;
        endDate?: string;
        groupBy?: "provider" | "operation" | "date";
    }): CostSummary;
    /**
     * Get the cumulative cost (cents) for a single project.
     *
     * @param projectId Project id.
     * @returns Total cost in cents across all of the project's records.
     */
    getProjectCost(projectId: string): number;
    /**
     * Get today's cost (cents), optionally scoped to a project.
     *
     * "Today" is determined by the UTC date portion of each record's timestamp.
     *
     * @param projectId Optional project filter.
     * @returns Total cost in cents for today.
     */
    getTodayCost(projectId?: string): number;
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
    checkFreeQuota(provider: string, model: string, operation: string): {
        remaining: number;
        used: number;
        total: number;
    };
    /**
     * Check whether a project's cumulative cost has reached the alert
     * threshold (`config.alertThreshold`).
     *
     * @param projectId Project id.
     * @returns `true` when the project cost ≥ alert threshold.
     */
    shouldAlert(projectId: string): boolean;
    /**
     * Serialise the tracker (records + pricing table + config) to a JSON string.
     *
     * The output is validated against {@link SerializedBillingSchema} before
     * encoding so corrupt in-memory state cannot produce invalid JSON.
     *
     * @returns Pretty-printed JSON string.
     */
    toJSON(): string;
    /**
     * Reconstruct a BillingTracker from a JSON string.
     *
     * The input is validated against {@link SerializedBillingSchema}. If
     * validation fails a Zod error is thrown.
     *
     * @param json JSON string produced by {@link toJSON} or compatible source.
     * @returns A populated BillingTracker.
     */
    static fromJSON(json: string): BillingTracker;
    /**
     * Persist the tracker to a JSON file on disk.
     *
     * Creates parent directories as needed (mkdir -p).
     *
     * @param filePath Absolute or relative path to the output file.
     */
    save(filePath: string): Promise<void>;
    /**
     * Load a BillingTracker from a JSON file on disk.
     *
     * @param filePath Path to a file previously written by {@link save}.
     * @returns A populated BillingTracker.
     */
    static load(filePath: string): Promise<BillingTracker>;
}
//# sourceMappingURL=billing.d.ts.map