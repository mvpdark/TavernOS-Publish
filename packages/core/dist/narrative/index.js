// Narrative Memory Engine — module exports.
//
// This module provides a dynamic story memory system for TavernOS.
// Unlike a static lorebook, facts are written, retrieved, ranked, and
// decayed automatically as chapters are written.
export { StoryDomainSchema, StoryCategorySchema, FactTierSchema, FactStatusSchema, StoryFactSchema, } from "./types.js";
export { DOMAIN_CATEGORIES, CATEGORY_META, domainOf, metaOf, } from "./story-domains.js";
export { FactVault, } from "./fact-vault.js";
export { ContextFetcher, } from "./context-fetcher.js";
export { LinkGraph, } from "./link-graph.js";
export { InsightForge, } from "./insight-forge.js";
//# sourceMappingURL=index.js.map