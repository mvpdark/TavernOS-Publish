// Shared HTTP utilities used by all API client modules (LLM, image, TTS, video).
//
// Extracted from inline duplications across llm/client.ts, image/client.ts,
// tts/client.ts, video/client.ts, and video/poller.ts to eliminate repeated
// header construction, error handling, URL normalisation, and the
// TAVERNOS_USER_AGENT constant.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** User-Agent string sent with every TavernOS API request. */
const VERSION: string = (() => {
  try {
    // Only read package.json in Node.js environments. Use a dynamic require
    // hidden from bundlers' static analysis to avoid browser build errors.
    // eslint-disable-next-line no-new-func
    const nodeRequire = new Function("return require")() as NodeRequire;
    const { readFileSync } = nodeRequire("node:fs");
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    // Fallback when package.json cannot be read (browser/bundled/packaged env).
    return "0.0.0";
  }
})();
export const TAVERNOS_USER_AGENT = `TavernOS/${VERSION}`;

// ---------------------------------------------------------------------------
// URL normalisation
// ---------------------------------------------------------------------------

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
export function normalizeApiUrl(baseUrl: string, endpoint: string): string {
  // 1. Strip trailing slashes from baseUrl
  const base = baseUrl.replace(/\/+$/, "");
  // 2. Ensure endpoint starts with /
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // 3. Join
  let url = `${base}${path}`;
  // 4. Collapse consecutive slashes, but preserve ://
  url = url.replace(/(https?:)\/{2,}/g, "$1//").replace(/([^:])\/{2,}/g, "$1/");
  // 5. Deduplicate repeated path segments (e.g. /v1/v1/ → /v1/, /v1beta/v1beta/ → /v1beta/)
  //    Loop to handle 3+ repeats (e.g. /v1/v1/v1/ → /v1/)
  let prev: string;
  do {
    prev = url;
    url = url.replace(/\/(v1(?:beta)?)\/\1(\/)/g, "/$1$2");
  } while (url !== prev);
  // 6. Strip trailing slash (but not from protocol ://)
  url = url.replace(/([^:])\/$/, "$1");
  return url;
}

// ---------------------------------------------------------------------------
// Header construction
// ---------------------------------------------------------------------------

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
export function buildHeaders(
  apiKey?: string,
  options?: { json?: boolean; extra?: Record<string, string> },
): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": TAVERNOS_USER_AGENT,
  };
  if (options?.json !== false) {
    headers["Content-Type"] = "application/json";
  }
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  if (options?.extra) {
    Object.assign(headers, options.extra);
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/**
 * Read the error body from a non-OK HTTP response and throw a standardised
 * `Error`. The promise always rejects — the return type `never` communicates
 * this to the compiler.
 *
 * @param response - The `fetch` Response whose `ok` is `false`.
 * @param label - Human-readable label for the error message (e.g. `"LLM API"`).
 * @throws `Error` with message `${label} error ${status}: ${errorText || statusText}`.
 */
export async function throwApiError(
  response: Response,
  label: string,
): Promise<never> {
  const errorText = await response.text().catch(() => "");
  throw new Error(
    `${label} error ${response.status}: ${errorText || response.statusText}`,
  );
}
