import { z } from "zod";
export declare const GameModeSchema: z.ZodEnum<["novel", "original"]>;
export type GameMode = z.infer<typeof GameModeSchema>;
export declare const GameStatusSchema: z.ZodEnum<["active", "completed", "abandoned"]>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export declare const TurnRoleSchema: z.ZodEnum<["player", "narrator", "system"]>;
export type TurnRole = z.infer<typeof TurnRoleSchema>;
export declare const PlayerStateSchema: z.ZodObject<{
    name: z.ZodDefault<z.ZodString>;
    location: z.ZodDefault<z.ZodString>;
    inventory: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodDefault<z.ZodString>;
    relationships: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: string;
    name: string;
    location: string;
    relationships: Record<string, string>;
    inventory: string[];
}, {
    status?: string | undefined;
    name?: string | undefined;
    location?: string | undefined;
    relationships?: Record<string, string> | undefined;
    inventory?: string[] | undefined;
}>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export declare const GameWorldSchema: z.ZodObject<{
    mode: z.ZodEnum<["novel", "original"]>;
    /** Source project id when mode === "novel". */
    sourceProjectId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    premise: z.ZodString;
    setting: z.ZodString;
    genre: z.ZodDefault<z.ZodString>;
    /** Extracted character summary (novel mode). */
    characterSummary: z.ZodOptional<z.ZodString>;
    /** Extracted world summary (novel mode). */
    worldSummary: z.ZodOptional<z.ZodString>;
    /** Who the player embodies in this world. */
    playerCharacter: z.ZodString;
    startingScene: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    genre: string;
    premise: string;
    mode: "novel" | "original";
    setting: string;
    playerCharacter: string;
    startingScene: string;
    sourceProjectId?: string | undefined;
    characterSummary?: string | undefined;
    worldSummary?: string | undefined;
}, {
    title: string;
    premise: string;
    mode: "novel" | "original";
    setting: string;
    playerCharacter: string;
    startingScene: string;
    genre?: string | undefined;
    sourceProjectId?: string | undefined;
    characterSummary?: string | undefined;
    worldSummary?: string | undefined;
}>;
export type GameWorld = z.infer<typeof GameWorldSchema>;
export declare const GameTurnSchema: z.ZodObject<{
    id: z.ZodString;
    role: z.ZodEnum<["player", "narrator", "system"]>;
    content: z.ZodString;
    /** Scene image URL (data URL or remote URL) for this narrator turn. */
    imageUrl: z.ZodOptional<z.ZodString>;
    /** TTS audio URL for this narrator turn (optional). */
    audioUrl: z.ZodOptional<z.ZodString>;
    /** Interactive choices presented to the player after this narrator turn. */
    choices: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    timestamp: number;
    role: "system" | "player" | "narrator";
    choices: string[];
    imageUrl?: string | undefined;
    audioUrl?: string | undefined;
}, {
    id: string;
    content: string;
    timestamp: number;
    role: "system" | "player" | "narrator";
    imageUrl?: string | undefined;
    audioUrl?: string | undefined;
    choices?: string[] | undefined;
}>;
export type GameTurn = z.infer<typeof GameTurnSchema>;
export declare const ScoreDimensionsSchema: z.ZodObject<{
    narrative: z.ZodNumber;
    engagement: z.ZodNumber;
    creativity: z.ZodNumber;
    coherence: z.ZodNumber;
    character: z.ZodNumber;
    tension: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    narrative: number;
    character: number;
    tension: number;
    engagement: number;
    creativity: number;
    coherence: number;
}, {
    narrative: number;
    character: number;
    tension: number;
    engagement: number;
    creativity: number;
    coherence: number;
}>;
export type ScoreDimensions = z.infer<typeof ScoreDimensionsSchema>;
export declare const AdventureScoreSchema: z.ZodObject<{
    totalScore: z.ZodNumber;
    dimensions: z.ZodObject<{
        narrative: z.ZodNumber;
        engagement: z.ZodNumber;
        creativity: z.ZodNumber;
        coherence: z.ZodNumber;
        character: z.ZodNumber;
        tension: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        narrative: number;
        character: number;
        tension: number;
        engagement: number;
        creativity: number;
        coherence: number;
    }, {
        narrative: number;
        character: number;
        tension: number;
        engagement: number;
        creativity: number;
        coherence: number;
    }>;
    summary: z.ZodString;
    recommendation: z.ZodString;
    strengths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    weaknesses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    novelPotential: z.ZodString;
}, "strip", z.ZodTypeAny, {
    summary: string;
    recommendation: string;
    dimensions: {
        narrative: number;
        character: number;
        tension: number;
        engagement: number;
        creativity: number;
        coherence: number;
    };
    totalScore: number;
    strengths: string[];
    weaknesses: string[];
    novelPotential: string;
}, {
    summary: string;
    recommendation: string;
    dimensions: {
        narrative: number;
        character: number;
        tension: number;
        engagement: number;
        creativity: number;
        coherence: number;
    };
    totalScore: number;
    novelPotential: string;
    strengths?: string[] | undefined;
    weaknesses?: string[] | undefined;
}>;
export type AdventureScore = z.infer<typeof AdventureScoreSchema>;
export declare const GameSessionSchema: z.ZodObject<{
    id: z.ZodString;
    world: z.ZodObject<{
        mode: z.ZodEnum<["novel", "original"]>;
        /** Source project id when mode === "novel". */
        sourceProjectId: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        premise: z.ZodString;
        setting: z.ZodString;
        genre: z.ZodDefault<z.ZodString>;
        /** Extracted character summary (novel mode). */
        characterSummary: z.ZodOptional<z.ZodString>;
        /** Extracted world summary (novel mode). */
        worldSummary: z.ZodOptional<z.ZodString>;
        /** Who the player embodies in this world. */
        playerCharacter: z.ZodString;
        startingScene: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        genre: string;
        premise: string;
        mode: "novel" | "original";
        setting: string;
        playerCharacter: string;
        startingScene: string;
        sourceProjectId?: string | undefined;
        characterSummary?: string | undefined;
        worldSummary?: string | undefined;
    }, {
        title: string;
        premise: string;
        mode: "novel" | "original";
        setting: string;
        playerCharacter: string;
        startingScene: string;
        genre?: string | undefined;
        sourceProjectId?: string | undefined;
        characterSummary?: string | undefined;
        worldSummary?: string | undefined;
    }>;
    player: z.ZodObject<{
        name: z.ZodDefault<z.ZodString>;
        location: z.ZodDefault<z.ZodString>;
        inventory: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        status: z.ZodDefault<z.ZodString>;
        relationships: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        name: string;
        location: string;
        relationships: Record<string, string>;
        inventory: string[];
    }, {
        status?: string | undefined;
        name?: string | undefined;
        location?: string | undefined;
        relationships?: Record<string, string> | undefined;
        inventory?: string[] | undefined;
    }>;
    turns: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        role: z.ZodEnum<["player", "narrator", "system"]>;
        content: z.ZodString;
        /** Scene image URL (data URL or remote URL) for this narrator turn. */
        imageUrl: z.ZodOptional<z.ZodString>;
        /** TTS audio URL for this narrator turn (optional). */
        audioUrl: z.ZodOptional<z.ZodString>;
        /** Interactive choices presented to the player after this narrator turn. */
        choices: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string;
        timestamp: number;
        role: "system" | "player" | "narrator";
        choices: string[];
        imageUrl?: string | undefined;
        audioUrl?: string | undefined;
    }, {
        id: string;
        content: string;
        timestamp: number;
        role: "system" | "player" | "narrator";
        imageUrl?: string | undefined;
        audioUrl?: string | undefined;
        choices?: string[] | undefined;
    }>, "many">>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "abandoned"]>>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    turnCount: z.ZodDefault<z.ZodNumber>;
    score: z.ZodOptional<z.ZodObject<{
        totalScore: z.ZodNumber;
        dimensions: z.ZodObject<{
            narrative: z.ZodNumber;
            engagement: z.ZodNumber;
            creativity: z.ZodNumber;
            coherence: z.ZodNumber;
            character: z.ZodNumber;
            tension: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            narrative: number;
            character: number;
            tension: number;
            engagement: number;
            creativity: number;
            coherence: number;
        }, {
            narrative: number;
            character: number;
            tension: number;
            engagement: number;
            creativity: number;
            coherence: number;
        }>;
        summary: z.ZodString;
        recommendation: z.ZodString;
        strengths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        weaknesses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        novelPotential: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        recommendation: string;
        dimensions: {
            narrative: number;
            character: number;
            tension: number;
            engagement: number;
            creativity: number;
            coherence: number;
        };
        totalScore: number;
        strengths: string[];
        weaknesses: string[];
        novelPotential: string;
    }, {
        summary: string;
        recommendation: string;
        dimensions: {
            narrative: number;
            character: number;
            tension: number;
            engagement: number;
            creativity: number;
            coherence: number;
        };
        totalScore: number;
        novelPotential: string;
        strengths?: string[] | undefined;
        weaknesses?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "abandoned";
    id: string;
    createdAt: number;
    updatedAt: number;
    world: {
        title: string;
        genre: string;
        premise: string;
        mode: "novel" | "original";
        setting: string;
        playerCharacter: string;
        startingScene: string;
        sourceProjectId?: string | undefined;
        characterSummary?: string | undefined;
        worldSummary?: string | undefined;
    };
    turnCount: number;
    player: {
        status: string;
        name: string;
        location: string;
        relationships: Record<string, string>;
        inventory: string[];
    };
    turns: {
        id: string;
        content: string;
        timestamp: number;
        role: "system" | "player" | "narrator";
        choices: string[];
        imageUrl?: string | undefined;
        audioUrl?: string | undefined;
    }[];
    score?: {
        summary: string;
        recommendation: string;
        dimensions: {
            narrative: number;
            character: number;
            tension: number;
            engagement: number;
            creativity: number;
            coherence: number;
        };
        totalScore: number;
        strengths: string[];
        weaknesses: string[];
        novelPotential: string;
    } | undefined;
}, {
    id: string;
    createdAt: number;
    updatedAt: number;
    world: {
        title: string;
        premise: string;
        mode: "novel" | "original";
        setting: string;
        playerCharacter: string;
        startingScene: string;
        genre?: string | undefined;
        sourceProjectId?: string | undefined;
        characterSummary?: string | undefined;
        worldSummary?: string | undefined;
    };
    player: {
        status?: string | undefined;
        name?: string | undefined;
        location?: string | undefined;
        relationships?: Record<string, string> | undefined;
        inventory?: string[] | undefined;
    };
    status?: "active" | "completed" | "abandoned" | undefined;
    score?: {
        summary: string;
        recommendation: string;
        dimensions: {
            narrative: number;
            character: number;
            tension: number;
            engagement: number;
            creativity: number;
            coherence: number;
        };
        totalScore: number;
        novelPotential: string;
        strengths?: string[] | undefined;
        weaknesses?: string[] | undefined;
    } | undefined;
    turnCount?: number | undefined;
    turns?: {
        id: string;
        content: string;
        timestamp: number;
        role: "system" | "player" | "narrator";
        imageUrl?: string | undefined;
        audioUrl?: string | undefined;
        choices?: string[] | undefined;
    }[] | undefined;
}>;
export type GameSession = z.infer<typeof GameSessionSchema>;
/** Input for world generation. */
export interface GenerateWorldInput {
    mode: GameMode;
    /** Project root path (novel mode). */
    sourceProjectRoot?: string;
    /** Source project id (novel mode). */
    sourceProjectId?: string;
    /** User preferences (original mode). */
    preferences?: {
        genre?: string;
        theme?: string;
        setting?: string;
        playerCharacter?: string;
    };
}
/** Input for processing a player turn. */
export interface ProcessTurnInput {
    world: GameWorld;
    player: PlayerState;
    turns: GameTurn[];
    action: string;
    onChunk?: (delta: string) => void;
    signal?: AbortSignal;
}
/** Output from processing a turn. */
export interface ProcessTurnOutput {
    /** Full LLM response (narrative + metadata). */
    raw: string;
    /** Narrative text shown to the player. */
    narrative: string;
    /** Scene description for image generation (English). */
    sceneImagePrompt: string;
    /** Interactive choices for the player's next action. */
    choices: string[];
    /** Player state updates. */
    playerStateUpdate: {
        location?: string;
        status?: string;
        inventoryAdd?: string[];
        inventoryRemove?: string[];
    };
}
/** Input for scoring. */
export interface ScoreAdventureInput {
    session: GameSession;
}
export declare const SessionListItemSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    genre: z.ZodString;
    mode: z.ZodEnum<["novel", "original"]>;
    status: z.ZodEnum<["active", "completed", "abandoned"]>;
    turnCount: z.ZodNumber;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    hasScore: z.ZodDefault<z.ZodBoolean>;
    totalScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "abandoned";
    id: string;
    title: string;
    genre: string;
    createdAt: number;
    updatedAt: number;
    turnCount: number;
    mode: "novel" | "original";
    hasScore: boolean;
    totalScore?: number | undefined;
}, {
    status: "active" | "completed" | "abandoned";
    id: string;
    title: string;
    genre: string;
    createdAt: number;
    updatedAt: number;
    turnCount: number;
    mode: "novel" | "original";
    totalScore?: number | undefined;
    hasScore?: boolean | undefined;
}>;
export type SessionListItem = z.infer<typeof SessionListItemSchema>;
//# sourceMappingURL=types.d.ts.map