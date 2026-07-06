import { z } from "zod";
export declare const GroupChatOrderSchema: z.ZodEnum<["fixed", "round-robin", "random"]>;
export type GroupChatOrder = z.infer<typeof GroupChatOrderSchema>;
export declare const GroupChatConfigSchema: z.ZodObject<{
    /** Member identifiers (persona card filenames or ids). Order matters for fixed/round-robin. */
    memberIds: z.ZodArray<z.ZodString, "many">;
    /** Speaking order strategy. */
    order: z.ZodDefault<z.ZodEnum<["fixed", "round-robin", "random"]>>;
    /** Number of consecutive turns a single member speaks before yielding (default 1). */
    turnInterval: z.ZodDefault<z.ZodNumber>;
    /** Optional scene / scenario text injected into every member's context. */
    scenario: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    scenario: string;
    order: "fixed" | "round-robin" | "random";
    memberIds: string[];
    turnInterval: number;
}, {
    memberIds: string[];
    scenario?: string | undefined;
    order?: "fixed" | "round-robin" | "random" | undefined;
    turnInterval?: number | undefined;
}>;
export type GroupChatConfig = z.infer<typeof GroupChatConfigSchema>;
export declare const GroupChatMessageSchema: z.ZodObject<{
    /** The member id that produced this message, or "__user__" for human input. */
    memberId: z.ZodString;
    /** Display name of the speaker (character name or "用户"). */
    memberName: z.ZodString;
    /** Message role for LLM context building. */
    role: z.ZodEnum<["character", "user"]>;
    /** Message body. */
    content: z.ZodString;
    /** Unix timestamp (ms). */
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    content: string;
    timestamp: number;
    role: "user" | "character";
    memberId: string;
    memberName: string;
}, {
    content: string;
    timestamp: number;
    role: "user" | "character";
    memberId: string;
    memberName: string;
}>;
export type GroupChatMessage = z.infer<typeof GroupChatMessageSchema>;
export declare const GroupChatSessionSchema: z.ZodObject<{
    id: z.ZodString;
    config: z.ZodObject<{
        /** Member identifiers (persona card filenames or ids). Order matters for fixed/round-robin. */
        memberIds: z.ZodArray<z.ZodString, "many">;
        /** Speaking order strategy. */
        order: z.ZodDefault<z.ZodEnum<["fixed", "round-robin", "random"]>>;
        /** Number of consecutive turns a single member speaks before yielding (default 1). */
        turnInterval: z.ZodDefault<z.ZodNumber>;
        /** Optional scene / scenario text injected into every member's context. */
        scenario: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        scenario: string;
        order: "fixed" | "round-robin" | "random";
        memberIds: string[];
        turnInterval: number;
    }, {
        memberIds: string[];
        scenario?: string | undefined;
        order?: "fixed" | "round-robin" | "random" | undefined;
        turnInterval?: number | undefined;
    }>;
    /** Display names keyed by memberId (resolved from persona cards). */
    memberNames: z.ZodRecord<z.ZodString, z.ZodString>;
    messages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** The member id that produced this message, or "__user__" for human input. */
        memberId: z.ZodString;
        /** Display name of the speaker (character name or "用户"). */
        memberName: z.ZodString;
        /** Message role for LLM context building. */
        role: z.ZodEnum<["character", "user"]>;
        /** Message body. */
        content: z.ZodString;
        /** Unix timestamp (ms). */
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        content: string;
        timestamp: number;
        role: "user" | "character";
        memberId: string;
        memberName: string;
    }, {
        content: string;
        timestamp: number;
        role: "user" | "character";
        memberId: string;
        memberName: string;
    }>, "many">>;
    /** Index into config.memberIds for the next speaker (fixed/round-robin). */
    currentTurnIndex: z.ZodDefault<z.ZodNumber>;
    /** How many consecutive turns the current speaker has used. */
    currentTurnCount: z.ZodDefault<z.ZodNumber>;
    /** Total number of completed turns. */
    turnCount: z.ZodDefault<z.ZodNumber>;
    /** Member id of the last speaker (for random order dedup). */
    lastSpeakerId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    config: {
        scenario: string;
        order: "fixed" | "round-robin" | "random";
        memberIds: string[];
        turnInterval: number;
    };
    messages: {
        content: string;
        timestamp: number;
        role: "user" | "character";
        memberId: string;
        memberName: string;
    }[];
    memberNames: Record<string, string>;
    currentTurnIndex: number;
    currentTurnCount: number;
    turnCount: number;
    lastSpeakerId?: string | undefined;
}, {
    id: string;
    config: {
        memberIds: string[];
        scenario?: string | undefined;
        order?: "fixed" | "round-robin" | "random" | undefined;
        turnInterval?: number | undefined;
    };
    memberNames: Record<string, string>;
    messages?: {
        content: string;
        timestamp: number;
        role: "user" | "character";
        memberId: string;
        memberName: string;
    }[] | undefined;
    currentTurnIndex?: number | undefined;
    currentTurnCount?: number | undefined;
    turnCount?: number | undefined;
    lastSpeakerId?: string | undefined;
}>;
export type GroupChatSession = z.infer<typeof GroupChatSessionSchema>;
export interface GroupChatTurnResult {
    /** The generated message. */
    readonly message: GroupChatMessage;
    /** The session snapshot after the turn (immutable copy). */
    readonly session: GroupChatSession;
    /** Token usage from the LLM call. */
    readonly usage?: {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
    };
}
//# sourceMappingURL=types.d.ts.map