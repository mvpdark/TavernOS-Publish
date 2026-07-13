import type { ImageModelCapability } from "./imageModelCapabilities";
import {
	getImageReferenceLimit,
	isImageThinkingDisabled,
} from "./imageModelCapabilities";
import {
	getModelDisplayLabel,
	getStoredModelValue,
} from "./modelOptions";
import { buildImageReferenceSlotState } from "./referenceAssetSlotPresentation";
import type {
	ComposerPreset,
	NodeType,
	ReferenceAssetSlotInputList,
} from "./canvas-types";

type BuildImageReferencePresentationStateParams = {
	type: NodeType;
	composer: ComposerPreset;
	capability: ImageModelCapability | null;
	referenceAssets: ReferenceAssetSlotInputList;
	canAddReferenceAsset: boolean;
};

function buildImageReferenceLimitHint(
	type: NodeType,
	composer: ComposerPreset,
	capability: ImageModelCapability | null,
	referenceCount: number,
	referenceLimit: number,
) {
	if (!capability) return "";
	const storedModel = getStoredModelValue(type, composer.model);
	const displayModel = getModelDisplayLabel(composer.model).trim();
	const upstreamSpec =
		displayModel === "Nano Banana" && storedModel.includes("gemini-3.1")
			? "（Gemini 3.1 接入规格）"
			: "";
	const modeLabel = capability.versionLabel && composer.version
		? `当前${capability.versionLabel}「${composer.version}」`
		: "当前配置";
	if (referenceLimit <= 0) {
		return `${modeLabel}不支持参考图，当前已挂载 ${referenceCount} 张。`;
	}
	return `${modeLabel}${upstreamSpec}最多可挂载 ${referenceLimit} 张参考图，当前已挂载 ${referenceCount} 张。`;
}

function buildImageReferencePrimaryHints(
	capability: ImageModelCapability | null,
	referenceCount: number,
	thinkingDisabled: boolean,
) {
	const hasReferences = referenceCount > 0;
	return [
		capability?.autoDisableAspectRatioWhenReference && hasReferences
			? "有参考图时比例会自动禁用或不传。"
			: null,
		capability?.disable4kWhenReference && hasReferences
			? "4K 更适合文生图，当前会优先使用更稳妥的分辨率。"
			: null,
		capability?.supportsThinkingMode && thinkingDisabled
			? `思考模式当前不可用${hasReferences ? "：已上传参考图。" : "：已开启顺序/组图。"}`
			: null,
	].filter(Boolean) as string[];
}

export function buildImageReferencePresentationState({
	type,
	composer,
	capability,
	referenceAssets,
	canAddReferenceAsset,
}: BuildImageReferencePresentationStateParams) {
	const limit = capability ? getImageReferenceLimit(composer.model, composer) : 0;
	const slotState = buildImageReferenceSlotState(
		referenceAssets,
		limit,
		canAddReferenceAsset,
	);
	const thinkingDisabled = capability
		? isImageThinkingDisabled(composer.model, composer, slotState.referenceCount)
		: false;

	return {
		limit,
		referenceCount: slotState.referenceCount,
		slotLabels: slotState.labels,
		thinkingDisabled,
		limitHint: buildImageReferenceLimitHint(
			type,
			composer,
			capability,
			slotState.referenceCount,
			limit,
		),
		primaryHints: buildImageReferencePrimaryHints(
			capability,
			slotState.referenceCount,
			thinkingDisabled,
		),
	};
}
