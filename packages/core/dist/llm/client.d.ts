import type { LLMConfig } from "../models/project.js";
import type { LLMMessage, LLMResponse, ChatOptions } from "./types.js";
export { normalizeApiUrl } from "../shared/http.js";
export interface LLMClient {
    readonly provider: "openai" | "anthropic";
    readonly service: string;
    readonly apiFormat: "chat" | "responses" | "messages";
    readonly stream: boolean;
    readonly baseUrl: string;
    readonly defaults: {
        readonly temperature: number;
        readonly maxTokens: number;
        readonly thinkingBudget: number;
        readonly extra: Readonly<Record<string, unknown>>;
    };
    /**
     * Execute a chat completion.
     * Handles stub mode, context window guard, temperature clamping,
     * streaming, retries, and partial response detection.
     */
    readonly chat: (model: string, messages: ReadonlyArray<LLMMessage>, options?: ChatOptions) => Promise<LLMResponse>;
}
export declare function createLLMClient(config: LLMConfig): LLMClient;
export declare function chatCompletion(config: LLMConfig, model: string, messages: ReadonlyArray<LLMMessage>, options?: ChatOptions): Promise<LLMResponse>;
//# sourceMappingURL=client.d.ts.map