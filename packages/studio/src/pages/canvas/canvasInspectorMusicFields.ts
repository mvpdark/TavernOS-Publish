import type { MusicComposerOptionKey } from "./appComposerOptionUpdates";
import { getMusicStylePresets } from "./audioMusicModelCapabilities";
import {
	type InspectorInputField,
	type InspectorSelectField,
	type InspectorTextareaField,
	selectFieldWhen,
} from "./canvasInspectorFieldTypes";
import { findPanelOptionLabel } from "./parameterPanelPresentation";
import type { CanvasInspectorOptionState } from "./canvasInspectorOptionState";
import {
	DISABLE_ENABLE_OPTIONS,
	VOCAL_MODE_OPTIONS,
	formatNodeMetric,
} from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type MusicParameterFieldConfig = {
	composer: ComposerPreset;
	optionState: Pick<
		CanvasInspectorOptionState,
		| "musicActionOptions"
		| "musicVersionOptions"
		| "musicStyleGroups"
		| "musicStylePresetOptions"
		| "musicStyleSummary"
	>;
	onUpdateMusicOption: (key: MusicComposerOptionKey, value: string) => void;
};

export function buildMusicParameterFields({
	composer,
	optionState,
	onUpdateMusicOption,
}: MusicParameterFieldConfig) {
	const {
		musicActionOptions,
		musicVersionOptions,
		musicStyleGroups,
		musicStylePresetOptions,
		musicStyleSummary,
	} = optionState;
	const selectFields: InspectorSelectField[] = [
		selectFieldWhen(Boolean(musicActionOptions.length), () => ({
			label: "功能",
			value:
				musicActionOptions.find(
					(option) => option.value === composer.musicAction,
				)?.label ?? formatNodeMetric(composer.musicAction),
			selectedValue: composer.musicAction,
			menuKey: "musicAction",
			options: musicActionOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => onUpdateMusicOption("musicAction", value),
		})),
		selectFieldWhen(Boolean(musicVersionOptions.length), () => ({
			label: "版本",
			value: formatNodeMetric(composer.musicVersion),
			selectedValue: composer.musicVersion,
			menuKey: "musicVersion",
			options: musicVersionOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => onUpdateMusicOption("musicVersion", value),
		})),
		{
			label: "音乐风格",
			value: musicStyleSummary,
			selectedValue: composer.musicStyleCategory,
			menuKey: "musicStyleCategory",
			options: musicStyleGroups,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => {
				const nextPreset =
					getMusicStylePresets(composer.model, value)[0]?.value ?? "";
				onUpdateMusicOption("musicStyleCategory", value);
				if (nextPreset) onUpdateMusicOption("musicStylePreset", nextPreset);
			},
		},
		{
			label: "子风格",
			value:
				musicStylePresetOptions.find(
					(option) => option.value === composer.musicStylePreset,
				)?.label ?? formatNodeMetric(composer.musicStylePreset),
			selectedValue: composer.musicStylePreset,
			menuKey: "musicStylePreset",
			options: musicStylePresetOptions,
			className: "inspector-panel__metric--mode-card",
			onSelect: (value) => onUpdateMusicOption("musicStylePreset", value),
		},
		{
			label: "生成选项",
			value: findPanelOptionLabel(
				VOCAL_MODE_OPTIONS,
				composer.musicInstrumental ?? "false",
				"有人声",
			),
			selectedValue: composer.musicInstrumental ?? "false",
			menuKey: "musicInstrumental",
			options: VOCAL_MODE_OPTIONS,
			onSelect: (value) => onUpdateMusicOption("musicInstrumental", value),
		},
		{
			label: "歌词优化",
			value: findPanelOptionLabel(
				DISABLE_ENABLE_OPTIONS,
				composer.musicLyricsOptimizer ?? "false",
				"关闭",
			),
			selectedValue: composer.musicLyricsOptimizer ?? "false",
			menuKey: "musicLyricsOptimizer",
			options: DISABLE_ENABLE_OPTIONS,
			onSelect: (value) => onUpdateMusicOption("musicLyricsOptimizer", value),
		},
		{
			label: "水印",
			value: findPanelOptionLabel(
				DISABLE_ENABLE_OPTIONS,
				composer.musicWatermark ?? "false",
				"关闭",
			),
			selectedValue: composer.musicWatermark ?? "false",
			menuKey: "musicWatermark",
			options: DISABLE_ENABLE_OPTIONS,
			onSelect: (value) => onUpdateMusicOption("musicWatermark", value),
		},
	];

	const inputFields: InspectorInputField[] = [];

	const textareaFields: InspectorTextareaField[] = [
		{
			label: "歌词",
			value: composer.musicLyrics,
			onChange: (value) => onUpdateMusicOption("musicLyrics", value),
		},
	];

	return { selectFields, inputFields, textareaFields };
}
