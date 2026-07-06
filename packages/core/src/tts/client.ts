// TTS client.
//
// Uses native fetch (no external SDK) to call the OpenAI TTS compatible
// speech synthesis endpoint (POST /v1/audio/speech). The base URL is resolved
// from the TTS provider registry so that Azure and custom endpoints work
// transparently.

import type {
  TTSConfig,
  TTSRequest,
  TTSResponse,
} from "./types.js";
import { ttsProviderRegistry, TTS_CONTENT_TYPES } from "./types.js";
import { isTTSStubEnabled, stubTTSSynthesis } from "./stub.js";
import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";

// ---------------------------------------------------------------------------
// TTSClient interface (closure-based, no internal state exposed)
// ---------------------------------------------------------------------------

export interface TTSClient {
  readonly provider: string;
  readonly baseUrl: string;
  readonly defaults: {
    readonly model: string;
    readonly voice: string;
    readonly speed: number;
    readonly responseFormat: string;
  };
  /** Synthesize speech from text. Returns raw audio bytes. */
  synthesize(request: TTSRequest): Promise<TTSResponse>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTTSClient(config: TTSConfig): TTSClient {
  // Resolve the base URL from the provider registry for known providers.
  // For "custom" (not in the registry or empty baseUrl), the config baseUrl
  // is used as-is.
  const providerConfig = ttsProviderRegistry.get(config.provider);
  const baseUrl = providerConfig?.baseUrl || config.baseUrl;
  const model = config.model || providerConfig?.models[0]?.id || "tts-1";
  const voice = config.voice || providerConfig?.voices[0]?.id || "alloy";
  const apiPattern = providerConfig?.apiPattern ?? "openai";

  return {
    provider: config.provider,
    baseUrl,
    defaults: {
      model,
      voice,
      speed: config.speed,
      responseFormat: config.responseFormat,
    },
    synthesize: (request) => synthesizeSpeech(config, baseUrl, model, voice, apiPattern, request),
  };
}

// ---------------------------------------------------------------------------
// Synthesis (stub mode → real API call)
// ---------------------------------------------------------------------------

async function synthesizeSpeech(
  config: TTSConfig,
  baseUrl: string,
  model: string,
  defaultVoice: string,
  apiPattern: "openai" | "kling" | "tongyi" | "minimax" | "vidu",
  request: TTSRequest,
): Promise<TTSResponse> {
  // 1. Stub mode — deterministic offline response
  if (isTTSStubEnabled()) {
    return stubTTSSynthesis(request);
  }

  const format = request.responseFormat ?? config.responseFormat;
  const effectiveVoice = request.voice ?? defaultVoice;
  const effectiveSpeed = request.speed ?? config.speed;
  const headers = buildHeaders(config.apiKey);

  // 2. Build URL and request body based on the API pattern
  let url: string;
  let body: Record<string, unknown>;

  switch (apiPattern) {
    case "kling":
      url = normalizeApiUrl(baseUrl, "/kling/v1/audio/tts");
      body = {
        text: request.text,
        voice_id: effectiveVoice,
        voice_language: "zh",
        voice_speed: effectiveSpeed,
      };
      break;

    case "tongyi":
      url = normalizeApiUrl(baseUrl, "/alibailian/api/v1/services/aigc/multimodal-generation/generation");
      body = {
        model,
        input: {
          text: request.text,
          voice: effectiveVoice,
          language_type: "zh",
        },
      };
      break;

    case "minimax":
      url = normalizeApiUrl(baseUrl, "/minimax/v1/t2a_v2");
      body = {
        model,
        text: request.text,
        voice_setting: {
          voice_id: effectiveVoice,
        },
      };
      break;

    case "vidu":
      url = normalizeApiUrl(baseUrl, "/ent/v2/audio-tts");
      body = {
        text: request.text,
        voice_setting_voice_id: effectiveVoice,
        speed: effectiveSpeed,
        volume: 50,
        pitch: 0,
        emotion: "happy",
      };
      break;

    default:
      // openai pattern
      url = normalizeApiUrl(baseUrl, "/audio/speech");
      body = {
        model,
        input: request.text,
        voice: effectiveVoice,
        response_format: format,
        speed: effectiveSpeed,
      };
      break;
  }

  // 3. Real API call
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, "TTS API");
  }

  // 4. The API returns binary audio data (OpenAI/Kling/VIDU) or JSON with
  //    base64/hex audio (Tongyi/Minimax). Handle both cases.
  const contentType = response.headers.get("content-type") ?? "";
  console.error(`[tts-client] url=${url} contentType="${contentType}" apiPattern=${apiPattern}`);

  if (contentType.includes("application/json")) {
    // Tongyi / Minimax may return JSON with embedded audio data.
    // Minimax encodes audio as a hex string; Tongyi uses base64.
    const json = (await response.json()) as TongyiMinimaxResponse;
    const audioStr = extractAudioBase64(json);
    if (audioStr) {
      const audio = decodeAudioString(audioStr);
      console.error(`[tts-client] JSON path: audioStr length=${audioStr.length}, decoded ${audio.length} bytes, first=${audio[0]?.toString(16) ?? "none"}`);
      return {
        audio,
        format,
        contentType: TTS_CONTENT_TYPES[format] ?? "audio/mpeg",
      };
    }
    throw new Error(`TTS API returned JSON without audio data: ${JSON.stringify(json).slice(0, 500)}`);
  }

  // Binary audio response — but some gateways (yunwu) may return the MiniMax
  // JSON body with a non-JSON Content-Type. If the binary data looks like a
  // JSON string (starts with '{'), parse it and extract the audio.
  const arrayBuffer = await response.arrayBuffer();
  const audio = new Uint8Array(arrayBuffer);

  // Check if this is actually a JSON response mislabeled as binary
  if (apiPattern === "minimax" || apiPattern === "tongyi") {
    const firstByte = audio[0];
    if (firstByte === 0x7b /* '{' */) {
      // It's JSON text — parse and decode
      const text = new TextDecoder().decode(audio);
      console.error(`[tts-client] Binary path but body is JSON (mistyped CT), parsing...`);
      try {
        const json = JSON.parse(text) as TongyiMinimaxResponse;
        const audioStr = extractAudioBase64(json);
        if (audioStr) {
          const decoded = decodeAudioString(audioStr);
          console.error(`[tts-client] Recovered from mistyped JSON: ${decoded.length} bytes, first=${decoded[0]?.toString(16) ?? "none"}`);
          return {
            audio: decoded,
            format,
            contentType: TTS_CONTENT_TYPES[format] ?? "audio/mpeg",
          };
        }
      } catch {
        // Fall through to return raw bytes
      }
    }
    // Also check if it's a raw hex string (no JSON wrapper)
    const text = new TextDecoder().decode(audio);
    const trimmed = text.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0 && trimmed.length > 100) {
      console.error(`[tts-client] Binary path but body is hex string (${trimmed.length} chars), decoding...`);
      const decoded = decodeAudioString(trimmed);
      return {
        audio: decoded,
        format,
        contentType: TTS_CONTENT_TYPES[format] ?? "audio/mpeg",
      };
    }
  }

  console.error(`[tts-client] Binary path: ${audio.length} bytes, first=${audio[0]?.toString(16) ?? "none"}`);
  return {
    audio,
    format,
    contentType: TTS_CONTENT_TYPES[format] ?? contentType ?? "audio/mpeg",
  };
}

// ---------------------------------------------------------------------------
// Response helpers for JSON-based TTS APIs (Tongyi / Minimax)
// ---------------------------------------------------------------------------

interface TongyiMinimaxResponse {
  output?: {
    audio?: string;
    data?: string;
  };
  data?: {
    audio?: string;
    data?: string;
  };
  audio?: string;
}

function extractAudioBase64(json: TongyiMinimaxResponse): string | undefined {
  return json.output?.audio ?? json.output?.data ?? json.data?.audio ?? json.data?.data ?? json.audio;
}

/**
 * Decode an audio data string that may be hex-encoded (MiniMax) or
 * base64-encoded (Tongyi and others). Hex strings contain only [0-9a-fA-F]
 * and have an even length; everything else is treated as base64.
 */
function decodeAudioString(str: string): Uint8Array {
  const trimmed = str.trim();
  // Detect hex encoding: only hex chars, even length, minimum 4 chars
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const bytes = new Uint8Array(trimmed.length / 2);
    for (let i = 0; i < trimmed.length; i += 2) {
      bytes[i / 2] = parseInt(trimmed.slice(i, i + 2), 16);
    }
    return bytes;
  }
  // Fall back to base64 decoding
  return Uint8Array.from(atob(trimmed), (c) => c.charCodeAt(0));
}
