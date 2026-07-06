export { TAVERNOS_USER_AGENT } from "../shared/http.js";
export declare const TRANSIENT_RETRIES = 2;
export declare const TRANSIENT_RETRY_DELAY_MS = 1000;
/** Default timeout for LLM API calls (2 minutes). */
export declare const DEFAULT_LLM_TIMEOUT_MS = 120000;
export interface OpenAIChatResponse {
    choices: Array<{
        message?: {
            content?: string;
        };
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface OpenAIStreamChunk {
    choices: Array<{
        delta?: {
            content?: string;
        };
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface AnthropicMessagesResponse {
    content: Array<{
        type: "text" | "tool_use" | "thinking";
        text?: string;
    }>;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
    model?: string;
    role?: string;
    stop_reason?: string;
}
export interface AnthropicStreamEvent {
    type: string;
    delta?: {
        type?: string;
        text?: string;
    };
    content_block?: {
        type: string;
        text?: string;
    };
    message?: {
        usage?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}
//# sourceMappingURL=client-types.d.ts.map