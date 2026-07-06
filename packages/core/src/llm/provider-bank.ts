// Provider bank: service capability table.
//
// Config-driven architecture — providers are declared as an array of
// ServiceConfig records (PROVIDER_CONFIGS) and indexed at load time into a
// Map-backed ProviderRegistry.  This replaces the original object-literal
// lookup table with a registry pattern that centralises validation and
// iteration logic behind a small method surface.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelCard {
  readonly id: string;
  readonly name: string;
  readonly contextWindowTokens: number;
  readonly maxOutput: number;
  readonly temperature?: number;
  readonly fixedTemperature?: number; // Models that require a specific temperature (e.g., kimi-k2.5 requires 1)
}

export interface ServiceConfig {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly apiFormat: "chat" | "responses" | "messages";
  readonly provider: "openai" | "anthropic";
  readonly models: ReadonlyArray<ModelCard>;
  readonly apiKeyOptional?: boolean;
  readonly compat?: {
    readonly supportsStore?: boolean;
    readonly disableStream?: boolean;
  };
  /** Authentication type: "api-key" (default) or "oauth" (bearer token from OAuth flow). */
  readonly authType?: "api-key" | "oauth";
  /** OAuth configuration — required when authType is "oauth". */
  readonly oauth?: OAuthConfig;
  /** Regex patterns to exclude models from the fetched (live) model list.
   *  Used to filter out deprecated/old models that the /models endpoint
   *  still returns. Patterns are matched against model IDs (case-insensitive). */
  readonly excludedModelPatterns?: ReadonlyArray<string>;
}

/** OAuth configuration for providers that support OAuth authentication (e.g., Grok SuperGrok). */
export interface OAuthConfig {
  /** Environment variable name for the OAuth access token (e.g., "XAI_OAUTH_TOKEN"). */
  readonly tokenEnvVar: string;
  /** Environment variable name for the OAuth refresh token (optional, for future token refresh). */
  readonly refreshTokenEnvVar?: string;
  /** OAuth token endpoint URL for exchanging code / refreshing tokens. */
  readonly tokenEndpoint?: string;
  /** OAuth authorization endpoint URL — the browser login page. */
  readonly authorizeUrl?: string;
  /** OAuth client ID used for token refresh requests. */
  readonly clientId?: string;
  /** OAuth scopes to request (space-separated). */
  readonly scope?: string;
  /** Loopback callback port for the local HTTP listener (default 56121). */
  readonly loopbackPort?: number;
}

// ---------------------------------------------------------------------------
// Built-in provider configurations (array-driven, not object-literal)
// ---------------------------------------------------------------------------

export const PROVIDER_CONFIGS: ReadonlyArray<ServiceConfig> = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiFormat: "chat",
    provider: "openai",
    models: [
      { id: "gpt-5.5", name: "GPT-5.5", contextWindowTokens: 400_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gpt-5.2", name: "GPT-5.2", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gpt-4o", name: "GPT-4o", contextWindowTokens: 128_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gpt-4o-mini", name: "GPT-4o mini", contextWindowTokens: 128_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "o3-mini", name: "o3-mini", contextWindowTokens: 200_000, maxOutput: 100_000 },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    apiFormat: "chat",
    provider: "anthropic",
    models: [
      { id: "claude-sonnet-5", name: "Claude Sonnet 5", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-opus-4-8", name: "Claude Opus 4.8", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextWindowTokens: 200_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindowTokens: 200_000, maxOutput: 8_192, temperature: 0.7 },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiFormat: "chat",
    provider: "openai",
    compat: { supportsStore: false },
    models: [
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", contextWindowTokens: 2_000_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "gemini-3-pro", name: "Gemini 3 Pro", contextWindowTokens: 2_000_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindowTokens: 2_000_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindowTokens: 1_000_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindowTokens: 1_000_000, maxOutput: 8_192, temperature: 0.7 },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi 开放平台)",
    baseUrl: "https://api.moonshot.cn/v1",
    apiFormat: "chat",
    provider: "openai",
    models: [
      { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.7-code-highspeed", name: "Kimi K2.7 Code Highspeed", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.6", name: "Kimi K2.6", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.5", name: "Kimi K2.5", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "moonshot-v1-128k", name: "Moonshot V1 128K", contextWindowTokens: 128_000, maxOutput: 8_192, temperature: 0.7 },
    ],
  },
  {
    id: "kimi-coding",
    name: "Kimi Code (编程版)",
    baseUrl: "https://api.kimi.com/coding/v1",
    apiFormat: "chat",
    provider: "openai",
    models: [
      { id: "kimi-for-coding", name: "Kimi for Coding", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.7-code-highspeed", name: "Kimi K2.7 Code Highspeed", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.6", name: "Kimi K2.6", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.5", name: "Kimi K2.5", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2-thinking", name: "Kimi K2 Thinking", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiFormat: "chat",
    provider: "openai",
    models: [
      { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", contextWindowTokens: 128_000, maxOutput: 32_768, temperature: 0.7 },
      { id: "deepseek-chat", name: "DeepSeek V3.2", contextWindowTokens: 64_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindowTokens: 64_000, maxOutput: 32_768 },
    ],
  },
  {
    id: "zhipu",
    name: "Zhipu (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiFormat: "chat",
    provider: "openai",
    models: [
      { id: "glm-5", name: "GLM-5", contextWindowTokens: 128_000, maxOutput: 4_096, temperature: 0.7 },
      { id: "glm-4.5", name: "GLM-4.5", contextWindowTokens: 128_000, maxOutput: 4_096, temperature: 0.7 },
      { id: "glm-4-plus", name: "GLM-4 Plus", contextWindowTokens: 128_000, maxOutput: 4_096, temperature: 0.7 },
      { id: "glm-4-flash", name: "GLM-4 Flash", contextWindowTokens: 128_000, maxOutput: 4_096, temperature: 0.7 },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    apiFormat: "chat",
    provider: "openai",
    apiKeyOptional: true,
    models: [],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiFormat: "chat",
    provider: "openai",
    models: [],
  },
  {
    id: "yunwu",
    name: "云雾 (Yunwu)",
    baseUrl: "https://yunwu.ai/v1",
    apiFormat: "chat",
    provider: "openai",
    // Filter out pre-2025 and non-chat models from the live /models response.
    // Yunwu's API returns 400+ models including very old LLMs, image/video
    // generators, TTS, embedding, and reranker models. These patterns keep
    // only relevant 2025+ chat/LLM models.
    excludedModelPatterns: [
      // --- Non-chat models (image / video / audio / embedding / reranker) ---
      "^dall-e", "^whisper", "^tts-", "^text-embedding", "^text-moderation",
      "^babbage", "^davinci", "^Embedding-",
      "^gpt-image", "^gpt-audio", "^gpt-realtime", "^gpt-oss",
      "^gpt-4o-.*audio", "^gpt-4o-.*realtime", "^gpt-4o-.*transcribe", "^gpt-4o-.*tts",
      "^gpt-4o-mini-.*audio", "^gpt-4o-mini-.*realtime", "^gpt-4o-mini-.*transcribe", "^gpt-4o-mini-.*tts",
      "^doubao-seedream", "^doubao-seedance", "^z-image",
      "^flux", "^mj_", "^kling-", "^vidu", "^wan2", "^happyhorse",
      "^pixverse", "^suno", "^gemma-", "^speech-",
      "^BAAI/", "^Pro/BAAI/", "^netease-youdao/",
      "^Qwen/Qwen3-Reranker", "^qwen3-rerank", "^qwen3-tts", "^qwen-image",
      "^gemini-.*-tts", "^gemini-.*-image", "^gemini-embedding",
      "^MiniMax-File-Upload", "^MiniMax-Voice", "^MiniMax-Hailuo",
      "^grok-imagine",
      // --- GPT-3.x / old GPT-4 (pre-2025) ---
      "^gpt-3\\.5", "^text-davinci",
      "^gpt-4$", "^gpt-4-0125", "^gpt-4-1106", "^gpt-4-0314", "^gpt-4-0613",
      "^gpt-4-32k", "^gpt-4-turbo", "^gpt-4-vision",
      "^gpt-4o-2024-", "^gpt-4o-mini-2024-",
      // --- Claude 3.x / 3.5 series (2024) ---
      "^claude-3-", "^claude-instant",
      // --- Gemini 1.x series (2024) ---
      "^gemini-1\\.",
      // --- Old DeepSeek (pre-2025) ---
      "^deepseek-coder", "^deepseek-v2", "^deepseek-v3$", "^deepseek-v3-",
      "^deepseek-r1-distill", "^deepseek-r1-0528", "^deepseek-r1-2025-",
      "^deepseek-r1-250120", "^deepseek-r1-250528",
      // --- Old Moonshot (pre-2025) ---
      "^moonshot-v1-8k", "^moonshot-v1-32k",
      // --- Old GLM (pre-2025) ---
      "^glm-3", "^glm-4$", "^glm-4-air", "^glm-4-flash", "^glm-4-long",
      // --- Old Qwen / Yi / Baichuan (pre-2025) ---
      "^qwen2-", "^qwq-32b", "^qwq-72b",
      "^yi-", "^baichuan",
      // --- Old Llama / Mistral (pre-2025) ---
      "^llama-", "^mistral-", "^mixtral",
      // --- Old Google models ---
      "^palm-", "^bard-",
      // --- Old ERNIE / SparkDesk ---
      "^ERNIE-", "^SparkDesk-",
      // --- Old OpenAI o-series (2024) ---
      "^o1$", "^o1-", "^o1-preview",
      // --- Misc non-LLM ---
      "^longcat-", "^mimo-", "^mai-ds", "^MAI-DS",
      "^qvq-", "^wen-",
      "^audio1", "^gpt-chat-latest$",
    ],
    models: [
      // Latest generation (2026)
      { id: "claude-sonnet-5", name: "Claude Sonnet 5 (yunwu)", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-opus-4-8", name: "Claude Opus 4.8 (yunwu)", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (yunwu)", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gpt-5.5", name: "GPT-5.5 (yunwu)", contextWindowTokens: 400_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gpt-5.2", name: "GPT-5.2 (yunwu)", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (yunwu)", contextWindowTokens: 2_000_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "kimi-k2.7-code", name: "Kimi K2.7 Code (yunwu)", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "kimi-k2.6", name: "Kimi K2.6 (yunwu)", contextWindowTokens: 256_000, maxOutput: 8_192, fixedTemperature: 1 },
      { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro (yunwu)", contextWindowTokens: 128_000, maxOutput: 32_768, temperature: 0.7 },
      { id: "glm-5", name: "GLM-5 (yunwu)", contextWindowTokens: 128_000, maxOutput: 4_096, temperature: 0.7 },
      // Previous generation (still supported, 2025+)
      { id: "gpt-4o", name: "GPT-4o (yunwu)", contextWindowTokens: 128_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "gpt-4o-mini", name: "GPT-4o mini (yunwu)", contextWindowTokens: 128_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (yunwu)", contextWindowTokens: 200_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "deepseek-chat", name: "DeepSeek V3.2 (yunwu)", contextWindowTokens: 64_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "deepseek-reasoner", name: "DeepSeek R1 (yunwu)", contextWindowTokens: 64_000, maxOutput: 32_768 },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (yunwu)", contextWindowTokens: 2_000_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "grok-4.3", name: "Grok 4.3 (yunwu)", contextWindowTokens: 1_000_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "grok-4.2", name: "Grok 4.2 (yunwu)", contextWindowTokens: 256_000, maxOutput: 8_192, temperature: 0.7 },
    ],
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    apiFormat: "chat",
    provider: "openai",
    authType: "oauth",
    // xAI's API supports OpenAI-compatible SSE streaming with API keys
    // (chat.stream() in the official SDK). However, SuperGrok OAuth tokens
    // return an empty body (0 data chunks) when stream=true — confirmed via
    // live testing. Disable streaming for OAuth to avoid the double-latency
    // penalty of try-stream-then-fallback. If the user switches to an API key
    // (XAI_API_KEY env var), this restriction can be lifted.
    compat: { disableStream: true },
    oauth: {
      tokenEnvVar: "XAI_OAUTH_TOKEN",
      refreshTokenEnvVar: "XAI_OAUTH_REFRESH_TOKEN",
      tokenEndpoint: "https://auth.x.ai/oauth2/token",
      authorizeUrl: "https://auth.x.ai/oauth2/authorize",
      clientId: "b1a00492-073a-47ea-816f-4c329264a828",
      scope: "openid profile email offline_access grok-cli:access api:access",
      loopbackPort: 56121,
    },
    models: [
      { id: "grok-4.3", name: "Grok 4.3", contextWindowTokens: 1_000_000, maxOutput: 16_384, temperature: 0.7 },
      { id: "grok-4.2", name: "Grok 4.2", contextWindowTokens: 256_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "grok-4", name: "Grok 4", contextWindowTokens: 128_000, maxOutput: 8_192, temperature: 0.7 },
      { id: "grok-3", name: "Grok 3", contextWindowTokens: 131_072, maxOutput: 16_384, temperature: 0.7 },
      { id: "grok-3-mini", name: "Grok 3 Mini", contextWindowTokens: 131_072, maxOutput: 16_384, temperature: 0.7 },
      { id: "grok-2", name: "Grok 2", contextWindowTokens: 131_072, maxOutput: 8_192, temperature: 0.7 },
    ],
  },
  {
    id: "agnes",
    name: "Agnes AI",
    baseUrl: "https://apihub.agnes-ai.com/v1",
    apiFormat: "chat",
    provider: "openai",
    // Agnes AI (Singapore) — text/image/video models, free API.
    // OpenAI-compatible: GET /models, POST /chat/completions, POST /images/generate.
    // Auth: Bearer token. QPS limit ~2/s.
    // Register at https://platform.agnes-ai.com/ for API key.
    models: [
      { id: "agnes-2.0-flash", name: "Agnes 2.0 Flash", contextWindowTokens: 1_000_000, maxOutput: 8_192, temperature: 0.7 },
    ],
  },
];

// ---------------------------------------------------------------------------
// ProviderRegistry — Map-backed lookup with domain methods
// ---------------------------------------------------------------------------

/**
 * Registry that indexes ServiceConfig records by their `id` in a Map.
 * Provides typed lookup, model search, and validation methods.
 */
export class ProviderRegistry {
  private readonly table: ReadonlyMap<string, ServiceConfig>;

  constructor(configs: ReadonlyArray<ServiceConfig>) {
    const map = new Map<string, ServiceConfig>();
    for (const cfg of configs) {
      map.set(cfg.id, cfg);
    }
    this.table = map;
  }

  /** Return the ServiceConfig for the given service id, or undefined. */
  get(serviceId: string): ServiceConfig | undefined {
    return this.table.get(serviceId);
  }

  /** True when a service with the given id is registered. */
  has(serviceId: string): boolean {
    return this.table.has(serviceId);
  }

  /** Return a list of all registered service configs. */
  list(): ServiceConfig[] {
    return Array.from(this.table.values());
  }

  /** Return an iterator of [id, config] pairs. */
  entries(): IterableIterator<[string, ServiceConfig]> {
    return this.table.entries();
  }

  /**
   * Find a model card by id or display name within a service.
   * Returns undefined when the service or model is not found.
   */
  findModel(serviceId: string, modelName: string): ModelCard | undefined {
    const service = this.table.get(serviceId);
    if (!service) return undefined;
    return service.models.find((m) => m.id === modelName || m.name === modelName);
  }

  /**
   * Find the service that owns a given model id. Searches every registered
   * service and returns the first whose model list contains the id. Used to
   * resolve a bare model id (without a service prefix) back to its service so
   * a per-service LLM client can be built. Returns undefined when no service
   * declares the model.
   */
  findServiceForModel(modelId: string): ServiceConfig | undefined {
    for (const service of this.table.values()) {
      if (service.models.some((m) => m.id === modelId)) {
        return service;
      }
    }
    return undefined;
  }

  /**
   * Validate that a model belongs to a service.
   * Returns true for unknown services (custom) or services with empty model
   * lists (ollama, openrouter) — those allow any model.
   */
  isModelValid(serviceId: string, modelName: string): boolean {
    const service = this.table.get(serviceId);
    if (!service) return true; // Custom services allow any model
    if (service.models.length === 0) return true; // Services with empty model lists allow any
    return service.models.some((m) => m.id === modelName || m.name === modelName);
  }

  /**
   * Resolve the effective authentication token for a service.
   * For OAuth providers, reads the token from the env var specified in OAuthConfig.
   * For API-key providers, returns the provided apiKey.
   * Returns an empty string when no token is available.
   */
  resolveAuthToken(serviceId: string, apiKey: string): string {
    const service = this.table.get(serviceId);
    if (!service) return apiKey; // Custom services use apiKey directly

    if (service.authType === "oauth" && service.oauth) {
      // Generic OAuth env fallback: the OAuth token is read from the env var
      // configured in serviceConfig.oauth.tokenEnvVar. If absent, fall back to
      // the apiKey (which may hold a token pasted into the settings UI).
      const envToken = process.env[service.oauth.tokenEnvVar] ?? "";
      return envToken || apiKey;
    }

    return apiKey;
  }

  /** Return the authType for a service. Defaults to "api-key" for unknown services. */
  getAuthType(serviceId: string): "api-key" | "oauth" {
    return this.table.get(serviceId)?.authType ?? "api-key";
  }
}

// ---------------------------------------------------------------------------
// Singleton instance built from built-in configs
// ---------------------------------------------------------------------------

export const providerRegistry: ProviderRegistry = new ProviderRegistry(PROVIDER_CONFIGS);

// ---------------------------------------------------------------------------
// Convenience delegates (thin wrappers for backward compatibility)
// ---------------------------------------------------------------------------

export function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return providerRegistry.get(serviceName);
}

export function lookupModel(
  serviceName: string,
  modelName: string,
): ModelCard | undefined {
  return providerRegistry.findModel(serviceName, modelName);
}

export function validateModelBelongsToService(
  serviceName: string,
  modelName: string,
): boolean {
  return providerRegistry.isModelValid(serviceName, modelName);
}

// Fallback for unknown models
export const UNKNOWN_MODEL_FALLBACK_MAX_TOKENS = 8192 * 3;
export const UNKNOWN_MODEL_FALLBACK_CONTEXT_WINDOW = 128_000;
