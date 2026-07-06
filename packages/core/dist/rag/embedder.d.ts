import type { Embedder, EmbedderConfig } from "./types.js";
/**
 * Deterministic stub embedder for testing.
 * Uses a hash-based pseudo-embedding: each character contributes to a dimension.
 * Not semantically meaningful but deterministic and fast.
 */
export declare class StubEmbedder implements Embedder {
    readonly dimensions: number;
    constructor(dimensions?: number);
    embed(text: string): Promise<readonly number[]>;
    embedBatch(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
    private computeEmbedding;
}
/**
 * OpenAI embeddings API embedder.
 * Uses the /v1/embeddings endpoint.
 */
export declare class OpenAIEmbedder implements Embedder {
    readonly dimensions: number;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    constructor(config: EmbedderConfig);
    embed(text: string): Promise<readonly number[]>;
    embedBatch(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}
/**
 * Create an embedder from config.
 */
export declare function createEmbedder(config: EmbedderConfig): Embedder;
//# sourceMappingURL=embedder.d.ts.map