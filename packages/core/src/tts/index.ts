// TTS module exports

export {
  TTSProviderSchema,
  TTSVoiceSchema,
  TTSResponseFormatSchema,
  TTSConfigSchema,
  TTSRequestSchema,
  type TTSProvider,
  type TTSVoice,
  type TTSResponseFormat,
  type TTSConfig,
  type TTSRequest,
  type TTSResponse,
} from "./types.js";

export {
  TTS_PROVIDER_CONFIGS,
  TTSProviderRegistry,
  ttsProviderRegistry,
  TTS_CONTENT_TYPES,
  type TTSProviderConfig,
  type TTSModelCard,
  type TTSVoiceCard,
} from "./types.js";

export { isTTSStubEnabled, stubTTSSynthesis } from "./stub.js";

export { createTTSClient, type TTSClient } from "./client.js";
