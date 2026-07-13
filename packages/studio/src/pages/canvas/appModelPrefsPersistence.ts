import type { TapModelPrefsStorage } from "./appLegacyStorageMigration";
import { getStoredModelValue } from "./modelOptions";
import type { ComposerPreset, NodeType } from "./canvas-types";

export function buildPersistedModelPrefs(
	modelPrefs: TapModelPrefsStorage,
	composerByType: Record<NodeType, ComposerPreset>,
	now = Date.now(),
): TapModelPrefsStorage {
	const imageModelKey = getStoredModelValue("image", composerByType.image.model);
	const videoModelKey = getStoredModelValue("video", composerByType.video.model);
	const audioModelKey = getStoredModelValue("audio", composerByType.audio.model);
	const musicModelKey = getStoredModelValue("music", composerByType.music.model);

	return {
		...modelPrefs,
		lastUsedModels: {
			...(modelPrefs.lastUsedModels ?? {}),
			text: getStoredModelValue("text", composerByType.text.model),
			image: imageModelKey,
			video: videoModelKey,
			audio: audioModelKey,
			music: musicModelKey,
		},
		modelConfigs: {
			...(modelPrefs.modelConfigs ?? {}),
			[imageModelKey]: {
				...(modelPrefs.modelConfigs?.[imageModelKey] ?? {}),
				version: composerByType.image.version,
				imageSize: composerByType.image.imageSize,
				aspectRatio: composerByType.image.aspectRatio,
				resolution: composerByType.image.resolution,
				outputFormat: composerByType.image.outputFormat,
				quality: composerByType.image.quality,
				midjourneyAction: composerByType.image.midjourneyAction,
				speedMode: composerByType.image.speedMode,
				background: composerByType.image.background,
				watermark: composerByType.image.watermark,
				promptExtend: composerByType.image.promptExtend,
				quantity: composerByType.image.quantity,
				width: composerByType.image.width,
				height: composerByType.image.height,
				enableSequential: composerByType.image.enableSequential,
				thinkingMode: composerByType.image.thinkingMode,
			},
			[videoModelKey]: {
				...(modelPrefs.modelConfigs?.[videoModelKey] ?? {}),
				videoGenerationMode: composerByType.video.videoGenerationMode,
				videoTier: composerByType.video.videoTier,
				videoQuality: composerByType.video.videoQuality,
				videoVersion: composerByType.video.videoVersion,
				videoFeature: composerByType.video.videoFeature,
				aspectRatio: composerByType.video.aspectRatio,
				resolution: composerByType.video.resolution,
				duration: composerByType.video.duration,
				seed: composerByType.video.seed,
			},
			[audioModelKey]: {
				...(modelPrefs.modelConfigs?.[audioModelKey] ?? {}),
				audioTier: composerByType.audio.audioTier,
			},
			[musicModelKey]: {
				...(modelPrefs.modelConfigs?.[musicModelKey] ?? {}),
				musicAction: composerByType.music.musicAction,
				musicVersion: composerByType.music.musicVersion,
				musicOutputFormat: composerByType.music.musicOutputFormat,
				musicLyrics: composerByType.music.musicLyrics,
				musicSampleRate: composerByType.music.musicSampleRate,
				musicBitrate: composerByType.music.musicBitrate,
				musicAudioFormat: composerByType.music.musicAudioFormat,
				musicInstrumental: composerByType.music.musicInstrumental,
				musicLyricsOptimizer: composerByType.music.musicLyricsOptimizer,
				musicWatermark: composerByType.music.musicWatermark,
				musicStyleCategory: composerByType.music.musicStyleCategory,
				musicStylePreset: composerByType.music.musicStylePreset,
			},
		},
		_meta: {
			version: modelPrefs._meta?.version ?? 1,
			updatedAt: now,
		},
	};
}
