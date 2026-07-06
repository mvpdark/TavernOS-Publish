import { z } from "zod";
/** Semantic type of a link between two facts. */
export declare const LinkEdgeTypeSchema: z.ZodEnum<["causal", "temporal", "character", "thematic", "contradiction"]>;
export type LinkEdgeType = z.infer<typeof LinkEdgeTypeSchema>;
/** A single directed edge in the link graph. */
export interface LinkEdge {
    readonly fromFactId: string;
    readonly toFactId: string;
    readonly type: LinkEdgeType;
    readonly weight: number;
    readonly createdAt: string;
}
export declare class LinkGraph {
    private readonly db;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    /**
     * Add or update an edge between two facts.
     *
     * If an edge with the same (from, to, type) already exists, the weight is
     * updated to the maximum of the existing and new weight. The created_at
     * timestamp is preserved on update.
     */
    addEdge(fromFactId: string, toFactId: string, type: LinkEdgeType, weight: number): void;
    /**
     * Remove all edges between two facts (both directions, all types).
     *
     * The link graph is conceptually undirected for removal purposes: calling
     * removeEdge(A, B) also clears B -> A.
     */
    removeEdge(fromFactId: string, toFactId: string): void;
    /**
     * Get one-hop neighbours of a fact.
     *
     * @param factId   the seed fact ID.
     * @param maxDepth maximum traversal depth (default 1 = one-hop only).
     *                  Currently only depth 1 is fully implemented; higher
     *                  depths are reserved for future expansion.
     * @returns all edges touching the fact within the given depth.
     */
    getNeighbors(factId: string, maxDepth?: number): LinkEdge[];
    /**
     * Get all edges from or to a fact (alias for one-hop neighbours).
     */
    getEdges(factId: string): LinkEdge[];
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
    diffuse(factIds: readonly string[], maxResults?: number): string[];
    /**
     * Compute graph statistics.
     *
     * @returns totalEdges, totalNodes (distinct fact IDs), and avgDegree
     *          (totalEdges * 2 / totalNodes, since edges are counted
     *          bidirectionally for degree purposes).
     */
    getStats(): {
        totalEdges: number;
        totalNodes: number;
        avgDegree: number;
    };
    /** Close the database connection. */
    close(): void;
}
//# sourceMappingURL=link-graph.d.ts.map