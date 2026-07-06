// packages/core/src/rag/types.ts
import { z } from "zod";
// ---------------------------------------------------------------------------
// Embedding Scope (three-level hierarchy)
// ---------------------------------------------------------------------------
export const EmbeddingScopeSchema = z.enum(["project", "character", "chat"]);
// ---------------------------------------------------------------------------
// Vector Document
// ---------------------------------------------------------------------------
export const VectorDocumentSchema = z.object({
    id: z.number().int(),
    scope: EmbeddingScopeSchema,
    scopeId: z.string(), // project id, character id, or chat session id
    source: z.string(), // file path or source identifier
    content: z.string(),
    chunkIndex: z.number().int().default(0),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: z.string().default(""),
});
// ---------------------------------------------------------------------------
// Embedder Config
// ---------------------------------------------------------------------------
export const EmbedderConfigSchema = z.object({
    type: z.enum(["stub", "openai"]),
    model: z.string().default("text-embedding-3-small"),
    dimensions: z.number().int().positive().default(1536),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
});
// ---------------------------------------------------------------------------
// Retriever Config
// ---------------------------------------------------------------------------
export const RetrieverConfigSchema = z.object({
    topK: z.number().int().min(1).max(100).default(5),
    minScore: z.number().min(0).max(1).default(0.0),
    maxTokens: z.number().int().positive().default(2000),
    /** Enable hybrid retrieval (vector + BM25 keyword search with RRF fusion). */
    hybrid: z.boolean().default(false),
});
//# sourceMappingURL=types.js.map