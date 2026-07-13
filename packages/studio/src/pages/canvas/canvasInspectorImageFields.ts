import type { ImageComposerOptionKey } from "./appComposerOptionUpdates";
import {
	actionFieldWhen,
	inputFieldWhen,
	type InspectorActionField,
	type InspectorInputField,
	type InspectorSelectField,
	selectOptionFieldWhen,
} from "./canvasInspectorFieldTypes";
import type { CanvasInspectorOptionState } from "./canvasInspectorOptionState";
import {
	formatImageAutoMetric,
	formatImageOutputFormatMetric,
	formatImageQualityMetric,
	formatNodeMetric,
} from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type ImageParameterFieldConfig = {
	composer: ComposerPreset;
	optionState: Pick<
		CanvasInspectorOptionState,
		| "imageCapability"
		| "isMidjourneyImageLayout"
		| "visibleMidjourneyActionOptions"
		| "imageResolutionOptions"
		| "imageSizeOptions"
		| "imageAspectRatioOptions"
		| "imageQuantityOptions"
		| "imageOutputFormatOptions"
		| "imageQualityOptions"
		| "imageBackgroundOptions"
		| "imageWatermarkOptions"
		| "imagePromptExtendOptions"
	>;
	onUpdateImageOption: (
		key: ImageComposerOptionKey,
		value: string | boolean,
	) => void;
};

export function buildImageParameterFields({
	composer,
	optionState,
	onUpdateImageOption,
}: ImageParameterFieldConfig) {
	const {
		imageCapability,
		isMidjourneyImageLayout,
		visibleMidjourneyActionOptions,
		imageResolutionOptions,
		imageSizeOptions,
		imageAspectRatioOptions,
		imageQuantityOptions,
		imageOutputFormatOptions,
		imageQualityOptions,
		imageBackgroundOptions,
		imageWatermarkOptions,
		imagePromptExtendOptions,
	} = optionState;
	const selectFields: InspectorSelectField[] = [
		selectOptionFieldWhen({
			condition: Boolean(imageResolutionOptions.length),
			label: "分辨率",
			selectedValue: composer.resolution,
			menuKey: "imageResolution",
			options: imageResolutionOptions,
			formatValue: formatImageAutoMetric,
			onSelect: (value) => onUpdateImageOption("resolution", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imageSizeOptions.length),
			label: "尺寸",
			value: composer.imageSize,
			selectedValue: composer.imageSize,
			menuKey: "imageSize",
			options: imageSizeOptions,
			formatValue: formatNodeMetric,
			onSelect: (value) => onUpdateImageOption("imageSize", value),
		}),
		selectOptionFieldWhen({
			condition:
				!isMidjourneyImageLayout && Boolean(imageAspectRatioOptions.length),
			label: "比例",
			selectedValue: composer.aspectRatio,
			menuKey: "imageAspectRatio",
			options: imageAspectRatioOptions,
			formatValue: formatImageAutoMetric,
			onSelect: (value) => onUpdateImageOption("aspectRatio", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imageQuantityOptions.length),
			label: "数量",
			value: composer.quantity,
			menuKey: "imageQuantity",
			options: imageQuantityOptions,
			formatValue: formatNodeMetric,
			onSelect: (value) => onUpdateImageOption("quantity", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imageOutputFormatOptions.length),
			label: "格式",
			selectedValue: composer.outputFormat,
			menuKey: "imageOutputFormat",
			options: imageOutputFormatOptions,
			formatValue: formatImageOutputFormatMetric,
			onSelect: (value) => onUpdateImageOption("outputFormat", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imageQualityOptions.length),
			label: "质量",
			selectedValue: composer.quality,
			menuKey: "imageQuality",
			options: imageQualityOptions,
			formatValue: formatImageQualityMetric,
			onSelect: (value) => onUpdateImageOption("quality", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imageBackgroundOptions.length),
			label: "背景",
			selectedValue: composer.background,
			menuKey: "imageBackground",
			options: imageBackgroundOptions,
			formatValue: formatImageAutoMetric,
			onSelect: (value) => onUpdateImageOption("background", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imageWatermarkOptions.length),
			label: "水印",
			selectedValue: composer.watermark,
			menuKey: "imageWatermark",
			options: imageWatermarkOptions,
			value: composer.watermark ?? "false",
			fallback: "关闭",
			onSelect: (value) => onUpdateImageOption("watermark", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(imagePromptExtendOptions.length),
			label: "提示词优化",
			selectedValue: composer.promptExtend,
			menuKey: "imagePromptExtend",
			options: imagePromptExtendOptions,
			value: composer.promptExtend ?? "true",
			fallback: "开启",
			onSelect: (value) => onUpdateImageOption("promptExtend", value),
		}),
	];

	const inputFields: InspectorInputField[] = [
		inputFieldWhen(imageCapability?.supportsSeed, () => ({
			label: "Seed",
			value: composer.seed,
			placeholder: "留空随机",
			inputMode: "numeric",
			onChange: (value) => onUpdateImageOption("seed", value),
		})),
		inputFieldWhen(imageCapability?.supportsInferenceSteps, () => ({
			label: "推理步数",
			value:
				composer.imageInferenceSteps ?? imageCapability?.defaultInferenceSteps,
			placeholder: imageCapability?.defaultInferenceSteps ?? "20",
			inputMode: "numeric",
			onChange: (value) =>
				onUpdateImageOption("imageInferenceSteps", value),
		})),
		inputFieldWhen(imageCapability?.supportsGuidanceScale, () => ({
			label: "引导强度",
			value:
				composer.imageGuidanceScale ?? imageCapability?.defaultGuidanceScale,
			placeholder: imageCapability?.defaultGuidanceScale ?? "7.5",
			inputMode: "decimal",
			onChange: (value) =>
				onUpdateImageOption("imageGuidanceScale", value),
		})),
	];

	const actionFields: InspectorActionField[] = [
		actionFieldWhen(Boolean(visibleMidjourneyActionOptions.length), () => ({
			id: "imageMidjourneyAction",
			label: "MJ 功能",
			options: visibleMidjourneyActionOptions,
			selectedValue: composer.midjourneyAction,
			onSelect: (value) => onUpdateImageOption("midjourneyAction", value),
		})),
	];

	return { selectFields, inputFields, actionFields };
}
