// packages/core/src/rag/bm25.ts
// BM25 keyword search engine — zero-dependency implementation.
// Provides lexical search to complement vector (semantic) search.
// Used by the hybrid retriever for fusion search (vector + keyword).
// ===========================================================================
// Part 1: Tokenizer
// ===========================================================================
/**
 * Unicode range for CJK Unified Ideographs and Extension A.
 * Used to distinguish Chinese characters from Latin/digit runs.
 */
const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf]/;
/**
 * Tokenize text for BM25 indexing and querying.
 *
 * - Chinese characters: bigram (2-char sliding window). A single isolated
 *   CJK character is kept as a unigram so very short queries still match.
 * - Latin / digits: lowercased and split on non-alphanumeric boundaries,
 *   discarding empty tokens (effectively lowercase + whitespace split +
 *   punctuation removal).
 *
 * The two strategies are applied to interleaved CJK / non-CJK runs so that
 * mixed-language text (common in Chinese web fiction) is handled correctly.
 */
function tokenize(text) {
    const tokens = [];
    const lower = text.toLowerCase();
    const len = lower.length;
    let i = 0;
    while (i < len) {
        const ch = lower[i];
        if (CJK_RANGE.test(ch)) {
            // Gather a contiguous run of CJK characters.
            let j = i;
            while (j < len && CJK_RANGE.test(lower[j]))
                j++;
            const run = lower.slice(i, j);
            // Bigram sliding window; unigram fallback for single-char runs.
            if (run.length === 1) {
                tokens.push(run);
            }
            else {
                for (let k = 0; k < run.length - 1; k++) {
                    tokens.push(run.slice(k, k + 2));
                }
            }
            i = j;
        }
        else {
            // Gather a contiguous non-CJK run and extract alphanumeric words.
            let j = i;
            while (j < len && !CJK_RANGE.test(lower[j]))
                j++;
            const segment = lower.slice(i, j);
            const words = segment.match(/[a-z0-9]+/g);
            if (words)
                tokens.push(...words);
            i = j;
        }
    }
    return tokens;
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
export class BM25Search {
    k1;
    b;
    /** Document id → raw content (kept for potential re-indexing). */
    docs = new Map();
    /** Document id → token count (document length |d|). */
    docLengths = new Map();
    /** Document id → Map<term, term-frequency>. */
    termFreqs = new Map();
    /** Inverted index: term → Set of document ids containing the term. */
    invertedIndex = new Map();
    /** Running sum of all document lengths (for average computation). */
    totalDocLength = 0;
    /**
     * @param k1 Term frequency saturation parameter (default 1.5).
     * @param b  Length normalization parameter (default 0.75).
     */
    constructor(k1 = 1.5, b = 0.75) {
        this.k1 = k1;
        this.b = b;
    }
    /**
     * Add a document to the BM25 index.
     *
     * If a document with the same `id` already exists, it is removed first
     * and re-indexed with the new content.
     */
    addDocument(id, content) {
        // Re-index: remove the old version if it exists.
        if (this.docs.has(id)) {
            this.removeDocument(id);
        }
        const tokens = tokenize(content);
        this.docs.set(id, content);
        this.docLengths.set(id, tokens.length);
        this.totalDocLength += tokens.length;
        // Build per-document term frequency map.
        const tf = new Map();
        for (const token of tokens) {
            tf.set(token, (tf.get(token) ?? 0) + 1);
        }
        this.termFreqs.set(id, tf);
        // Update the inverted index.
        for (const term of tf.keys()) {
            let postings = this.invertedIndex.get(term);
            if (!postings) {
                postings = new Set();
                this.invertedIndex.set(term, postings);
            }
            postings.add(id);
        }
    }
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
    search(query, topK = 10) {
        const N = this.docs.size;
        if (N === 0)
            return [];
        const queryTokens = tokenize(query);
        if (queryTokens.length === 0)
            return [];
        const avgdl = N > 0 ? this.totalDocLength / N : 0;
        // Use unique query terms (a term appearing twice in the query is counted once).
        const queryTerms = new Set(queryTokens);
        // Accumulate scores per candidate document.
        const scores = new Map();
        for (const term of queryTerms) {
            const postings = this.invertedIndex.get(term);
            if (!postings || postings.size === 0)
                continue;
            const nqi = postings.size; // document frequency of the term
            // IDF: log((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
            const idf = Math.log((N - nqi + 0.5) / (nqi + 0.5) + 1);
            for (const docId of postings) {
                const tfMap = this.termFreqs.get(docId);
                const f = tfMap?.get(term) ?? 0;
                if (f === 0)
                    continue;
                const docLen = this.docLengths.get(docId) ?? 0;
                const denom = f + this.k1 * (1 - this.b + this.b * (avgdl > 0 ? docLen / avgdl : 0));
                const termScore = (idf * (f * (this.k1 + 1))) / denom;
                scores.set(docId, (scores.get(docId) ?? 0) + termScore);
            }
        }
        // Sort by score descending and return top-K.
        return [...scores.entries()]
            .map(([id, score]) => ({ id, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
    /**
     * Remove a document from the index.
     * Cleans up the inverted index and term-frequency maps.
     */
    removeDocument(id) {
        if (!this.docs.has(id))
            return;
        const tf = this.termFreqs.get(id);
        if (tf) {
            for (const term of tf.keys()) {
                const postings = this.invertedIndex.get(term);
                if (postings) {
                    postings.delete(id);
                    if (postings.size === 0) {
                        this.invertedIndex.delete(term);
                    }
                }
            }
        }
        this.totalDocLength -= this.docLengths.get(id) ?? 0;
        this.docs.delete(id);
        this.docLengths.delete(id);
        this.termFreqs.delete(id);
    }
    /** Clear all documents from the index. */
    clear() {
        this.docs.clear();
        this.docLengths.clear();
        this.termFreqs.clear();
        this.invertedIndex.clear();
        this.totalDocLength = 0;
    }
    /** Get the number of indexed documents. */
    size() {
        return this.docs.size;
    }
}
//# sourceMappingURL=bm25.js.map