// packages/core/src/character-engine/motive-stack.ts
// MotiveStack — character motivation tracking system.
//
// Manages a per-character stack of active motives with priorities.
// Motives can be pushed, resolved, abandoned, or temporarily suppressed.
// The active motive with the highest priority is considered the "top motive"
// and is typically the one driving the character's current behaviour.
import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
// ---------------------------------------------------------------------------
// MotiveStack
// ---------------------------------------------------------------------------
export class MotiveStack {
    db;
    constructor(dbPath) {
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.initSchema();
    }
    // --- Schema ---
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS motives (
        id                 TEXT PRIMARY KEY,
        character_id       TEXT NOT NULL,
        description        TEXT NOT NULL,
        priority           REAL NOT NULL DEFAULT 50,
        status             TEXT NOT NULL DEFAULT 'active',
        source             TEXT NOT NULL DEFAULT 'internal',
        chapter_origin     INTEGER NOT NULL DEFAULT 0,
        chapter_resolved   INTEGER,
        related_characters TEXT NOT NULL DEFAULT '[]',
        created_at         TEXT NOT NULL,
        updated_at         TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_motives_character ON motives(character_id);
      CREATE INDEX IF NOT EXISTS idx_motives_status   ON motives(character_id, status);
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            id: row.id,
            characterId: row.character_id,
            description: row.description,
            priority: row.priority,
            status: row.status,
            source: row.source,
            chapterOrigin: row.chapter_origin,
            chapterResolved: row.chapter_resolved ?? undefined,
            relatedCharacters: JSON.parse(row.related_characters),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    // --- Persistence ---
    insertOne(motive) {
        this.db.prepare(`
      INSERT INTO motives
        (id, character_id, description, priority, status, source,
         chapter_origin, chapter_resolved, related_characters, created_at, updated_at)
      VALUES
        (@id, @character_id, @description, @priority, @status, @source,
         @chapter_origin, @chapter_resolved, @related_characters, @created_at, @updated_at)
    `).run({
            id: motive.id,
            character_id: motive.characterId,
            description: motive.description,
            priority: motive.priority,
            status: motive.status,
            source: motive.source,
            chapter_origin: motive.chapterOrigin,
            chapter_resolved: motive.chapterResolved ?? null,
            related_characters: JSON.stringify(motive.relatedCharacters),
            created_at: motive.createdAt,
            updated_at: motive.updatedAt,
        });
    }
    // --- Public API ---
    /** Add a new motive to the stack. Returns the fully populated Motive. */
    push(motive) {
        const now = new Date().toISOString();
        const full = {
            ...motive,
            status: motive.status ?? "active",
            source: motive.source ?? "internal",
            relatedCharacters: motive.relatedCharacters ?? [],
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        this.insertOne(full);
        return full;
    }
    /** Mark a motive as satisfied, recording the resolution chapter. */
    resolve(id, chapterIndex) {
        this.db.prepare(`UPDATE motives
         SET status = 'satisfied', chapter_resolved = @chapter_resolved, updated_at = @updated_at
       WHERE id = @id`).run({
            id,
            chapter_resolved: chapterIndex,
            updated_at: new Date().toISOString(),
        });
    }
    /** Mark a motive as abandoned (permanently discarded). */
    abandon(id) {
        this.db.prepare(`UPDATE motives SET status = 'abandoned', updated_at = @updated_at WHERE id = @id`).run({ id, updated_at: new Date().toISOString() });
    }
    /** Temporarily suppress a motive (can be re-activated later). */
    suppress(id) {
        this.db.prepare(`UPDATE motives SET status = 'suppressed', updated_at = @updated_at WHERE id = @id`).run({ id, updated_at: new Date().toISOString() });
    }
    /** Get all active motives for a character, sorted by priority descending. */
    getActive(characterId) {
        const rows = this.db.prepare(`SELECT * FROM motives
        WHERE character_id = ? AND status = 'active'
        ORDER BY priority DESC`).all(characterId);
        return rows.map(r => this.mapRow(r));
    }
    /** Get all motives for a character (any status), sorted by priority descending. */
    getAll(characterId) {
        const rows = this.db.prepare(`SELECT * FROM motives
        WHERE character_id = ?
        ORDER BY priority DESC`).all(characterId);
        return rows.map(r => this.mapRow(r));
    }
    /** Get the highest-priority active motive for a character. */
    getTopMotive(characterId) {
        const rows = this.db.prepare(`SELECT * FROM motives
        WHERE character_id = ? AND status = 'active'
        ORDER BY priority DESC
        LIMIT 1`).all(characterId);
        return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
    }
    /** Close the database connection. */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=motive-stack.js.map