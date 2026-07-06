export const BASE_URL = "/api";

/**
 * Convert a WebDAV or internal image URL to go through the API proxy.
 * This allows the browser to load images from internal WebDAV servers
 * (e.g. http://192.168.x.x:port/dav/...) without exposing them publicly.
 *
 * - URLs that are already relative (/api/...) are left as-is.
 * - data: URLs are left as-is.
 * - All other http(s) URLs are proxied through /api/proxy/image?url=...
 */
export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/")) return url;
  if (!/^https?:\/\//.test(url)) return url;
  return `${BASE_URL}/proxy/image?url=${encodeURIComponent(url)}`;
}

/**
 * Extract an error message from a non-OK HTTP response.
 * Tries to read `{ error }`, `{ message }`, or `{ msg }` from a JSON body;
 * falls back to the raw response text, then to a generic status-code message.
 */
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (text) {
      try {
        const body = JSON.parse(text) as {
          error?: string;
          message?: string;
          msg?: string;
        };
        if (body.error) return body.error;
        if (body.message) return body.message;
        if (body.msg) return body.msg;
      } catch {
        // Body is not JSON — return the raw text if non-empty.
        const trimmed = text.trim();
        if (trimmed) return trimmed;
      }
    }
  } catch {
    // Cannot read response body — fall back to status message.
  }
  return `API error: ${res.status}`;
}

/** Safely parse the response body as JSON. Returns null for empty bodies
 *  (e.g. 204 No Content) so that DELETE and other void endpoints don't
 *  throw SyntaxError on res.json(). */
async function parseBody<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text || text.trim() === "") return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API error: ${res.status} (invalid JSON response: ${text.slice(0, 200)})`);
  }
}

/** Default per-request timeout (30s). SSE/streaming endpoints bypass this. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Combine an optional caller-provided AbortSignal with a default timeout.
 * Uses AbortSignal.timeout + AbortSignal.any (supported in modern Chromium /
 * Electron). If the caller's signal is already aborted, that is propagated.
 */
function withTimeout(signal?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeoutSignal;
  return AbortSignal.any([signal, timeoutSignal]);
}

/**
 * Core fetch wrapper with a default 30s timeout and a single retry on
 * transient failures (network errors and 5xx server errors). Non-retryable
 * errors (4xx) and timeouts are surfaced immediately.
 *
 * NOTE: A single retry on 5xx is also applied to POST/PUT. Most TavernOS
 * write endpoints are effectively idempotent (create-if-absent / overwrite),
 * so the risk of duplicate side effects is low. If a non-idempotent endpoint
 * is added, it should pass an explicit signal and handle retries itself.
 */
async function request(
  path: string,
  init: RequestInit = {},
  retries = 1,
): Promise<Response> {
  const signal = withTimeout(init.signal as AbortSignal | undefined);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, signal });
  } catch (e) {
    // Network error or timeout — the request likely never completed. Retry
    // once if attempts remain, otherwise rethrow.
    if (retries > 0) return request(path, init, retries - 1);
    throw e;
  }
  // Retry once on 5xx (server-side) errors; 4xx are not retried.
  if (res.status >= 500 && retries > 0) return request(path, init, retries - 1);
  return res;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await request(path, { signal });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return (await parseBody<T>(res)) ?? ({} as T);
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return (await parseBody<T>(res)) ?? ({} as T);
}

export async function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return (await parseBody<T>(res)) ?? ({} as T);
}

export async function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await request(path, { method: "DELETE", signal });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return (await parseBody<T>(res)) ?? ({} as T);
}

/** Upload a file via multipart/form-data POST. */
export async function apiUpload<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
  const res = await request(path, {
    method: "POST",
    body: formData,
    signal,
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return (await parseBody<T>(res)) ?? ({} as T);
}

/**
 * Consume a POST-based SSE stream via fetch ReadableStream.
 * Parses "data:" lines as JSON and invokes onEvent for each event.
 *
 * Pass an AbortSignal to allow cancelling the stream (e.g. when the calling
 * component unmounts). When aborted, the fetch rejects with an AbortError and
 * the loop exits.
 */
export async function streamSsePost<T>(
  url: string,
  body: unknown,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new Error(await extractErrorMessage(res));
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          try {
            onEvent(JSON.parse(jsonStr) as T);
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }
  }
}
