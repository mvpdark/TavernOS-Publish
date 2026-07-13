import {
	type KakaAlignedResponse,
	type KakaApiConfig,
	type KakaAudioGenerationRequest,
	type KakaMusicGenerationRequest,
	requestKakaApi,
	requestKakaAudioGeneration,
	requestKakaMusicGeneration,
} from "./kakaApi";
import type { ReferenceAssetWithUrl } from "./referenceAssetUtils";
import {
	getFirstReferenceAssetUrlByKindOrExtensionFromReadyAssets,
	getReferenceAssetUrl,
} from "./referenceAssetUtils";
import {
	isMiniMaxSpeech28HdRequest,
	isSunoMusicRequest,
	resolveSunoModelForAction,
} from "./audioMusicProviderRouting";
import { extractVoiceId, unwrapAlignedResponseData } from "./kakaSendResponse";
import type { KakaSendRouteContext } from "./kakaSendRouting";
import type { ComposerPreset, ReferenceAsset } from "./canvas-types";

function slugVoiceId(value: string) {
	const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return `kaka-${normalized || Date.now().toString(36)}`;
}

export function resolveMusicReferenceAudioUrl(
	referenceAssets: readonly ReferenceAssetWithUrl[],
) {
	return getFirstReferenceAssetUrlByKindOrExtensionFromReadyAssets(referenceAssets, "audio");
}

export function buildKakaMusicGenerationRequest({
	model,
	composer,
	referenceAssets,
	nextPrompt,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
	nextPrompt: string;
}) {
	const sunoRequest = isSunoMusicRequest(model, composer);
	const musicAction = composer.musicAction || "music";
	const sentModel = sunoRequest ? resolveSunoModelForAction(musicAction) : model;
	const referenceAudioUrl = resolveMusicReferenceAudioUrl(referenceAssets);
	const requestBody: KakaMusicGenerationRequest = {
		model: sentModel,
		prompt: nextPrompt,
		lyrics: composer.musicLyrics,
		audio_url: referenceAudioUrl,
		options: {
			music_action: musicAction,
			suno_action: musicAction,
			lyrics: composer.musicLyrics,
			output_format: composer.musicOutputFormat,
			format: composer.musicAudioFormat,
			sample_rate: composer.musicSampleRate ? Number.parseInt(composer.musicSampleRate, 10) : undefined,
			bitrate: composer.musicBitrate ? Number.parseInt(composer.musicBitrate, 10) : undefined,
			is_instrumental: composer.musicInstrumental === "true",
			lyrics_optimizer: composer.musicLyricsOptimizer === "true",
			aigc_watermark: composer.musicWatermark === "true",
			style: [composer.musicStyleCategory, composer.musicStylePreset]
				.filter(Boolean)
				.join(", "),
			music_style_category: composer.musicStyleCategory,
			music_style_preset: composer.musicStylePreset,
			audio_url: referenceAudioUrl,
			url: referenceAudioUrl,
		},
	};
	return { requestBody, sentModel };
}

export async function requestMusicLikeGeneration({
	config,
	model,
	composer,
	referenceAssets,
	nextPrompt,
}: {
	config: KakaApiConfig;
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
	nextPrompt: string;
}) {
	const { requestBody, sentModel } = buildKakaMusicGenerationRequest({
		model,
		composer,
		referenceAssets,
		nextPrompt,
	});
	const alignedResponse = (await requestKakaMusicGeneration(config, requestBody)).data;
	return { alignedResponse, sentModel };
}

export function resolveAudioVoiceSourceUrl({
	sourceAsset,
	referenceAssets,
}: {
	sourceAsset?: Pick<ReferenceAsset, "url"> | null;
	referenceAssets: readonly ReferenceAssetWithUrl[];
}) {
	const sourceAssetUrl = sourceAsset ? getReferenceAssetUrl(sourceAsset) : "";
	return sourceAssetUrl || resolveMusicReferenceAudioUrl(referenceAssets);
}

export function buildKakaAudioGenerationRequest({
	model,
	composer,
	routeContext,
}: {
	model: string;
	composer: ComposerPreset;
	routeContext: Pick<KakaSendRouteContext, "nextPrompt">;
}) {
	const isMiniMaxSpeech28Hd = isMiniMaxSpeech28HdRequest(model, composer);
	const sentModel = isMiniMaxSpeech28Hd ? "speech-2.8-hd(yunwu)" : model;
	const requestBody: KakaAudioGenerationRequest = {
		model: sentModel,
		text: routeContext.nextPrompt,
		options: {
			audio_tier: composer.audioTier,
			voice_id: (composer.audioVoiceId ?? "").trim() || (composer.audioVoiceName ?? "").trim() || undefined,
			output_format: isMiniMaxSpeech28Hd ? "hex" : undefined,
			format: isMiniMaxSpeech28Hd ? "mp3" : undefined,
			sample_rate: isMiniMaxSpeech28Hd ? 32000 : undefined,
			bitrate: isMiniMaxSpeech28Hd ? 128000 : undefined,
			channel: isMiniMaxSpeech28Hd ? 1 : undefined,
		},
	};
	return { requestBody, sentModel };
}

export async function requestAudioLikeGeneration({
	config,
	model,
	composer,
	referenceAssets,
	sourceAsset,
	routeContext,
}: {
	config: KakaApiConfig;
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
	sourceAsset: ReferenceAsset | null;
	routeContext: Pick<
		KakaSendRouteContext,
		"audioVoiceMode" | "isAudioVoiceUtility" | "nextPrompt"
	>;
}) {
	if (routeContext.isAudioVoiceUtility) {
		const displayName = (composer.audioVoiceName ?? "").trim();
		if (!displayName) {
			throw new Error(routeContext.audioVoiceMode === "clone" ? "请先填写克隆音色名称。" : "请先填写设计音色名称。");
		}
		const sourceAudioUrl = resolveAudioVoiceSourceUrl({
			sourceAsset,
			referenceAssets,
		});
		if (routeContext.audioVoiceMode === "clone" && !sourceAudioUrl) {
			throw new Error("音色克隆需要先连接一段参考音频。");
		}
		if (routeContext.audioVoiceMode === "design" && !(composer.audioVoiceStyle ?? "").trim()) {
			throw new Error("请先填写音色风格描述。");
		}
		const sentModel = routeContext.audioVoiceMode === "clone" ? "voice-clone(yunwu)" : "voice-design(yunwu)";
		const alignedResponse = (await requestKakaApi<
			{ type: "tts"; model: string; prompt: string; options: Record<string, unknown> },
			KakaAlignedResponse
		>(config, "/api/v1/generate", {
			type: "tts",
			model: sentModel,
			prompt: routeContext.audioVoiceMode === "design" ? (composer.audioVoiceStyle ?? "") : displayName,
			options: {
				display_name: displayName,
				provider: "minimax",
				voice_id: (composer.audioVoiceId ?? "").trim() || slugVoiceId(displayName),
				audio_url: sourceAudioUrl,
				preview_text: routeContext.nextPrompt || "这是一段用于试听音色的文本。",
			},
		})).data;
		const unwrappedVoiceData = unwrapAlignedResponseData(alignedResponse);
		const voiceId = extractVoiceId(unwrappedVoiceData);
		return {
			alignedResponse,
			sentModel,
			voiceNotice: {
				message: voiceId ? `音色「${displayName}」已创建：${voiceId}` : `音色「${displayName}」已创建。`,
				dedupeKey: `voice-${routeContext.audioVoiceMode}-success`,
			},
		};
	}

	const { requestBody, sentModel } = buildKakaAudioGenerationRequest({
		model,
		composer,
		routeContext,
	});
	const alignedResponse = (await requestKakaAudioGeneration(config, requestBody)).data;
	return { alignedResponse, sentModel };
}
