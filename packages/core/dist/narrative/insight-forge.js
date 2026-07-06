// packages/core/src/narrative/insight-forge.ts
// InsightForge — pattern detection engine.
//
// Scans the FactVault's active facts and surfaces structural patterns that a
// human author (or the pipeline) might want to act on: recurring characters,
// unresolved foreshadows, escalating conflicts, relationship clusters, and
// thematic patterns.
//
// All detection is rule-based (zero-LLM) — every rule is a deterministic
// function over fact fields. This keeps the engine fast, reproducible, and
// free of token cost.
//
// Design principles:
//   • Operates entirely on FactVault.getActive() — no extra DB access.
//   • Thresholds are named constants for easy tuning.
//   • Every pattern carries severity + the fact IDs that triggered it.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
/** Type of pattern detected by the engine. */
export const InsightPatternTypeSchema = z.enum([
    "recurring_character", // a character appears in many facts
    "unresolved_foreshadow", // a foreshadow has been active too long
    "conflict_escalation", // conflicts are getting heavier over time
    "relationship_cluster", // relation facts share common characters
    "thematic_pattern", // motif/symbol facts share triggers with plot threads
]);
/** Severity of a detected pattern. */
export const InsightSeveritySchema = z.enum(["info", "warning", "critical"]);
// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------
/** A trigger must appear in more than this many facts to be "recurring". */
const RECURRING_CHARACTER_THRESHOLD = 5;
/** A foreshadow is "unresolved" if it has been active for this many chapters. */
const FORESHADOW_AGE_THRESHOLD = 20;
/** Minimum number of conflicts needed to detect an escalation trend. */
const CONFLICT_ESCALATION_MIN_COUNT = 2;
/** Minimum number of shared triggers to form a relationship cluster. */
const RELATION_CLUSTER_MIN_SHARED = 2;
/** Minimum relation cluster size (number of facts) to be reported. */
const RELATION_CLUSTER_MIN_SIZE = 3;
/** Categories that represent thematic motifs/symbols. */
const THEMATIC_CATEGORIES = new Set(["motif", "symbol"]);
// ---------------------------------------------------------------------------
// InsightForge
// ---------------------------------------------------------------------------
export class InsightForge {
    vault;
    constructor(vault) {
        this.vault = vault;
    }
    // -----------------------------------------------------------------------
    // Pattern detection
    // -----------------------------------------------------------------------
    /**
     * Scan all active facts and detect structural patterns.
     *
     * Returns an array of InsightPattern, each containing the pattern type, a
     * human-readable description, the fact IDs involved, and a severity.
     */
    detectPatterns() {
        const facts = this.vault.getActive();
        const patterns = [];
        patterns.push(...this.detectRecurringCharacters(facts));
        patterns.push(...this.detectUnresolvedForeshadows(facts));
        patterns.push(...this.detectConflictEscalation(facts));
        patterns.push(...this.detectRelationshipClusters(facts));
        patterns.push(...this.detectThematicPatterns(facts));
        return patterns;
    }
    /**
     * 1. Recurring characters — triggers that appear in more than
     *    RECURRING_CHARACTER_THRESHOLD facts.
     */
    detectRecurringCharacters(facts) {
        // Map<trigger, Set<factId>> — how many facts reference each trigger.
        const triggerToFacts = new Map();
        for (const fact of facts) {
            for (const trigger of fact.triggers) {
                const lower = trigger.toLowerCase();
                let set = triggerToFacts.get(lower);
                if (!set) {
                    set = new Set();
                    triggerToFacts.set(lower, set);
                }
                set.add(fact.id);
            }
        }
        const patterns = [];
        for (const [trigger, factIds] of triggerToFacts) {
            if (factIds.size > RECURRING_CHARACTER_THRESHOLD) {
                const ids = [...factIds];
                patterns.push({
                    type: "recurring_character",
                    description: `Trigger "${trigger}" appears in ${ids.length} facts, ` +
                        "indicating a recurring character or motif that may warrant consolidation or arc tracking.",
                    factIds: ids,
                    severity: "info",
                });
            }
        }
        return patterns;
    }
    /**
     * 2. Unresolved foreshadows — foreshadow-category facts that are still
     *    active after FORESHADOW_AGE_THRESHOLD chapters.
     *
     * The "current chapter" is inferred as the maximum chapterOrigin across
     * all active facts.
     */
    detectUnresolvedForeshadows(facts) {
        const currentChapter = facts.reduce((max, f) => Math.max(max, f.chapterOrigin), 0);
        const staleForeshadows = facts.filter((f) => f.category === "foreshadow" &&
            f.status === "active" &&
            currentChapter - f.chapterOrigin >= FORESHADOW_AGE_THRESHOLD);
        if (staleForeshadows.length === 0)
            return [];
        return [
            {
                type: "unresolved_foreshadow",
                description: `${staleForeshadows.length} foreshadow(s) have been active for ` +
                    `${FORESHADOW_AGE_THRESHOLD}+ chapters (current chapter: ${currentChapter}) ` +
                    "without resolution. Consider resolving or explicitly archiving them.",
                factIds: staleForeshadows.map((f) => f.id),
                severity: "warning",
            },
        ];
    }
    /**
     * 3. Conflict escalation — conflict-category facts sorted by chapterOrigin
     *    show increasing weight over time.
     */
    detectConflictEscalation(facts) {
        const conflicts = facts
            .filter((f) => f.category === "conflict" && f.status === "active")
            .sort((a, b) => a.chapterOrigin - b.chapterOrigin);
        if (conflicts.length < CONFLICT_ESCALATION_MIN_COUNT)
            return [];
        // Check if weights are monotonically non-decreasing.
        let isEscalating = true;
        for (let i = 1; i < conflicts.length; i++) {
            if (conflicts[i].weight < conflicts[i - 1].weight) {
                isEscalating = false;
                break;
            }
        }
        if (!isEscalating)
            return [];
        const weightRange = conflicts[conflicts.length - 1].weight - conflicts[0].weight;
        const severity = weightRange >= 30 ? "critical" : "warning";
        return [
            {
                type: "conflict_escalation",
                description: `Conflict weight has escalated from ${conflicts[0].weight} to ` +
                    `${conflicts[conflicts.length - 1].weight} over ` +
                    `${conflicts.length} conflict facts. The narrative tension is ` +
                    "rising without relief — consider introducing a resolution or cooldown.",
                factIds: conflicts.map((f) => f.id),
                severity,
            },
        ];
    }
    /**
     * 4. Relationship clusters — relation-category facts that share common
     *    character triggers. Facts are grouped by their shared triggers; a
     *    cluster is reported when RELATION_CLUSTER_MIN_SIZE or more facts
     *    share at least RELATION_CLUSTER_MIN_SHARED triggers.
     */
    detectRelationshipClusters(facts) {
        const relations = facts.filter((f) => f.category === "relation" && f.status === "active");
        if (relations.length < RELATION_CLUSTER_MIN_SIZE)
            return [];
        // Group facts by shared trigger sets. We use a union-find approach:
        // two facts are in the same cluster if they share >= MIN_SHARED triggers.
        const clusters = new Map();
        const parent = relations.map((_, i) => i);
        const find = (x) => {
            while (parent[x] !== x) {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        };
        const union = (a, b) => {
            const ra = find(a);
            const rb = find(b);
            if (ra !== rb)
                parent[ra] = rb;
        };
        const sharedTriggerCount = (a, b) => {
            const setB = new Set(b.triggers.map((t) => t.toLowerCase()));
            let count = 0;
            for (const t of a.triggers) {
                if (setB.has(t.toLowerCase()))
                    count++;
            }
            return count;
        };
        // O(n²) pairwise comparison of relation facts. Acceptable for small N
        // (relation facts per book are typically < 100); for larger N an inverted
        // trigger index (like the one in narrative-engine.addLinkEdges) would
        // reduce this to ~O(n * k) where k is the average trigger count.
        for (let i = 0; i < relations.length; i++) {
            for (let j = i + 1; j < relations.length; j++) {
                if (sharedTriggerCount(relations[i], relations[j]) >= RELATION_CLUSTER_MIN_SHARED) {
                    union(i, j);
                }
            }
        }
        // Collect clusters.
        for (let i = 0; i < relations.length; i++) {
            const root = find(i);
            let cluster = clusters.get(root);
            if (!cluster) {
                cluster = [];
                clusters.set(root, cluster);
            }
            cluster.push(relations[i]);
        }
        const patterns = [];
        for (const cluster of clusters.values()) {
            if (cluster.length >= RELATION_CLUSTER_MIN_SIZE) {
                patterns.push({
                    type: "relationship_cluster",
                    description: `${cluster.length} relation facts share common characters, ` +
                        "forming a relationship cluster. This may indicate a complex " +
                        "social web that could benefit from a dedicated relationship summary.",
                    factIds: cluster.map((f) => f.id),
                    severity: "info",
                });
            }
        }
        return patterns;
    }
    /**
     * 5. Thematic patterns — motif/symbol facts that share triggers with
     *    plot_thread facts. This indicates a thematic element that is
     *    actively woven into the plot.
     */
    detectThematicPatterns(facts) {
        const thematicFacts = facts.filter((f) => THEMATIC_CATEGORIES.has(f.category) && f.status === "active");
        const plotFacts = facts.filter((f) => f.domain === "plot_thread" && f.status === "active");
        if (thematicFacts.length === 0 || plotFacts.length === 0)
            return [];
        // Build a set of all plot-thread triggers for quick lookup.
        const plotTriggers = new Set();
        for (const pf of plotFacts) {
            for (const t of pf.triggers) {
                plotTriggers.add(t.toLowerCase());
            }
        }
        const patterns = [];
        for (const tf of thematicFacts) {
            const shared = tf.triggers.filter((t) => plotTriggers.has(t.toLowerCase()));
            if (shared.length > 0) {
                // Find which plot facts share these triggers.
                const relatedPlotFacts = plotFacts.filter((pf) => pf.triggers.some((t) => shared.includes(t.toLowerCase())));
                patterns.push({
                    type: "thematic_pattern",
                    description: `Thematic fact "${tf.label}" (${tf.category}) shares triggers ` +
                        `[${shared.join(", ")}] with ${relatedPlotFacts.length} plot-thread ` +
                        "fact(s), indicating this motif/symbol is actively woven into the plot.",
                    factIds: [tf.id, ...relatedPlotFacts.map((f) => f.id)],
                    severity: "info",
                });
            }
        }
        return patterns;
    }
}
//# sourceMappingURL=insight-forge.js.map