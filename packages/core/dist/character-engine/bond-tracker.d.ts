import type { BondState, BondInteraction } from "./types.js";
export declare class BondTracker {
    private readonly db;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    private upsert;
    private initialState;
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
    private computeNextPhase;
    /**
     * Record a bond interaction and return the updated BondState.
     *
     * Positive interactions increase trust and warmth, decrease tensions,
     * and advance the positive streak. Negative interactions do the reverse
     * and reset the streak. Phase transitions are checked after every update.
     */
    recordInteraction(interaction: BondInteraction): BondState;
    /** Retrieve a bond by its pair key (internal helper). */
    private getBondByPairKey;
    /** Retrieve the bond between two characters. */
    getBond(charA: string, charB: string): BondState | undefined;
    /** Retrieve all stored bonds. */
    getAllBonds(): BondState[];
    /** Retrieve all bonds involving a specific character. */
    getBondsForCharacter(char: string): BondState[];
    /** Close the database connection. */
    close(): void;
}
//# sourceMappingURL=bond-tracker.d.ts.map