import type { EpiphanySignal, MoodVector } from "./types.js";
import type { SceneType } from "../scene/types.js";
export declare class EpiphanyDetector {
    private readonly db;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    private insertOne;
    /** Create, persist, and return an EpiphanySignal. */
    private createSignal;
    /**
     * Check for epiphany conditions given the current and previous mood.
     * Returns the first matching EpiphanySignal, or null if none triggered.
     *
     * Detection rules are evaluated in order; the first match wins.
     */
    check(characterId: string, currentMood: MoodVector, previousMood: MoodVector | undefined, sceneType: SceneType, sceneIntensity: number, chapterIndex: number, triggerScene: string): EpiphanySignal | null;
    /** Retrieve all epiphany signals for a character. */
    getByCharacter(characterId: string): EpiphanySignal[];
    /** Retrieve all epiphany signals for a specific chapter. */
    getByChapter(chapterIndex: number): EpiphanySignal[];
    /** Close the database connection. */
    close(): void;
}
//# sourceMappingURL=epiphany.d.ts.map