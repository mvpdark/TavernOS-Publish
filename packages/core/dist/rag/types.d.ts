import { z } from "zod";
export declare const EmbeddingScopeSchema: z.ZodEnum<["project", "character", "chat"]>;
export type EmbeddingScope = z.infer<typeof EmbeddingScopeSchema>;
export declare const VectorDocumentSchema: z.ZodObject<{
    id: z.ZodNumber;
    scope: z.ZodEnum<["project", "character", "chat"]>;
    scopeId: z.ZodString;
    source: z.ZodString;
    content: z.ZodString;
    chunkIndex: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    createdAt: string;
    scope: "chat" | "character" | "project";
    content: string;
    source: string;
    scopeId: string;
    chunkIndex: number;
    metadata: Record<string, unknown>;
}, {
    id: number;
    scope: "chat" | "character" | "project";
    content: string;
    source: string;
    scopeId: string;
    createdAt?: string | undefined;
    chunkIndex?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type VectorDocument = z.infer<typeof VectorDocumentSchema>;
export interface SearchResult {
    readonly document: VectorDocument;
    readonly score: number;
}
export interface Embedder {
    readonly dimensions: number;
    embed(text: string): Promise<readonly number[]>;
    embedBatch(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}
export declare const EmbedderConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["stub", "openai"]>;
    model: z.ZodDefault<z.ZodString>;
    dimensions: z.ZodDefault<z.ZodNumber>;
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "openai" | "stub";
    model: string;
    dimensions: number;
    baseUrl?: string | undefined;
    apiKey?: string | undefined;
}, {
    type: "openai" | "stub";
    baseUrl?: string | undefined;
    apiKey?: string | undefined;
    model?: string | undefined;
    dimensions?: number | undefined;
}>;
export type EmbedderConfig = z.infer<typeof EmbedderConfigSchema>;
export declare const RetrieverConfigSchema: z.ZodObject<{
    topK: z.ZodDefault<z.ZodNumber>;
    minScore: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    /** Enable hybrid retrieval (vector + BM25 keyword search with RRF fusion). */
    hybrid: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    maxTokens: number;
    topK: number;
    minScore: number;
    hybrid: boolean;
}, {
    maxTokens?: number | undefined;
    topK?: number | undefined;
    minScore?: number | undefined;
    hybrid?: boolean | undefined;
}>;
export type RetrieverConfig = z.infer<typeof RetrieverConfigSchema>;
//# sourceMappingURL=types.d.ts.map