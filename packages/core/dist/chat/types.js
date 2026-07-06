// Group chat / multi-character module: types and Zod schemas.
//
// Supports SillyTavern-style group chats where multiple characters
// participate in a single conversation, each speaking in turn using
// their own persona card system prompt.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Speaking order
// ---------------------------------------------------------------------------
export const GroupChatOrderSchema = z.enum([
    "fixed",
    "round-robin",
    "random",
]);
// ---------------------------------------------------------------------------
// Group chat config
// ---------------------------------------------------------------------------
export const GroupChatConfigSchema = z.object({
    /** Member identifiers (persona card filenames or ids). Order matters for fixed/round-robin. */
    memberIds: z.array(z.string().min(1)).min(1),
    /** Speaking order strategy. */
    order: GroupChatOrderSchema.default("fixed"),
    /** Number of consecutive turns a single member speaks before yielding (default 1). */
    turnInterval: z.number().int().min(1).max(10).default(1),
    /** Optional scene / scenario text injected into every member's context. */
    scenario: z.string().default(""),
});
// ---------------------------------------------------------------------------
// Group chat message
// ---------------------------------------------------------------------------
export const GroupChatMessageSchema = z.object({
    /** The member id that produced this message, or "__user__" for human input. */
    memberId: z.string(),
    /** Display name of the speaker (character name or "用户"). */
    memberName: z.string(),
    /** Message role for LLM context building. */
    role: z.enum(["character", "user"]),
    /** Message body. */
    content: z.string(),
    /** Unix timestamp (ms). */
    timestamp: z.number().int(),
});
// ---------------------------------------------------------------------------
// Group chat session (serializable snapshot)
// ---------------------------------------------------------------------------
export const GroupChatSessionSchema = z.object({
    id: z.string(),
    config: GroupChatConfigSchema,
    /** Display names keyed by memberId (resolved from persona cards). */
    memberNames: z.record(z.string(), z.string()),
    messages: z.array(GroupChatMessageSchema).default([]),
    /** Index into config.memberIds for the next speaker (fixed/round-robin). */
    currentTurnIndex: z.number().int().min(0).default(0),
    /** How many consecutive turns the current speaker has used. */
    currentTurnCount: z.number().int().min(0).default(0),
    /** Total number of completed turns. */
    turnCount: z.number().int().min(0).default(0),
    /** Member id of the last speaker (for random order dedup). */
    lastSpeakerId: z.string().optional(),
});
//# sourceMappingURL=types.js.map