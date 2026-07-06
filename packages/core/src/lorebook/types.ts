// packages/core/src/lorebook/types.ts
// Lorebook type definitions.
//
// Schemas mirror the industry-standard lorebook entry/config shape so that
// imported lorebook JSON can be validated directly against Zod schemas.
import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Selective logic modes controlling how primary/secondary keys are combined. */
export const SelectiveLogicSchema = z.enum([
  "AND_ANY",
  "NOT_ALL",
  "NOT_ANY",
  "AND_ALL",
]);
export type SelectiveLogic = z.infer<typeof SelectiveLogicSchema>;

/** Insertion positions for an entry relative to defined anchors. */
export const InsertionPositionSchema = z.enum([
  "before",
  "after",
  "ANTop",
  "ANBottom",
  "atDepth",
  "EMTop",
  "EMBottom",
  "outlet",
]);
export type InsertionPosition = z.infer<typeof InsertionPositionSchema>;

/** Role under which an entry's content is injected into the chat. */
export const MessageRoleSchema = z.enum(["system", "user", "assistant"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

// ---------------------------------------------------------------------------
// Lore Entry
// ---------------------------------------------------------------------------

/**
 * A single lorebook entry. Field names and defaults follow the industry-standard
 * lorebook format so that imported JSON round-trips losslessly.
 */
export const LoreEntrySchema = z.object({
  uid: z.number(),
  key: z.array(z.string()),
  keysecondary: z.array(z.string()).default([]),
  comment: z.string().default(""),
  content: z.string().default(""),
  constant: z.boolean().default(false),
  selective: z.boolean().default(true),
  selectiveLogic: SelectiveLogicSchema.default("AND_ANY"),
  order: z.number().default(100),
  position: InsertionPositionSchema.default("before"),
  disable: z.boolean().default(false),
  ignoreBudget: z.boolean().default(false),
  excludeRecursion: z.boolean().default(false),
  preventRecursion: z.boolean().default(false),
  probability: z.number().default(100),
  useProbability: z.boolean().default(false),
  depth: z.number().default(4),
  role: MessageRoleSchema.default("system"),
  group: z.string().default(""),
  groupWeight: z.number().default(100),
  matchWholeWords: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
  automationId: z.string().default(""),
  sticky: z.number().default(0),
  cooldown: z.number().default(0),
  delay: z.number().default(0),
});
export type LoreEntry = z.infer<typeof LoreEntrySchema>;

// ---------------------------------------------------------------------------
// Lore Scan Config
// ---------------------------------------------------------------------------

/** Lore scan configuration applied to a lorebook during activation. */
export const LoreScanConfigSchema = z.object({
  recursionEnabled: z.boolean().default(false),
  maxRecursionSteps: z.number().default(0),
  scanDepth: z.number().default(2),
  /** Recursive keyword activation depth (0=disabled, 1=one level, max 5). Takes precedence over legacy recursionEnabled/maxRecursionSteps. */
  recursionDepth: z.number().min(0).max(5).default(1),
  budgetPercentage: z.number().default(25),
  budgetCap: z.number().default(0),
  minActivations: z.number().default(0),
  sortFn: z.string().default("order"),
});
export type LoreScanConfig = z.infer<typeof LoreScanConfigSchema>;

// ---------------------------------------------------------------------------
// Scan State & Result
// ---------------------------------------------------------------------------

/** Internal state machine phase during a lore scan pass. */
export const ScanStateSchema = z.enum([
  "NONE",
  "INITIAL",
  "RECURSION",
  "MIN_ACTIVATIONS",
]);
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
