import type { LLMClient } from "../llm/index.js";
import type { GenerateWorldInput, GameWorld, ProcessTurnInput, ProcessTurnOutput, GameSession, AdventureScore, PlayerState, GameTurn } from "./types.js";
/**
 * Generate a new game world.
 *
 * Novel mode: reads the project's truth files (story-bible, story-state,
 * characters) and asks the LLM to create an adventure world based on them.
 *
 * Original mode: asks the LLM to invent a world from user preferences.
 */
export declare function generateWorld(client: LLMClient, model: string, input: GenerateWorldInput): Promise<GameWorld>;
/**
 * Process a player action and generate narrative + metadata.
 *
 * The LLM streams a response in this format:
 *   [narrative text...]
 *   ===META===
 *   场景: [English scene description for image gen]
 *   位置: [player location]
 *   状态: [player status]
 *   获得: [items gained, comma-separated]
 *   失去: [items lost, comma-separated]
 *
 * The narrative portion is streamed via onChunk; after completion, the full
 * response is parsed to extract metadata.
 */
export declare function processTurn(client: LLMClient, model: string, input: ProcessTurnInput): Promise<ProcessTurnOutput>;
/**
 * Build an image generation prompt from the scene description.
 * Combines world genre styling with the scene description for a cohesive look.
 */
export declare function buildSceneImagePrompt(world: GameWorld, sceneDescription: string): string;
/**
 * Score the adventure for novelization potential.
 * Feeds the entire transcript to the LLM and asks for structured evaluation.
 */
export declare function scoreAdventure(client: LLMClient, model: string, session: GameSession): Promise<AdventureScore>;
/**
 * Build data needed to convert an adventure into a novel project.
 * Returns the project name, genre, and initial story bible content.
 */
export declare function buildNovelConversionData(session: GameSession): {
    name: string;
    genre: string;
    storyBible: string;
    premise: string;
    protagonist: string;
};
/** A converted chapter ready to write to disk. */
export interface ConvertedChapter {
    id: string;
    title: string;
    content: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}
/** Result of the full conversion. */
export interface ConversionResult {
    chapters: ConvertedChapter[];
    storyBible: string;
    characters: ExtractedCharacter[];
}
/** A character extracted from the adventure for card creation. */
export interface ExtractedCharacter {
    name: string;
    description: string;
    personality: string;
    role: string;
}
/**
 * Convert an adventure session into novel chapters using LLM.
 *
 * For each chapter group, the LLM rewrites the interactive dialogue
 * (player action → narrator response) into continuous third-person prose
 * suitable for a novel. The output preserves key plot points, character
 * interactions, and world details while removing game-like elements.
 *
 * @param onChapterProgress Called after each chapter is converted (0-indexed).
 */
export declare function convertAdventureToChapters(client: LLMClient, model: string, session: GameSession, onChapterProgress?: (index: number, total: number, title: string) => void): Promise<ConversionResult>;
/** Create a new game session from a world + initial player state. */
export declare function createSession(world: GameWorld, player?: Partial<PlayerState>): GameSession;
/** Create a new turn object. */
export declare function createTurn(role: GameTurn["role"], content: string, extra?: {
    imageUrl?: string;
    audioUrl?: string;
    choices?: string[];
}): GameTurn;
/** Apply player state updates from a ProcessTurnOutput. */
export declare function applyPlayerStateUpdate(player: PlayerState, update: ProcessTurnOutput["playerStateUpdate"]): PlayerState;
//# sourceMappingURL=engine.d.ts.map