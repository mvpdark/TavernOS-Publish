// appHttpClient.ts — Adapted for TavernOS API client
// Bridges Kaka Studio's HTTP function signatures to TavernOS api/client.

import {
  apiGet as tavernosGet,
  apiPost as tavernosPost,
  apiPut as tavernosPut,
  apiDelete as tavernosDelete,
  apiUpload as tavernosUpload,
  BASE_URL,
} from "../../api/client.js";

export { BASE_URL };

/**
 * Parse JSON response with Kaka Studio compatible error handling.
 * Strips /api prefix if present, then delegates to TavernOS client.
 */
export async function requestJson<T = unknown>(
  url: string,
  init?: RequestInit,
  _errorMessage?: string,
): Promise<T> {
  const path = url.startsWith("/api") ? url.slice(4) : url;
  const method = init?.method?.toUpperCase() ?? "GET";

  if (method === "GET") {
    return tavernosGet<T>(path, init?.signal ?? undefined);
  }
  if (method === "POST") {
    const body = init?.body
      ? typeof init.body === "string"
        ? JSON.parse(init.body)
        : init.body
      : undefined;
    return tavernosPost<T>(path, body, init?.signal ?? undefined);
  }
  if (method === "PUT") {
    const body = init?.body
      ? typeof init.body === "string"
        ? JSON.parse(init.body)
        : init.body
      : undefined;
    return tavernosPut<T>(path, body, init?.signal ?? undefined);
  }
  if (method === "DELETE") {
    return tavernosDelete<T>(path, init?.signal ?? undefined);
  }
  if (method === "PATCH") {
    // TavernOS client doesn't have apiPatch, use raw fetch with /api prefix
    const fullUrl = url.startsWith("/api") ? url : `${BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!response.ok) {
      throw new Error(await readResponseErrorMessage(response));
    }
    return response.json() as Promise<T>;
  }

  // Fallback
  const fullUrl = url.startsWith("/api") ? url : `${BASE_URL}${url}`;
  const response = await fetch(fullUrl, init);
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

/**
 * Check response is OK. Returns the raw Response for backward compat.
 * Uses fetch with /api prefix normalization.
 */
export async function requestOk(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const fullUrl = url.startsWith("/api") ? url : `${BASE_URL}${url}`;
  const response = await fetch(fullUrl, init);
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response));
  }
  return response;
}

/**
 * Fetch a blob. Returns both the blob and the response (for header access).
 * Uses fetch with /api prefix normalization.
 */
export async function requestBlob(
  url: string,
  init?: RequestInit,
  _errorMessage?: string,
): Promise<{ blob: Blob; response: Response }> {
  const fullUrl = url.startsWith("/api") ? url : `${BASE_URL}${url}`;
  const response = await fetch(fullUrl, init);
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response));
  }
  return { blob: await response.blob(), response };
}

/**
 * Extract error message from a Response object.
 */
export async function readResponseErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return (
        json.error ||
        json.message ||
        json.msg ||
        text ||
        `HTTP ${response.status}`
      );
    } catch {
      return text || `HTTP ${response.status}`;
    }
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Upload multipart form data.
 */
export async function requestUpload<T = unknown>(
  url: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  const path = url.startsWith("/api") ? url.slice(4) : url;
  return tavernosUpload<T>(path, formData, signal);
}
