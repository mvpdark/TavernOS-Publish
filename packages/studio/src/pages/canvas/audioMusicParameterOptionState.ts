import {
	formatAudioMusicMeta,
	getAudioModelCapability,
	getAudioTierOptions,
	getMusicActionOptions,
	getMusicAudioFormatOptions,
	getMusicBitrateOptions,
	getMusicModelCapability,
	getMusicOutputFormatOptions,
	getMusicSampleRateOptions,
	getMusicStyleGroups,
	getMusicStyleLabel,
	getMusicStylePresets,
	getMusicVersionOptions,
} from "./audioMusicModelCapabilities";
import type { ComposerPreset, NodeType } from "./canvas-types";

export type AudioMusicParameterOptionStateConfig = {
	composer: ComposerPreset;
	type?: NodeType;
	isAudioNode?: boolean;
	isMusicNode?: boolean;
};

export function buildAudioMusicParameterOptionState({
	composer,
	type,
	isAudioNode,
	isMusicNode,
}: AudioMusicParameterOptionStateConfig) {
	const audioNode = isAudioNode ?? type === "audio";
	const musicNode = isMusicNode ?? type === "music";

	return {
		audioCapability: audioNode ? getAudioModelCapability(composer.model) : null,
		musicCapability: musicNode ? getMusicModelCapability(composer.model) : null,
		audioTierOptions: audioNode ? getAudioTierOptions(composer.model) : [],
		musicActionOptions: musicNode ? getMusicActionOptions(composer.model) : [],
		musicVersionOptions: musicNode ? getMusicVersionOptions(composer.model) : [],
		musicOutputFormatOptions: musicNode ? getMusicOutputFormatOptions(composer.model) : [],
		musicSampleRateOptions: musicNode ? getMusicSampleRateOptions(composer.model) : [],
		musicBitrateOptions: musicNode ? getMusicBitrateOptions(composer.model) : [],
		musicAudioFormatOptions: musicNode ? getMusicAudioFormatOptions(composer.model) : [],
		musicStyleGroups: musicNode ? getMusicStyleGroups() : [],
		musicStylePresetOptions: musicNode
			? getMusicStylePresets(composer.model, composer.musicStyleCategory)
			: [],
		musicStyleSummary: musicNode ? getMusicStyleLabel(composer) : "",
		audioMusicSummary: audioNode || musicNode
			? formatAudioMusicMeta(audioNode ? "audio" : "music", composer)
			: "",
	};
}

export type AudioMusicParameterOptionState = ReturnType<
	typeof buildAudioMusicParameterOptionState
>;
