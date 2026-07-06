import { type TimelineAnchor, type TemporalContext, type AppearanceRecord } from "./types.js";
export declare class TimelineSense {
    private readonly db;
    private closed;
    constructor(dbPath: string);
    private initSchema;
    private mapAnchorRow;
    private mapAppearanceRow;
    /**
     * Add a timeline anchor.
     *
     * @param input Anchor data without `id` and `createdAt` (server-generated).
     * @returns     The fully-formed TimelineAnchor with id and createdAt.
     */
    addAnchor(input: Omit<TimelineAnchor, "id" | "createdAt">): TimelineAnchor;
    /**
     * Get the most recent N anchors, ordered by chapter (descending) then
     * creation time (descending).
     */
    getRecentAnchors(count: number): TimelineAnchor[];
    /**
     * Get all anchors whose chapter_index falls within [from, to] (inclusive).
     */
    getAnchorsByChapter(from: number, to: number): TimelineAnchor[];
    /**
     * Record that a character appeared in a given chapter.
     * If the character is seen in the same chapter twice, the duplicate is
     * silently ignored.
     */
    recordAppearance(character: string, chapterIndex: number): void;
    /**
     * Get the appearance record for a specific character.
     */
    getAppearance(character: string): AppearanceRecord | undefined;
    /**
     * Build a full temporal context for the given chapter.
     *
     * Includes the 5 most recent anchors, recurring patterns, time-since-last-
     * appearance for every tracked character, and the current chapter's event
     * density.
     */
    getTemporalContext(currentChapter: number): TemporalContext;
    /**
     * Compute the event density (0-1) for a given chapter.
     *
     * Combines a count-based contribution (up to 0.6) with a significance-
     * weighted contribution (up to 0.4). A chapter with 4+ high-significance
     * events will approach 1.0.
     */
    getChapterDensity(chapterIndex: number): number;
    /**
     * Detect repeating patterns across all timeline anchors.
     *
     * Returns human-readable pattern strings for:
     *   1. Character co-occurrences (pairs appearing together in 2+ anchors)
     *   2. Recurring locations (appearing in 2+ anchors)
     *   3. Anchor-type clustering (types appearing in 3+ anchors)
     *   4. Recurring label keywords (2-grams appearing in 2+ labels)
     */
    detectRecurringPatterns(): string[];
    /** Close the database connection. Safe to call multiple times. */
    close(): void;
    /** Retrieve all anchors ordered by chapter then creation time. */
    private getAllAnchors;
    /** Retrieve all appearance records ordered by last chapter (descending). */
    private getAllAppearances;
}
//# sourceMappingURL=sense.d.ts.map