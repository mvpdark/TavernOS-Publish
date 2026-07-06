import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
// Lazy-load better-sqlite3 — wrapped in try-catch so the server doesn't
// crash if the native module is missing or has an ABI mismatch (e.g. in
// an Electron packaged app where the Node.js ABI may differ).
const nodeRequire = createRequire(import.meta.url);
// Typed as the better-sqlite3 module export (the Database constructor) so
// `new Database(...)` is type-checked instead of falling back to `any`.
let Database = null;
try {
    Database = nodeRequire("better-sqlite3");
}
catch {
    // better-sqlite3 not available — RAG features will be disabled
}
let hnswlib = null;
try {
    hnswlib = nodeRequire("hnswlib-node");
}
catch {
    // hnswlib-node not available — fall back to brute-force search
}
function mapDoc(row) {
    return {
        id: row.id,
        scope: row.scope,
        scopeId: row.scope_id,
        source: row.source,
        content: row.content,
        chunkIndex: row.chunk_index,
        metadata: JSON.parse(row.metadata || "{}"),
        createdAt: row.created_at,
    };
}
/**
 * Compute cosine similarity between two vectors.
 * Returns 0-1 range (clamped, since embeddings are non-negative in most models).
 */
export function cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        const av = a[i];
        const bv = b[i];
        dot += av * bv;
        normA += av * av;
        normB += bv * bv;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0)
        return 0;
    return dot / denom;
}
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
export class VectorStore {
    db;
    // HNSW index cache: key = `${scope}:${scopeId}`
    hnswIndices = new Map();
    hnswDir;
    indexDimensions = new Map();
    static HNSW_MAX_ELEMENTS = 10000;
    static HNSW_PERSIST_INTERVAL = 50;
    addCounter = 0;
    constructor(bookDir) {
        if (!Database) {
            throw new Error("better-sqlite3 is not available — RAG vector store cannot be initialized.");
        }
        const storyDir = join(bookDir, "story");
        // Synchronous mkdir is intentional: better-sqlite3 (used below) is itself
        // a synchronous native binding. The directory must exist before the DB
        // file is created, and making only this call async would be inconsistent.
        mkdirSync(storyDir, { recursive: true });
        this.hnswDir = join(storyDir, "hnsw");
        mkdirSync(this.hnswDir, { recursive: true });
        const dbPath = join(storyDir, "vectors.db");
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.migrate();
    }
    migrate() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS vector_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL,
        scope_id TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        embedding TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_vdocs_scope ON vector_documents(scope, scope_id);
      CREATE INDEX IF NOT EXISTS idx_vdocs_source ON vector_documents(source);
      CREATE TABLE IF NOT EXISTS vector_meta (
        scope TEXT NOT NULL,
        scope_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        hnsw_built INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (scope, scope_id)
      );
    `);
    }
    // -------------------------------------------------------------------------
    // HNSW index management
    // -------------------------------------------------------------------------
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
    getHnswIndex(scope, scopeId, dimensions) {
        const key = `${scope}:${scopeId}`;
        const cached = this.hnswIndices.get(key);
        if (cached)
            return cached;
        if (!hnswlib)
            return null;
        // Check vector_meta for an existing record
        const meta = this.db.prepare(`SELECT dimensions, hnsw_built FROM vector_meta WHERE scope = ? AND scope_id = ?`).get(scope, scopeId);
        const dim = meta?.dimensions ?? dimensions;
        if (!meta) {
            this.db.prepare(`INSERT INTO vector_meta (scope, scope_id, dimensions, hnsw_built) VALUES (?, ?, ?, 0)`).run(scope, scopeId, dim);
        }
        const index = new hnswlib.HierarchicalNSW("cosine", dim);
        index.initIndex(VectorStore.HNSW_MAX_ELEMENTS, 16, 200);
        // Only load from disk if the index was previously built and not invalidated
        const hnswPath = join(this.hnswDir, `${scope}_${scopeId}.hnsw`);
        if (meta?.hnsw_built === 1) {
            try {
                index.load(hnswPath);
                this.hnswIndices.set(key, index);
                this.indexDimensions.set(key, dim);
                return index;
            }
            catch {
                // Load failed (corrupted or missing file) — fall through to rebuild
            }
        }
        // Rebuild from SQLite
        return this.rebuildHnswIndex(scope, scopeId);
    }
    /**
     * Rebuild an HNSW index from scratch using all vectors in SQLite for the
     * given (scope, scopeId).
     *
     * The rebuilt index is saved to disk, marked as built in `vector_meta`, and
     * stored in the in-memory cache.  Returns `null` when there are no documents
     * to index or `hnswlib-node` is unavailable.
     */
    rebuildHnswIndex(scope, scopeId) {
        const key = `${scope}:${scopeId}`;
        if (!hnswlib)
            return null;
        const rows = this.db.prepare(`SELECT id, embedding FROM vector_documents WHERE scope = ? AND scope_id = ? ORDER BY id`).all(scope, scopeId);
        if (rows.length === 0) {
            return null;
        }
        // Infer dimensions from the first embedding
        const firstEmbedding = JSON.parse(rows[0].embedding);
        const dim = firstEmbedding.length;
        const index = new hnswlib.HierarchicalNSW("cosine", dim);
        index.initIndex(VectorStore.HNSW_MAX_ELEMENTS, 16, 200);
        for (const row of rows) {
            const embedding = JSON.parse(row.embedding);
            index.addPoint(embedding, row.id);
        }
        // Persist to disk
        const hnswPath = join(this.hnswDir, `${scope}_${scopeId}.hnsw`);
        try {
            index.save(hnswPath);
        }
        catch {
            // Ignore save errors — the in-memory index still works
        }
        // Update meta: mark as built and record dimensions
        this.db.prepare(`INSERT OR REPLACE INTO vector_meta (scope, scope_id, dimensions, hnsw_built) VALUES (?, ?, ?, 1)`).run(scope, scopeId, dim);
        this.hnswIndices.set(key, index);
        this.indexDimensions.set(key, dim);
        return index;
    }
    /**
     * Persist a cached HNSW index to its `.hnsw` file on disk.
     * No-op when the index is not currently in the cache.
     */
    persistHnswIndex(scope, scopeId) {
        const key = `${scope}:${scopeId}`;
        const index = this.hnswIndices.get(key);
        if (!index)
            return;
        const hnswPath = join(this.hnswDir, `${scope}_${scopeId}.hnsw`);
        try {
            index.save(hnswPath);
        }
        catch {
            // Ignore save errors
        }
    }
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------
    addDocument(doc) {
        const stmt = this.db.prepare(`INSERT INTO vector_documents (scope, scope_id, source, content, chunk_index, embedding, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const result = stmt.run(doc.scope, doc.scopeId, doc.source, doc.content, doc.chunkIndex, JSON.stringify(doc.embedding), JSON.stringify(doc.metadata ?? {}));
        const id = Number(result.lastInsertRowid);
        // Update HNSW index if available
        if (hnswlib) {
            const index = this.getHnswIndex(doc.scope, doc.scopeId, doc.embedding.length);
            if (index) {
                // Resize if approaching capacity
                if (index.getPointCount() >= VectorStore.HNSW_MAX_ELEMENTS) {
                    index.resizeIndex(VectorStore.HNSW_MAX_ELEMENTS * 2);
                }
                index.addPoint(Array.from(doc.embedding), id);
                this.addCounter++;
                if (this.addCounter % VectorStore.HNSW_PERSIST_INTERVAL === 0) {
                    this.persistHnswIndex(doc.scope, doc.scopeId);
                }
            }
        }
        return id;
    }
    search(queryEmbedding, scope, scopeId, topK = 5, minScore = 0) {
        // Try HNSW ANN search first
        const hnswIndex = this.getHnswIndex(scope, scopeId, queryEmbedding.length);
        if (hnswIndex && hnswIndex.getPointCount() > 0) {
            // Over-fetch for better recall, then re-score with exact cosine
            const fetchK = Math.max(topK * 4, 50);
            const result = hnswIndex.searchKnn(Array.from(queryEmbedding), fetchK);
            // Convert to plain array — hnswlib-node may return typed arrays at runtime
            const candidateIds = Array.from(result.neighbors).filter((id) => id > 0);
            if (candidateIds.length > 0) {
                // Load candidate documents from SQLite and re-score with exact cosine
                const placeholders = candidateIds.map(() => "?").join(",");
                const rows = this.db.prepare(`SELECT * FROM vector_documents WHERE id IN (${placeholders})`).all(...candidateIds);
                const results = rows
                    .map((row) => {
                    const embedding = JSON.parse(row.embedding);
                    const score = cosineSimilarity(queryEmbedding, embedding);
                    return { document: mapDoc(row), score };
                })
                    .filter((r) => r.score >= minScore)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, topK);
                return results;
            }
        }
        // Fallback: brute-force search
        const rows = this.db.prepare(`SELECT * FROM vector_documents WHERE scope = ? AND scope_id = ? ORDER BY id LIMIT 500`).all(scope, scopeId);
        const results = rows
            .map((row) => {
            const embedding = JSON.parse(row.embedding);
            const score = cosineSimilarity(queryEmbedding, embedding);
            return { document: mapDoc(row), score };
        })
            .filter((r) => r.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        return results;
    }
    getDocuments(scope, scopeId) {
        return this.db.prepare(`SELECT * FROM vector_documents WHERE scope = ? AND scope_id = ? ORDER BY chunk_index`).all(scope, scopeId).map(mapDoc);
    }
    /** Retrieve a single document by its numeric id. Returns undefined if not found. */
    getDocumentById(id) {
        const row = this.db.prepare(`SELECT * FROM vector_documents WHERE id = ?`).get(id);
        return row ? mapDoc(row) : undefined;
    }
    deleteDocument(id) {
        // Look up scope/scopeId before deleting so we can invalidate the HNSW cache
        const row = this.db.prepare(`SELECT scope, scope_id FROM vector_documents WHERE id = ?`).get(id);
        this.db.prepare(`DELETE FROM vector_documents WHERE id = ?`).run(id);
        // HNSW doesn't support single-point deletion — mark for rebuild on next access
        if (row) {
            const key = `${row.scope}:${row.scope_id}`;
            this.hnswIndices.delete(key);
            this.db.prepare(`UPDATE vector_meta SET hnsw_built = 0 WHERE scope = ? AND scope_id = ?`).run(row.scope, row.scope_id);
        }
    }
    deleteBySource(scope, scopeId, source) {
        this.db.prepare(`DELETE FROM vector_documents WHERE scope = ? AND scope_id = ? AND source = ?`).run(scope, scopeId, source);
        // Invalidate HNSW cache — index will be rebuilt from SQLite on next search
        const key = `${scope}:${scopeId}`;
        this.hnswIndices.delete(key);
        this.db.prepare(`UPDATE vector_meta SET hnsw_built = 0 WHERE scope = ? AND scope_id = ?`).run(scope, scopeId);
    }
    count(scope, scopeId) {
        if (scope && scopeId) {
            const row = this.db.prepare(`SELECT COUNT(*) as count FROM vector_documents WHERE scope = ? AND scope_id = ?`).get(scope, scopeId);
            return row.count;
        }
        const row = this.db.prepare(`SELECT COUNT(*) as count FROM vector_documents`).get();
        return row.count;
    }
    close() {
        // Persist all cached HNSW indices before closing the database
        for (const key of this.hnswIndices.keys()) {
            const sep = key.indexOf(":");
            const scope = key.slice(0, sep);
            const scopeId = key.slice(sep + 1);
            this.persistHnswIndex(scope, scopeId);
        }
        this.hnswIndices.clear();
        this.db.close();
    }
}
//# sourceMappingURL=vector-store.js.map