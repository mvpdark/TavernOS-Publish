import { getModelDisplayLabel } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";

export function isSunoMusicRequest(model: string, composer: ComposerPreset) {
	const labels = [
		model,
		composer.model,
		getModelDisplayLabel(model),
		getModelDisplayLabel(composer.model),
	]
		.join(" ")
		.toLowerCase();
	return labels.includes("suno");
}

export function resolveSunoModelForAction(action?: string) {
	if (action === "lyrics") return "suno_lyrics(yunwu)";
	if (action === "upload") return "suno_uploads(yunwu)";
	return "suno_music(yunwu)";
}

export function isMiniMaxSpeech28HdRequest(model: string, composer: ComposerPreset) {
	return [model, composer.model]
		.map((value) => getModelDisplayLabel(value).trim())
		.some((label) => label === "MiniMax Speech 2.8 HD" || label === "Minimax Speech 2.8");
}
