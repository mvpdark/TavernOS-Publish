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
export function toErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "string")
        return error;
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
/** Build the ChatOptions payload shared by both chat helpers. */
function buildChatOptions(ctx, options) {
    return {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        onStreamProgress: ctx.onStreamProgress,
        signal: options?.signal,
        // Project rule: LLM calls should NOT have a default timeout. Only apply a
        // timeout when the caller explicitly provides one.
        timeoutMs: options?.timeoutMs,
    };
}
/**
 * Factory: produce the shared agent runtime from a context.
 * Agents call this internally and compose the returned helpers,
 * removing the need for a base class hierarchy.
 */
export function createAgentRuntime(ctx) {
    const chat = (messages, options) => ctx.client.chat(ctx.model, messages, buildChatOptions(ctx, options));
    const chatWithModel = (model, messages, options) => ctx.client.chat(model, messages, buildChatOptions(ctx, options));
    return { ctx, chat, chatWithModel };
}
//# sourceMappingURL=base.js.map