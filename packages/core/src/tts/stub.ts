// TTS stub mode.
//
// When the TAVERNOS_TTS_STUB environment variable is truthy, the TTS client
// short-circuits real HTTP calls and returns a deterministic placeholder audio
// buffer. This mirrors the LLM and image stub patterns and enables fully
// offline tests.

import type { TTSRequest, TTSResponse } from "./types.js";
import { TTS_CONTENT_TYPES } from "./types.js";

/** True when the TTS stub is enabled via env var. */
export function isTTSStubEnabled(): boolean {
  const v = process.env["TAVERNOS_TTS_STUB"];
  return v === "true" || v === "1";
}

/**
 * Deterministic stub TTS synthesis.
 * Produces a stable placeholder audio buffer derived from the input text so
 * that the same text always yields the same buffer — no network access required.
 */
export function stubTTSSynthesis(request: TTSRequest): TTSResponse {
  const format = request.responseFormat ?? "mp3";

  // Build a deterministic byte sequence from the text length and content.
  // This is NOT valid audio but provides stable, testable bytes.
  const textBytes = new TextEncoder().encode(request.text);
  // Prepend a stub header (4 bytes) + the text bytes as a payload.
  const header = new Uint8Array([0x53, 0x54, 0x55, 0x42]); // "STUB"
  const audio = new Uint8Array(header.length + textBytes.length);
  audio.set(header, 0);
  audio.set(textBytes, header.length);

  return {
    audio,
    format,
    contentType: TTS_CONTENT_TYPES[format] ?? "audio/mpeg",
  };
}
