// packages/core/src/voice/index.ts
// Voice management module exports.

export {
  createVoiceClient,
  type VoiceClient,
  type VoiceClientConfig,
} from "./client.js";
export {
  VoiceDesignRequestSchema,
  VoiceCloneRequestSchema,
  KlingCustomVoiceRequestSchema,
  VoiceInfoSchema,
  CustomVoiceSchema,
  type VoiceDesignRequest,
  type VoiceCloneRequest,
  type KlingCustomVoiceRequest,
  type VoiceInfo,
  type CustomVoice,
} from "./types.js";
