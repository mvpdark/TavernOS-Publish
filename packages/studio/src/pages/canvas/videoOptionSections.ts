import type { VideoComposerOptionKey } from "./appComposerOptionUpdates";
import {
	createPanelSelectSection,
	type PanelSelectSection,
} from "./parameterPanelPresentation";
import type { VideoParameterOptionState } from "./videoParameterOptionState";

export type VideoOptionSection = PanelSelectSection<VideoComposerOptionKey>;

export type VideoSeedInputSection = {
	label: string;
	value: string;
	placeholder: string;
	inputMode: "numeric";
	onChange: (value: string) => void;
};

type VideoOptionUpdater = (key: VideoComposerOptionKey, value: string) => void;

export const VIDEO_PARTIAL_CAPABILITY_HINT =
	"当前模型规范仍在补全文档，面板只显示已确认项。";

export function buildVideoOptionSections({
	optionState,
	shouldHighlightMode,
	suggestionModeLabel,
	onUpdateVideoOption,
}: {
	optionState: VideoParameterOptionState;
	shouldHighlightMode: boolean;
	suggestionModeLabel?: string;
	onUpdateVideoOption: VideoOptionUpdater;
}): VideoOptionSection[] {
	return [
		createPanelSelectSection({
			label: "生成方式",
			options: optionState.modeOptions,
			currentValue: optionState.currentModeValue,
			key: "videoGenerationMode",
			wide: true,
			hint:
				shouldHighlightMode && suggestionModeLabel
					? `建议切换为「${suggestionModeLabel}」`
					: undefined,
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "档位",
			options: optionState.tierOptions,
			currentValue: optionState.currentTierValue,
			key: "videoTier",
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "质量",
			options: optionState.qualityOptions,
			currentValue: optionState.currentQualityValue,
			key: "videoQuality",
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "版本",
			options: optionState.versionOptions,
			currentValue: optionState.currentVersionValue,
			key: "videoVersion",
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "扩展能力",
			options: optionState.featureOptions,
			currentValue: optionState.currentFeatureValue,
			key: "videoFeature",
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "画幅",
			options: optionState.aspectRatioOptions,
			currentValue: optionState.currentAspectRatioValue,
			key: "aspectRatio",
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "清晰度",
			options: optionState.resolutionOptions,
			currentValue: optionState.currentResolutionValue,
			key: "resolution",
			onUpdate: onUpdateVideoOption,
		}),
		createPanelSelectSection({
			label: "生成时长",
			options: optionState.durationOptions,
			currentValue: optionState.currentDurationValue,
			key: "duration",
			wide: true,
			onUpdate: onUpdateVideoOption,
		}),
	];
}

export function buildVideoSeedInputSection({
	optionState,
	seed,
	onUpdateVideoOption,
}: {
	optionState: VideoParameterOptionState;
	seed: string;
	onUpdateVideoOption: VideoOptionUpdater;
}): VideoSeedInputSection | null {
	if (!optionState.supportsSeed) return null;
	return {
		label: "Seed",
		value: seed,
		placeholder: "留空随机",
		inputMode: "numeric",
		onChange: (value) => onUpdateVideoOption("seed", value),
	};
}

export function getVideoPartialCapabilityHint(
	optionState: VideoParameterOptionState,
) {
	return optionState.hasPartialCapabilityDoc ? VIDEO_PARTIAL_CAPABILITY_HINT : null;
}
