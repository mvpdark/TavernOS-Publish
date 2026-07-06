// Text-to-Speech module: types, Zod schemas, and TTS provider registry.
//
// Supports the OpenAI TTS API format (POST /v1/audio/speech) plus
// configurable base URLs so that Azure OpenAI and other compatible
// endpoints can be used transparently.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const TTSProviderSchema = z.enum([
  "openai",
  "azure",
  "yunwu",
  "yunwu-kling",
  "yunwu-tongyi",
  "yunwu-minimax",
  "yunwu-vidu",
  "custom",
]);
export type TTSProvider = z.infer<typeof TTSProviderSchema>;

export const TTSVoiceSchema = z.string().min(1);
export type TTSVoice = z.infer<typeof TTSVoiceSchema>;

export const TTSResponseFormatSchema = z.enum([
  "mp3",
  "opus",
  "aac",
  "flac",
  "wav",
  "pcm",
]);
export type TTSResponseFormat = z.infer<typeof TTSResponseFormatSchema>;

// ---------------------------------------------------------------------------
// TTS config (provider + model + credentials + voice settings)
// ---------------------------------------------------------------------------

export const TTSConfigSchema = z.object({
  provider: TTSProviderSchema.default("openai"),
  model: z.string().default("tts-1"),
  voice: TTSVoiceSchema.default("alloy"),
  speed: z.number().min(0.25).max(4).default(1),
  apiKey: z.string().default(""),
  baseUrl: z.string().default("https://api.openai.com/v1"),
  responseFormat: TTSResponseFormatSchema.default("mp3"),
});
export type TTSConfig = z.infer<typeof TTSConfigSchema>;

// ---------------------------------------------------------------------------
// TTS request (per-call overrides)
// ---------------------------------------------------------------------------

export const TTSRequestSchema = z.object({
  text: z.string().min(1),
  voice: TTSVoiceSchema.optional(),
  speed: z.number().min(0.25).max(4).optional(),
  responseFormat: TTSResponseFormatSchema.optional(),
});
export type TTSRequest = z.infer<typeof TTSRequestSchema>;

// ---------------------------------------------------------------------------
// TTS response
// ---------------------------------------------------------------------------

export interface TTSResponse {
  /** Raw audio bytes. */
  readonly audio: Uint8Array;
  /** Audio format identifier (e.g. "mp3", "wav"). */
  readonly format: string;
  /** MIME content type (e.g. "audio/mpeg"). */
  readonly contentType: string;
}

// ---------------------------------------------------------------------------
// TTS provider configs (parallel to IMAGE_PROVIDER_CONFIGS)
// ---------------------------------------------------------------------------

export interface TTSVoiceCard {
  readonly id: string;
  readonly name: string;
}

export interface TTSModelCard {
  readonly id: string;
  readonly name: string;
}

export interface TTSProviderConfig {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly models: ReadonlyArray<TTSModelCard>;
  readonly voices: ReadonlyArray<TTSVoiceCard>;
  readonly apiKeyOptional?: boolean;
  /** API endpoint pattern. "openai" uses /audio/speech; others use vendor-specific paths. */
  readonly apiPattern?: "openai" | "kling" | "tongyi" | "minimax" | "vidu";
}

export const TTS_PROVIDER_CONFIGS: ReadonlyArray<TTSProviderConfig> = [
  {
    id: "openai",
    name: "OpenAI TTS",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "tts-1", name: "TTS-1 (standard)" },
      { id: "tts-1-hd", name: "TTS-1 HD (high quality)" },
    ],
    voices: [
      { id: "alloy", name: "Alloy" },
      { id: "echo", name: "Echo" },
      { id: "fable", name: "Fable" },
      { id: "onyx", name: "Onyx" },
      { id: "nova", name: "Nova" },
      { id: "shimmer", name: "Shimmer" },
    ],
  },
  {
    id: "azure",
    name: "Azure OpenAI TTS",
    baseUrl: "",
    models: [
      { id: "tts-1", name: "TTS-1" },
      { id: "tts-1-hd", name: "TTS-1 HD" },
    ],
    voices: [
      { id: "alloy", name: "Alloy" },
      { id: "echo", name: "Echo" },
      { id: "fable", name: "Fable" },
      { id: "onyx", name: "Onyx" },
      { id: "nova", name: "Nova" },
      { id: "shimmer", name: "Shimmer" },
    ],
  },
  {
    id: "yunwu",
    name: "云雾 (Yunwu) TTS",
    baseUrl: "https://yunwu.ai/v1",
    apiPattern: "openai",
    models: [
      { id: "gpt-4o-mini-tts", name: "GPT-4o Mini TTS" },
      { id: "gpt-4o-mini-tts-1", name: "GPT-4o Mini TTS 1" },
      { id: "tts-1", name: "TTS-1 (standard)" },
      { id: "tts-1-1106", name: "TTS-1 1106" },
      { id: "tts-1-hd", name: "TTS-1 HD" },
      { id: "tts-1-hd-1106", name: "TTS-1 HD 1106" },
      { id: "tts-hd-1", name: "TTS HD 1" },
      { id: "gemini-3.1-flash-tts-preview", name: "Gemini 3.1 Flash TTS" },
      { id: "gemini-2.5-pro-preview-tts", name: "Gemini 2.5 Pro TTS" },
      { id: "gemini-2.5-flash-preview-tts", name: "Gemini 2.5 Flash TTS" },
    ],
    voices: [
      { id: "alloy", name: "Alloy" },
      { id: "echo", name: "Echo" },
      { id: "fable", name: "Fable" },
      { id: "onyx", name: "Onyx" },
      { id: "nova", name: "Nova" },
      { id: "shimmer", name: "Shimmer" },
    ],
  },
  {
    id: "yunwu-kling",
    name: "云雾 - Kling TTS",
    baseUrl: "https://yunwu.ai",
    apiPattern: "kling",
    models: [
      { id: "kling-audio", name: "Kling Audio" },
      { id: "kling-custom-voices", name: "Kling 自定义声音" },
    ],
    voices: [
      { id: "zh_female_qingxin", name: "清新女声" },
      { id: "zh_male_wennuan", name: "温暖男声" },
      { id: "zh_female_kuanhong", name: "宽洪女声" },
      { id: "zh_male_chunhou", name: "淳厚男声" },
    ],
  },
  {
    id: "yunwu-tongyi",
    name: "云雾 - 通义千问 TTS",
    baseUrl: "https://yunwu.ai",
    apiPattern: "tongyi",
    models: [
      { id: "qwen3-tts-flash", name: "Qwen3 TTS Flash" },
      { id: "qwen3-tts-flash-2025-11-27", name: "Qwen3 TTS Flash (2025-11-27)" },
    ],
    voices: [
      { id: "longxiaochun", name: "龙小纯" },
      { id: "longwan", name: "龙婉" },
      { id: "longcheng", name: "龙诚" },
      { id: "longbiao", name: "龙飙" },
    ],
  },
  {
    id: "yunwu-minimax",
    name: "云雾 - Minimax TTS",
    baseUrl: "https://yunwu.ai",
    apiPattern: "minimax",
    models: [
      { id: "speech-2.8-hd", name: "Speech 2.8 HD" },
      { id: "speech-2.8-turbo", name: "Speech 2.8 Turbo" },
      { id: "speech-2.6-hd", name: "Speech 2.6 HD" },
      { id: "speech-2.6-turbo", name: "Speech 2.6 Turbo" },
      { id: "speech-02-hd", name: "Speech 02 HD" },
      { id: "speech-02-turbo", name: "Speech 02 Turbo" },
    ],
    voices: [
      { id: "male-qn-qingse", name: "青涩男声" },
      { id: "male-qn-jingying", name: "精英男声" },
      { id: "male-qn-badao", name: "霸道男声" },
      { id: "female-shaonv", name: "少女女声" },
      { id: "female-yujie", name: "御姐女声" },
      { id: "female-chengshu", name: "成熟女声" },
    ],
  },
  {
    id: "yunwu-vidu",
    name: "云雾 - VIDU TTS",
    baseUrl: "https://yunwu.ai",
    apiPattern: "vidu",
    models: [
      { id: "vidu-tts", name: "VIDU TTS" },
    ],
    voices: [
      { id: "default", name: "默认" },
    ],
  },
  {
    id: "custom",
    name: "Custom Endpoint",
    baseUrl: "",
    models: [],
    voices: [],
    apiKeyOptional: true,
  },
];

// ---------------------------------------------------------------------------
// TTSProviderRegistry — Map-backed lookup (mirrors ImageProviderRegistry)
// ---------------------------------------------------------------------------

export class TTSProviderRegistry {
  private readonly table: ReadonlyMap<string, TTSProviderConfig>;

  constructor(configs: ReadonlyArray<TTSProviderConfig>) {
    const map = new Map<string, TTSProviderConfig>();
    for (const cfg of configs) {
      map.set(cfg.id, cfg);
    }
    this.table = map;
  }

  get(id: string): TTSProviderConfig | undefined {
    return this.table.get(id);
  }

  has(id: string): boolean {
    return this.table.has(id);
  }

  list(): TTSProviderConfig[] {
    return Array.from(this.table.values());
  }

  /** First model id for a provider, or undefined when the provider has no models. */
  defaultModel(id: string): string | undefined {
    return this.table.get(id)?.models[0]?.id;
  }

  /** First voice id for a provider, or undefined when the provider has no voices. */
  defaultVoice(id: string): string | undefined {
    return this.table.get(id)?.voices[0]?.id;
  }
}

export const ttsProviderRegistry: TTSProviderRegistry = new TTSProviderRegistry(
  TTS_PROVIDER_CONFIGS,
);

// ---------------------------------------------------------------------------
// Content-type mapping for response formats
// ---------------------------------------------------------------------------

export const TTS_CONTENT_TYPES: Readonly<Record<string, string>> = {
  mp3: "audio/mpeg",
  opus: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  wav: "audio/wav",
  pcm: "audio/pcm",
};
