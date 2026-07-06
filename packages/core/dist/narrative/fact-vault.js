// packages/core/src/narrative/fact-vault.ts
// FactVault — persistent storage for StoryFacts.
//
// Provides CRUD, dedup/merge, relevance scoring, and tier management.
// Uses SQLite (via better-sqlite3) as primary storage with automatic
// JSON export for backup/portability.
//
// Key design decisions (adapted from research, not copied):
//   • Dedup uses Jaccard similarity on label+content (≥0.6 threshold)
//   • Relevance score = weight × e^(-λ × chapters) × narrativeRelevance
//   • Pinned tier has a max count; excess is auto-demoted by decayed score
//   • All writes are synchronous (SQLite is fast enough for story-scale)
import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { metaOf } from "./story-domains.js";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEDUP_THRESHOLD = 0.6;
const PINNED_MAX_COUNT = 20;
const PINNED_WEIGHT_THRESHOLD = 70;
// ---------------------------------------------------------------------------
// FactVault
// ---------------------------------------------------------------------------
export class FactVault {
    db;
    dataDir;
    jsonPath;
    constructor(dbPath) {
        this.dataDir = join(dbPath, "..");
        mkdirSync(this.dataDir, { recursive: true });
        this.jsonPath = join(this.dataDir, "story-facts.json");
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.initSchema();
    }
    // --- Schema ---
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_facts (
        id                  TEXT PRIMARY KEY,
        domain              TEXT NOT NULL,
        category            TEXT NOT NULL,
        label               TEXT NOT NULL,
        content             TEXT NOT NULL,
        weight              REAL NOT NULL DEFAULT 50,
        certainty           REAL NOT NULL DEFAULT 0.7,
        tier                TEXT NOT NULL DEFAULT 'ambient',
        status              TEXT NOT NULL DEFAULT 'active',
        triggers            TEXT NOT NULL DEFAULT '[]',
        emotional_weight    REAL NOT NULL DEFAULT 0,
        narrative_relevance REAL NOT NULL DEFAULT 0.5,
        chapter_origin      INTEGER NOT NULL DEFAULT 0,
        derived_from        TEXT,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL,
        access_count        INTEGER NOT NULL DEFAULT 0,
        last_access_at      TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_facts_domain   ON story_facts(domain);
      CREATE INDEX IF NOT EXISTS idx_facts_category ON story_facts(category);
      CREATE INDEX IF NOT EXISTS idx_facts_tier     ON story_facts(tier) WHERE status = 'active';
      CREATE INDEX IF NOT EXISTS idx_facts_status   ON story_facts(status);

      -- FTS5 virtual table for full-text search.
      -- trigram tokenizer: extracts overlapping 3-character sequences,
      -- which works well for CJK text (each char = 1 codepoint, so a 3-char
      -- trigram captures meaningful Chinese substrings).
      CREATE VIRTUAL TABLE IF NOT EXISTS story_facts_fts USING fts5(
        label, content,
        content='story_facts',
        content_rowid='rowid',
        tokenize='trigram'
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON story_facts BEGIN
        INSERT INTO story_facts_fts(rowid, label, content)
        VALUES (new.rowid, new.label, new.content);
      END;
      CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON story_facts BEGIN
        INSERT INTO story_facts_fts(story_facts_fts, rowid, label, content)
        VALUES ('delete', old.rowid, old.label, old.content);
      END;
      CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON story_facts BEGIN
        INSERT INTO story_facts_fts(story_facts_fts, rowid, label, content)
        VALUES ('delete', old.rowid, old.label, old.content);
        INSERT INTO story_facts_fts(rowid, label, content)
        VALUES (new.rowid, new.label, new.content);
      END;
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            id: row.id,
            domain: row.domain,
            category: row.category,
            label: row.label,
            content: row.content,
            weight: row.weight,
            certainty: row.certainty,
            tier: row.tier,
            status: row.status,
            triggers: JSON.parse(row.triggers),
            emotionalWeight: row.emotional_weight,
            narrativeRelevance: row.narrative_relevance,
            chapterOrigin: row.chapter_origin,
            derivedFrom: row.derived_from ? JSON.parse(row.derived_from) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            accessCount: row.access_count,
            lastAccessAt: row.last_access_at ?? undefined,
        };
    }
    // --- Public API ---
    /** Add a fact, with automatic dedup/merge against existing facts. */
    addFact(input) {
        const now = new Date().toISOString();
        // Try to find an existing similar fact for merging.
        const existing = this.findSimilar(input.category, input.label, input.content);
        if (existing) {
            // Merge: keep the more detailed content, union triggers, max weights.
            const merged = {
                weight: Math.max(existing.weight, input.weight ?? 50) + 2,
                certainty: Math.max(existing.certainty, input.certainty ?? 0.7),
                triggers: [...new Set([...existing.triggers, ...(input.triggers ?? [])])],
                content: (input.content.length > existing.content.length) ? input.content : existing.content,
                emotionalWeight: (input.emotionalWeight ?? 0) !== 0 ? input.emotionalWeight : existing.emotionalWeight,
                updatedAt: now,
            };
            // Auto-promote to pinned if weight exceeds threshold.
            if (merged.weight >= PINNED_WEIGHT_THRESHOLD) {
                merged.tier = "pinned";
            }
            this.updateOne(existing.id, merged);
            const updated = this.getById(existing.id);
            // Re-check pinned capacity after promotion.
            this.enforcePinnedLimit();
            return { fact: updated, isNew: false, mergedWith: existing.id };
        }
        // Create new fact. We set every field explicitly (instead of spreading
        // input) so that optional fields always get proper defaults — SQLite
        // NOT NULL constraints will reject undefined values at runtime.
        const meta = metaOf(input.category);
        const resolvedWeight = input.weight ?? meta.defaultWeight;
        const fact = {
            id: randomUUID(),
            domain: input.domain,
            category: input.category,
            label: input.label,
            content: input.content,
            weight: resolvedWeight,
            certainty: input.certainty ?? meta.defaultCertainty,
            tier: resolvedWeight >= PINNED_WEIGHT_THRESHOLD ? "pinned" : (input.tier ?? "ambient"),
            status: input.status ?? "active",
            triggers: input.triggers ?? [],
            emotionalWeight: input.emotionalWeight ?? 0,
            narrativeRelevance: input.narrativeRelevance ?? meta.narrativeRelevance,
            chapterOrigin: input.chapterOrigin ?? 0,
            derivedFrom: input.derivedFrom,
            createdAt: now,
            updatedAt: now,
            accessCount: 0,
        };
        this.insertOne(fact);
        this.enforcePinnedLimit();
        return { fact, isNew: true };
    }
    /** Get a fact by ID. */
    getById(id) {
        const row = this.db.prepare("SELECT * FROM story_facts WHERE id = ?").get(id);
        return row ? this.mapRow(row) : undefined;
    }
    /** Get all active facts. */
    getActive() {
        const rows = this.db.prepare("SELECT * FROM story_facts WHERE status = 'active'").all();
        return rows.map(r => this.mapRow(r));
    }
    /** Get all pinned (core) facts. */
    getPinned() {
        const rows = this.db.prepare("SELECT * FROM story_facts WHERE status = 'active' AND tier = 'pinned' ORDER BY weight DESC").all();
        return rows.map(r => this.mapRow(r));
    }
    /** Search by trigger words (substring match). */
    searchByTriggers(query) {
        const lower = query.toLowerCase();
        const all = this.getActive();
        return all.filter(f => f.triggers.some(t => lower.includes(t.toLowerCase())));
    }
    /** Full-text search via FTS5 (trigram tokenizer). */
    searchByFts(query, limit = 10) {
        // trigram tokenizer indexes overlapping 3-character sequences.
        // To match Chinese queries, extract all 3-grams from the query and
        // join with OR — any fact containing any 3-char substring of the query
        // will be returned. This catches facts the trigger path might miss.
        const sanitized = query.replace(/["'*]/g, "").trim();
        if (sanitized.length < 3)
            return [];
        // Generate overlapping 3-character trigrams.
        const trigrams = [];
        for (let i = 0; i <= sanitized.length - 3; i++) {
            trigrams.push(`"${sanitized.slice(i, i + 3)}"`);
        }
        // Deduplicate to avoid redundant terms.
        const unique = [...new Set(trigrams)];
        const ftsQuery = unique.join(" OR ");
        const rows = this.db.prepare(`
      SELECT f.* FROM story_facts f
      JOIN story_facts_fts fts ON f.rowid = fts.rowid
      WHERE story_facts_fts MATCH ? AND f.status = 'active'
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit);
        return rows.map(r => this.mapRow(r));
    }
    /** Get facts by domain. */
    getByDomain(domain) {
        const rows = this.db.prepare("SELECT * FROM story_facts WHERE domain = ? AND status = 'active' ORDER BY weight DESC").all(domain);
        return rows.map(r => this.mapRow(r));
    }
    /** Mark a fact as accessed (bump access count, update timestamp). */
    markAccessed(id) {
        this.db.prepare("UPDATE story_facts SET access_count = access_count + 1, last_access_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    }
    /**
     * Mark multiple facts as accessed in a single UPDATE (avoids the per-item
     * round-trip cost of calling {@link markAccessed} in a loop). Uses an
     * explicit placeholder per id to avoid SQL-injection pitfalls with
     * dynamic IN-clauses.
     */
    markAccessedBatch(ids) {
        if (ids.length === 0)
            return;
        const placeholders = ids.map(() => "?").join(", ");
        const now = new Date().toISOString();
        this.db.prepare(`UPDATE story_facts SET access_count = access_count + 1, last_access_at = ? WHERE id IN (${placeholders})`).run(now, ...ids);
    }
    /** Archive a fact (soft delete from active retrieval). */
    archive(id) {
        this.db.prepare("UPDATE story_facts SET status = 'archived' WHERE id = ?").run(id);
    }
    /** Void a fact (logical delete, kept for audit). */
    void(id) {
        this.db.prepare("UPDATE story_facts SET status = 'voided' WHERE id = ?").run(id);
    }
    /** Compute the decayed relevance score for a fact. */
    scoreRelevance(fact, currentChapter) {
        const meta = metaOf(fact.category);
        const chaptersSince = Math.max(0, currentChapter - fact.chapterOrigin);
        const decay = Math.exp(-meta.decayLambda * chaptersSince);
        let score = fact.weight * decay * fact.narrativeRelevance * (1 + Math.abs(fact.emotionalWeight) * 0.5);
        // Recency boost: updated within last 3 chapters.
        if (currentChapter - fact.chapterOrigin <= 3) {
            score *= 1.5;
        }
        return score;
    }
    /** Export all facts to JSON (backup). */
    exportJson() {
        const rows = this.db.prepare("SELECT * FROM story_facts ORDER BY created_at").all();
        const facts = rows.map(r => this.mapRow(r));
        writeFileSync(this.jsonPath, JSON.stringify(facts, null, 2), "utf-8");
        return facts;
    }
    /** Close the database connection. */
    close() {
        // exportJson() does a writeFileSync which may throw; wrap it so the
        // SQLite handle is always released even when the backup write fails.
        try {
            this.exportJson();
        }
        catch {
            // Backup export failure must not prevent db.close().
        }
        finally {
            this.db.close();
        }
    }
    // --- Internal ---
    insertOne(fact) {
        this.db.prepare(`
      INSERT INTO story_facts
        (id, domain, category, label, content, weight, certainty, tier, status,
         triggers, emotional_weight, narrative_relevance, chapter_origin,
         derived_from, created_at, updated_at, access_count, last_access_at)
      VALUES
        (@id, @domain, @category, @label, @content, @weight, @certainty, @tier, @status,
         @triggers, @emotional_weight, @narrative_relevance, @chapter_origin,
         @derived_from, @created_at, @updated_at, @access_count, @last_access_at)
    `).run({
            id: fact.id,
            domain: fact.domain,
            category: fact.category,
            label: fact.label,
            content: fact.content,
            weight: fact.weight,
            certainty: fact.certainty,
            tier: fact.tier,
            status: fact.status,
            triggers: JSON.stringify(fact.triggers),
            emotional_weight: fact.emotionalWeight,
            narrative_relevance: fact.narrativeRelevance,
            chapter_origin: fact.chapterOrigin,
            derived_from: fact.derivedFrom ? JSON.stringify(fact.derivedFrom) : null,
            created_at: fact.createdAt,
            updated_at: fact.updatedAt,
            access_count: fact.accessCount,
            last_access_at: fact.lastAccessAt ?? null,
        });
    }
    updateOne(id, patch) {
        const sets = [];
        const params = { id };
        if (patch.weight !== undefined) {
            sets.push("weight = @weight");
            params.weight = patch.weight;
        }
        if (patch.certainty !== undefined) {
            sets.push("certainty = @certainty");
            params.certainty = patch.certainty;
        }
        if (patch.tier !== undefined) {
            sets.push("tier = @tier");
            params.tier = patch.tier;
        }
        if (patch.triggers !== undefined) {
            sets.push("triggers = @triggers");
            params.triggers = JSON.stringify(patch.triggers);
        }
        if (patch.content !== undefined) {
            sets.push("content = @content");
            params.content = patch.content;
        }
        if (patch.emotionalWeight !== undefined) {
            sets.push("emotional_weight = @emotional_weight");
            params.emotional_weight = patch.emotionalWeight;
        }
        if (patch.updatedAt !== undefined) {
            sets.push("updated_at = @updated_at");
            params.updated_at = patch.updatedAt;
        }
        if (patch.status !== undefined) {
            sets.push("status = @status");
            params.status = patch.status;
        }
        if (sets.length === 0)
            return;
        this.db.prepare(`UPDATE story_facts SET ${sets.join(", ")} WHERE id = @id`).run(params);
    }
    /** Find a similar existing fact for dedup/merge. */
    findSimilar(category, label, content) {
        // Fast path: exact label match within the same category is always a dup.
        const exact = this.db.prepare("SELECT * FROM story_facts WHERE category = ? AND label = ? AND status = 'active' LIMIT 1").get(category, label);
        if (exact)
            return this.mapRow(exact);
        // Fuzzy path: Jaccard similarity on character sets of (label + content).
        // LIMIT 200 pre-filters candidates before the O(n) Jaccard scan to keep
        // the dedup check bounded on large vaults.
        const candidates = this.db.prepare("SELECT * FROM story_facts WHERE category = ? AND status = 'active' LIMIT 200").all(category);
        const target = charSet(label + content);
        let best = null;
        for (const row of candidates) {
            const existing = this.mapRow(row);
            const existingSet = charSet(existing.label + existing.content);
            const sim = jaccard(target, existingSet);
            if (sim >= DEDUP_THRESHOLD && (!best || sim > best.sim)) {
                best = { fact: existing, sim };
            }
        }
        return best?.fact;
    }
    /** Enforce pinned tier capacity — demote lowest-scoring pinned facts. */
    enforcePinnedLimit() {
        const pinned = this.getPinned();
        if (pinned.length <= PINNED_MAX_COUNT)
            return;
        // Sort by weight ascending (lowest first), demote the excess.
        const excess = pinned.sort((a, b) => a.weight - b.weight).slice(0, pinned.length - PINNED_MAX_COUNT);
        for (const f of excess) {
            this.updateOne(f.id, { tier: "ambient" });
        }
    }
}
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/** Create a Set of characters from a string (for Jaccard similarity). */
function charSet(s) {
    return new Set(s.toLowerCase().split(""));
}
/** Jaccard similarity between two sets. */
function jaccard(a, b) {
    if (a.size === 0 && b.size === 0)
        return 0;
    let intersection = 0;
    for (const x of a) {
        if (b.has(x))
            intersection++;
    }
    return intersection / (a.size + b.size - intersection);
}
//# sourceMappingURL=fact-vault.js.map