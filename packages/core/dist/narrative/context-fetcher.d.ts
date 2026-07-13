import type { FactVault } from "./fact-vault.js";
import type { LinkGraph } from "./link-graph.js";
import type { FetchResult } from "./types.js";
export interface FetcherConfig {
    /** Maximum characters for the assembled context block. */
    readonly charBudget: number;
    /** Reserved characters for pinned (core) facts. */
    readonly pinnedBudget: number;
    /** Current chapter index (for decay scoring). */
    readonly currentChapter: number;
}
export declare class ContextFetcher {
    /** Optional LinkGraph for one-hop diffusion. When absent, linkHits=0. */
    private readonly linkGraph;
    private readonly vault;
    private readonly config;
    constructor(vault: FactVault, config?: FetcherConfig, linkGraph?: LinkGraph);
    /** Fetch relevant facts and assemble a context block. */
    fetch(query: string): FetchResult;
    /** Assemble a text block from ranked facts, respecting char budget.
     *  Returns the context block and whether pinned facts were truncated. */
    private assembleBlock;
    /** Format a single fact as a line in the context block. */
    private formatFactLine;
}
//# sourceMappingURL=context-fetcher.d.ts.map