import {
	type MusicComposerOptionKey,
	resolveAudioComposerPreset,
	resolveMusicComposerPreset,
} from "./audioMusicModelCapabilities";
import { resolveImageComposerPreset } from "./imageModelCapabilities";
import { getMusicModelMeta } from "./appNodeModelConfig";
import { getVideoModelCredits } from "./appVideoModelHelpers";
import { getModelDisplayLabel } from "./modelOptions";
import { countReferenceAssets } from "./referenceAssetUtils";
import type { ComposerPreset, NodeType } from "./canvas-types";
import { resolveVideoComposerPreset } from "./videoModelCapabilities";

export type { MusicComposerOptionKey };

export type ImageComposerOptionKey =
	| "version"
	| "imageSize"
	| "aspectRatio"
	| "resolution"
	| "outputFormat"
	| "quality"
	| "midjourneyAction"
	| "speedMode"
	| "background"
	| "watermark"
	| "promptExtend"
	| "quantity"
	| "seed"
	| "width"
	| "height"
	| "imageInferenceSteps"
	| "imageGuidanceScale"
	| "enableSequential"
	| "thinkingMode";

export type VideoComposerOptionKey =
	| "videoGenerationMode"
	| "videoTier"
	| "videoQuality"
	| "videoVersion"
	| "videoFeature"
	| "aspectRatio"
	| "resolution"
	| "duration"
	| "seed";

export type AudioComposerOptionKey =
	| "audioTier"
	| "audioVoiceMode"
	| "audioVoiceName"
	| "audioVoiceId"
	| "audioVoiceStyle";

export type TextComposerOptionKey = "textMode";

export type ComposerOptionNotice = {
	message: string;
	tone: "info" | "warning";
	dedupeKey: string;
};

export function getComposerReferenceAssetCount(composer: Pick<ComposerPreset, "referenceAssets">) {
	return countReferenceAssets(composer.referenceAssets ?? []);
}

export function applyModelSelectionToComposer(
	type: NodeType,
	current: ComposerPreset,
	nextModel: string,
): ComposerPreset {
	if (type === "video") {
		return {
			...current,
			model: nextModel,
			credits: getVideoModelCredits(nextModel),
			...resolveVideoComposerPreset(nextModel, current),
		};
	}
	if (type === "image" || type === "editor") {
		return {
			...current,
			model: nextModel,
			...resolveImageComposerPreset(nextModel, current, getComposerReferenceAssetCount(current)),
		};
	}
	if (type === "audio") {
		return {
			...current,
			model: nextModel,
			...resolveAudioComposerPreset(nextModel, current),
		};
	}
	if (type === "music") {
		return {
			...current,
			model: nextModel,
			meta: getMusicModelMeta(nextModel),
			...resolveMusicComposerPreset(nextModel, current),
		};
	}
	return {
		...current,
		model: nextModel,
	};
}

export function applyImageComposerOption(
	current: ComposerPreset,
	key: ImageComposerOptionKey,
	value: string | boolean,
): ComposerPreset {
	const next = { ...current, [key]: value };
	return {
		...next,
		...resolveImageComposerPreset(current.model, next, getComposerReferenceAssetCount(current)),
	};
}

export function applyVideoComposerOption(
	current: ComposerPreset,
	key: VideoComposerOptionKey,
	value: string,
): { composer: ComposerPreset; notice?: ComposerOptionNotice } {
	const isHailuo23 = getModelDisplayLabel(current.model).trim() === "MiniMax Hailuo 2.3";
	const next = { ...current, [key]: value };
	if (isHailuo23 && key === "videoQuality") {
		next.videoTier = value;
	}
	const resolved = resolveVideoComposerPreset(next.model, next);
	const composer = {
		...next,
		...resolved,
		...(isHailuo23 && key === "videoQuality" ? { videoTier: value } : {}),
	};
	if (isHailuo23 && (composer.resolution ?? "").toUpperCase() === "1080P" && composer.duration === "10s") {
		composer.duration = "6s";
		return {
			composer,
			notice: {
				message: "MiniMax Hailuo 2.3 1080P only supports 6s. Switched to 6s automatically.",
				tone: "info",
				dedupeKey: "hailuo-1080p-duration-guard",
			},
		};
	}
	return { composer };
}

export function applyAudioComposerOption(
	current: ComposerPreset,
	key: AudioComposerOptionKey,
	value: string,
): ComposerPreset {
	const next = { ...current, [key]: value };
	return {
		...next,
		...resolveAudioComposerPreset(current.model, next),
	};
}

export function applyMusicComposerOption(
	current: ComposerPreset,
	key: MusicComposerOptionKey,
	value: string,
): ComposerPreset {
	const next = { ...current, [key]: value };
	return {
		...next,
		...resolveMusicComposerPreset(current.model, next),
	};
}
