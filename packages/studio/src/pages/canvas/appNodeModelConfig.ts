import { getModelDisplayLabel, resolveModelLabel } from "./modelOptions";
import type { ComposerPreset, NodeType } from "./canvas-types";

export const NODE_MODELS: Record<NodeType, string[]> = {
	text: ["GPT-5.5 ☁️", "Claude Opus 4.7 ☁️", "Claude Sonnet 4.6 ☁️", "DeepSeek-V4-Flash 🌊", "Qwen3.6-35B-A3B 🌊", "MiniMax M2.7 High Speed 🤖"],
	shot: [],
	character: [],
	scene: [],
	image: ["Nano Banana ☁️", "GPT Image ☁️", "Z Image Turbo ☁️", "Ideogram 3.0 ☁️", "Midjourney ☁️", "Kolors 🌊"],
	video: ["VEO 3.1 ☁️", "Runway Gen4 ☁️", "Grok Imagine Video ☁️", "MiniMax Hailuo 2.3 ☁️", "Wan 2.2 🌊", "Seedance"],
	audio: ["MiniMax Speech 2.8 HD ☁️"],
	music: ["Suno ☁️"],
	editor: ["Nano Banana ☁️", "GPT Image ☁️", "Z Image Turbo ☁️", "Midjourney 混图 ☁️", "Midjourney 反推 ☁️", "Ideogram ☁️"],
};

export function getMusicModelMeta(_model: string) {
	return ["Suno", "作曲"];
}

export function resolveAllowedNodeModel(
	type: NodeType,
	storedModel: string | undefined,
	fallback: string,
) {
	const resolvedModel = resolveModelLabel(type, storedModel);
	if (!resolvedModel) return fallback;
	const resolvedDisplayName = getModelDisplayLabel(resolvedModel).trim();
	return (
		NODE_MODELS[type].find(
			(model) => getModelDisplayLabel(model).trim() === resolvedDisplayName,
		) ?? fallback
	);
}

export function buildShotPromptPrefix(composer?: ComposerPreset) {
	if (!composer) return "";
	const parts = [composer.shotSize, composer.cameraAngle, composer.frameRatio].filter(
		(value): value is string => Boolean(value),
	);
	return parts.length ? `[镜头设定] ${parts.join(" / ")}\n` : "";
}
