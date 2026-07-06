import type { LLMClient } from "../llm/client.js";
import type { LLMMessage, LLMResponse, OnStreamProgress } from "../llm/types.js";
/**
 * Normalize any thrown value into a descriptive string message.
 *
 * Agents and their dependencies are expected to throw `Error` instances.
 * This helper gives the upper-layer catch sites a single, consistent way to
 * extract a human-readable message regardless of what was actually thrown
 * (defensively handling string/object throws so a non-`Error` value never
 * surfaces as `"[object Object]"` or `undefined`). Use it in every catch
 * that logs or reports an agent error.
 */
export declare function toErrorMessage(error: unknown): string;
export interface AgentContext {
    readonly client: LLMClient;
    readonly model: string;
    readonly projectRoot: string;
    readonly bookId?: string;
    readonly onStreamProgress?: OnStreamProgress;
}
export interface AgentChatOptions {
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly signal?: AbortSignal;
    /** 单次 LLM 请求超时（毫秒）。未传时不设超时（无默认值），仅当调用方显式传入时生效。 */
    readonly timeoutMs?: number;
}
/**
 * Shared chat capabilities composed into every agent.
 * Replaces the former BaseAgent abstract class with a factory-produced
 * runtime object so agents compose behavior instead of inheriting it.
 */
export interface AgentRuntime {
    /** The originating context (read-only). */
    readonly ctx: AgentContext;
    /** Send a chat completion using the agent's default model. */
    chat(messages: ReadonlyArray<LLMMessage>, options?: AgentChatOptions): Promise<LLMResponse>;
    /** Send a chat completion using an explicit model override. */
    chatWithModel(model: string, messages: ReadonlyArray<LLMMessage>, options?: AgentChatOptions): Promise<LLMResponse>;
}
/**
 * Factory: produce the shared agent runtime from a context.
 * Agents call this internally and compose the returned helpers,
 * removing the need for a base class hierarchy.
 */
export declare function createAgentRuntime(ctx: AgentContext): AgentRuntime;
//# sourceMappingURL=base.d.ts.map