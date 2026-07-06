// packages/core/src/character-engine/epiphany.ts
// EpiphanyDetector — detects emotional breakthroughs and perspective shifts.
//
// Analyses mood transitions and scene context to identify five types of
// epiphany:
//   • emotional_breakthrough — negative → positive mood shift
//   • perspective_shift      — large control swing during a revelation
//   • resolve_awakened       — energy surge from low to high in conflict/tragedy
//   • bond_catalyst          — large affection change in reunion/tenderness
//   • trauma_release         — large tension drop in tenderness/reunion
//
// All detected signals are persisted in SQLite for retrieval.
import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Mood labels classified as "negative" for breakthrough detection. */
const NEGATIVE_LABELS = ["furious", "fearful", "wounded", "withdrawn"];
/** Mood labels classified as "positive" for breakthrough detection. */
const POSITIVE_LABELS = ["tender", "serene", "smitten"];
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/** Clamp a value to the inclusive [min, max] range. */
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
// ---------------------------------------------------------------------------
// EpiphanyDetector
// ---------------------------------------------------------------------------
export class EpiphanyDetector {
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
      CREATE TABLE IF NOT EXISTS epiphany_signals (
        id            TEXT PRIMARY KEY,
        character_id  TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        type          TEXT NOT NULL,
        intensity     REAL NOT NULL,
        trigger_scene TEXT NOT NULL,
        before_mood   TEXT NOT NULL,
        after_mood    TEXT NOT NULL,
        description   TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_epiphany_character ON epiphany_signals(character_id);
      CREATE INDEX IF NOT EXISTS idx_epiphany_chapter  ON epiphany_signals(chapter_index);
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            id: row.id,
            characterId: row.character_id,
            chapterIndex: row.chapter_index,
            type: row.type,
            intensity: row.intensity,
            triggerScene: row.trigger_scene,
            beforeMood: row.before_mood,
            afterMood: row.after_mood,
            description: row.description,
            createdAt: row.created_at,
        };
    }
    // --- Persistence ---
    insertOne(signal) {
        this.db.prepare(`
      INSERT INTO epiphany_signals
        (id, character_id, chapter_index, type, intensity,
         trigger_scene, before_mood, after_mood, description, created_at)
      VALUES
        (@id, @character_id, @chapter_index, @type, @intensity,
         @trigger_scene, @before_mood, @after_mood, @description, @created_at)
    `).run({
            id: signal.id,
            character_id: signal.characterId,
            chapter_index: signal.chapterIndex,
            type: signal.type,
            intensity: signal.intensity,
            trigger_scene: signal.triggerScene,
            before_mood: signal.beforeMood,
            after_mood: signal.afterMood,
            description: signal.description,
            created_at: signal.createdAt,
        });
    }
    /** Create, persist, and return an EpiphanySignal. */
    createSignal(characterId, chapterIndex, type, intensity, triggerScene, beforeMood, afterMood, description) {
        const signal = {
            id: randomUUID(),
            characterId,
            chapterIndex,
            type,
            intensity: clamp(intensity, 0, 1),
            triggerScene,
            beforeMood,
            afterMood,
            description,
            createdAt: new Date().toISOString(),
        };
        this.insertOne(signal);
        return signal;
    }
    // --- Public API ---
    /**
     * Check for epiphany conditions given the current and previous mood.
     * Returns the first matching EpiphanySignal, or null if none triggered.
     *
     * Detection rules are evaluated in order; the first match wins.
     */
    check(characterId, currentMood, previousMood, sceneType, sceneIntensity, chapterIndex, triggerScene) {
        // All rules require a previous mood for comparison.
        if (!previousMood)
            return null;
        const before = previousMood.label;
        const after = currentMood.label;
        // Rule 1: emotional_breakthrough
        // Negative → positive mood shift with high scene intensity.
        if (NEGATIVE_LABELS.includes(before) &&
            POSITIVE_LABELS.includes(after) &&
            sceneIntensity > 0.7) {
            return this.createSignal(characterId, chapterIndex, "emotional_breakthrough", sceneIntensity, triggerScene, before, after, "情感突破：从负面情绪中挣脱，迎来积极转变");
        }
        // Rule 2: perspective_shift
        // Control changed by > 30 during a revelation scene.
        const controlDelta = Math.abs(currentMood.control - previousMood.control);
        if (controlDelta > 30 && sceneType === "revelation") {
            return this.createSignal(characterId, chapterIndex, "perspective_shift", controlDelta / 100, triggerScene, before, after, "视角转变：认知格局发生重大调整");
        }
        // Rule 3: resolve_awakened
        // Energy jumped from < -20 to > 30 in a conflict or tragedy scene.
        if (previousMood.energy < -20 &&
            currentMood.energy > 30 &&
            (sceneType === "conflict" || sceneType === "tragedy")) {
            const energyJump = currentMood.energy - previousMood.energy;
            return this.createSignal(characterId, chapterIndex, "resolve_awakened", energyJump / 100, triggerScene, before, after, "决心觉醒：从低沉中振作，燃起战斗意志");
        }
        // Rule 4: bond_catalyst
        // Affection changed by > 25 in a reunion or tenderness scene.
        const affectionDelta = Math.abs(currentMood.affection - previousMood.affection);
        if (affectionDelta > 25 &&
            (sceneType === "reunion" || sceneType === "tenderness")) {
            return this.createSignal(characterId, chapterIndex, "bond_catalyst", affectionDelta / 100, triggerScene, before, after, "羁绊催化：情感连接显著加深");
        }
        // Rule 5: trauma_release
        // Tension dropped by > 35 in a tenderness or reunion scene.
        const tensionDrop = previousMood.tension - currentMood.tension;
        if (tensionDrop > 35 &&
            (sceneType === "tenderness" || sceneType === "reunion")) {
            return this.createSignal(characterId, chapterIndex, "trauma_release", tensionDrop / 100, triggerScene, before, after, "创伤释放：长期紧绷的神经终于松弛");
        }
        return null;
    }
    /** Retrieve all epiphany signals for a character. */
    getByCharacter(characterId) {
        const rows = this.db.prepare("SELECT * FROM epiphany_signals WHERE character_id = ? ORDER BY chapter_index ASC").all(characterId);
        return rows.map(r => this.mapRow(r));
    }
    /** Retrieve all epiphany signals for a specific chapter. */
    getByChapter(chapterIndex) {
        const rows = this.db.prepare("SELECT * FROM epiphany_signals WHERE chapter_index = ? ORDER BY created_at ASC").all(chapterIndex);
        return rows.map(r => this.mapRow(r));
    }
    /** Close the database connection. */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=epiphany.js.map