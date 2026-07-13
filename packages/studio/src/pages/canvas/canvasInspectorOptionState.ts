import { buildAudioMusicParameterOptionState } from "./audioMusicParameterOptionState";
import { getImageModelCapability } from "./imageModelCapabilities";
import { buildImageParameterOptionState } from "./imageParameterOptionState";
import { isMidjourneyTaskAction } from "./midjourneyActions";
import type { CanvasNode, ComposerPreset } from "./canvas-types";
import { buildVideoParameterOptionState } from "./videoParameterOptionState";

export type CanvasInspectorOptionStateConfig = {
	composer: ComposerPreset;
	asset?: CanvasNode["asset"];
	referenceCount: number;
	isImageLikeNode: boolean;
	isVideoNode: boolean;
	isAudioNode: boolean;
	isMusicNode: boolean;
};

export function buildCanvasInspectorOptionState({
	composer,
	asset,
	referenceCount,
	isImageLikeNode,
	isVideoNode,
	isAudioNode,
	isMusicNode,
}: CanvasInspectorOptionStateConfig) {
	const imageCapability = isImageLikeNode
		? getImageModelCapability(composer.model)
		: null;
	const imageParameterOptionState = isImageLikeNode
		? buildImageParameterOptionState({
				composer,
				capability: imageCapability,
				referenceCount,
			})
		: buildImageParameterOptionState({
				composer,
				capability: null,
				referenceCount: 0,
			});
	const {
		imageVersionOptions,
		imageResolutionOptions,
		imageSizeOptions,
		imageAspectRatioOptions,
		imageQuantityOptions,
		imageQualityOptions,
		imageMidjourneyActionOptions,
		imageSpeedModeOptions,
		imageOutputFormatOptions,
		imageBackgroundOptions,
		imageWatermarkOptions,
		imagePromptExtendOptions,
		isMidjourneyImageLayout,
	} = imageParameterOptionState;
	const hasMidjourneyTaskContext = Boolean(
		asset?.provider === "midjourney" &&
			(asset?.providerTaskId || asset?.providerMetadata),
	);
	const visibleMidjourneyActionOptions = imageMidjourneyActionOptions.map(
		(option) => {
			const requiresTask = isMidjourneyTaskAction(option.value);
			if (!requiresTask || hasMidjourneyTaskContext) return option;
			return {
				...option,
				disabled: true,
				description: "需 MJ 原始结果",
			};
		},
	);
	const videoParameterOptionState = buildVideoParameterOptionState({
		composer,
		capability: isVideoNode ? undefined : null,
	});

	const audioMusicParameterOptionState = buildAudioMusicParameterOptionState({
		composer,
		isAudioNode,
		isMusicNode,
	});
	const {
		audioTierOptions,
		musicActionOptions,
		musicVersionOptions,
		musicStyleGroups,
		musicStylePresetOptions,
		musicStyleSummary,
	} = audioMusicParameterOptionState;

	return {
		imageCapability,
		imageVersionOptions,
		imageResolutionOptions,
		imageSizeOptions,
		imageAspectRatioOptions,
		imageQuantityOptions,
		imageQualityOptions,
		imageMidjourneyActionOptions,
		visibleMidjourneyActionOptions,
		imageSpeedModeOptions,
		imageOutputFormatOptions,
		imageBackgroundOptions,
		imageWatermarkOptions,
		imagePromptExtendOptions,
		isMidjourneyImageLayout,
		videoMode: videoParameterOptionState.currentMode,
		videoCapability: videoParameterOptionState.capability,
		videoModeOptions: videoParameterOptionState.modeOptions,
		videoAspectRatioOptions: videoParameterOptionState.aspectRatioOptions,
		videoResolutionOptions: videoParameterOptionState.resolutionOptions,
		videoDurationOptions: videoParameterOptionState.durationOptions,
		videoQualityOptions: videoParameterOptionState.qualityOptions,
		videoVersionOptions: videoParameterOptionState.versionOptions,
		videoDurationValue: videoParameterOptionState.durationValue,
		shouldShowVideoSeed: isVideoNode && videoParameterOptionState.shouldShowSeed,
		audioTierOptions,
		musicActionOptions,
		musicVersionOptions,
		musicStyleGroups,
		musicStylePresetOptions,
		musicStyleSummary,
	};
}

export type CanvasInspectorOptionState = ReturnType<
	typeof buildCanvasInspectorOptionState
>;
