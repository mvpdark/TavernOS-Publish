import {
	getImageAspectRatioOptions,
	getImageBackgroundOptions,
	getImageMidjourneyActionOptions,
	type ImageModelCapability,
	type ImageSelectOption,
	getImageOutputFormatOptions,
	getImagePromptExtendOptions,
	getImageQuantityOptions,
	getImageQualityOptions,
	getImageResolutionOptions,
	getImageSpeedModeOptions,
	getImageWatermarkOptions,
} from "./imageModelCapabilities";
import type { ComposerPreset } from "./canvas-types";

type BuildImageParameterOptionStateConfig = {
	composer: ComposerPreset;
	capability: ImageModelCapability | null;
	referenceCount: number;
	fallbackAspectRatios?: readonly string[];
	fallbackResolutions?: readonly string[];
};

function toImageSelectOptions(values: readonly string[] = []): ImageSelectOption[] {
	return values.map((value) => ({ value, label: value }));
}

export function buildImageParameterOptionState({
	composer,
	capability,
	referenceCount,
	fallbackAspectRatios = [],
	fallbackResolutions = [],
}: BuildImageParameterOptionStateConfig) {
	const model = composer.model;
	const imageVersionOptions = capability?.versions
		? toImageSelectOptions(capability.versions)
		: [];
	const imageResolutionOptions = capability
		? getImageResolutionOptions(model, referenceCount, composer)
		: toImageSelectOptions(fallbackResolutions);
	const imageSizeOptions = capability?.sizePresets ?? [];
	const imageAspectRatioOptions = capability
		? getImageAspectRatioOptions(model, referenceCount)
		: toImageSelectOptions(fallbackAspectRatios);
	const imageQuantityOptions = capability
		? getImageQuantityOptions(model, composer)
		: [];
	const imageQualityOptions = capability ? getImageQualityOptions(model) : [];
	const imageMidjourneyActionOptions = capability
		? getImageMidjourneyActionOptions(model)
		: [];
	const imageSpeedModeOptions = capability
		? getImageSpeedModeOptions(model)
		: [];
	const imageOutputFormatOptions = capability
		? getImageOutputFormatOptions(model)
		: [];
	const imageBackgroundOptions = capability
		? getImageBackgroundOptions(model)
		: [];
	const imageWatermarkOptions = capability
		? getImageWatermarkOptions(model)
		: [];
	const imagePromptExtendOptions = capability
		? getImagePromptExtendOptions(model)
		: [];

	return {
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
		isMidjourneyImageLayout: imageMidjourneyActionOptions.length > 0,
	};
}

export type ImageParameterOptionState = ReturnType<
	typeof buildImageParameterOptionState
>;
