import type { Embedder, EmbeddingScope, SearchResult, RetrieverConfig } from "./types.js";
import { VectorStore } from "./vector-store.js";
export interface RetrieveInput {
    readonly query: string;
    readonly scope: EmbeddingScope;
    readonly scopeId: string;
    readonly topK?: number;
    readonly minScore?: number;
    readonly maxTokens?: number;
}
export interface RetrieveResult {
    readonly results: SearchResult[];
    readonly tokenUsage: number;
    readonly truncated: boolean;
}
/**
 * RAG retriever with budget control.
 * Embeds the query, searches the vector store, and truncates results to fit token budget.
 */
export declare class Retriever {
    private readonly embedder;
    private readonly store;
    private readonly config;
    /** Parallel BM25 keyword index kept in sync with the vector store. */
    private readonly bm25Search;
    constructor(embedder: Embedder, store: VectorStore, config?: Partial<RetrieverConfig>);
    retrieve(input: RetrieveInput): Promise<RetrieveResult>;
    /**
     * Hybrid retrieval combining vector (semantic) search with BM25 keyword
     * search using Reciprocal Rank Fusion (RRF).
     *
     * Strategy:
     *   1. Vector search with topK*2 candidates.
     *   2. BM25 keyword search with topK*2 candidates.
     *   3. Fuse the two ranked lists with RRF: score(d) = Σ 1/(rrf_k + rank_i(d)).
     *   4. Sort by fused score, take topK, apply token budget.
     *
     * The BM25 index is lazily populated from the vector store on first use
     * (cold-start), then maintained incrementally via addDocument/addDocuments.
     */
    private hybridRetrieve;
    /**
     * Rebuild the BM25 keyword index from all documents currently in the
     * vector store for the given scope. Useful for cold-start or after
     * external modifications to the vector store.
     */
    rebuildBM25Index(scope: EmbeddingScope, scopeId: string): void;
    /**
     * Add a document to the vector store.
     * Embeds the content and stores the embedding.
     */
    addDocument(input: {
        scope: EmbeddingScope;
        scopeId: string;
        source: string;
        content: string;
        chunkIndex?: number;
        metadata?: Record<string, unknown>;
    }): Promise<number>;
    /**
     * Add multiple documents in batch.
     */
    addDocuments(inputs: ReadonlyArray<{
        scope: EmbeddingScope;
        scopeId: string;
        source: string;
        content: string;
        chunkIndex?: number;
        metadata?: Record<string, unknown>;
    }>): Promise<number[]>;
    /**
     * Remove a document from both the vector store and the BM25 index,
     * keeping the two indexes in sync.
     */
    removeDocument(id: number): void;
}
//# sourceMappingURL=retriever.d.ts.map