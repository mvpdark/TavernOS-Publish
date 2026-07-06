// LLM client internal types and constants.
// Pure contracts module — no runtime logic, no side-effects.
// Extracted from client.ts for single-responsibility separation.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// TAVERNOS_USER_AGENT is defined in shared/http.ts and re-exported here for
// backward compatibility — existing imports from "./client-types.js" continue
// to work.
export { TAVERNOS_USER_AGENT } from "../shared/http.js";
export const TRANSIENT_RETRIES = 2;
export const TRANSIENT_RETRY_DELAY_MS = 1000;
/** Default timeout for LLM API calls (2 minutes). */
export const DEFAULT_LLM_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// OpenAI API Response Types
// ---------------------------------------------------------------------------

export interface OpenAIChatResponse {
  choices: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  choices: Array<{
    delta?: { content?: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Anthropic Messages API Response Types
// ---------------------------------------------------------------------------

export interface AnthropicMessagesResponse {
  content: Array<{
    type: "text" | "tool_use" | "thinking";
    text?: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  model?: string;
  role?: string;
  stop_reason?: string;
}

export interface AnthropicStreamEvent {
  type: string;
  delta?: {
    type?: string;
    text?: string;
  };
  content_block?: {
    type: string;
    text?: string;
  };
  message?: {
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}
