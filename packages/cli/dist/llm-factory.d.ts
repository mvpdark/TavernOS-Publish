import { type LLMClient, type ProjectConfig } from "@tavernos/core";
/**
 * Build an LLM client from the project's LLM configuration.
 * The API key is resolved from the config or the `TAVERNOS_API_KEY` env var.
 * For OAuth providers (e.g., Grok), the OAuth token is resolved from
 * `XAI_OAUTH_TOKEN` env var or the `oauthToken` config field.
 */
export declare function createClientFromConfig(config: ProjectConfig): {
    client: LLMClient;
    model: string;
};
//# sourceMappingURL=llm-factory.d.ts.map