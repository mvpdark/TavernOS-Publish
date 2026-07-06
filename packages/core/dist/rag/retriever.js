import { BM25Search } from "./bm25.js";
import { approxTokens } from "../llm/token-utils.js";
/**
 * RAG retriever with budget control.
 * Embeds the query, searches the vector store, and truncates results to fit token budget.
 */
export class Retriever {
    embedder;
    store;
    config;
    /** Parallel BM25 keyword index kept in sync with the vector store. */
    bm25Search;
    constructor(embedder, store, config) {
        this.embedder = embedder;
        this.store = store;
        this.config = {
            topK: config?.topK ?? 5,
            minScore: config?.minScore ?? 0.0,
            maxTokens: config?.maxTokens ?? 2000,
            hybrid: config?.hybrid ?? false,
        };
        this.bm25Search = new BM25Search();
    }
    async retrieve(input) {
        // Delegate to hybrid retrieval when enabled.
        if (this.config.hybrid) {
            return this.hybridRetrieve(input);
        }
        const topK = input.topK ?? this.config.topK;
        const minScore = input.minScore ?? this.config.minScore;
        const maxTokens = input.maxTokens ?? this.config.maxTokens;
        // Embed the query
        const queryEmbedding = await this.embedder.embed(input.query);
        // Search vector store
        const allResults = this.store.search(queryEmbedding, input.scope, input.scopeId, topK, minScore);
        // Apply token budget
        let tokenUsage = 0;
        let truncated = false;
        const results = [];
        for (const result of allResults) {
            const docTokens = approxTokens(result.document.content);
            if (tokenUsage + docTokens > maxTokens) {
                truncated = true;
                break;
            }
            results.push(result);
            tokenUsage += docTokens;
        }
        return { results, tokenUsage, truncated };
    }
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
    async hybridRetrieve(input) {
        const topK = input.topK ?? this.config.topK;
        const minScore = input.minScore ?? this.config.minScore;
        const maxTokens = input.maxTokens ?? this.config.maxTokens;
        const rrfK = 60;
        // --- Cold-start: populate BM25 from the vector store if empty ---
        if (this.bm25Search.size() === 0) {
            this.rebuildBM25Index(input.scope, input.scopeId);
        }
        // --- Vector search (over-fetch 2x for fusion recall) ---
        const queryEmbedding = await this.embedder.embed(input.query);
        const vectorResults = this.store.search(queryEmbedding, input.scope, input.scopeId, topK * 2, minScore);
        // --- BM25 keyword search (over-fetch 2x for fusion recall) ---
        const bm25Results = this.bm25Search.search(input.query, topK * 2);
        // --- RRF (Reciprocal Rank Fusion) ---
        // score(d) = sum over each ranked list i of  1 / (rrf_k + rank_i(d))
        const rrf = new Map();
        const ensure = (id) => {
            let entry = rrf.get(id);
            if (!entry) {
                entry = { score: 0, document: undefined };
                rrf.set(id, entry);
            }
            return entry;
        };
        // Fuse vector results (rank is 1-based).
        vectorResults.forEach((result, index) => {
            const entry = ensure(result.document.id);
            entry.score += 1 / (rrfK + index + 1);
            entry.document = result.document;
        });
        // Fuse BM25 results (rank is 1-based).
        // Fetch the full document from the store for BM25-only hits.
        bm25Results.forEach((hit, index) => {
            const entry = ensure(hit.id);
            entry.score += 1 / (rrfK + index + 1);
            if (entry.document === undefined) {
                entry.document = this.store.getDocumentById(hit.id);
            }
        });
        // --- Sort by fused RRF score, drop orphaned entries, take topK ---
        const fused = [...rrf.values()]
            .filter((e) => e.document !== undefined)
            .map((e) => ({ document: e.document, score: e.score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        // --- Apply token budget ---
        let tokenUsage = 0;
        let truncated = false;
        const results = [];
        for (const result of fused) {
            const docTokens = approxTokens(result.document.content);
            if (tokenUsage + docTokens > maxTokens) {
                truncated = true;
                break;
            }
            results.push(result);
            tokenUsage += docTokens;
        }
        return { results, tokenUsage, truncated };
    }
    /**
     * Rebuild the BM25 keyword index from all documents currently in the
     * vector store for the given scope. Useful for cold-start or after
     * external modifications to the vector store.
     */
    rebuildBM25Index(scope, scopeId) {
        const documents = this.store.getDocuments(scope, scopeId);
        for (const doc of documents) {
            this.bm25Search.addDocument(doc.id, doc.content);
        }
    }
    /**
     * Add a document to the vector store.
     * Embeds the content and stores the embedding.
     */
    async addDocument(input) {
        const embedding = await this.embedder.embed(input.content);
        const id = this.store.addDocument({
            scope: input.scope,
            scopeId: input.scopeId,
            source: input.source,
            content: input.content,
            chunkIndex: input.chunkIndex ?? 0,
            metadata: input.metadata ?? {},
            embedding,
        });
        // Keep the BM25 keyword index in sync.
        this.bm25Search.addDocument(id, input.content);
        return id;
    }
    /**
     * Add multiple documents in batch.
     */
    async addDocuments(inputs) {
        // Batch embed all contents
        const embeddings = await this.embedder.embedBatch(inputs.map((i) => i.content));
        const ids = [];
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const id = this.store.addDocument({
                scope: input.scope,
                scopeId: input.scopeId,
                source: input.source,
                content: input.content,
                chunkIndex: input.chunkIndex ?? 0,
                metadata: input.metadata ?? {},
                embedding: embeddings[i],
            });
            // Keep the BM25 keyword index in sync.
            this.bm25Search.addDocument(id, input.content);
            ids.push(id);
        }
        return ids;
    }
}
//# sourceMappingURL=retriever.js.map