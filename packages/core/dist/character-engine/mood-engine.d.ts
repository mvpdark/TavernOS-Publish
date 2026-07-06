import type { MoodVector, MoodShiftInput } from "./types.js";
export declare class MoodEngine {
    private readonly db;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    private upsert;
    private defaultVector;
    /**
     * Compute the next mood state via the 10-step deterministic pipeline.
     *
     * The bond modifier (-0.5 to 0.5) also serves as the atmosphere indicator:
     * values > 0.15 are treated as "warm", < -0.15 as "hostile".
     */
    shift(input: MoodShiftInput): MoodVector;
    /** Retrieve the current mood vector for a character. */
    getMood(characterId: string): MoodVector | undefined;
    /** Retrieve all stored mood vectors. */
    getAllMoods(): MoodVector[];
    /** Close the database connection. */
    close(): void;
}
//# sourceMappingURL=mood-engine.d.ts.map