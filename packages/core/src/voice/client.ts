// packages/core/src/voice/client.ts
// Voice management client — MiniMax voice design/clone + Kling custom voices.

import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";
import type {
  VoiceDesignRequest,
  VoiceCloneRequest,
  KlingCustomVoiceRequest,
} from "./types.js";

export interface VoiceClientConfig {
  apiKey: string;
  /** Base URL without trailing slash, e.g. "https://yunwu.ai". */
  baseUrl: string;
}

export interface VoiceClient {
  /** MiniMax: upload an audio file for voice cloning. Returns file_id. */
  uploadAudio(audio: ArrayBuffer, filename: string, purpose: string): Promise<{ fileId: number; raw: unknown }>;
  /** MiniMax: design a voice from a text prompt. Returns the new voice_id. */
  designVoice(req: VoiceDesignRequest): Promise<{ voiceId: string; raw: unknown }>;
  /** MiniMax: clone a voice from an uploaded audio file. */
  cloneVoice(req: VoiceCloneRequest): Promise<{ voiceId: string; raw: unknown }>;
  /** Kling: create a custom voice from an audio URL or video ID. */
  createKlingVoice(req: KlingCustomVoiceRequest): Promise<{ taskId: string; raw: unknown }>;
  /** Kling: query a custom voice by voice_id. */
  queryKlingVoice(voiceId: string): Promise<unknown>;
  /** Kling: list official voices. */
  listKlingOfficialVoices(): Promise<unknown>;
  /** Kling: delete a custom voice. */
  deleteKlingVoice(voiceId: string): Promise<unknown>;
}

export function createVoiceClient(config: VoiceClientConfig): VoiceClient {
  const { apiKey, baseUrl } = config;

  return {
    async uploadAudio(audio, filename, purpose) {
      // MiniMax file upload is multipart/form-data at /v1/files/upload.
      // Through yunwu proxy the path is /minimax/v1/files/upload.
      const url = normalizeApiUrl(baseUrl, "/minimax/v1/files/upload");
      const formData = new FormData();
      formData.append("purpose", purpose);
      formData.append("file", new Blob([audio]), filename);
      const resp = await fetch(url, {
        method: "POST",
        headers: buildHeaders(apiKey, { json: false }),
        body: formData,
      });
      if (!resp.ok) await throwApiError(resp, "MiniMax file upload");
      const data = await resp.json() as { file?: { file_id?: number } };
      const fileId = data.file?.file_id ?? 0;
      return { fileId, raw: data };
    },

    async designVoice(req) {
      const url = normalizeApiUrl(baseUrl, "/minimax/v1/voice_design");
      const resp = await fetch(url, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify(req),
      });
      if (!resp.ok) await throwApiError(resp, "MiniMax voice design");
      const data = await resp.json();
      return { voiceId: req.voice_id, raw: data };
    },

    async cloneVoice(req) {
      const url = normalizeApiUrl(baseUrl, "/minimax/v1/voice_clone");
      const resp = await fetch(url, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify(req),
      });
      if (!resp.ok) await throwApiError(resp, "MiniMax voice clone");
      const data = await resp.json();
      return { voiceId: req.voice_id, raw: data };
    },

    async createKlingVoice(req) {
      const url = normalizeApiUrl(baseUrl, "/kling/v1/general/custom-voices");
      const resp = await fetch(url, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify(req),
      });
      if (!resp.ok) await throwApiError(resp, "Kling custom voice");
      const data = await resp.json() as Record<string, unknown>;
      const dataField = data["data"] as Record<string, unknown> | undefined;
      const taskId = (dataField?.["task_id"] as string) ?? (data["task_id"] as string) ?? "";
      return { taskId, raw: data };
    },

    async queryKlingVoice(voiceId) {
      const url = normalizeApiUrl(baseUrl, `/kling/v1/general/custom-voices/${encodeURIComponent(voiceId)}`);
      const resp = await fetch(url, {
        method: "GET",
        headers: buildHeaders(apiKey, { json: false }),
      });
      if (!resp.ok) await throwApiError(resp, "Kling query voice");
      return resp.json();
    },

    async listKlingOfficialVoices() {
      const url = normalizeApiUrl(baseUrl, "/kling/v1/general/voices");
      const resp = await fetch(url, {
        method: "GET",
        headers: buildHeaders(apiKey, { json: false }),
      });
      if (!resp.ok) await throwApiError(resp, "Kling list voices");
      return resp.json();
    },

    async deleteKlingVoice(voiceId) {
      const url = normalizeApiUrl(baseUrl, "/kling/v1/general/custom-voices/delete");
      const resp = await fetch(url, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({ voice_id: voiceId }),
      });
      if (!resp.ok) await throwApiError(resp, "Kling delete voice");
      return resp.json();
    },
  };
}
