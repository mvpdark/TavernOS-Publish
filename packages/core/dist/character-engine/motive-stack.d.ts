import type { Motive } from "./types.js";
export declare class MotiveStack {
    private readonly db;
    constructor(dbPath: string);
    private initSchema;
    private mapRow;
    private insertOne;
    /** Add a new motive to the stack. Returns the fully populated Motive. */
    push(motive: Omit<Partial<Motive>, "id" | "createdAt" | "updatedAt"> & {
        characterId: string;
        description: string;
        priority: number;
        chapterOrigin: number;
    }): Motive;
    /** Mark a motive as satisfied, recording the resolution chapter. */
    resolve(id: string, chapterIndex: number): void;
    /** Mark a motive as abandoned (permanently discarded). */
    abandon(id: string): void;
    /** Temporarily suppress a motive (can be re-activated later). */
    suppress(id: string): void;
    /** Get all active motives for a character, sorted by priority descending. */
    getActive(characterId: string): Motive[];
    /** Get all motives for a character (any status), sorted by priority descending. */
    getAll(characterId: string): Motive[];
    /** Get the highest-priority active motive for a character. */
    getTopMotive(characterId: string): Motive | undefined;
    /** Close the database connection. */
    close(): void;
}
//# sourceMappingURL=motive-stack.d.ts.map