import type {
	AudioComposerOptionKey,
	MusicComposerOptionKey,
} from "./appComposerOptionUpdates";
import type { AudioMusicParameterOptionState } from "./audioMusicParameterOptionState";
import {
	DISABLE_ENABLE_OPTIONS,
	VOCAL_MODE_OPTIONS,
	createPanelSelectSection,
	type PanelSelectSection,
} from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type AudioMusicOptionSection =
	PanelSelectSection<AudioComposerOptionKey | MusicComposerOptionKey>;

type AudioOptionUpdater = (key: AudioComposerOptionKey, value: string) => void;
type MusicOptionUpdater = (key: MusicComposerOptionKey, value: string) => void;

export function buildAudioOptionSections({
	composer,
	optionState,
	onUpdateAudioOption,
}: {
	composer: ComposerPreset;
	optionState: AudioMusicParameterOptionState;
	onUpdateAudioOption?: AudioOptionUpdater;
}): AudioMusicOptionSection[] {
	return [
		createPanelSelectSection({
			label: "音质/档位",
			options: optionState.audioTierOptions,
			currentValue: composer.audioTier,
			key: "audioTier",
			onUpdate: onUpdateAudioOption,
		}),
	];
}

export function buildMusicBaseOptionSections({
	composer,
	optionState,
	onUpdateMusicOption,
}: {
	composer: ComposerPreset;
	optionState: AudioMusicParameterOptionState;
	onUpdateMusicOption?: MusicOptionUpdater;
}): AudioMusicOptionSection[] {
	return [
		createPanelSelectSection({
			label: "Suno 功能",
			options: optionState.musicActionOptions,
			currentValue: composer.musicAction,
			key: "musicAction",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "MiniMax 版本",
			options: optionState.musicVersionOptions,
			currentValue: composer.musicVersion,
			key: "musicVersion",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "输出格式",
			options: optionState.musicOutputFormatOptions,
			currentValue: composer.musicOutputFormat,
			key: "musicOutputFormat",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "采样率",
			options: optionState.musicSampleRateOptions,
			currentValue: composer.musicSampleRate,
			key: "musicSampleRate",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "比特率",
			options: optionState.musicBitrateOptions,
			currentValue: composer.musicBitrate,
			key: "musicBitrate",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "音频编码",
			options: optionState.musicAudioFormatOptions,
			currentValue: composer.musicAudioFormat,
			key: "musicAudioFormat",
			onUpdate: onUpdateMusicOption,
		}),
	];
}

export function buildMiniMaxMusicOptionSections({
	composer,
	onUpdateMusicOption,
}: {
	composer: ComposerPreset;
	onUpdateMusicOption?: MusicOptionUpdater;
}): AudioMusicOptionSection[] {
	return [
		createPanelSelectSection({
			label: "生成选项",
			options: VOCAL_MODE_OPTIONS,
			currentValue: composer.musicInstrumental ?? "false",
			key: "musicInstrumental",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "歌词优化",
			options: DISABLE_ENABLE_OPTIONS,
			currentValue: composer.musicLyricsOptimizer ?? "false",
			key: "musicLyricsOptimizer",
			onUpdate: onUpdateMusicOption,
		}),
		createPanelSelectSection({
			label: "水印",
			options: DISABLE_ENABLE_OPTIONS,
			currentValue: composer.musicWatermark ?? "false",
			key: "musicWatermark",
			onUpdate: onUpdateMusicOption,
		}),
	];
}


