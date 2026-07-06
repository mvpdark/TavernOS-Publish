import { z } from "zod";
import type { FactVault } from "./fact-vault.js";
/** Type of pattern detected by the engine. */
export declare const InsightPatternTypeSchema: z.ZodEnum<["recurring_character", "unresolved_foreshadow", "conflict_escalation", "relationship_cluster", "thematic_pattern"]>;
export type InsightPatternType = z.infer<typeof InsightPatternTypeSchema>;
/** Severity of a detected pattern. */
export declare const InsightSeveritySchema: z.ZodEnum<["info", "warning", "critical"]>;
export type InsightSeverity = z.infer<typeof InsightSeveritySchema>;
/** A single detected pattern. */
export interface InsightPattern {
    readonly type: InsightPatternType;
    readonly description: string;
    readonly factIds: string[];
    readonly severity: InsightSeverity;
}
export declare class InsightForge {
    private readonly vault;
    constructor(vault: FactVault);
    /**
     * Scan all active facts and detect structural patterns.
     *
     * Returns an array of InsightPattern, each containing the pattern type, a
     * human-readable description, the fact IDs involved, and a severity.
     */
    detectPatterns(): InsightPattern[];
    /**
     * 1. Recurring characters — triggers that appear in more than
     *    RECURRING_CHARACTER_THRESHOLD facts.
     */
    private detectRecurringCharacters;
    /**
     * 2. Unresolved foreshadows — foreshadow-category facts that are still
     *    active after FORESHADOW_AGE_THRESHOLD chapters.
     *
     * The "current chapter" is inferred as the maximum chapterOrigin across
     * all active facts.
     */
    private detectUnresolvedForeshadows;
    /**
     * 3. Conflict escalation — conflict-category facts sorted by chapterOrigin
     *    show increasing weight over time.
     */
    private detectConflictEscalation;
    /**
     * 4. Relationship clusters — relation-category facts that share common
     *    character triggers. Facts are grouped by their shared triggers; a
     *    cluster is reported when RELATION_CLUSTER_MIN_SIZE or more facts
     *    share at least RELATION_CLUSTER_MIN_SHARED triggers.
     */
    private detectRelationshipClusters;
    /**
     * 5. Thematic patterns — motif/symbol facts that share triggers with
     *    plot_thread facts. This indicates a thematic element that is
     *    actively woven into the plot.
     */
    private detectThematicPatterns;
}
//# sourceMappingURL=insight-forge.d.ts.map