// packages/core/src/narrative/context-fetcher.ts
// ContextFetcher — multi-path retrieval engine for story facts.
//
// Given a query (e.g. the scene being written), fetches relevant facts
// from the FactVault via multiple paths, merges, ranks, and assembles
// a context block for prompt injection.
//
// P0 implements 3 core paths:
//   1. Trigger match   — fast substring match on trigger words
//   2. FTS5 search     — SQLite full-text search
//   3. Pinned inject   — always include core (pinned) facts
//
// P2 will add:
//   4. Semantic search — embedding cosine similarity
//   5. Link diffusion  — one-hop from link-graph
//   6. Timeline anchor — chapter-based temporal recall
const DEFAULT_CONFIG = {
    charBudget: 4000,
    pinnedBudget: 1500,
    currentChapter: 0,
};
// ---------------------------------------------------------------------------
// ContextFetcher
// ---------------------------------------------------------------------------
export class ContextFetcher {
    /** Optional LinkGraph for one-hop diffusion. When absent, linkHits=0. */
    linkGraph;
    vault;
    config;
    constructor(vault, config = DEFAULT_CONFIG, linkGraph) {
        this.vault = vault;
        this.config = config;
        this.linkGraph = linkGraph ?? null;
    }
    /** Fetch relevant facts and assemble a context block. */
    fetch(query) {
        const paths = [];
        const candidates = new Map();
        const collectedIds = new Set();
        // --- Path 1: Pinned injection (always) ---
        const pinnedFacts = this.vault.getPinned();
        for (const f of pinnedFacts) {
            const path = { path: "pinned", factId: f.id };
            paths.push(path);
            collectedIds.add(f.id);
            candidates.set(f.id, {
                fact: f,
                score: this.vault.scoreRelevance(f, this.config.currentChapter) * 1.5, // pinned boost
                paths: [path],
            });
        }
        // --- Path 2: Trigger match ---
        const triggerHits = this.vault.searchByTriggers(query);
        for (const f of triggerHits) {
            const path = { path: "trigger", factId: f.id };
            paths.push(path);
            collectedIds.add(f.id);
            const existing = candidates.get(f.id);
            const score = this.vault.scoreRelevance(f, this.config.currentChapter) * 2.0; // trigger boost
            if (existing) {
                candidates.set(f.id, { ...existing, score: Math.max(existing.score, score), paths: [...existing.paths, path] });
            }
            else {
                candidates.set(f.id, { fact: f, score, paths: [path] });
            }
        }
        // --- Path 3: FTS5 search ---
        const ftsHits = this.vault.searchByFts(query, 10);
        for (const f of ftsHits) {
            const path = { path: "fts", factId: f.id };
            paths.push(path);
            collectedIds.add(f.id);
            const existing = candidates.get(f.id);
            const score = this.vault.scoreRelevance(f, this.config.currentChapter) * 1.3; // FTS boost
            if (existing) {
                candidates.set(f.id, { ...existing, score: Math.max(existing.score, score), paths: [...existing.paths, path] });
            }
            else {
                candidates.set(f.id, { fact: f, score, paths: [path] });
            }
        }
        // --- Path 4: Link diffusion (one-hop from LinkGraph) ---
        let linkHits = 0;
        if (this.linkGraph && collectedIds.size > 0) {
            const neighborIds = this.linkGraph.diffuse([...collectedIds], 10);
            linkHits = neighborIds.length;
            for (const nid of neighborIds) {
                if (candidates.has(nid))
                    continue; // already collected via another path
                const fact = this.vault.getById(nid);
                if (!fact || fact.status !== "active")
                    continue;
                const path = { path: "link", factId: nid };
                paths.push(path);
                const score = this.vault.scoreRelevance(fact, this.config.currentChapter) * 1.1; // link boost
                candidates.set(nid, { fact, score, paths: [path] });
            }
        }
        // --- Merge, rank, budget ---
        const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
        // Mark accessed for top results (single batched UPDATE instead of a
        // per-item round-trip loop).
        this.vault.markAccessedBatch(ranked.slice(0, 15).map((sf) => sf.fact.id));
        // Assemble context block within budget.
        const contextBlock = this.assembleBlock(ranked);
        return {
            contextBlock,
            facts: ranked,
            trace: {
                totalCandidates: candidates.size,
                pinned: pinnedFacts.length,
                triggerHits: triggerHits.length,
                ftsHits: ftsHits.length,
                semanticHits: 0,
                linkHits,
            },
        };
    }
    /** Assemble a text block from ranked facts, respecting char budget. */
    assembleBlock(ranked) {
        const lines = [];
        let remaining = this.config.charBudget;
        // Section 1: Pinned facts (reserved budget).
        const pinned = ranked.filter(sf => sf.fact.tier === "pinned");
        const pinnedBudget = Math.min(this.config.pinnedBudget, remaining);
        lines.push("【核心设定】");
        let pinnedUsed = 0;
        for (const sf of pinned) {
            const line = this.formatFactLine(sf);
            if (pinnedUsed + line.length > pinnedBudget)
                break;
            lines.push(line);
            pinnedUsed += line.length;
            remaining -= line.length;
        }
        // Section 2: Retrieved facts (competitive budget).
        const ambient = ranked.filter(sf => sf.fact.tier !== "pinned");
        if (ambient.length > 0 && remaining > 200) {
            lines.push("");
            lines.push("【相关记忆】");
            for (const sf of ambient) {
                const line = this.formatFactLine(sf);
                if (remaining < line.length + 50)
                    break;
                lines.push(line);
                remaining -= line.length;
            }
        }
        return lines.join("\n");
    }
    /** Format a single fact as a line in the context block. */
    formatFactLine(sf) {
        const f = sf.fact;
        const pathTags = sf.paths.map(p => p.path).join("+");
        const sourceTag = pathTags.includes("trigger") ? "←触发词"
            : pathTags.includes("fts") ? "←全文匹配"
                : pathTags.includes("pinned") ? "←核心"
                    : "";
        return `· [${f.domain}/${f.category}] ${f.label}：${f.content} ${sourceTag}`;
    }
}
//# sourceMappingURL=context-fetcher.js.map