// packages/core/src/voice/types.ts
// Voice design & clone types for MiniMax and Kling voice management.

import { z } from "zod";

// --- MiniMax Voice Design ---
export const VoiceDesignRequestSchema = z.object({
  prompt: z.string().min(1),
  preview_text: z.string().default(""),
  voice_id: z.string().min(1),
  aigc_watermark: z.boolean().default(false),
});
export type VoiceDesignRequest = z.infer<typeof VoiceDesignRequestSchema>;

// --- MiniMax Voice Clone ---
export const VoiceCloneRequestSchema = z.object({
  file_id: z.number().int(),
  voice_id: z.string().min(1),
  clone_prompt: z.object({
    prompt_audio: z.number().int(),
    prompt_text: z.string(),
  }).optional(),
  text: z.string().optional(),
  model: z.string().default("speech-2.8-hd"),
  language_boost: z.string().default("auto"),
  need_noise_reduction: z.boolean().default(false),
  need_volume_normalization: z.boolean().default(false),
  aigc_watermark: z.boolean().default(false),
});
export type VoiceCloneRequest = z.infer<typeof VoiceCloneRequestSchema>;

// --- Kling Custom Voice ---
export const KlingCustomVoiceRequestSchema = z.object({
  voice_name: z.string().min(1),
  voice_url: z.string().optional(),
  video_id: z.string().optional(),
  callback_url: z.string().optional(),
  external_task_id: z.string().optional(),
});
export type KlingCustomVoiceRequest = z.infer<typeof KlingCustomVoiceRequestSchema>;

// --- Voice info (query result) ---
export const VoiceInfoSchema = z.object({
  voice_id: z.string(),
  voice_name: z.string().optional(),
  status: z.string().optional(),
  provider: z.enum(["minimax", "kling"]),
});
export type VoiceInfo = z.infer<typeof VoiceInfoSchema>;

// --- Custom voice (locally persisted design/clone results) ---
// MiniMax and Kling do not provide a "list my custom voices" API, so we
// persist each successful design/clone locally in custom-voices.json and
// merge them into the TTS provider's voice list on config fetch.
export const CustomVoiceSchema = z.object({
  /** The voice_id returned by the design/clone API (user-defined). */
  voiceId: z.string().min(1),
  /** Human-readable label shown in the UI dropdown. */
  name: z.string().min(1),
  /** Which TTS provider this voice belongs to. */
  provider: z.enum(["minimax", "kling"]),
  /** How the voice was created. */
  source: z.enum(["design", "clone"]),
  /** Design prompt or clone description for reference. */
  prompt: z.string().default(""),
  /** ISO timestamp of creation. */
  createdAt: z.string().default(""),
});
export type CustomVoice = z.infer<typeof CustomVoiceSchema>;
