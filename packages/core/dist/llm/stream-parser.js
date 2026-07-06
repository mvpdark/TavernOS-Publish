// SSE stream parser for OpenAI-compatible chat completion streaming.
// Pure parsing logic — takes a ReadableStream + callbacks, returns LLMResponse.
// Independently unit-testable with no dependency on the client factory.
import { createStreamTracker } from "./types.js";
import { PartialResponseError } from "./errors.js";
/**
 * Extract the payload after an SSE field prefix.
 *
 * SSE spec allows "field: value" or "field:value" (space after colon is
 * optional). Some providers omit the space, so we handle both.
 */
function extractSSEData(line) {
    // Fast path: "data: " (most common, OpenAI standard)
    if (line.startsWith("data: "))
        return line.slice(6);
    // "data:" without space (some providers/proxies)
    if (line.startsWith("data:"))
        return line.slice(5);
    return null;
}
/**
 * Try to parse a JSON error body from a non-SSE response.
 *
 * Some providers return a JSON error (e.g. rate limit, auth failure) with
 * Content-Type: text/event-stream but no actual SSE data lines. Detecting
 * this lets us surface the real error instead of a generic "no content".
 */
function tryExtractJsonError(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed.startsWith("{"))
        return null;
    try {
        const obj = JSON.parse(trimmed);
        // OpenAI-style error: { "error": { "message": "..." } }
        const err = obj.error;
        if (err && typeof err === "object" && "message" in err) {
            return String(err.message ?? "");
        }
        // Direct message field
        if ("message" in obj && typeof obj.message === "string") {
            return obj.message;
        }
        // DeepSeek/Kimi style: { "error_msg": "..." }
        if ("error_msg" in obj)
            return String(obj.error_msg);
        // Generic: return the raw JSON (truncated)
        return trimmed.slice(0, 300);
    }
    catch {
        return null;
    }
}
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
export async function parseStreamResponse(body, onProgress, onChunk) {
    const tracker = createStreamTracker(onProgress);
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let usage;
    // Diagnostics: track malformed chunks and raw bytes for error messages.
    let malformedCount = 0;
    let firstMalformedRaw;
    let totalChunks = 0;
    // Capture raw bytes (first 2000 chars) to diagnose empty-body issues.
    // Without this, we can't tell if the provider returned an error JSON,
    // a different SSE format, or a truly empty body.
    let rawCapture = "";
    let rawCaptureFull = false;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const decoded = decoder.decode(value, { stream: true });
            buffer += decoded;
            // Capture raw bytes for diagnosis (only first 2000 chars)
            if (!rawCaptureFull) {
                rawCapture += decoded;
                if (rawCapture.length >= 2000) {
                    rawCapture = rawCapture.slice(0, 2000);
                    rawCaptureFull = true;
                }
            }
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const data = extractSSEData(trimmed);
                if (data === null)
                    continue;
                if (data === "[DONE]")
                    continue;
                totalChunks++;
                try {
                    const chunk = JSON.parse(data);
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) {
                        content += delta;
                        tracker.onChunk(delta);
                        onChunk?.(delta);
                    }
                    if (chunk.usage) {
                        usage = chunk.usage;
                    }
                }
                catch {
                    // Record malformed chunks for diagnostics — helps identify provider
                    // compatibility issues (e.g. unexpected SSE format from Grok/xAI).
                    malformedCount++;
                    if (!firstMalformedRaw)
                        firstMalformedRaw = data.slice(0, 300);
                    if (malformedCount <= 3) {
                        console.warn(`[stream-parser] malformed SSE chunk #${malformedCount}:`, data.slice(0, 200));
                    }
                }
            }
        }
    }
    finally {
        tracker.stop();
        await reader.cancel();
        reader.releaseLock();
    }
    // Process any remaining buffered data (last line without trailing \n)
    if (buffer.trim()) {
        const data = extractSSEData(buffer.trim());
        if (data && data !== "[DONE]") {
            totalChunks++;
            try {
                const chunk = JSON.parse(data);
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) {
                    content += delta;
                    tracker.onChunk(delta);
                    onChunk?.(delta);
                }
                if (chunk.usage) {
                    usage = chunk.usage;
                }
            }
            catch {
                malformedCount++;
                if (!firstMalformedRaw)
                    firstMalformedRaw = data.slice(0, 300);
            }
        }
    }
    // Partial response detection: if we got content but no completion signal
    if (!content) {
        // Try to detect if the provider returned a JSON error instead of SSE.
        const jsonError = tryExtractJsonError(rawCapture);
        let diag;
        if (totalChunks > 0) {
            diag = ` Received ${totalChunks} data chunks (${malformedCount} malformed). First raw chunk: ${firstMalformedRaw ?? "N/A"}`;
        }
        else if (jsonError) {
            diag = ` Received 0 data chunks. Response appears to be a JSON error: "${jsonError.slice(0, 200)}"`;
        }
        else if (rawCapture.length > 0) {
            diag = ` Received 0 data chunks. Raw response (first 500 chars): ${rawCapture.slice(0, 500)}`;
        }
        else {
            diag = " Received 0 data chunks — stream returned a truly empty body (0 bytes).";
        }
        throw new PartialResponseError(`Stream completed but no content was received.${diag}`, "");
    }
    return {
        content,
        usage: {
            promptTokens: usage?.prompt_tokens ?? 0,
            completionTokens: usage?.completion_tokens ?? 0,
            totalTokens: usage?.total_tokens ?? 0,
        },
    };
}
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
export async function parseAnthropicStreamResponse(body, onProgress, onChunk) {
    const tracker = createStreamTracker(onProgress);
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let malformedCount = 0;
    let firstMalformedRaw;
    let totalChunks = 0;
    let rawCapture = "";
    let rawCaptureFull = false;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const decoded = decoder.decode(value, { stream: true });
            buffer += decoded;
            if (!rawCaptureFull) {
                rawCapture += decoded;
                if (rawCapture.length >= 2000) {
                    rawCapture = rawCapture.slice(0, 2000);
                    rawCaptureFull = true;
                }
            }
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const data = extractSSEData(trimmed);
                if (data === null)
                    continue;
                if (data === "[DONE]")
                    continue;
                totalChunks++;
                try {
                    const event = JSON.parse(data);
                    // Extract text deltas from content_block_delta events.
                    if (event.type === "content_block_delta" && event.delta?.text) {
                        content += event.delta.text;
                        tracker.onChunk(event.delta.text);
                        onChunk?.(event.delta.text);
                    }
                    // Extract usage from message_start and message_delta events.
                    if (event.type === "message_start" && event.message?.usage) {
                        inputTokens = event.message.usage.input_tokens ?? 0;
                    }
                    if (event.type === "message_delta" && event.usage) {
                        outputTokens = event.usage.output_tokens ?? 0;
                    }
                }
                catch {
                    malformedCount++;
                    if (!firstMalformedRaw)
                        firstMalformedRaw = data.slice(0, 300);
                    if (malformedCount <= 3) {
                        console.warn(`[stream-parser] malformed Anthropic SSE chunk #${malformedCount}:`, data.slice(0, 200));
                    }
                }
            }
        }
    }
    finally {
        tracker.stop();
        await reader.cancel();
        reader.releaseLock();
    }
    // Process remaining buffer
    if (buffer.trim()) {
        const data = extractSSEData(buffer.trim());
        if (data && data !== "[DONE]") {
            totalChunks++;
            try {
                const event = JSON.parse(data);
                if (event.type === "content_block_delta" && event.delta?.text) {
                    content += event.delta.text;
                    tracker.onChunk(event.delta.text);
                    onChunk?.(event.delta.text);
                }
                if (event.type === "message_start" && event.message?.usage) {
                    inputTokens = event.message.usage.input_tokens ?? 0;
                }
                if (event.type === "message_delta" && event.usage) {
                    outputTokens = event.usage.output_tokens ?? 0;
                }
            }
            catch {
                malformedCount++;
            }
        }
    }
    if (!content) {
        const jsonError = tryExtractJsonError(rawCapture);
        let diag;
        if (totalChunks > 0) {
            diag = ` Received ${totalChunks} data chunks (${malformedCount} malformed). First raw chunk: ${firstMalformedRaw ?? "N/A"}`;
        }
        else if (jsonError) {
            diag = ` Received 0 data chunks. Response appears to be a JSON error: "${jsonError.slice(0, 200)}"`;
        }
        else if (rawCapture.length > 0) {
            diag = ` Received 0 data chunks. Raw response (first 500 chars): ${rawCapture.slice(0, 500)}`;
        }
        else {
            diag = " Received 0 data chunks — stream returned a truly empty body (0 bytes).";
        }
        throw new PartialResponseError(`Anthropic stream completed but no content was received.${diag}`, "");
    }
    return {
        content,
        usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
        },
    };
}
//# sourceMappingURL=stream-parser.js.map