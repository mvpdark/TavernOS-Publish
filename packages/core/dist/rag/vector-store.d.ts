import type { VectorDocument, SearchResult, EmbeddingScope } from "./types.js";
/**
 * Compute cosine similarity between two vectors.
 * Returns 0-1 range (clamped, since embeddings are non-negative in most models).
 */
export declare function cosineSimilarity(a: readonly number[], b: readonly number[]): number;
/**
 * SQLite-backed vector store with HNSW approximate nearest neighbor search.
 *
 * When the optional `hnswlib-node` native module is available, an HNSW index
 * is maintained per (scope, scopeId) for fast ANN queries.  Search results
 * are always re-scored with exact cosine similarity to guarantee accuracy.
 *
 * If `hnswlib-node` is not installed, the store transparently falls back to
 * brute-force scanning (LIMIT 500 rows, exact cosine similarity).
 *
 * Embeddings are stored as JSON arrays in the `embedding` column.
 */
export declare class VectorStore {
    private readonly db;
    private readonly hnswIndices;
    private readonly hnswDir;
    private readonly indexDimensions;
    private static readonly HNSW_MAX_ELEMENTS;
    private static readonly HNSW_PERSIST_INTERVAL;
    private addCounter;
    /** Tracks the current capacity ceiling for HNSW indices, doubled on each
     *  resize so the index can grow beyond the initial HNSW_MAX_ELEMENTS. */
    private currentMaxElements;
    constructor(bookDir: string);
    private migrate;
    /**
     * Get or create an HNSW index for the given (scope, scopeId).
     *
     * On first access the index is either loaded from a persisted `.hnsw` file
     * (when `vector_meta.hnsw_built = 1`) or rebuilt from scratch using all
     * vectors currently in SQLite.  Subsequent calls return the cached in-memory
     * index.
     *
     * Returns `null` when `hnswlib-node` is not available, signalling the caller
     * to fall back to brute-force search.
     */
    private getHnswIndex;
    /**
     * Rebuild an HNSW index from scratch using all vectors in SQLite for the
     * given (scope, scopeId).
     *
     * The rebuilt index is saved to disk, marked as built in `vector_meta`, and
     * stored in the in-memory cache.  Returns `null` when there are no documents
     * to index or `hnswlib-node` is unavailable.
     */
    private rebuildHnswIndex;
    /**
     * Persist a cached HNSW index to its `.hnsw` file on disk.
     * No-op when the index is not currently in the cache.
     */
    private persistHnswIndex;
    addDocument(doc: Omit<VectorDocument, "id" | "createdAt"> & {
        embedding: readonly number[];
    }): number;
    search(queryEmbedding: readonly number[], scope: EmbeddingScope, scopeId: string, topK?: number, minScore?: number): SearchResult[];
    getDocuments(scope: EmbeddingScope, scopeId: string): VectorDocument[];
    /** Retrieve a single document by its numeric id. Returns undefined if not found. */
    getDocumentById(id: number): VectorDocument | undefined;
    deleteDocument(id: number): void;
    deleteBySource(scope: EmbeddingScope, scopeId: string, source: string): void;
    count(scope?: EmbeddingScope, scopeId?: string): number;
    close(): void;
}
//# sourceMappingURL=vector-store.d.ts.map