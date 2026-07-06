/** A single BM25 search hit. */
export interface BM25Hit {
    readonly id: number;
    readonly score: number;
}
/**
 * BM25 search engine for Chinese/English text.
 *
 * Tokenizes Chinese text by bigram and English text by whitespace, then
 * builds an in-memory inverted index for fast keyword retrieval. The scoring
 * uses the standard Okapi BM25 formula with configurable `k1` and `b`
 * parameters.
 *
 * This class is intentionally framework-agnostic — it knows nothing about
 * vector stores or embeddings. The caller is responsible for keeping the
 * BM25 document IDs in sync with the vector store's document IDs.
 */
export declare class BM25Search {
    private readonly k1;
    private readonly b;
    /** Document id → raw content (kept for potential re-indexing). */
    private readonly docs;
    /** Document id → token count (document length |d|). */
    private readonly docLengths;
    /** Document id → Map<term, term-frequency>. */
    private readonly termFreqs;
    /** Inverted index: term → Set of document ids containing the term. */
    private readonly invertedIndex;
    /** Running sum of all document lengths (for average computation). */
    private totalDocLength;
    /**
     * @param k1 Term frequency saturation parameter (default 1.5).
     * @param b  Length normalization parameter (default 0.75).
     */
    constructor(k1?: number, b?: number);
    /**
     * Add a document to the BM25 index.
     *
     * If a document with the same `id` already exists, it is removed first
     * and re-indexed with the new content.
     */
    addDocument(id: number, content: string): void;
    /**
     * Search for documents matching the query, returning the top-K results
     * ranked by BM25 score (descending).
     *
     * The BM25 score for a document d and query terms qi is:
     *
     *   score(d) = Σ  IDF(qi) * (f(qi,d) * (k1+1))
     *                          ─────────────────────────
     *                          f(qi,d) + k1*(1-b+b*|d|/avgdl)
     *
     * where IDF(qi) = log((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1).
     *
     * @param query The query string.
     * @param topK  Maximum number of results to return (default 10).
     * @returns Array of { id, score } sorted by score descending.
     */
    search(query: string, topK?: number): BM25Hit[];
    /**
     * Remove a document from the index.
     * Cleans up the inverted index and term-frequency maps.
     */
    removeDocument(id: number): void;
    /** Clear all documents from the index. */
    clear(): void;
    /** Get the number of indexed documents. */
    size(): number;
}
//# sourceMappingURL=bm25.d.ts.map