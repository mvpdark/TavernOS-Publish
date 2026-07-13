import type { ComposerPreset } from "./canvas-types";
import { getModelDisplayLabel } from "./modelOptions";

const IDEOGRAM_GENERATE_MODEL_BY_MODE: Record<string, string> = {
	极速: "ideogram_generate_V_3_TURBO(yunwu)",
	标准: "ideogram_generate_V_3_DEFAULT(yunwu)",
	质量: "ideogram_generate_V_3_QUALITY(yunwu)",
};

const IDEOGRAM_ACTION_MODEL_BY_MODE: Record<string, string> = {
	局部: "ideogram_edit_V_3_DEFAULT(yunwu)",
	混合: "ideogram_remix_V_3_DEFAULT(yunwu)",
	重构: "ideogram_reframe_V_3_DEFAULT(yunwu)",
	更换背景: "ideogram_replace_background_V_3_DEFAULT(yunwu)",
	放大: "ideogram_upscale(yunwu)",
	反推: "ideogram_describe(yunwu)",
};

const IDEOGRAM_ACTION_BY_MODE: Record<string, string> = {
	局部: "edit",
	混合: "remix",
	重构: "reframe",
	更换背景: "replace_background",
	放大: "upscale",
	反推: "describe",
};

export function isIdeogramModel(value: string) {
	const label = getModelDisplayLabel(value).trim().toLowerCase();
	const raw = value.toLowerCase();
	return label.startsWith("ideogram") || raw.includes("ideogram_");
}

function getIdeogramRawModel(value: string) {
	const raw = value.trim();
	const withoutPlatform = raw.endsWith(")") && raw.includes("(")
		? raw.slice(0, raw.lastIndexOf("(")).trim()
		: raw;
	const rawFromEncoded = withoutPlatform.includes("<<<RAW>>>")
		? withoutPlatform.slice(withoutPlatform.lastIndexOf("<<<RAW>>>") + "<<<RAW>>>".length).trim()
		: withoutPlatform;
	return rawFromEncoded;
}

export function resolveIdeogramImageRequest({
	model,
	composer,
}: {
	model: string;
	composer: ComposerPreset;
}) {
	if (!isIdeogramModel(model) && !isIdeogramModel(composer.model)) return null;
	const rawModel = getIdeogramRawModel(model || composer.model);
	const label = getModelDisplayLabel(model || composer.model).trim();
	const isGenerateModel = rawModel.startsWith("ideogram_generate_") || label === "Ideogram 3.0";
	const isEditorAction = !isGenerateModel;
	const mode = composer.version || (isEditorAction ? "局部" : "极速");
	const resolvedModel = isGenerateModel
		? IDEOGRAM_GENERATE_MODEL_BY_MODE[mode] ?? (rawModel.startsWith("ideogram_generate_") ? rawModel : IDEOGRAM_GENERATE_MODEL_BY_MODE.极速)
		: IDEOGRAM_ACTION_MODEL_BY_MODE[mode] ?? (rawModel.startsWith("ideogram_") ? rawModel : IDEOGRAM_ACTION_MODEL_BY_MODE.局部);
	const action = isGenerateModel ? "generate" : IDEOGRAM_ACTION_BY_MODE[mode] ?? "edit";
	return {
		model: resolvedModel,
		options: {
			ideogram_action: action,
		},
	};
}
