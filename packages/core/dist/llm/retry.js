// Transient retry utility for LLM API calls.
// Pure retry logic — wraps an async function with exponential backoff + jitter.
// Independently unit-testable with no dependency on the client factory.
import { PartialResponseError, LLMRetryExhaustedError, LLMTimeoutError } from "./errors.js";
import { TRANSIENT_RETRIES, TRANSIENT_RETRY_DELAY_MS } from "./client-types.js";
/**
 * Detect an abort/cancel error thrown by `fetch` when an AbortSignal fires.
 *
 * `fetch` rejects with a `DOMException` whose `name` is `"AbortError"` when its
 * signal is aborted. `DOMException` extends `Error` in modern runtimes, so a
 * plain `name` check is sufficient and also covers any other `Error` subclass
 * that follows the `"AbortError"` name convention. These are intentional,
 * user-initiated cancellations — they must never be retried.
 */
function isAbortError(error) {
    return error instanceof Error && error.name === "AbortError";
}
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
export async function withTransientRetry(fn, retries = TRANSIENT_RETRIES) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            // Don't retry on partial response or context window errors
            if (error instanceof PartialResponseError)
                throw error;
            if (error instanceof Error && error.name === "ContextWindowExceededError")
                throw error;
            // Don't retry on user-initiated abort — it is an intentional cancel,
            // not a transient failure, so retrying would fight the caller's wish.
            if (isAbortError(error))
                throw error;
            // Don't retry on timeout — a timeout means the request is already
            // expensive/slow; retrying would multiply the cost and likely time out
            // again. The caller should handle a single timeout explicitly.
            if (error instanceof LLMTimeoutError)
                throw error;
            lastError = error;
            if (attempt < retries) {
                // Exponential backoff with full jitter: base * 2^attempt + random(0, base)
                const delay = TRANSIENT_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * TRANSIENT_RETRY_DELAY_MS;
                await sleep(delay);
            }
        }
    }
    throw new LLMRetryExhaustedError(`LLM request failed after ${retries + 1} attempts`, lastError, retries + 1);
}
/** Promise-based sleep helper. */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map