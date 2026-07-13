import { toPanelOptions } from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";
import {
	formatVideoMeta,
	getVideoModeOption,
	getVideoModelCapability,
	type VideoModelCapability,
} from "./videoModelCapabilities";

export type VideoParameterOptionStateConfig = {
	composer: ComposerPreset;
	capability?: VideoModelCapability | null;
};

export function buildVideoParameterOptionState({
	composer,
	capability = getVideoModelCapability(composer.model, composer),
}: VideoParameterOptionStateConfig) {
	const currentMode = capability
		? getVideoModeOption(composer.model, composer.videoGenerationMode, composer)
		: null;
	const modeOptions = (capability?.modes ?? []).map((mode) => ({
		value: mode.id,
		label: mode.label,
	}));
	const tierOptions = toPanelOptions(capability?.tiers ?? []);
	const qualityOptions = toPanelOptions(capability?.qualities ?? []);
	const versionOptions = toPanelOptions(capability?.versions ?? []);
	const featureOptions = toPanelOptions(capability?.features ?? []);
	const aspectRatioOptions = toPanelOptions(capability?.aspectRatios ?? []);
	const resolutionOptions = toPanelOptions(capability?.resolutions ?? []);
	const durationOptions = toPanelOptions(capability?.durations ?? []);
	const durationValue =
		composer.duration ||
		capability?.displayOnlyDuration ||
		capability?.defaultDuration;
	const hasPartialCapabilityDoc =
		Boolean(capability?.inferred) &&
		((capability?.aspectRatios.length ?? 0) === 0 ||
			(capability?.resolutions.length ?? 0) === 0 ||
			(capability?.durations.length ?? 0) === 0);

	return {
		capability,
		currentMode,
		modeOptions,
		tierOptions,
		qualityOptions,
		versionOptions,
		featureOptions,
		aspectRatioOptions,
		resolutionOptions,
		durationOptions,
		currentModeValue: composer.videoGenerationMode ?? capability?.defaultMode ?? "",
		currentTierValue: composer.videoTier ?? capability?.defaultTier ?? "",
		currentQualityValue: composer.videoQuality ?? capability?.defaultQuality ?? "",
		currentVersionValue: composer.videoVersion ?? capability?.defaultVersion ?? "",
		currentFeatureValue: composer.videoFeature ?? capability?.defaultFeature ?? "",
		currentAspectRatioValue: composer.aspectRatio ?? capability?.defaultAspectRatio ?? "",
		currentResolutionValue: composer.resolution ?? capability?.defaultResolution ?? "",
		currentDurationValue: composer.duration ?? capability?.defaultDuration ?? "",
		durationValue,
		supportsSeed: Boolean(capability?.supportsSeed),
		shouldShowSeed: Boolean(capability?.supportsSeed),
		hasPartialCapabilityDoc,
		videoSummary: capability ? formatVideoMeta(composer, composer.model) : "",
	};
}

export type VideoParameterOptionState = ReturnType<
	typeof buildVideoParameterOptionState
>;
