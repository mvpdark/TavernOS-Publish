import { getModelDisplayLabel } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";

function collectModelLabels(model: string, composer: ComposerPreset) {
	return [model, composer.model, getModelDisplayLabel(model), getModelDisplayLabel(composer.model)]
		.map((value) => value.trim())
		.filter(Boolean);
}

export function isQwenImageEdit2509Request(model: string, composer: ComposerPreset) {
	return collectModelLabels(model, composer).some((label) =>
		label === "Qwen-Image-Edit-2509" ||
		label.includes("Qwen/Qwen-Image-Edit-2509")
	);
}

export function isKolorsRequest(model: string, composer: ComposerPreset) {
	return collectModelLabels(model, composer)
		.map((label) => label.toLowerCase())
		.some((label) => label === "kolors" || label.startsWith("kolors ") || label.includes("kolors"));
}
