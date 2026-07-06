/**
 * Deterministic stub embedder for testing.
 * Uses a hash-based pseudo-embedding: each character contributes to a dimension.
 * Not semantically meaningful but deterministic and fast.
 */
export class StubEmbedder {
    dimensions;
    constructor(dimensions = 64) {
        this.dimensions = dimensions;
    }
    async embed(text) {
        return this.computeEmbedding(text);
    }
    async embedBatch(texts) {
        return texts.map((t) => this.computeEmbedding(t));
    }
    computeEmbedding(text) {
        const vec = new Array(this.dimensions).fill(0);
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const idx = charCode % this.dimensions;
            vec[idx] += 1;
        }
        // Normalize to unit length
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < vec.length; i++) {
                vec[i] = vec[i] / norm;
            }
        }
        return vec;
    }
}
/**
 * OpenAI embeddings API embedder.
 * Uses the /v1/embeddings endpoint.
 */
export class OpenAIEmbedder {
    dimensions;
    apiKey;
    baseUrl;
    model;
    constructor(config) {
        this.apiKey = config.apiKey ?? process.env["OPENAI_API_KEY"] ?? "";
        this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
        this.model = config.model;
        this.dimensions = config.dimensions;
    }
    async embed(text) {
        const results = await this.embedBatch([text]);
        if (results.length === 0) {
            throw new Error("Embedding API returned empty results");
        }
        return results[0];
    }
    async embedBatch(texts) {
        const response = await fetch(`${this.baseUrl}/embeddings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                input: texts,
                dimensions: this.dimensions,
            }),
        });
        if (!response.ok) {
            throw new Error(`OpenAI embeddings API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.data.map((d) => d.embedding);
    }
}
/**
 * Create an embedder from config.
 */
export function createEmbedder(config) {
    switch (config.type) {
        case "stub":
            return new StubEmbedder(config.dimensions);
        case "openai":
            return new OpenAIEmbedder(config);
        default:
            throw new Error(`Unknown embedder type: ${config.type}`);
    }
}
//# sourceMappingURL=embedder.js.map