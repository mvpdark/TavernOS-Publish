export interface ModelCard {
    readonly id: string;
    readonly name: string;
    readonly contextWindowTokens: number;
    readonly maxOutput: number;
    readonly temperature?: number;
    readonly fixedTemperature?: number;
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
export declare const PROVIDER_CONFIGS: ReadonlyArray<ServiceConfig>;
/**
 * Registry that indexes ServiceConfig records by their `id` in a Map.
 * Provides typed lookup, model search, and validation methods.
 */
export declare class ProviderRegistry {
    private readonly table;
    constructor(configs: ReadonlyArray<ServiceConfig>);
    /** Return the ServiceConfig for the given service id, or undefined. */
    get(serviceId: string): ServiceConfig | undefined;
    /** True when a service with the given id is registered. */
    has(serviceId: string): boolean;
    /** Return a list of all registered service configs. */
    list(): ServiceConfig[];
    /** Return an iterator of [id, config] pairs. */
    entries(): IterableIterator<[string, ServiceConfig]>;
    /**
     * Find a model card by id or display name within a service.
     * Returns undefined when the service or model is not found.
     */
    findModel(serviceId: string, modelName: string): ModelCard | undefined;
    /**
     * Find the service that owns a given model id. Searches every registered
     * service and returns the first whose model list contains the id. Used to
     * resolve a bare model id (without a service prefix) back to its service so
     * a per-service LLM client can be built. Returns undefined when no service
     * declares the model.
     */
    findServiceForModel(modelId: string): ServiceConfig | undefined;
    /**
     * Validate that a model belongs to a service.
     * Returns true for unknown services (custom) or services with empty model
     * lists (ollama, openrouter) — those allow any model.
     */
    isModelValid(serviceId: string, modelName: string): boolean;
    /**
     * Resolve the effective authentication token for a service.
     * For OAuth providers, reads the token from the env var specified in OAuthConfig.
     * For API-key providers, returns the provided apiKey.
     * Returns an empty string when no token is available.
     */
    resolveAuthToken(serviceId: string, apiKey: string): string;
    /** Return the authType for a service. Defaults to "api-key" for unknown services. */
    getAuthType(serviceId: string): "api-key" | "oauth";
}
export declare const providerRegistry: ProviderRegistry;
export declare function getServiceConfig(serviceName: string): ServiceConfig | undefined;
export declare function lookupModel(serviceName: string, modelName: string): ModelCard | undefined;
export declare function validateModelBelongsToService(serviceName: string, modelName: string): boolean;
export declare const UNKNOWN_MODEL_FALLBACK_MAX_TOKENS: number;
export declare const UNKNOWN_MODEL_FALLBACK_CONTEXT_WINDOW = 128000;
//# sourceMappingURL=provider-bank.d.ts.map