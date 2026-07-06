/**
 * Execute an async function with transient retry on failure.
 *
 * Retries on generic errors (network timeouts, 5xx responses) but immediately
 * re-throws non-retriable errors:
 * - PartialResponseError: streaming produced no content (compatibility issue)
 * - ContextWindowExceededError: input too long for the model
 * - AbortError: the caller aborted the request (user-initiated cancel)
 * - LLMTimeoutError: request exceeded the configured timeout (will NOT retry)
 *
 * Uses exponential backoff with jitter: delay = base * 2^attempt + random(0, base).
 * This prevents thundering herd when multiple clients retry simultaneously.
 *
 * @param fn      - The async function to execute.
 * @param retries - Maximum number of retry attempts (default from TRANSIENT_RETRIES).
 * @throws {LLMRetryExhaustedError} When all attempts fail.
 */
export declare function withTransientRetry<T>(fn: () => Promise<T>, retries?: number): Promise<T>;
/** Promise-based sleep helper. */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=retry.d.ts.map