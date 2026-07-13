import {
	getImageModelCapability,
	getImageReferenceLimit,
} from "./imageModelCapabilities";
import type { KakaUpstreamModelType } from "./kakaApi";
import {
	getVisibleModelOptions,
	resolveCompatibleModelSelection,
} from "./modelOptions";
import type { PrimaryReferenceAsset } from "./primaryNodeHelpers";
import { countReferenceAssets } from "./referenceAssetUtils";
import type { ComposerPreset, NodeType } from "./canvas-types";
import {
	getVideoModelCapability,
	getVideoModeOption,
	recommendVideoGenerationMode,
} from "./videoModelCapabilities";

type UpstreamModelOptions = Record<KakaUpstreamModelType, string[]>;
type NodeModelOptions = Record<NodeType, string[]>;
type ComposerByType = Record<NodeType, ComposerPreset>;

export function derivePrimaryComposerState({
	primaryType,
	composer,
	primaryReferenceAssets,
	nodeModels,
	upstreamModelOptions,
	isLoadingUpstreamModels,
	didUpstreamModelFetchFail,
	composerByType,
}: {
	primaryType: NodeType;
	composer: ComposerPreset;
	primaryReferenceAssets: Array<PrimaryReferenceAsset | null>;
	nodeModels: NodeModelOptions;
	upstreamModelOptions: UpstreamModelOptions;
	isLoadingUpstreamModels: boolean;
	didUpstreamModelFetchFail: boolean;
	composerByType: ComposerByType;
}) {
	const primaryVideoModelCapability =
		primaryType === "video" ? getVideoModelCapability(composer.model, composer) : null;
	const primaryImageModelCapability =
		primaryType === "image" || primaryType === "editor"
			? getImageModelCapability(composer.model)
			: null;
	const primaryVideoModeOption =
		primaryType === "video"
			? getVideoModeOption(composer.model, composer.videoGenerationMode, composer)
			: null;
	const primaryReferenceAssetCount = countReferenceAssets(primaryReferenceAssets);
	const recommendedPrimaryVideoMode =
		primaryType === "video"
			? recommendVideoGenerationMode(composer.model, primaryReferenceAssetCount, composer)
			: null;
	const effectivePrimaryReferenceAssets =
		primaryType === "video"
			? primaryReferenceAssets
		: primaryType === "image" || primaryType === "editor"
			? primaryReferenceAssets
		: primaryType === "music"
			? (composer.referenceAssets ?? [])
		: [];
	const effectivePrimaryReferenceCount = countReferenceAssets(effectivePrimaryReferenceAssets);
	const primaryImageReferenceLimit =
		primaryType === "image" || primaryType === "editor"
			? getImageReferenceLimit(composer.model, composer)
			: 0;
	const canAddPrimaryReferenceAsset =
		primaryType === "video"
			? primaryReferenceAssetCount <
				(primaryVideoModeOption?.maxReferenceImages ?? 1)
			: primaryType === "image" || primaryType === "editor"
				? effectivePrimaryReferenceCount <
					primaryImageReferenceLimit
				: primaryType === "music"
					? effectivePrimaryReferenceCount < 1
			: primaryType !== "text" && primaryType !== "shot" && primaryType !== "character" && primaryType !== "scene";
	const primaryModelOptions = getVisibleModelOptions({
		type: primaryType,
		selectedModel: composer.model,
		localOptions: nodeModels[primaryType],
		upstreamOptions:
			primaryType === "editor"
				? nodeModels.editor
				: primaryType === "shot" || primaryType === "character" || primaryType === "scene"
					? nodeModels.shot
					: upstreamModelOptions[primaryType],
		isLoadingUpstreamModels,
		didUpstreamModelFetchFail,
	});
	const compatiblePrimaryModel = resolveCompatibleModelSelection({
		type: primaryType,
		selectedModel: composer.model,
		options: primaryModelOptions,
		fallbackModel: composerByType[primaryType].model,
	});

	return {
		primaryVideoModelCapability,
		primaryImageModelCapability,
		primaryVideoModeOption,
		primaryReferenceAssetCount,
		effectivePrimaryReferenceCount,
		recommendedPrimaryVideoMode,
		effectivePrimaryReferenceAssets,
		canAddPrimaryReferenceAsset,
		primaryModelOptions,
		compatiblePrimaryModel,
	};
}
