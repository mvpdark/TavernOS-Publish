// DeepGame module — interactive adventure engine.
//
// Combines LLM (narrative generation) + Image generation (scene illustrations)
// + Truth files (world consistency for novel mode) into an interactive
// adventure experience that can be scored and converted to a novel project.
export * from "./types.js";
export { generateWorld, processTurn, buildSceneImagePrompt, scoreAdventure, buildNovelConversionData, convertAdventureToChapters, createSession, createTurn, applyPlayerStateUpdate, } from "./engine.js";
//# sourceMappingURL=index.js.map