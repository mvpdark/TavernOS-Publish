// packages/core/src/narrative/story-domains.ts
// Story domain taxonomy — defines which categories exist and their decay rates.
//
// The decay lambda controls how quickly a fact loses relevance over time
// (measured in chapters, not days). Lower lambda = longer memory.
//
//   score = weight × e^(-λ × chaptersSinceCreated) × narrativeRelevance
//
// Tiered decay design:
//   • Permanent (λ ≈ 0.001): character identity, world rules — should never fade
//   • Long-term (λ ≈ 0.005): relationships, factions, geography
//   • Medium (λ ≈ 0.02):     plot threads, foreshadows, mysteries
//   • Short-term (λ ≈ 0.08): timeline events, seasonal details
//   • Ephemeral (λ ≈ 0.15):  chapter-specific moods, transitional states
// ---------------------------------------------------------------------------
// Domain → Categories mapping
// ---------------------------------------------------------------------------
export const DOMAIN_CATEGORIES = {
    character: ["identity", "personality", "appearance", "ability", "background", "relation"],
    world: ["rule", "faction", "history", "system"],
    location: ["geography", "venue", "region"],
    plot_thread: ["foreshadow", "task", "mystery", "causality"],
    timeline: ["event", "milestone", "season"],
    theme: ["motif", "symbol", "conflict"],
};
// ---------------------------------------------------------------------------
// Category Metadata — decay rates and default weights
// ---------------------------------------------------------------------------
export const CATEGORY_META = {
    // --- character domain (permanent to long-term) ---
    identity: { defaultWeight: 80, defaultCertainty: 0.9, decayLambda: 0.001, narrativeRelevance: 0.9 },
    personality: { defaultWeight: 70, defaultCertainty: 0.8, decayLambda: 0.003, narrativeRelevance: 0.8 },
    appearance: { defaultWeight: 50, defaultCertainty: 0.85, decayLambda: 0.005, narrativeRelevance: 0.6 },
    ability: { defaultWeight: 65, defaultCertainty: 0.85, decayLambda: 0.003, narrativeRelevance: 0.75 },
    background: { defaultWeight: 60, defaultCertainty: 0.8, decayLambda: 0.002, narrativeRelevance: 0.7 },
    relation: { defaultWeight: 75, defaultCertainty: 0.75, decayLambda: 0.005, narrativeRelevance: 0.85 },
    // --- world domain (permanent to long-term) ---
    rule: { defaultWeight: 85, defaultCertainty: 0.9, decayLambda: 0.001, narrativeRelevance: 0.9 },
    faction: { defaultWeight: 65, defaultCertainty: 0.8, decayLambda: 0.005, narrativeRelevance: 0.7 },
    history: { defaultWeight: 55, defaultCertainty: 0.75, decayLambda: 0.003, narrativeRelevance: 0.6 },
    system: { defaultWeight: 70, defaultCertainty: 0.85, decayLambda: 0.002, narrativeRelevance: 0.8 },
    // --- location domain (long-term) ---
    geography: { defaultWeight: 55, defaultCertainty: 0.8, decayLambda: 0.005, narrativeRelevance: 0.6 },
    venue: { defaultWeight: 50, defaultCertainty: 0.8, decayLambda: 0.01, narrativeRelevance: 0.65 },
    region: { defaultWeight: 60, defaultCertainty: 0.8, decayLambda: 0.005, narrativeRelevance: 0.65 },
    // --- plot_thread domain (medium) ---
    foreshadow: { defaultWeight: 70, defaultCertainty: 0.7, decayLambda: 0.02, narrativeRelevance: 0.85 },
    task: { defaultWeight: 60, defaultCertainty: 0.8, decayLambda: 0.03, narrativeRelevance: 0.75 },
    mystery: { defaultWeight: 65, defaultCertainty: 0.65, decayLambda: 0.02, narrativeRelevance: 0.8 },
    causality: { defaultWeight: 68, defaultCertainty: 0.75, decayLambda: 0.01, narrativeRelevance: 0.8 },
    // --- timeline domain (short-term to ephemeral) ---
    event: { defaultWeight: 50, defaultCertainty: 0.85, decayLambda: 0.08, narrativeRelevance: 0.6, autoArchiveChapters: 30 },
    milestone: { defaultWeight: 75, defaultCertainty: 0.9, decayLambda: 0.01, narrativeRelevance: 0.85 },
    season: { defaultWeight: 40, defaultCertainty: 0.8, decayLambda: 0.05, narrativeRelevance: 0.5, autoArchiveChapters: 15 },
    // --- theme domain (permanent) ---
    motif: { defaultWeight: 60, defaultCertainty: 0.7, decayLambda: 0.001, narrativeRelevance: 0.75 },
    symbol: { defaultWeight: 55, defaultCertainty: 0.7, decayLambda: 0.001, narrativeRelevance: 0.7 },
    conflict: { defaultWeight: 80, defaultCertainty: 0.8, decayLambda: 0.001, narrativeRelevance: 0.9 },
};
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Get the domain for a given category. */
export function domainOf(category) {
    for (const [domain, cats] of Object.entries(DOMAIN_CATEGORIES)) {
        if (cats.includes(category)) {
            return domain;
        }
    }
    throw new Error(`Unknown category: ${category}`);
}
/** Get metadata for a category, falling back to safe defaults. */
export function metaOf(category) {
    return CATEGORY_META[category] ?? {
        defaultWeight: 50,
        defaultCertainty: 0.7,
        decayLambda: 0.01,
        narrativeRelevance: 0.5,
    };
}
//# sourceMappingURL=story-domains.js.map