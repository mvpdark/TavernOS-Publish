// packages/core/src/character-engine/bond-tracker.ts
// BondTracker — relationship FSM (finite state machine) tracker.
//
// Tracks the evolving relationship between pairs of characters via a
// deterministic phase-transition FSM. Each interaction adjusts trust,
// tensions, and warmth, which in turn may trigger a phase transition
// (stranger → acquaintance → ally → confidant → lover, or rival/enemy).
//
// All state is persisted in SQLite; the transition history is stored as
// a JSON array for auditability.
import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/** Clamp a value to the inclusive [min, max] range. */
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
/**
 * Build a canonical pair key by sorting the two character IDs alphabetically
 * and joining with ":". This ensures (A, B) and (B, A) map to the same bond.
 */
function buildPairKey(a, b) {
    const [first, second] = [a, b].sort();
    // Use a null byte as the delimiter so character IDs that themselves
    // contain ":" don't break the split in getBondsForCharacter (and the
    // pair-key splits in narrative-engine.ts).
    return `${first}\u0000${second}`;
}
// ---------------------------------------------------------------------------
// BondTracker
// ---------------------------------------------------------------------------
export class BondTracker {
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
      CREATE TABLE IF NOT EXISTS bond_states (
        pair_key                 TEXT PRIMARY KEY,
        phase                    TEXT NOT NULL DEFAULT 'stranger',
        trust                    REAL NOT NULL DEFAULT 30,
        tensions                 REAL NOT NULL DEFAULT 0,
        warmth                   REAL NOT NULL DEFAULT 0,
        mood                     TEXT NOT NULL DEFAULT 'neutral',
        positive_streak          INTEGER NOT NULL DEFAULT 0,
        shared_scenes            INTEGER NOT NULL DEFAULT 0,
        last_interaction_chapter INTEGER NOT NULL DEFAULT 0,
        history                  TEXT NOT NULL DEFAULT '[]',
        updated_at               TEXT NOT NULL
      );
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            pairKey: row.pair_key,
            phase: row.phase,
            trust: row.trust,
            tensions: row.tensions,
            warmth: row.warmth,
            mood: row.mood,
            positiveStreak: row.positive_streak,
            sharedScenes: row.shared_scenes,
            lastInteractionChapter: row.last_interaction_chapter,
            history: JSON.parse(row.history),
            updatedAt: row.updated_at,
        };
    }
    // --- Persistence ---
    upsert(state) {
        this.db.prepare(`
      INSERT INTO bond_states
        (pair_key, phase, trust, tensions, warmth, mood,
         positive_streak, shared_scenes, last_interaction_chapter, history, updated_at)
      VALUES
        (@pair_key, @phase, @trust, @tensions, @warmth, @mood,
         @positive_streak, @shared_scenes, @last_interaction_chapter, @history, @updated_at)
      ON CONFLICT(pair_key) DO UPDATE SET
        phase                    = @phase,
        trust                    = @trust,
        tensions                 = @tensions,
        warmth                   = @warmth,
        mood                     = @mood,
        positive_streak          = @positive_streak,
        shared_scenes            = @shared_scenes,
        last_interaction_chapter = @last_interaction_chapter,
        history                  = @history,
        updated_at               = @updated_at
    `).run({
            pair_key: state.pairKey,
            phase: state.phase,
            trust: state.trust,
            tensions: state.tensions,
            warmth: state.warmth,
            mood: state.mood,
            positive_streak: state.positiveStreak,
            shared_scenes: state.sharedScenes,
            last_interaction_chapter: state.lastInteractionChapter,
            history: JSON.stringify(state.history),
            updated_at: state.updatedAt,
        });
    }
    // --- Initial state ---
    initialState(pairKey) {
        return {
            pairKey,
            phase: "stranger",
            trust: 30,
            tensions: 0,
            warmth: 0,
            mood: "neutral",
            positiveStreak: 0,
            sharedScenes: 0,
            lastInteractionChapter: 0,
            history: [],
            updatedAt: new Date().toISOString(),
        };
    }
    // --- Phase transition FSM ---
    /**
     * Compute the next phase based on the current state.
     *
     * Transition rules (checked in priority order):
     *   • enemy is sticky — only exits to rival when tensions < 50
     *   • rival can escalate to enemy (tensions ≥ 70) or recover to ally
     *   • any phase → enemy when tensions ≥ 70 (no exclusions)
     *   • any phase → rival when tensions ≥ 50 (except lover/family)
     *   • mentor/family are set externally — no auto-progression
     *   • stranger → acquaintance → ally → confidant → lover (trust/streak gates)
     */
    computeNextPhase(state) {
        const current = state.phase;
        // Enemy phase: sticky until tensions drop below 50.
        if (current === "enemy") {
            return state.tensions < 50 ? "rival" : "enemy";
        }
        // Rival phase: can escalate to enemy or recover to ally.
        if (current === "rival") {
            if (state.tensions >= 70)
                return "enemy";
            if (state.trust >= 60 && state.tensions < 30)
                return "ally";
            return "rival";
        }
        // From any other phase — check escalation rules first.
        // Rule: any → enemy (tensions ≥ 70, no exclusions).
        if (state.tensions >= 70)
            return "enemy";
        // Rule: any → rival (tensions ≥ 50, but not lover/family).
        if (state.tensions >= 50 && current !== "lover" && current !== "family") {
            return "rival";
        }
        // mentor and family are set externally — no auto-progression.
        if (current === "mentor" || current === "family")
            return current;
        // Progression cascade.
        switch (current) {
            case "stranger":
                return state.trust >= 20 ? "acquaintance" : "stranger";
            case "acquaintance":
                return state.trust >= 40 && state.positiveStreak >= 3 ? "ally" : "acquaintance";
            case "ally":
                return state.trust >= 65 && state.positiveStreak >= 5 ? "confidant" : "ally";
            case "confidant":
                return state.trust >= 80 && state.warmth >= 0.5 && state.positiveStreak >= 7
                    ? "lover"
                    : "confidant";
            case "lover":
                // Lover is terminal in the progression path (protected from rival).
                return "lover";
            default:
                return current;
        }
    }
    // --- Public API ---
    /**
     * Record a bond interaction and return the updated BondState.
     *
     * Positive interactions increase trust and warmth, decrease tensions,
     * and advance the positive streak. Negative interactions do the reverse
     * and reset the streak. Phase transitions are checked after every update.
     */
    recordInteraction(interaction) {
        const pairKey = buildPairKey(interaction.characterA, interaction.characterB);
        // Get or create the initial state.
        const existing = this.getBondByPairKey(pairKey);
        let state = existing ?? this.initialState(pairKey);
        // Apply interaction effects.
        if (interaction.isPositive) {
            state.trust += 5 + interaction.intensity * 10;
            state.tensions -= 2 + interaction.intensity * 5;
            state.warmth = clamp(state.warmth + 0.1, -1, 1);
            state.positiveStreak++;
        }
        else {
            state.trust -= 5 + interaction.intensity * 15;
            state.tensions += 3 + interaction.intensity * 8;
            state.warmth = clamp(state.warmth - 0.15, -1, 1);
            state.positiveStreak = 0;
        }
        // Clamp trust and tensions to valid ranges.
        state.trust = clamp(state.trust, 0, 100);
        state.tensions = clamp(state.tensions, 0, 100);
        // Update mood from warmth.
        state.mood = state.warmth > 0.3
            ? "warm"
            : state.warmth < -0.3
                ? "hostile"
                : "neutral";
        // Update scene tracking.
        state.sharedScenes++;
        state.lastInteractionChapter = interaction.chapterIndex;
        // Check for phase transition.
        const prevPhase = state.phase;
        const nextPhase = this.computeNextPhase(state);
        if (nextPhase !== prevPhase) {
            state.history.push({
                chapter: interaction.chapterIndex,
                fromPhase: prevPhase,
                toPhase: nextPhase,
                reason: interaction.description,
            });
            state.phase = nextPhase;
        }
        state.updatedAt = new Date().toISOString();
        this.upsert(state);
        return state;
    }
    /** Retrieve a bond by its pair key (internal helper). */
    getBondByPairKey(pairKey) {
        const row = this.db.prepare("SELECT * FROM bond_states WHERE pair_key = ?").get(pairKey);
        return row ? this.mapRow(row) : undefined;
    }
    /** Retrieve the bond between two characters. */
    getBond(charA, charB) {
        return this.getBondByPairKey(buildPairKey(charA, charB));
    }
    /** Retrieve all stored bonds. */
    getAllBonds() {
        const rows = this.db.prepare("SELECT * FROM bond_states").all();
        return rows.map(r => this.mapRow(r));
    }
    /** Retrieve all bonds involving a specific character. */
    getBondsForCharacter(char) {
        return this.getAllBonds().filter(b => {
            const parts = b.pairKey.split("\u0000");
            return parts.includes(char);
        });
    }
    /** Close the database connection. */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=bond-tracker.js.map