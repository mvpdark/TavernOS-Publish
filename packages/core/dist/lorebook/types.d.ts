import { z } from "zod";
/** Selective logic modes controlling how primary/secondary keys are combined. */
export declare const SelectiveLogicSchema: z.ZodEnum<["AND_ANY", "NOT_ALL", "NOT_ANY", "AND_ALL"]>;
export type SelectiveLogic = z.infer<typeof SelectiveLogicSchema>;
/** Insertion positions for an entry relative to defined anchors. */
export declare const InsertionPositionSchema: z.ZodEnum<["before", "after", "ANTop", "ANBottom", "atDepth", "EMTop", "EMBottom", "outlet"]>;
export type InsertionPosition = z.infer<typeof InsertionPositionSchema>;
/** Role under which an entry's content is injected into the chat. */
export declare const MessageRoleSchema: z.ZodEnum<["system", "user", "assistant"]>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
/**
 * A single lorebook entry. Field names and defaults follow the industry-standard
 * lorebook format so that imported JSON round-trips losslessly.
 */
export declare const LoreEntrySchema: z.ZodObject<{
    uid: z.ZodNumber;
    key: z.ZodArray<z.ZodString, "many">;
    keysecondary: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    comment: z.ZodDefault<z.ZodString>;
    content: z.ZodDefault<z.ZodString>;
    constant: z.ZodDefault<z.ZodBoolean>;
    selective: z.ZodDefault<z.ZodBoolean>;
    selectiveLogic: z.ZodDefault<z.ZodEnum<["AND_ANY", "NOT_ALL", "NOT_ANY", "AND_ALL"]>>;
    order: z.ZodDefault<z.ZodNumber>;
    position: z.ZodDefault<z.ZodEnum<["before", "after", "ANTop", "ANBottom", "atDepth", "EMTop", "EMBottom", "outlet"]>>;
    disable: z.ZodDefault<z.ZodBoolean>;
    ignoreBudget: z.ZodDefault<z.ZodBoolean>;
    excludeRecursion: z.ZodDefault<z.ZodBoolean>;
    preventRecursion: z.ZodDefault<z.ZodBoolean>;
    probability: z.ZodDefault<z.ZodNumber>;
    useProbability: z.ZodDefault<z.ZodBoolean>;
    depth: z.ZodDefault<z.ZodNumber>;
    role: z.ZodDefault<z.ZodEnum<["system", "user", "assistant"]>>;
    group: z.ZodDefault<z.ZodString>;
    groupWeight: z.ZodDefault<z.ZodNumber>;
    matchWholeWords: z.ZodDefault<z.ZodBoolean>;
    caseSensitive: z.ZodDefault<z.ZodBoolean>;
    automationId: z.ZodDefault<z.ZodString>;
    sticky: z.ZodDefault<z.ZodNumber>;
    cooldown: z.ZodDefault<z.ZodNumber>;
    delay: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content: string;
    comment: string;
    constant: boolean;
    selective: boolean;
    position: "before" | "after" | "ANTop" | "ANBottom" | "atDepth" | "EMTop" | "EMBottom" | "outlet";
    uid: number;
    key: string[];
    keysecondary: string[];
    selectiveLogic: "AND_ANY" | "NOT_ALL" | "NOT_ANY" | "AND_ALL";
    order: number;
    disable: boolean;
    ignoreBudget: boolean;
    excludeRecursion: boolean;
    preventRecursion: boolean;
    probability: number;
    useProbability: boolean;
    depth: number;
    role: "system" | "user" | "assistant";
    group: string;
    groupWeight: number;
    matchWholeWords: boolean;
    caseSensitive: boolean;
    automationId: string;
    sticky: number;
    cooldown: number;
    delay: number;
}, {
    uid: number;
    key: string[];
    content?: string | undefined;
    comment?: string | undefined;
    constant?: boolean | undefined;
    selective?: boolean | undefined;
    position?: "before" | "after" | "ANTop" | "ANBottom" | "atDepth" | "EMTop" | "EMBottom" | "outlet" | undefined;
    keysecondary?: string[] | undefined;
    selectiveLogic?: "AND_ANY" | "NOT_ALL" | "NOT_ANY" | "AND_ALL" | undefined;
    order?: number | undefined;
    disable?: boolean | undefined;
    ignoreBudget?: boolean | undefined;
    excludeRecursion?: boolean | undefined;
    preventRecursion?: boolean | undefined;
    probability?: number | undefined;
    useProbability?: boolean | undefined;
    depth?: number | undefined;
    role?: "system" | "user" | "assistant" | undefined;
    group?: string | undefined;
    groupWeight?: number | undefined;
    matchWholeWords?: boolean | undefined;
    caseSensitive?: boolean | undefined;
    automationId?: string | undefined;
    sticky?: number | undefined;
    cooldown?: number | undefined;
    delay?: number | undefined;
}>;
export type LoreEntry = z.infer<typeof LoreEntrySchema>;
/** Lore scan configuration applied to a lorebook during activation. */
export declare const LoreScanConfigSchema: z.ZodObject<{
    recursionEnabled: z.ZodDefault<z.ZodBoolean>;
    maxRecursionSteps: z.ZodDefault<z.ZodNumber>;
    scanDepth: z.ZodDefault<z.ZodNumber>;
    /** Recursive keyword activation depth (0=disabled, 1=one level, max 5). Takes precedence over legacy recursionEnabled/maxRecursionSteps. */
    recursionDepth: z.ZodDefault<z.ZodNumber>;
    budgetPercentage: z.ZodDefault<z.ZodNumber>;
    budgetCap: z.ZodDefault<z.ZodNumber>;
    minActivations: z.ZodDefault<z.ZodNumber>;
    sortFn: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    recursionEnabled: boolean;
    maxRecursionSteps: number;
    scanDepth: number;
    recursionDepth: number;
    budgetPercentage: number;
    budgetCap: number;
    minActivations: number;
    sortFn: string;
}, {
    recursionEnabled?: boolean | undefined;
    maxRecursionSteps?: number | undefined;
    scanDepth?: number | undefined;
    recursionDepth?: number | undefined;
    budgetPercentage?: number | undefined;
    budgetCap?: number | undefined;
    minActivations?: number | undefined;
    sortFn?: string | undefined;
}>;
export type LoreScanConfig = z.infer<typeof LoreScanConfigSchema>;
/** Internal state machine phase during a lore scan pass. */
export declare const ScanStateSchema: z.ZodEnum<["NONE", "INITIAL", "RECURSION", "MIN_ACTIVATIONS"]>;
export type ScanState = z.infer<typeof ScanStateSchema>;
/**
 * A single entry in the activation chain, recording which depth level an entry
 * was activated at and which keyword triggered it.
 */
export interface ActivationChainEntry {
    /** Depth level: 0 = initial scan, 1 = first recursion, etc. */
    depth: number;
    /** UID of the activated entry. */
    entryUid: number;
    /** The keyword that triggered activation, or "constant" for constant entries. */
    triggeredBy: string;
}
/**
 * Result returned by a lore scan: the entries that activated, the joined
 * injected content, the token budget consumed, whether the budget overflowed,
 * and the activation chain showing how entries were triggered recursively.
 */
export interface LoreScanResult {
    activatedEntries: LoreEntry[];
    injectedContent: string;
    tokenUsage: number;
    overflow: boolean;
    /** Ordered list of activation events showing the recursive trigger chain. */
    activationChain: ActivationChainEntry[];
}
//# sourceMappingURL=types.d.ts.map