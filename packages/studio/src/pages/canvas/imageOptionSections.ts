import type { ImageComposerOptionKey } from "./appComposerOptionUpdates";
import type { ImageModelCapability } from "./imageModelCapabilities";
import type { ImageParameterOptionState } from "./imageParameterOptionState";
import {
	IMAGE_GENERATION_MODE_OPTIONS,
	buildImageThinkingModeOptions,
	createPanelSelectSection,
	type PanelSelectSection,
} from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

type ImageOptionUpdater = (key: ImageComposerOptionKey, value: string | boolean) => void;

export type ImageSelectOptionSection = PanelSelectSection<ImageComposerOptionKey>;

export type ImageNumericPairSection = {
	label: string;
	firstLabel: string;
	firstValue: string;
	secondLabel: string;
	secondValue: string;
	onFirstChange: (value: string) => void;
	onSecondChange: (value: string) => void;
};

export type ImageSingleNumericSection = {
	label: string;
	fieldLabel: string;
	value: string;
	onChange: (value: string) => void;
};

export function buildImageSelectOptionSections({
	composer,
	capability,
	optionState,
	onUpdateImageOption,
}: {
	composer: ComposerPreset;
	capability: ImageModelCapability | null;
	optionState: ImageParameterOptionState;
	onUpdateImageOption: ImageOptionUpdater;
}): ImageSelectOptionSection[] {
	const sections: ImageSelectOptionSection[] = [];
	if (optionState.imageVersionOptions.length) {
		sections.push(createPanelSelectSection({
			label: capability?.versionLabel ?? "版本",
			options: optionState.imageVersionOptions,
			currentValue: composer.version,
			key: "version",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageMidjourneyActionOptions.length) {
		sections.push(createPanelSelectSection({
			label: "功能",
			options: optionState.imageMidjourneyActionOptions,
			currentValue: composer.midjourneyAction,
			key: "midjourneyAction",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageSizeOptions.length) {
		sections.push(createPanelSelectSection({
			label: "尺寸",
			options: optionState.imageSizeOptions,
			currentValue: composer.imageSize,
			key: "imageSize",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageAspectRatioOptions.length) {
		sections.push(createPanelSelectSection({
			label: "比例",
			options: optionState.imageAspectRatioOptions,
			currentValue: composer.aspectRatio,
			key: "aspectRatio",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageResolutionOptions.length) {
		sections.push(createPanelSelectSection({
			label: "分辨率",
			options: optionState.imageResolutionOptions,
			currentValue: composer.resolution,
			key: "resolution",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageQualityOptions.length) {
		sections.push(createPanelSelectSection({
			label: "质量",
			options: optionState.imageQualityOptions,
			currentValue: composer.quality,
			key: "quality",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageSpeedModeOptions.length) {
		sections.push(createPanelSelectSection({
			label: "速度",
			options: optionState.imageSpeedModeOptions,
			currentValue: composer.speedMode,
			key: "speedMode",
			onUpdate: onUpdateImageOption,
		}));
	}
	return sections;
}

export function buildImageFormatAndControlSections({
	composer,
	optionState,
	onUpdateImageOption,
}: {
	composer: ComposerPreset;
	optionState: ImageParameterOptionState;
	onUpdateImageOption: ImageOptionUpdater;
}): ImageSelectOptionSection[] {
	const sections: ImageSelectOptionSection[] = [];
	if (optionState.imageOutputFormatOptions.length) {
		sections.push(createPanelSelectSection({
			label: "输出格式",
			options: optionState.imageOutputFormatOptions,
			currentValue: composer.outputFormat,
			key: "outputFormat",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageBackgroundOptions.length) {
		sections.push(createPanelSelectSection({
			label: "背景",
			options: optionState.imageBackgroundOptions,
			currentValue: composer.background,
			key: "background",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageWatermarkOptions.length) {
		sections.push(createPanelSelectSection({
			label: "水印",
			options: optionState.imageWatermarkOptions,
			currentValue: composer.watermark,
			key: "watermark",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imagePromptExtendOptions.length) {
		sections.push(createPanelSelectSection({
			label: "提示词优化",
			options: optionState.imagePromptExtendOptions,
			currentValue: composer.promptExtend,
			key: "promptExtend",
			onUpdate: onUpdateImageOption,
		}));
	}
	if (optionState.imageQuantityOptions.length) {
		sections.push(createPanelSelectSection({
			label: "数量",
			options: optionState.imageQuantityOptions,
			currentValue: composer.quantity,
			key: "quantity",
			onUpdate: onUpdateImageOption,
		}));
	}
	return sections;
}

export function buildImageCustomDimensionSection({
	composer,
	capability,
	onUpdateImageOption,
}: {
	composer: ComposerPreset;
	capability: ImageModelCapability | null;
	onUpdateImageOption: ImageOptionUpdater;
}): ImageNumericPairSection | null {
	if (!capability?.allowsCustomDimensions) return null;
	return {
		label: "自定义宽高",
		firstLabel: "宽",
		firstValue: composer.width ?? "",
		secondLabel: "高",
		secondValue: composer.height ?? "",
		onFirstChange: (value) => onUpdateImageOption("width", value),
		onSecondChange: (value) => onUpdateImageOption("height", value),
	};
}

export function buildImageNumericSections({
	composer,
	capability,
	onUpdateImageOption,
}: {
	composer: ComposerPreset;
	capability: ImageModelCapability | null;
	onUpdateImageOption: ImageOptionUpdater;
}): ImageSingleNumericSection[] {
	const sections: ImageSingleNumericSection[] = [];
	if (capability?.supportsSeed) {
		sections.push({
			label: "随机种子",
			fieldLabel: "Seed",
			value: composer.seed ?? "",
			onChange: (value) => onUpdateImageOption("seed", value),
		});
	}
	if (capability?.supportsInferenceSteps) {
		sections.push({
			label: "推理步数",
			fieldLabel: "Steps",
			value: composer.imageInferenceSteps ?? capability.defaultInferenceSteps ?? "",
			onChange: (value) => onUpdateImageOption("imageInferenceSteps", value),
		});
	}
	if (capability?.supportsGuidanceScale) {
		sections.push({
			label: "引导强度",
			fieldLabel: "CFG",
			value: composer.imageGuidanceScale ?? capability.defaultGuidanceScale ?? "",
			onChange: (value) => onUpdateImageOption("imageGuidanceScale", value),
		});
	}
	return sections;
}

export function buildImageModeSections({
	composer,
	capability,
	thinkingDisabled,
	onUpdateImageOption,
}: {
	composer: ComposerPreset;
	capability: ImageModelCapability | null;
	thinkingDisabled: boolean;
	onUpdateImageOption: ImageOptionUpdater;
}): ImageSelectOptionSection[] {
	const sections: ImageSelectOptionSection[] = [];
	if (capability?.supportsEnableSequential) {
		sections.push(createPanelSelectSection({
			label: "生成方式",
			options: IMAGE_GENERATION_MODE_OPTIONS,
			currentValue: String(Boolean(composer.enableSequential)),
			key: "enableSequential",
			onUpdate: (key, value) => onUpdateImageOption(key, value === "true"),
		}));
	}
	if (capability?.supportsThinkingMode) {
		sections.push(createPanelSelectSection({
			label: "思考模式",
			options: buildImageThinkingModeOptions(thinkingDisabled),
			currentValue: String(Boolean(composer.thinkingMode) && !thinkingDisabled),
			key: "thinkingMode",
			onUpdate: (key, value) => onUpdateImageOption(key, value === "true"),
		}));
	}
	return sections;
}
