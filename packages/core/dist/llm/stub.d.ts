import type { LLMMessage, LLMResponse, ChatOptions } from "./types.js";
export declare function isLlmStubEnabled(): boolean;
/**
 * Generate a deterministic response based on the input messages.
 * This does NOT call any API — it produces predictable output for testing.
 */
export declare function stubChatCompletion(messages: ReadonlyArray<LLMMessage>, _options?: ChatOptions): LLMResponse;
//# sourceMappingURL=stub.d.ts.map