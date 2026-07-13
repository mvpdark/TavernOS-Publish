import type { TapModelPrefsStorage } from "./appLegacyStorageMigration";
import { COMPOSER_PRESETS } from "./appComposerPresets";
import { getVideoModelCredits } from "./appVideoModelHelpers";
import {
	resolveAudioComposerPreset,
	resolveMusicComposerPreset,
} from "./audioMusicModelCapabilities";
import { resolveImageComposerPreset } from "./imageModelCapabilities";
import {
	getMusicModelMeta,
	resolveAllowedNodeModel,
} from "./appNodeModelConfig";
import type { ComposerPreset, NodeType } from "./canvas-types";
import { resolveVideoComposerPreset } from "./videoModelCapabilities";

type ModelConfig = Record<string, string | number | boolean | undefined>;

function getModelConfig(
	modelPrefs: TapModelPrefsStorage,
	model: string | undefined,
): ModelConfig | undefined {
	return model ? modelPrefs.modelConfigs?.[model] : undefined;
}

function pickString(config: ModelConfig | undefined, key: string) {
	const value = config?.[key];
	return typeof value === "string" ? value : undefined;
}

function pickBoolean(config: ModelConfig | undefined, key: string) {
	const value = config?.[key];
	return typeof value === "boolean" ? value : undefined;
}

function resolveStoredNodeModel(
	type: NodeType,
	storedModel: string | undefined,
	fallback: string,
) {
	return resolveAllowedNodeModel(type, storedModel, fallback);
}

export function createInitialComposerByType(
	initialModelPrefs: TapModelPrefsStorage,
): Record<NodeType, ComposerPreset> {
	const imageStoredModel = initialModelPrefs.lastUsedModels?.image;
	const imageConfig = getModelConfig(initialModelPrefs, imageStoredModel);
	const resolvedImageModel = resolveStoredNodeModel(
		"image",
		imageStoredModel,
		COMPOSER_PRESETS.image.model,
	);

	const videoStoredModel = initialModelPrefs.lastUsedModels?.video;
	const resolvedVideoModel = resolveStoredNodeModel(
		"video",
		videoStoredModel,
		COMPOSER_PRESETS.video.model,
	);
	const videoConfig = getModelConfig(initialModelPrefs, videoStoredModel);

	const audioStoredModel = initialModelPrefs.lastUsedModels?.audio;
	const resolvedAudioModel = resolveStoredNodeModel(
		"audio",
		audioStoredModel,
		COMPOSER_PRESETS.audio.model,
	);
	const audioConfig = getModelConfig(initialModelPrefs, resolvedAudioModel);

	const musicStoredModel = initialModelPrefs.lastUsedModels?.music;
	const resolvedMusicModel = resolveStoredNodeModel(
		"music",
		musicStoredModel,
		COMPOSER_PRESETS.music.model,
	);
	const musicConfig = getModelConfig(initialModelPrefs, musicStoredModel);

	return {
		...COMPOSER_PRESETS,
		text: {
			...COMPOSER_PRESETS.text,
			model: resolveStoredNodeModel(
				"text",
				initialModelPrefs.lastUsedModels?.text,
				COMPOSER_PRESETS.text.model,
			),
		},
		shot: {
			...COMPOSER_PRESETS.shot,
			model: resolveStoredNodeModel(
				"shot",
				initialModelPrefs.lastUsedModels?.text,
				COMPOSER_PRESETS.shot.model,
			),
		},
		character: {
			...COMPOSER_PRESETS.character,
			model: resolveStoredNodeModel(
				"character",
				initialModelPrefs.lastUsedModels?.text,
				COMPOSER_PRESETS.character.model,
			),
		},
		scene: {
			...COMPOSER_PRESETS.scene,
			model: resolveStoredNodeModel(
				"scene",
				initialModelPrefs.lastUsedModels?.text,
				COMPOSER_PRESETS.scene.model,
			),
		},
		image: {
			...COMPOSER_PRESETS.image,
			model: resolvedImageModel,
			...resolveImageComposerPreset(resolvedImageModel, {
				version: pickString(imageConfig, "version"),
				imageSize: pickString(imageConfig, "imageSize"),
				aspectRatio: pickString(imageConfig, "aspectRatio"),
				resolution: pickString(imageConfig, "resolution"),
				outputFormat: pickString(imageConfig, "outputFormat"),
				quality: pickString(imageConfig, "quality"),
				midjourneyAction: pickString(imageConfig, "midjourneyAction"),
				speedMode: pickString(imageConfig, "speedMode"),
				background: pickString(imageConfig, "background"),
				watermark: pickString(imageConfig, "watermark"),
				promptExtend: pickString(imageConfig, "promptExtend"),
				quantity: pickString(imageConfig, "quantity"),
				seed: pickString(imageConfig, "seed"),
				width: pickString(imageConfig, "width"),
				height: pickString(imageConfig, "height"),
				enableSequential: pickBoolean(imageConfig, "enableSequential"),
				thinkingMode: pickBoolean(imageConfig, "thinkingMode"),
			}),
		},
		video: {
			...COMPOSER_PRESETS.video,
			model: resolvedVideoModel,
			credits: getVideoModelCredits(resolvedVideoModel),
			...resolveVideoComposerPreset(resolvedVideoModel, {
				videoGenerationMode: pickString(videoConfig, "videoGenerationMode"),
				videoTier: pickString(videoConfig, "videoTier"),
				videoQuality: pickString(videoConfig, "videoQuality"),
				videoVersion: pickString(videoConfig, "videoVersion"),
				videoFeature: pickString(videoConfig, "videoFeature"),
				aspectRatio: pickString(videoConfig, "aspectRatio"),
				resolution: pickString(videoConfig, "resolution"),
				duration: pickString(videoConfig, "duration"),
				seed: pickString(videoConfig, "seed"),
			}),
		},
		audio: {
			...COMPOSER_PRESETS.audio,
			model: resolvedAudioModel,
			...resolveAudioComposerPreset(resolvedAudioModel, {
				audioTier: pickString(audioConfig, "audioTier"),
			}),
		},
		music: {
			...COMPOSER_PRESETS.music,
			model: resolvedMusicModel,
			meta: getMusicModelMeta(resolvedMusicModel),
			...resolveMusicComposerPreset(resolvedMusicModel, {
				musicAction: pickString(musicConfig, "musicAction"),
				musicVersion: pickString(musicConfig, "musicVersion"),
				musicOutputFormat: pickString(musicConfig, "musicOutputFormat"),
				musicLyrics: pickString(musicConfig, "musicLyrics"),
				musicSampleRate: pickString(musicConfig, "musicSampleRate"),
				musicBitrate: pickString(musicConfig, "musicBitrate"),
				musicAudioFormat: pickString(musicConfig, "musicAudioFormat"),
				musicInstrumental: pickString(musicConfig, "musicInstrumental"),
				musicLyricsOptimizer: pickString(musicConfig, "musicLyricsOptimizer"),
				musicWatermark: pickString(musicConfig, "musicWatermark"),
				musicStyleCategory: pickString(musicConfig, "musicStyleCategory"),
				musicStylePreset: pickString(musicConfig, "musicStylePreset"),
			}),
		},
		editor: COMPOSER_PRESETS.editor,
	};
}
