import type { VideoComposerOptionKey } from "./appComposerOptionUpdates";
import {
	inputFieldWhen,
	type InspectorInputField,
	type InspectorSelectField,
	selectField,
	selectOptionFieldWhen,
} from "./canvasInspectorFieldTypes";
import type { CanvasInspectorOptionState } from "./canvasInspectorOptionState";
import { formatNodeMetric } from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type VideoParameterFieldConfig = {
	composer: ComposerPreset;
	optionState: Pick<
		CanvasInspectorOptionState,
		| "videoCapability"
		| "videoDurationValue"
		| "videoAspectRatioOptions"
		| "videoResolutionOptions"
		| "videoDurationOptions"
		| "videoQualityOptions"
		| "videoVersionOptions"
		| "shouldShowVideoSeed"
	>;
	onUpdateVideoOption: (key: VideoComposerOptionKey, value: string) => void;
};

export function buildVideoParameterFields({
	composer,
	optionState,
	onUpdateVideoOption,
}: VideoParameterFieldConfig) {
	const {
		videoCapability,
		videoDurationValue,
		videoAspectRatioOptions,
		videoResolutionOptions,
		videoDurationOptions,
		videoQualityOptions,
		videoVersionOptions,
		shouldShowVideoSeed,
	} = optionState;
	const selectFields: InspectorSelectField[] = [
		selectField({
			label: "比例",
			value: formatNodeMetric(composer.aspectRatio),
			menuKey: "videoAspectRatio",
			options: videoAspectRatioOptions,
			onSelect: (value) => onUpdateVideoOption("aspectRatio", value),
		}),
		selectField({
			label: "分辨率",
			value: formatNodeMetric(composer.resolution),
			menuKey: "videoResolution",
			options: videoResolutionOptions,
			onSelect: (value) => onUpdateVideoOption("resolution", value),
		}),
		selectField({
			label: "时长",
			value: formatNodeMetric(videoDurationValue),
			selectedValue: composer.duration || videoDurationValue,
			menuKey: "videoDuration",
			options: videoDurationOptions,
			className: "inspector-panel__metric--duration-card",
			onSelect: (value) => onUpdateVideoOption("duration", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(videoCapability?.qualities?.length),
			label: "质量",
			selectedValue: composer.videoQuality ?? videoCapability?.defaultQuality,
			menuKey: "videoQuality",
			options: videoQualityOptions,
			formatValue: formatNodeMetric,
			onSelect: (value) => onUpdateVideoOption("videoQuality", value),
		}),
		selectOptionFieldWhen({
			condition: Boolean(videoCapability?.versions?.length),
			label: "版本",
			selectedValue: composer.videoVersion ?? videoCapability?.defaultVersion,
			menuKey: "videoVersion",
			options: videoVersionOptions,
			formatValue: formatNodeMetric,
			onSelect: (value) => onUpdateVideoOption("videoVersion", value),
		}),
	];

	const inputFields: InspectorInputField[] = [
		inputFieldWhen(shouldShowVideoSeed, () => ({
			label: "Seed",
			value: composer.seed,
			placeholder: "留空随机",
			inputMode: "numeric",
			onChange: (value) => onUpdateVideoOption("seed", value),
		})),
	];

	return { selectFields, inputFields };
}
