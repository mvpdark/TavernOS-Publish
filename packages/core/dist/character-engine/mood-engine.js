// packages/core/src/character-engine/mood-engine.ts
// MoodEngine — zero-LLM 4D emotion engine using mathematical recursion.
//
// Computes mood transitions via a deterministic 10-step pipeline:
//   1.  Base stimulus lookup (SCENE_IMPULSE)
//   2.  Bond modulation
//   3.  Capacity decay (extreme values resist change)
//   4.  Per-chapter clamp (±10)
//   5.  Tension suppression (high tension dampens affection growth)
//   6.  Lock zone (|v| > 80 opposes reversal)
//   7.  Atmosphere modulation (bond-derived warmth/hostility)
//   8.  EMA recursion (exponential moving average, decay = 0.03)
//   9.  Deterministic noise (FNV-1a hash → ±1.5 jitter)
//   10. Clamp to [-100, 100] + label mapping
//
// All state is persisted in SQLite for reproducibility.
import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { SCENE_IMPULSE } from "../scene/types.js";
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/** Clamp a value to the inclusive [min, max] range. */
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
/** Capacity decay: reduces delta magnitude when the current value is already extreme. */
function capScale(v) {
    return Math.max(0.1, 1 - Math.abs(v) / 120);
}
/**
 * Lock zone: when |current| > 80, deltas that oppose the current extreme
 * (i.e., would pull the value back toward zero) are reduced by 50%.
 * This makes high/low mood states "sticky" and resistant to reversal.
 */
function applyLockZone(current, delta) {
    if (Math.abs(current) > 80 && delta !== 0 && Math.sign(delta) !== Math.sign(current)) {
        return delta * 0.5;
    }
    return delta;
}
/**
 * Deterministic FNV-1a 32-bit hash.
 * Used to generate reproducible jitter so the same inputs always produce
 * the same mood output (zero-LLM, fully deterministic).
 */
function fnv1a(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash;
}
/** Extract a ±1.5 jitter value from a different byte of the hash seed. */
function jitter(seed, dimension) {
    const byte = (seed >>> (dimension * 8)) & 0xff;
    return (byte / 255 - 0.5) * 3;
}
/** Threshold constants for label mapping. */
const HIGH = 30;
const LOW = -30;
/**
 * Map a 4D mood vector to a discrete MoodLabel.
 *
 * Priority order (first match wins):
 *   1. High tension + low control → furious (energy ≥ 0) / fearful (energy < 0)
 *   2. Low affection + low energy → withdrawn
 *   3. High affection + high energy → smitten
 *   4. High tension + high control → defiant
 *   5. Low tension + low energy → serene
 *   6. High affection + low tension → tender
 *   7. High tension + low affection → wounded
 *   8. Default → composed
 */
function mapMoodLabel(aff, ten, eng, con) {
    const highTension = ten > HIGH;
    const lowTension = ten < LOW;
    const lowControl = con < LOW;
    const highControl = con > HIGH;
    const lowAffection = aff < LOW;
    const highAffection = aff > HIGH;
    const lowEnergy = eng < LOW;
    const highEnergy = eng > HIGH;
    if (highTension && lowControl)
        return eng >= 0 ? "furious" : "fearful";
    if (lowAffection && lowEnergy)
        return "withdrawn";
    if (highAffection && highEnergy)
        return "smitten";
    if (highTension && highControl)
        return "defiant";
    if (lowTension && lowEnergy)
        return "serene";
    if (highAffection && lowTension)
        return "tender";
    if (highTension && lowAffection)
        return "wounded";
    return "composed";
}
// ---------------------------------------------------------------------------
// MoodEngine
// ---------------------------------------------------------------------------
export class MoodEngine {
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
      CREATE TABLE IF NOT EXISTS mood_vectors (
        character_id   TEXT PRIMARY KEY,
        affection      REAL NOT NULL,
        tension        REAL NOT NULL,
        energy         REAL NOT NULL,
        control        REAL NOT NULL,
        label          TEXT NOT NULL,
        locked         INTEGER NOT NULL DEFAULT 0,
        updated_at     TEXT NOT NULL,
        chapter_index  INTEGER NOT NULL DEFAULT 0
      );
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            characterId: row.character_id,
            affection: row.affection,
            tension: row.tension,
            energy: row.energy,
            control: row.control,
            label: row.label,
            locked: row.locked !== 0,
            updatedAt: row.updated_at,
            chapterIndex: row.chapter_index,
        };
    }
    // --- Persistence ---
    upsert(v) {
        this.db.prepare(`
      INSERT INTO mood_vectors
        (character_id, affection, tension, energy, control, label, locked, updated_at, chapter_index)
      VALUES
        (@character_id, @affection, @tension, @energy, @control, @label, @locked, @updated_at, @chapter_index)
      ON CONFLICT(character_id) DO UPDATE SET
        affection     = @affection,
        tension       = @tension,
        energy        = @energy,
        control       = @control,
        label         = @label,
        locked        = @locked,
        updated_at    = @updated_at,
        chapter_index = @chapter_index
    `).run({
            character_id: v.characterId,
            affection: v.affection,
            tension: v.tension,
            energy: v.energy,
            control: v.control,
            label: v.label,
            locked: v.locked ? 1 : 0,
            updated_at: v.updatedAt,
            chapter_index: v.chapterIndex,
        });
    }
    // --- Default vector for new characters ---
    defaultVector(characterId) {
        return {
            characterId,
            affection: 0,
            tension: 0,
            energy: 0,
            control: 0,
            label: "composed",
            locked: false,
            updatedAt: new Date().toISOString(),
            chapterIndex: 0,
        };
    }
    // --- Public API ---
    /**
     * Compute the next mood state via the 10-step deterministic pipeline.
     *
     * The bond modifier (-0.5 to 0.5) also serves as the atmosphere indicator:
     * values > 0.15 are treated as "warm", < -0.15 as "hostile".
     */
    shift(input) {
        // Previous state (or default zero vector for new characters).
        const prev = this.getMood(input.characterId) ?? this.defaultVector(input.characterId);
        // --- Step 1: Base stimulus lookup, scaled by scene intensity ---
        const impulse = SCENE_IMPULSE[input.sceneType];
        if (!impulse)
            throw new Error(`Invalid sceneType: ${input.sceneType}`);
        let dAff = impulse.affection * input.sceneIntensity;
        let dTen = impulse.tension * input.sceneIntensity;
        let dEng = impulse.energy * input.sceneIntensity;
        let dCon = impulse.control * input.sceneIntensity;
        // --- Step 2: Bond modulation (delta × (1 + bondModifier)) ---
        const bondFactor = 1 + input.bondModifier;
        dAff *= bondFactor;
        dTen *= bondFactor;
        dEng *= bondFactor;
        dCon *= bondFactor;
        // --- Step 3: Capacity decay (reduces delta when already extreme) ---
        dAff *= capScale(prev.affection);
        dTen *= capScale(prev.tension);
        dEng *= capScale(prev.energy);
        dCon *= capScale(prev.control);
        // --- Step 4: Per-chapter clamp (each delta clamped to ±10) ---
        dAff = clamp(dAff, -10, 10);
        dTen = clamp(dTen, -10, 10);
        dEng = clamp(dEng, -10, 10);
        dCon = clamp(dCon, -10, 10);
        // --- Step 5: Tension suppression (positive affection dampened by current tension) ---
        if (dAff > 0) {
            dAff *= 1 - prev.tension * 0.01;
        }
        // --- Step 6: Lock zone (extreme values resist opposing change) ---
        dAff = applyLockZone(prev.affection, dAff);
        dTen = applyLockZone(prev.tension, dTen);
        dEng = applyLockZone(prev.energy, dEng);
        dCon = applyLockZone(prev.control, dCon);
        // --- Step 7: Atmosphere modulation (derived from bond modifier) ---
        const atmosphere = input.bondModifier > 0.15
            ? "warm"
            : input.bondModifier < -0.15
                ? "hostile"
                : "neutral";
        if (atmosphere === "warm") {
            dAff *= 1.15;
        }
        else if (atmosphere === "hostile") {
            dAff *= 0.7;
        }
        // --- Step 8: EMA recursion (next = prev × (1 - decay) + delta, decay = 0.03) ---
        const decay = 0.03;
        let nextAff = prev.affection * (1 - decay) + dAff;
        let nextTen = prev.tension * (1 - decay) + dTen;
        let nextEng = prev.energy * (1 - decay) + dEng;
        let nextCon = prev.control * (1 - decay) + dCon;
        // --- Step 9: Deterministic noise (FNV-1a hash → ±1.5 jitter per dimension) ---
        const seed = fnv1a(`${input.characterId}:${input.chapterIndex}:${input.sceneIndex}`);
        nextAff += jitter(seed, 0);
        nextTen += jitter(seed, 1);
        nextEng += jitter(seed, 2);
        nextCon += jitter(seed, 3);
        // --- Step 10: Clamp to [-100, 100] + label mapping ---
        nextAff = clamp(nextAff, -100, 100);
        nextTen = clamp(nextTen, -100, 100);
        nextEng = clamp(nextEng, -100, 100);
        nextCon = clamp(nextCon, -100, 100);
        const label = mapMoodLabel(nextAff, nextTen, nextEng, nextCon);
        const locked = Math.abs(nextAff) > 80 ||
            Math.abs(nextTen) > 80 ||
            Math.abs(nextEng) > 80 ||
            Math.abs(nextCon) > 80;
        const vector = {
            characterId: input.characterId,
            affection: nextAff,
            tension: nextTen,
            energy: nextEng,
            control: nextCon,
            label,
            locked,
            updatedAt: new Date().toISOString(),
            chapterIndex: input.chapterIndex,
        };
        this.upsert(vector);
        return vector;
    }
    /** Retrieve the current mood vector for a character. */
    getMood(characterId) {
        const row = this.db.prepare("SELECT * FROM mood_vectors WHERE character_id = ?").get(characterId);
        return row ? this.mapRow(row) : undefined;
    }
    /** Retrieve all stored mood vectors. */
    getAllMoods() {
        const rows = this.db.prepare("SELECT * FROM mood_vectors").all();
        return rows.map(r => this.mapRow(r));
    }
    /** Close the database connection. */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=mood-engine.js.map