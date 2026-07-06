import type { StoryFact, StoryCategory, FactTier, WriteResult } from "./types.js";
export declare class FactVault {
    private readonly db;
    private readonly dataDir;
    private readonly jsonPath;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    /** Add a fact, with automatic dedup/merge against existing facts. */
    addFact(input: {
        domain: StoryFact["domain"];
        category: StoryCategory;
        label: string;
        content: string;
        weight?: number;
        certainty?: number;
        tier?: FactTier;
        status?: StoryFact["status"];
        triggers?: string[];
        emotionalWeight?: number;
        narrativeRelevance?: number;
        chapterOrigin?: number;
        derivedFrom?: string[];
    }): WriteResult;
    /** Get a fact by ID. */
    getById(id: string): StoryFact | undefined;
    /** Get all active facts. */
    getActive(): StoryFact[];
    /** Get all pinned (core) facts. */
    getPinned(): StoryFact[];
    /** Search by trigger words (substring match). */
    searchByTriggers(query: string): StoryFact[];
    /** Full-text search via FTS5 (trigram tokenizer). */
    searchByFts(query: string, limit?: number): StoryFact[];
    /** Get facts by domain. */
    getByDomain(domain: string): StoryFact[];
    /** Mark a fact as accessed (bump access count, update timestamp). */
    markAccessed(id: string): void;
    /**
     * Mark multiple facts as accessed in a single UPDATE (avoids the per-item
     * round-trip cost of calling {@link markAccessed} in a loop). Uses an
     * explicit placeholder per id to avoid SQL-injection pitfalls with
     * dynamic IN-clauses.
     */
    markAccessedBatch(ids: readonly string[]): void;
    /** Archive a fact (soft delete from active retrieval). */
    archive(id: string): void;
    /** Void a fact (logical delete, kept for audit). */
    void(id: string): void;
    /** Compute the decayed relevance score for a fact. */
    scoreRelevance(fact: StoryFact, currentChapter: number): number;
    /** Export all facts to JSON (backup). */
    exportJson(): StoryFact[];
    /** Close the database connection. */
    close(): void;
    private insertOne;
    private updateOne;
    /** Find a similar existing fact for dedup/merge. */
    private findSimilar;
    /** Enforce pinned tier capacity — demote lowest-scoring pinned facts. */
    private enforcePinnedLimit;
}
//# sourceMappingURL=fact-vault.d.ts.map