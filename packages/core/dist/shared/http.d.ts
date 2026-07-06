export declare const TAVERNOS_USER_AGENT: string;
/**
 * Normalize a URL by combining baseUrl and endpoint path, then fixing common issues:
 * - Remove trailing slashes from baseUrl
 * - Ensure endpoint starts with /
 * - Collapse consecutive slashes (//) into single / (preserving ://)
 * - Deduplicate repeated /v1 segments (e.g. /v1/v1/ → /v1/)
 * - Deduplicate repeated /v1beta segments
 *
 * This allows users to enter baseUrl with or without trailing slashes or /v1
 * and still get a correct API URL.
 */
export declare function normalizeApiUrl(baseUrl: string, endpoint: string): string;
/**
 * Build standard HTTP headers for API requests.
 *
 * @param apiKey - Optional API key. When provided, an `Authorization: Bearer` header is added.
 * @param options - Optional configuration:
 *   - `json` (default `true`): When `true`, includes `Content-Type: application/json`.
 *     Set to `false` for GET requests that send no body.
 *   - `extra`: Additional headers to merge in (overrides defaults on conflict).
 * @returns A `Record<string, string>` of HTTP headers.
 */
export declare function buildHeaders(apiKey?: string, options?: {
    json?: boolean;
    extra?: Record<string, string>;
}): Record<string, string>;
/**
 * Read the error body from a non-OK HTTP response and throw a standardised
 * `Error`. The promise always rejects — the return type `never` communicates
 * this to the compiler.
 *
 * @param response - The `fetch` Response whose `ok` is `false`.
 * @param label - Human-readable label for the error message (e.g. `"LLM API"`).
 * @throws `Error` with message `${label} error ${status}: ${errorText || statusText}`.
 */
export declare function throwApiError(response: Response, label: string): Promise<never>;
//# sourceMappingURL=http.d.ts.map