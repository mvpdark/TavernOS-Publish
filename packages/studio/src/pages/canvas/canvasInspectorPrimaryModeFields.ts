import type {
	AudioComposerOptionKey,
	ImageComposerOptionKey,
	TextComposerOptionKey,
	VideoComposerOptionKey,
} from "./appComposerOptionUpdates";
import {
	type InspectorSelectField,
	selectFieldWhen,
} from "./canvasInspectorFieldTypes";
import type { CanvasInspectorOptionState } from "./canvasInspectorOptionState";
import { getModelDisplayLabel } from "./modelOptions";
import {
	formatImageSpeedModeMetric,
	formatNodeMetric,
} from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type PrimaryModeFieldConfig = {
	composer: ComposerPreset;
	isTextNode: boolean;
	isImageLikeNode: boolean;
	isVideoNode: boolean;
	isAudioNode: boolean;
	optionState: Pick<
		CanvasInspectorOptionState,
		| "imageVersionOptions"
		| "imageSpeedModeOptions"
		| "videoMode"
		| "videoCapability"
		| "videoModeOptions"
		| "audioTierOptions"
	>;
	onUpdateTextOption: (key: TextComposerOptionKey, value: string) => void;
	onUpdateImageOption: (
		key: ImageComposerOptionKey,
		value: string | boolean,
	) => void;
	onUpdateVideoOption: (key: VideoComposerOptionKey, value: string) => void;
	onUpdateAudioOption: (key: AudioComposerOptionKey, value: string) => void;
};

export function buildPrimaryModeFields({
	composer,
	isTextNode,
	isImageLikeNode,
	isVideoNode,
	isAudioNode,
	optionState,
	onUpdateTextOption,
	onUpdateImageOption,
	onUpdateVideoOption,
	onUpdateAudioOption,
}: PrimaryModeFieldConfig) {
	const {
		imageVersionOptions,
		imageSpeedModeOptions,
		videoMode,
		videoCapability,
		videoModeOptions,
		audioTierOptions,
	} = optionState;
	const fields: InspectorSelectField[] = [
		selectFieldWhen(
			isTextNode && getModelDisplayLabel(composer.model).trim() === "GPT-5.5",
			() => ({
				label: "模式",
				value: composer.textMode === "xhigh" ? "高级" : "标准",
				selectedValue: composer.textMode ?? "standard",
				menuKey: "textMode",
				options: [
					{ value: "standard", label: "标准" },
					{ value: "xhigh", label: "高级 xhigh" },
				],
				onSelect: (value) => onUpdateTextOption("textMode", value),
			}),
		),
		selectFieldWhen(isImageLikeNode && Boolean(imageVersionOptions.length), () => ({
			label: "模式",
			value: formatNodeMetric(composer.version),
			menuKey: "imageVersion",
			options: imageVersionOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => onUpdateImageOption("version", value),
		})),
		selectFieldWhen(isImageLikeNode && Boolean(imageSpeedModeOptions.length), () => ({
			label: "速度",
			value: formatImageSpeedModeMetric(composer.speedMode),
			selectedValue: composer.speedMode,
			menuKey: "imageSpeedMode",
			options: imageSpeedModeOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => onUpdateImageOption("speedMode", value),
		})),
		selectFieldWhen(isVideoNode && videoMode, () => ({
			label: "模式",
			value: videoMode?.label ?? "",
			selectedValue:
				composer.videoGenerationMode ??
					videoCapability?.defaultMode ??
					videoMode?.id,
				menuKey: "videoMode",
			options: videoModeOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) =>
				onUpdateVideoOption("videoGenerationMode", value),
		})),
		selectFieldWhen(isAudioNode && Boolean(audioTierOptions.length), () => ({
			label: "模式",
			value: formatNodeMetric(composer.audioTier),
			menuKey: "audioTier",
			options: audioTierOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => onUpdateAudioOption("audioTier", value),
		})),
	];

	return fields;
}
