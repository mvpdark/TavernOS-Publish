// Shared type definitions for Settings page and its sub-components.
//
// NOTE: ModelInfo, ImageModelInfo, VideoModelInfo, TTSVoiceInfo, and
// CustomVoiceInfo are NOT redefinitions of @tavernos/core types. Core does
// not define these model-list shapes — they are the frontend representation
// of the API response from the settings routes (provider/model catalog).
// The server builds these objects inline (e.g. routes/tts.ts maps provider
// models to { id, name }). They are kept here as the single source of truth
// for the Settings page's wire format.

// --- LLM settings ---

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  apiKeyOptional: boolean;
  authType: "api-key" | "oauth";
  /** The provider's default API base URL. Empty for fully custom providers. */
  baseUrl?: string;
  models: ModelInfo[];
  /** Whether the model list was dynamically fetched from the API (vs hardcoded). */
  modelsFetched?: boolean;
}

/** Credentials for a single provider (masked as "***" when set on the wire). */
export interface ProviderCredentialData {
  apiKey?: string;
  oauthToken?: string;
}

/** Map of service-id → credentials. */
export type ProviderCredentialsData = Record<string, ProviderCredentialData>;

export interface SettingsData {
  service: string;
  model: string;
  apiKey: string;
  /** OAuth access token — shown when the selected provider uses OAuth auth. */
  oauthToken?: string;
  temperature: number;
  stream: boolean;
  baseUrl?: string;
  /** Embedder config for RAG vector retrieval (Phase B). apiKey is masked. */
  embedderConfig?: EmbedderConfigData;
}

/** Embedder configuration for the RAG vector-retrieval layer. */
export interface EmbedderConfigData {
  type: "stub" | "openai";
  model: string;
  dimensions: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface SettingsResponse {
  settings: SettingsData;
  providers: ProviderInfo[];
  dataDir: string;
  /** Per-provider stored credentials (masked). */
  providerCredentials?: ProviderCredentialsData;
}

// --- Image generation config ---

export interface ImageModelInfo {
  id: string;
  name: string;
}

export interface ImageProviderInfo {
  id: string;
  name: string;
  apiKeyOptional: boolean;
  models: ImageModelInfo[];
  baseUrl: string;
}

export interface ImageConfigData {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  size: string;
  style: string;
  quality: string;
}

export interface ImageConfigResponse {
  config: ImageConfigData;
  providers: ImageProviderInfo[];
}

// --- TTS config ---

export interface TTSVoiceInfo {
  id: string;
  name: string;
}

export interface TTSProviderInfo {
  id: string;
  name: string;
  apiKeyOptional: boolean;
  models: TTSVoiceInfo[];
  voices: TTSVoiceInfo[];
  baseUrl: string;
}

export interface TTSConfigData {
  provider: string;
  model: string;
  voice: string;
  speed: number;
  apiKey: string;
  baseUrl: string;
  responseFormat: string;
}

export interface TTSConfigResponse {
  config: TTSConfigData;
  providers: TTSProviderInfo[];
}

// --- Custom voices (locally persisted design/clone results) ---

export interface CustomVoiceInfo {
  voiceId: string;
  name: string;
  provider: "minimax" | "kling";
  source: "design" | "clone";
  prompt: string;
  createdAt: string;
}

// --- Video generation config ---

export interface VideoModelInfo {
  id: string;
  name: string;
}

export interface VideoProviderInfo {
  id: string;
  name: string;
  apiKeyOptional: boolean;
  models: VideoModelInfo[];
  baseUrl: string;
}

export interface VideoConfigData {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  /** Jimeng direct: sessionid from jimeng.jianying.com (masked as "***" when set). */
  jimengSessionId: string;
}

export interface VideoConfigResponse {
  config: VideoConfigData;
  providers: VideoProviderInfo[];
}

// --- Plus module config ---

export interface WebDAVConfigData {
  url: string;
  username: string;
  password: string;
  basePath: string;
}

export interface PlusConfigData {
  enabled: boolean;
  dailyCount: number;
  theme: string;
  style: string;
  aspectRatio: string;
  botType: "MID_JOURNEY" | "NIJI_JOURNEY";
  mjVersion: string;
  scheduleTime: string;
  targetProjectId: string;
  language: string;
  extraPrompt: string;
}

export interface PlusProjectInfo {
  id: string;
  name: string;
}

export interface PlusConfigResponse {
  plusConfig: PlusConfigData;
  webdavConfig: WebDAVConfigData;
  webdavConfigured: boolean;
  storageMode?: "webdav" | "local";
  storageConfigured?: boolean;
  projects: PlusProjectInfo[];
}

export interface PlusGenerationItem {
  name: string;
  ok: boolean;
  filename?: string;
  avatarUrl?: string;
  error?: string;
  imagePrompt?: string;
}

export interface PlusGenerationLog {
  timestamp: string;
  trigger: "schedule" | "manual";
  items: PlusGenerationItem[];
  error?: string;
}
