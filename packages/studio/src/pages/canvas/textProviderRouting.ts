import { getModelDisplayLabel, resolveModelLabel } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";

function isGpt55TextModel(model?: string) {
	const normalizedModel = model?.trim();
	if (!normalizedModel) return false;
	const resolvedModel = resolveModelLabel("text", normalizedModel) ?? normalizedModel;
	return getModelDisplayLabel(resolvedModel).trim() === "GPT-5.5";
}

export function resolveTextModelForRequest(
	model: string,
	composer: Pick<ComposerPreset, "model" | "textMode">,
) {
	const selectedModel = composer.model || model;
	if (!isGpt55TextModel(model) && !isGpt55TextModel(selectedModel)) {
		return null;
	}
	return composer.textMode === "xhigh"
		? "gpt-5.5-xhigh(yunwu)"
		: "gpt-5.5(yunwu)";
}
