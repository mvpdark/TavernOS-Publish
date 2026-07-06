// packages/cli/src/llm-factory.ts
// LLM client factory — builds a client from project LLM configuration.

import {
  createLLMClient,
  providerRegistry,
  type LLMClient,
  type ProjectConfig,
} from "@tavernos/core";

/**
 * Build an LLM client from the project's LLM configuration.
 * The API key is resolved from the config or the `TAVERNOS_API_KEY` env var.
 * For OAuth providers (e.g., Grok), the OAuth token is resolved from
 * `XAI_OAUTH_TOKEN` env var or the `oauthToken` config field.
 */
export function createClientFromConfig(config: ProjectConfig): {
  client: LLMClient;
  model: string;
} {
  const llm = config.llm;
  const serviceName = llm.service;
  const serviceConfig = providerRegistry.get(serviceName);
  const isOAuth = providerRegistry.getAuthType(serviceName) === "oauth";

  // Resolve auth token based on authType
  let apiKey = llm.apiKey || process.env["TAVERNOS_API_KEY"] || "";
  let oauthToken = llm.oauthToken;

  if (isOAuth && serviceConfig?.oauth) {
    // OAuth provider: read token from env var specified in OAuthConfig
    const envOauthToken = process.env[serviceConfig.oauth.tokenEnvVar] ?? "";
    oauthToken = oauthToken || envOauthToken;
    // Also check XAI_API_KEY as fallback for users who have API key access
    apiKey = apiKey || process.env["XAI_API_KEY"] || "";
  }

  // Resolve baseUrl: explicit config > service default > empty
  const baseUrl = llm.baseUrl || serviceConfig?.baseUrl || "";

  // Build the effective LLMConfig, filling in service defaults where needed
  const effectiveConfig = {
    ...llm,
    apiKey,
    oauthToken,
    baseUrl,
    apiFormat: llm.apiFormat ?? serviceConfig?.apiFormat ?? "chat",
    stream: llm.stream ?? true,
  };

  const client = createLLMClient(effectiveConfig);
  return { client, model: llm.model };
}
