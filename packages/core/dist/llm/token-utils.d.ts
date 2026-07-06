/**
 * Approximate token count for a string.
 * CJK characters: ~1 token per character
 * Non-CJK: ~1 token per 4 characters
 */
export declare function approxTokens(text: string): number;
/**
 * Approximate total tokens for a list of messages.
 */
export declare function estimateMessagesTokens(messages: ReadonlyArray<{
    readonly role: string;
    readonly content: string;
}>): number;
export interface ContextWindowCheck {
    readonly inputTokens: number;
    readonly contextWindow: number;
    readonly reservedOutput: number;
    readonly available: number;
    readonly withinWindow: boolean;
}
/**
 * Check whether the input fits within the model's context window
 * after reserving space for the output.
 */
export declare function checkContextWindow(inputTokens: number, serviceName: string, modelName: string, reservedOutput?: number): ContextWindowCheck;
/**
 * Assert that the input fits within the context window.
 * Throws ContextWindowExceededError if not — never silently truncates.
 */
export declare function assertWithinContextWindow(inputTokens: number, serviceName: string, modelName: string, reservedOutput?: number): void;
/**
 * Clamp temperature for models that require a specific temperature.
 * E.g., Moonshot kimi-k2.5 requires temperature === 1.
 */
export declare function clampTemperatureForModel(serviceName: string, modelName: string, temperature: number): number;
//# sourceMappingURL=token-utils.d.ts.map