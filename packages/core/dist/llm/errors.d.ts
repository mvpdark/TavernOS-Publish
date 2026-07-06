/**
 * Thrown when a streaming response is interrupted before completion.
 * The partial content is preserved for diagnostic purposes only —
 * it must NEVER be written to disk as a successful chapter.
 */
export declare class PartialResponseError extends Error {
    readonly partialContent: string;
    constructor(message: string, partialContent: string);
}
/**
 * Thrown when the estimated input tokens exceed the model's context window
 * after reserving space for the output. Semantic text is NEVER silently
 * truncated — the caller must explicitly reduce the input.
 */
export declare class ContextWindowExceededError extends Error {
    readonly estimatedInputTokens: number;
    readonly contextWindow: number;
    readonly reservedOutput: number;
    constructor(message: string, estimatedInputTokens: number, contextWindow: number, reservedOutput: number);
}
/**
 * Thrown when a model/service mismatch is detected (e.g., using a Kimi model
 * with a Google service endpoint).
 */
export declare class ModelServiceMismatchError extends Error {
    readonly service: string;
    readonly model: string;
    constructor(service: string, model: string);
}
/**
 * Thrown when all transient retry attempts are exhausted.
 */
export declare class LLMRetryExhaustedError extends Error {
    readonly lastError: unknown;
    readonly attempts: number;
    constructor(message: string, lastError: unknown, attempts: number);
}
/**
 * Thrown when an LLM API call exceeds the configured timeout.
 * The call is aborted via AbortController to prevent indefinite hangs.
 */
export declare class LLMTimeoutError extends Error {
    readonly timeoutMs: number;
    constructor(message: string, timeoutMs: number);
}
//# sourceMappingURL=errors.d.ts.map