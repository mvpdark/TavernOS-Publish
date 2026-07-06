// packages/core/src/narrative/link-graph.ts
// LinkGraph — fact relationship graph for one-hop diffusion in retrieval.
//
// Stores typed edges between StoryFact IDs so that the retrieval pipeline can
// expand a seed set of facts into their immediate neighbourhood. Each edge
// carries a weight (importance of the relationship) and a semantic type
// (causal, temporal, character, thematic, contradiction).
//
// Design principles:
//   • SQLite-backed (better-sqlite3) with WAL journal mode.
//   • Edges are directed (fromFactId -> toFactId) but queried bidirectionally.
//   • addEdge is idempotent: re-adding an existing edge takes the max weight.
//   • diffuse() performs one-hop expansion, sorting neighbours by weight.
//
// All SQL columns use snake_case; all TypeScript fields use camelCase.
import Database from "better-sqlite3";
import { z } from "zod";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
/** Semantic type of a link between two facts. */
export const LinkEdgeTypeSchema = z.enum([
    "causal", // A causes B
    "temporal", // A happens before B
    "character", // A and B share a character
    "thematic", // A and B share a theme
    "contradiction", // A contradicts B
]);
/** Schema for validating edge rows read from SQLite. */
const LinkEdgeRowSchema = z.object({
    from_fact_id: z.string(),
    to_fact_id: z.string(),
    type: LinkEdgeTypeSchema,
    weight: z.number(),
    created_at: z.string(),
});
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default depth for neighbour traversal (one-hop). */
const DEFAULT_MAX_DEPTH = 1;
/** Default result cap for diffuse(). */
const DEFAULT_MAX_RESULTS = 20;
// ---------------------------------------------------------------------------
// LinkGraph
// ---------------------------------------------------------------------------
export class LinkGraph {
    db;
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.initSchema();
    }
    // --- Schema ---
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS fact_links (
        from_fact_id  TEXT NOT NULL,
        to_fact_id    TEXT NOT NULL,
        type          TEXT NOT NULL,
        weight        REAL NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL,
        PRIMARY KEY (from_fact_id, to_fact_id, type)
      );

      CREATE INDEX IF NOT EXISTS idx_links_from ON fact_links(from_fact_id);
      CREATE INDEX IF NOT EXISTS idx_links_to   ON fact_links(to_fact_id);
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            fromFactId: row.from_fact_id,
            toFactId: row.to_fact_id,
            type: row.type,
            weight: row.weight,
            createdAt: row.created_at,
        };
    }
    // --- Public API ---
    /**
     * Add or update an edge between two facts.
     *
     * If an edge with the same (from, to, type) already exists, the weight is
     * updated to the maximum of the existing and new weight. The created_at
     * timestamp is preserved on update.
     */
    addEdge(fromFactId, toFactId, type, weight) {
        const now = new Date().toISOString();
        // UPSERT: on conflict, keep the larger weight but do not overwrite
        // the original created_at.
        this.db.prepare(`
      INSERT INTO fact_links (from_fact_id, to_fact_id, type, weight, created_at)
      VALUES (@from_fact_id, @to_fact_id, @type, @weight, @created_at)
      ON CONFLICT(from_fact_id, to_fact_id, type) DO UPDATE SET
        weight = MAX(excluded.weight, fact_links.weight)
    `).run({
            from_fact_id: fromFactId,
            to_fact_id: toFactId,
            type,
            weight,
            created_at: now,
        });
    }
    /**
     * Remove all edges between two facts (both directions, all types).
     *
     * The link graph is conceptually undirected for removal purposes: calling
     * removeEdge(A, B) also clears B -> A.
     */
    removeEdge(fromFactId, toFactId) {
        this.db.prepare(`
      DELETE FROM fact_links
      WHERE (from_fact_id = @a AND to_fact_id = @b)
         OR (from_fact_id = @b AND to_fact_id = @a)
    `).run({ a: fromFactId, b: toFactId });
    }
    /**
     * Get one-hop neighbours of a fact.
     *
     * @param factId   the seed fact ID.
     * @param maxDepth maximum traversal depth (default 1 = one-hop only).
     *                  Currently only depth 1 is fully implemented; higher
     *                  depths are reserved for future expansion.
     * @returns all edges touching the fact within the given depth.
     */
    getNeighbors(factId, maxDepth = DEFAULT_MAX_DEPTH) {
        // One-hop: all edges where factId is either endpoint.
        if (maxDepth <= 1) {
            const rows = this.db.prepare(`
        SELECT * FROM fact_links
        WHERE from_fact_id = ? OR to_fact_id = ?
        ORDER BY weight DESC
      `).all(factId, factId);
            return rows.map((r) => this.mapRow(LinkEdgeRowSchema.parse(r)));
        }
        // Future expansion: BFS for multi-hop. For now, fall back to one-hop
        // to avoid returning unbounded results without a visited-set guard.
        return this.getNeighbors(factId, 1);
    }
    /**
     * Get all edges from or to a fact (alias for one-hop neighbours).
     */
    getEdges(factId) {
        const rows = this.db.prepare(`
      SELECT * FROM fact_links
      WHERE from_fact_id = ? OR to_fact_id = ?
      ORDER BY weight DESC
    `).all(factId, factId);
        return rows.map((r) => this.mapRow(LinkEdgeRowSchema.parse(r)));
    }
    /**
     * One-hop diffusion: given a set of fact IDs, return related fact IDs
     * sorted by edge weight (descending).
     *
     * Input IDs are excluded from the output (we only return new neighbours).
     * When a neighbour is reachable from multiple seed facts, the highest
     * edge weight wins and it appears only once.
     *
     * @param factIds    seed set of fact IDs.
     * @param maxResults maximum number of neighbour IDs to return (default 20).
     */
    diffuse(factIds, maxResults = DEFAULT_MAX_RESULTS) {
        if (factIds.length === 0)
            return [];
        // Build the IN-clause placeholders.
        const placeholders = factIds.map(() => "?").join(", ");
        // Query all edges where either endpoint is in the seed set.
        const rows = this.db.prepare(`
      SELECT * FROM fact_links
      WHERE from_fact_id IN (${placeholders}) OR to_fact_id IN (${placeholders})
      ORDER BY weight DESC
    `).all(...factIds, ...factIds);
        // Build the seed set for fast exclusion.
        const seedSet = new Set(factIds);
        // Collect neighbour IDs with their best (max) weight.
        // Map<neighbourId, maxWeight>
        const neighbourWeights = new Map();
        for (const row of rows) {
            const edge = this.mapRow(LinkEdgeRowSchema.parse(row));
            // Determine the neighbour: the endpoint that is NOT in the seed set.
            let neighbourId = null;
            if (!seedSet.has(edge.fromFactId)) {
                neighbourId = edge.fromFactId;
            }
            else if (!seedSet.has(edge.toFactId)) {
                neighbourId = edge.toFactId;
            }
            // If both endpoints are in the seed set (internal edge), skip —
            // we only want to surface NEW facts.
            if (neighbourId === null)
                continue;
            const existing = neighbourWeights.get(neighbourId) ?? -Infinity;
            if (edge.weight > existing) {
                neighbourWeights.set(neighbourId, edge.weight);
            }
        }
        // Sort by weight descending, then by ID for deterministic ordering.
        const sorted = [...neighbourWeights.entries()].sort((a, b) => {
            if (b[1] !== a[1])
                return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        });
        return sorted.slice(0, maxResults).map(([id]) => id);
    }
    /**
     * Compute graph statistics.
     *
     * @returns totalEdges, totalNodes (distinct fact IDs), and avgDegree
     *          (totalEdges * 2 / totalNodes, since edges are counted
     *          bidirectionally for degree purposes).
     */
    getStats() {
        const edgeCount = this.db.prepare("SELECT COUNT(*) AS count FROM fact_links").get();
        const nodeCount = this.db.prepare(`
      SELECT COUNT(DISTINCT fact_id) AS count FROM (
        SELECT from_fact_id AS fact_id FROM fact_links
        UNION
        SELECT to_fact_id AS fact_id FROM fact_links
      )
    `).get();
        const totalEdges = edgeCount.count;
        const totalNodes = nodeCount.count;
        const avgDegree = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;
        return { totalEdges, totalNodes, avgDegree };
    }
    /** Close the database connection. */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=link-graph.js.map