import type { LLMResponse, OnStreamProgress } from "./types.js";
/**
 * Parse an SSE stream from an OpenAI-compatible chat completion endpoint.
 *
 * Reads the ReadableStream chunk-by-chunk, extracts `data:` lines, parses
 * JSON chunks, accumulates content deltas, and tracks usage information.
 *
 * Robustness features:
 * - Handles both "data: " and "data:" SSE formats
 * - Captures raw bytes for diagnosis when no content is received
 * - Detects JSON error bodies masquerading as SSE
 * - Logs first malformed chunks for provider compatibility debugging
 *
 * @param body    - The ReadableStream from the fetch response.
 * @param onProgress - Optional periodic progress callback (every 30s by default).
 * @param onChunk - Optional per-delta callback for real-time character streaming.
 * @throws {PartialResponseError} When the stream completes but no content was received.
 */
export declare function parseStreamResponse(body: ReadableStream<Uint8Array>, onProgress?: OnStreamProgress, onChunk?: (delta: string) => void): Promise<LLMResponse>;
/**
 * Parse an SSE stream from an Anthropic Messages API endpoint.
 *
 * Anthropic streaming events use a typed `event:` + `data:` format:
 *   - `content_block_delta` with `delta.text` — incremental text
 *   - `message_start` / `message_delta` — carries usage info
 *   - `message_stop` — end of stream
 *
 * @param body    - The ReadableStream from the fetch response.
 * @param onProgress - Optional periodic progress callback.
 * @param onChunk - Optional per-delta callback for real-time character streaming.
 * @throws {PartialResponseError} When the stream completes but no content was received.
 */
export declare function parseAnthropicStreamResponse(body: ReadableStream<Uint8Array>, onProgress?: OnStreamProgress, onChunk?: (delta: string) => void): Promise<LLMResponse>;
//# sourceMappingURL=stream-parser.d.ts.map