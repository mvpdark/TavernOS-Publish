// packages/core/src/deepgame/types.ts
//
// DeepGame — interactive adventure module.
//
// Two modes:
//   "novel"    — read an existing novel project and let the player adventure
//                inside that novel's world (characters, lore, settings).
//   "original" — generate a brand-new world from scratch via LLM and adventure
//                in it.
//
// Each turn: LLM generates narrative text + scene image prompt. After the
// adventure, an AI scoring pass evaluates whether the story is good enough
// to convert into a novel project.
//
// Combines: LLM (narrative) + Image generation (scene illustrations) +
// TTS (optional narration) + Truth files (world consistency for novel mode).
import { z } from "zod";
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const GameModeSchema = z.enum(["novel", "original"]);
export const GameStatusSchema = z.enum(["active", "completed", "abandoned"]);
export const TurnRoleSchema = z.enum(["player", "narrator", "system"]);
// ---------------------------------------------------------------------------
// Player state — tracked throughout the adventure
// ---------------------------------------------------------------------------
export const PlayerStateSchema = z.object({
    name: z.string().default("玩家"),
    location: z.string().default(""),
    inventory: z.array(z.string()).default([]),
    status: z.string().default("健康"),
    relationships: z.record(z.string(), z.string()).default({}),
});
// ---------------------------------------------------------------------------
// Game world — the adventure setting
// ---------------------------------------------------------------------------
export const GameWorldSchema = z.object({
    mode: GameModeSchema,
    /** Source project id when mode === "novel". */
    sourceProjectId: z.string().optional(),
    title: z.string(),
    premise: z.string(),
    setting: z.string(),
    genre: z.string().default(""),
    /** Extracted character summary (novel mode). */
    characterSummary: z.string().optional(),
    /** Extracted world summary (novel mode). */
    worldSummary: z.string().optional(),
    /** Who the player embodies in this world. */
    playerCharacter: z.string(),
    startingScene: z.string(),
});
// ---------------------------------------------------------------------------
// Game turn — a single interaction step
// ---------------------------------------------------------------------------
export const GameTurnSchema = z.object({
    id: z.string(),
    role: TurnRoleSchema,
    content: z.string(),
    /** Scene image URL (data URL or remote URL) for this narrator turn. */
    imageUrl: z.string().optional(),
    /** TTS audio URL for this narrator turn (optional). */
    audioUrl: z.string().optional(),
    /** Interactive choices presented to the player after this narrator turn. */
    choices: z.array(z.string()).default([]),
    timestamp: z.number(),
});
// ---------------------------------------------------------------------------
// Adventure score — AI evaluation for novelization potential
// ---------------------------------------------------------------------------
export const ScoreDimensionsSchema = z.object({
    narrative: z.number().min(0).max(100),
    engagement: z.number().min(0).max(100),
    creativity: z.number().min(0).max(100),
    coherence: z.number().min(0).max(100),
    character: z.number().min(0).max(100),
    tension: z.number().min(0).max(100),
});
export const AdventureScoreSchema = z.object({
    totalScore: z.number().min(0).max(100),
    dimensions: ScoreDimensionsSchema,
    summary: z.string(),
    recommendation: z.string(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    novelPotential: z.string(),
});
// ---------------------------------------------------------------------------
// Game session — the complete adventure state
// ---------------------------------------------------------------------------
export const GameSessionSchema = z.object({
    id: z.string(),
    world: GameWorldSchema,
    player: PlayerStateSchema,
    turns: z.array(GameTurnSchema).default([]),
    status: GameStatusSchema.default("active"),
    createdAt: z.number(),
    updatedAt: z.number(),
    turnCount: z.number().default(0),
    score: AdventureScoreSchema.optional(),
});
// ---------------------------------------------------------------------------
// Session list item (lightweight, for list views)
// ---------------------------------------------------------------------------
export const SessionListItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    genre: z.string(),
    mode: GameModeSchema,
    status: GameStatusSchema,
    turnCount: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    hasScore: z.boolean().default(false),
    totalScore: z.number().optional(),
});
//# sourceMappingURL=types.js.map