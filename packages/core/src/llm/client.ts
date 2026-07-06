// LLM Client: interface, factory, and chat completion
// Uses native fetch — no external LLM SDK dependency
//
// Split from the original 322-line client.ts into focused modules:
//   - client-types.ts  : OpenAI API response types + constants
//   - stream-parser.ts : SSE stream parsing (parseStreamResponse)
//   - retry.ts         : transient retry logic (withTransientRetry)
// This module retains the public interface, factory, and orchestration.

import type { LLMConfig } from "../models/project.js";
import type { LLMMessage, LLMResponse, ChatOptions } from "./types.js";
import { lookupModel, getServiceConfig, validateModelBelongsToService, providerRegistry, UNKNOWN_MODEL_FALLBACK_MAX_TOKENS } from "./provider-bank.js";
import { estimateMessagesTokens, assertWithinContextWindow, clampTemperatureForModel } from "./token-utils.js";
import { ModelServiceMismatchError, LLMTimeoutError, PartialResponseError } from "./errors.js";
import { isLlmStubEnabled, stubChatCompletion } from "./stub.js";
import { TRANSIENT_RETRIES } from "./client-types.js";
import type { OpenAIChatResponse, AnthropicMessagesResponse } from "./client-types.js";
import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";
import { TAVERNOS_USER_AGENT } from "../shared/http.js";
// Re-export normalizeApiUrl for backward compatibility (llm/index.ts re-exports from client.ts).
export { normalizeApiUrl } from "../shared/http.js";
import { parseStreamResponse, parseAnthropicStreamResponse } from "./stream-parser.js";
import { withTransientRetry } from "./retry.js";

// ---------------------------------------------------------------------------
// LLMClient Interface (closure-based, no internal state exposed)
// ---------------------------------------------------------------------------

export interface LLMClient {
  readonly provider: "openai" | "anthropic";
  readonly service: string;
  readonly apiFormat: "chat" | "responses" | "messages";
  readonly stream: boolean;
  readonly baseUrl: string;
  readonly defaults: {
    readonly temperature: number;
    readonly maxTokens: number;
    readonly thinkingBudget: number;
    readonly extra: Readonly<Record<string, unknown>>;
  };
  /**
   * Execute a chat completion.
   * Handles stub mode, context window guard, temperature clamping,
   * streaming, retries, and partial response detection.
   */
  readonly chat: (
    model: string,
    messages: ReadonlyArray<LLMMessage>,
    options?: ChatOptions,
  ) => Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLLMClient(config: LLMConfig): LLMClient {
  const serviceName = config.service ?? "custom";
  const serviceConfig = getServiceConfig(serviceName);

  // Validate model belongs to service (if service is known)
  if (serviceConfig && !validateModelBelongsToService(serviceName, config.model)) {
    throw new ModelServiceMismatchError(serviceName, config.model);
  }

  const modelCard = lookupModel(serviceName, config.model);
  const baseUrl = config.baseUrl || serviceConfig?.baseUrl || "";
  const apiFormat = config.apiFormat ?? serviceConfig?.apiFormat ?? "chat";
  const stream = config.stream ?? true;

  const defaults = {
    temperature: config.temperature ?? 0.7,
    maxTokens: modelCard?.maxOutput ?? UNKNOWN_MODEL_FALLBACK_MAX_TOKENS,
    thinkingBudget: config.thinkingBudget ?? 0,
    extra: config.extra ?? {},
  };

  const provider = serviceConfig?.provider ?? (config.provider === "anthropic" ? "anthropic" : "openai");

  return {
    provider,
    service: serviceName,
    apiFormat,
    stream,
    baseUrl,
    defaults,
    chat: (model, messages, options) =>
      chatCompletion(config, model, messages, options),
  };
}

// ---------------------------------------------------------------------------
// Chat Completion (orchestration: stub → guard → clamp → retry → execute)
// ---------------------------------------------------------------------------

export async function chatCompletion(
  config: LLMConfig,
  model: string,
  messages: ReadonlyArray<LLMMessage>,
  options?: ChatOptions,
): Promise<LLMResponse> {
  // 1. Stub mode
  if (isLlmStubEnabled()) {
    return stubChatCompletion(messages, options);
  }

  const serviceName = config.service ?? "custom";

  // 2. Context window guard
  const inputTokens = estimateMessagesTokens(messages);
  assertWithinContextWindow(inputTokens, serviceName, model, options?.maxTokens);

  // 3. Temperature clamping
  const temperature = clampTemperatureForModel(
    serviceName,
    model,
    options?.temperature ?? config.temperature ?? 0.7,
  );

  const maxTokens = options?.maxTokens ?? lookupModel(serviceName, model)?.maxOutput ?? UNKNOWN_MODEL_FALLBACK_MAX_TOKENS;

  // 4. Execute with retries
  return withTransientRetry(
    () => executeChatCompletion(config, model, messages, temperature, maxTokens, options),
    TRANSIENT_RETRIES,
  );
}

// ---------------------------------------------------------------------------
// Execute — Anthropic Messages API format
// (used by Kimi Code / api.kimi.com/coding and native Anthropic /v1/messages)
// ---------------------------------------------------------------------------

async function executeAnthropicMessages(
  config: LLMConfig,
  baseUrl: string,
  model: string,
  messages: ReadonlyArray<LLMMessage>,
  temperature: number,
  maxTokens: number,
  useStream: boolean,
  options?: ChatOptions,
): Promise<LLMResponse> {
  // Anthropic Messages API endpoint is /v1/messages
  const url = normalizeApiUrl(baseUrl, "/v1/messages");

  // Auth: Anthropic uses x-api-key header + anthropic-version header
  const authToken = providerRegistry.resolveAuthToken(
    config.service ?? "custom",
    config.oauthToken ?? config.apiKey,
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": authToken,
    "anthropic-version": "2023-06-01",
    "User-Agent": TAVERNOS_USER_AGENT,
  };
  if (config.headers) {
    Object.assign(headers, config.headers);
  }

  // Anthropic Messages API separates system messages from the messages array.
  // system is a top-level string; the messages array contains only user/assistant turns.
  const systemMessages = messages.filter((m) => m.role === "system");
  const systemText = systemMessages.map((m) => m.content).join("\n\n");
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model,
    messages: conversationMessages,
    max_tokens: maxTokens,
    temperature,
  };
  if (systemText) {
    body.system = systemText;
  }
  if (useStream) {
    body.stream = true;
  }

  // Set up timeout via AbortController — only when caller explicitly requests it.
  const timeoutMs = options?.timeoutMs;
  const timeoutController = timeoutMs ? new AbortController() : null;
  const timeoutId = timeoutController
    ? setTimeout(() => timeoutController.abort(), timeoutMs)
    : null;
  const signal = options?.signal
    ? (timeoutController
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : options.signal)
    : (timeoutController?.signal ?? undefined);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      await throwApiError(response, "LLM API (Anthropic Messages)");
    }

    if (useStream && response.body) {
      return await parseAnthropicStreamResponse(response.body, options?.onStreamProgress, options?.onChunk);
    }

    // Non-streaming: parse Anthropic Messages API response
    const data = await response.json() as AnthropicMessagesResponse;
    const content = (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return {
      content,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
    };
  } catch (error) {
    if (timeoutController?.signal.aborted && !(error instanceof LLMTimeoutError) && timeoutMs) {
      throw new LLMTimeoutError(
        `LLM request timed out after ${timeoutMs}ms`,
        timeoutMs,
      );
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Execute (actual API call)
// ---------------------------------------------------------------------------

async function executeChatCompletion(
  config: LLMConfig,
  model: string,
  messages: ReadonlyArray<LLMMessage>,
  temperature: number,
  maxTokens: number,
  options?: ChatOptions,
): Promise<LLMResponse> {
  const serviceName = config.service ?? "custom";
  const serviceConfig = getServiceConfig(serviceName);
  const baseUrl = config.baseUrl || serviceConfig?.baseUrl || "";
  const useStream = (config.stream ?? true) && !serviceConfig?.compat?.disableStream;

  // Branch: Anthropic Messages API format (used by Kimi Code / api.kimi.com/coding)
  // uses a different endpoint (/v1/messages), different headers (x-api-key +
  // anthropic-version), and a different request/response body shape.
  const apiFormat = config.apiFormat ?? serviceConfig?.apiFormat ?? "chat";
  if (apiFormat === "messages") {
    return executeAnthropicMessages(config, baseUrl, model, messages, temperature, maxTokens, useStream, options);
  }

  const url = normalizeApiUrl(baseUrl, "/chat/completions");

  // Resolve authentication token: OAuth providers use oauthToken (from env or config),
  // regular providers use apiKey directly.
  const authToken = providerRegistry.resolveAuthToken(
    serviceName,
    config.oauthToken ?? config.apiKey,
  );
  const headers = buildHeaders(authToken, {
    extra: {
      ...config.headers,
      // Declare SSE intent for streaming requests. Some providers/proxies
      // require this header to return a chunked event-stream instead of a
      // buffered JSON body. Both xAI/Grok and Moonshot/Kimi support standard
      // OpenAI-compatible SSE streaming per their official docs.
      ...(useStream ? { Accept: "text/event-stream" } : {}),
    },
  });

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens,
  };
  if (useStream) {
    body.stream = true;
    body.stream_options = { include_usage: true };
  }

  // Set up timeout via AbortController — only when caller explicitly requests it.
  // No default timeout: image generation and long creative tasks may exceed 2 minutes.
  const timeoutMs = options?.timeoutMs;
  const timeoutController = timeoutMs ? new AbortController() : null;
  const timeoutId = timeoutController
    ? setTimeout(() => timeoutController.abort(), timeoutMs)
    : null;
  const signal = options?.signal
    ? (timeoutController
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : options.signal)
    : (timeoutController?.signal ?? undefined);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      await throwApiError(response, "LLM API");
    }

    if (useStream && response.body) {
      // Diagnostic: log Content-Type to identify providers that don't
      // return text/event-stream (which would explain empty SSE bodies).
      const ct = response.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream")) {
        console.warn(`[llm] stream response Content-Type is "${ct}" (expected text/event-stream) — provider may not support SSE streaming`);
      }
      try {
        return await parseStreamResponse(response.body, options?.onStreamProgress, options?.onChunk);
      } catch (streamErr) {
        // If the stream completed but produced no content (compatibility issue),
        // automatically fall back to a non-streaming request. This handles
        // providers whose SSE format differs subtly from the OpenAI spec
        // (e.g. xAI/Grok, some proxies). The non-streaming path reads the
        // full JSON response directly, bypassing SSE parsing entirely.
        if (streamErr instanceof PartialResponseError) {
          console.warn("[llm] stream produced no content, falling back to non-streaming request:", streamErr.message.slice(0, 200));
          // Re-send the same request without streaming.
          const fallbackBody: Record<string, unknown> = { ...body };
          delete fallbackBody.stream;
          delete fallbackBody.stream_options;
          const fallbackResponse = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(fallbackBody),
            signal,
          });
          if (!fallbackResponse.ok) {
            await throwApiError(fallbackResponse, "LLM API (non-streaming fallback)");
          }
          const fallbackData = await fallbackResponse.json() as OpenAIChatResponse;
          const fallbackContent = fallbackData.choices[0]?.message?.content ?? "";
          if (fallbackContent) {
            return {
              content: fallbackContent,
              usage: {
                promptTokens: fallbackData.usage?.prompt_tokens ?? 0,
                completionTokens: fallbackData.usage?.completion_tokens ?? 0,
                totalTokens: fallbackData.usage?.total_tokens ?? 0,
              },
            };
          }
          // If even non-streaming returned empty, throw the original error.
          throw streamErr;
        }
        throw streamErr;
      }
    }

    // Non-streaming
    const data = await response.json() as OpenAIChatResponse;
    return {
      content: data.choices[0]?.message?.content ?? "",
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    // If the timeout fired, wrap in LLMTimeoutError for clearer diagnostics
    if (timeoutController?.signal.aborted && !(error instanceof LLMTimeoutError) && timeoutMs) {
      throw new LLMTimeoutError(
        `LLM request timed out after ${timeoutMs}ms`,
        timeoutMs,
      );
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
