export interface LLMMessage {
    readonly role: "system" | "user" | "assistant";
    readonly content: string;
}
export interface LLMResponse {
    readonly content: string;
    readonly usage: {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
    };
}
export interface StreamProgress {
    readonly elapsedMs: number;
    readonly totalChars: number;
    readonly chineseChars: number;
    readonly status: "streaming" | "done";
}
export type OnStreamProgress = (progress: StreamProgress) => void;
export interface ChatOptions {
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly onStreamProgress?: OnStreamProgress;
    /** Called for every text delta received during streaming. */
    readonly onChunk?: (delta: string) => void;
    readonly signal?: AbortSignal;
    /** Per-request timeout in milliseconds. No default timeout — set explicitly if needed. */
    readonly timeoutMs?: number;
}
export declare function createStreamTracker(onProgress?: OnStreamProgress, intervalMs?: number): {
    readonly onChunk: (text: string) => void;
    readonly stop: () => void;
};
//# sourceMappingURL=types.d.ts.map