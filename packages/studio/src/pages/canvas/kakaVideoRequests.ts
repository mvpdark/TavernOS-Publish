import {
	type KakaApiConfig,
	type KakaAlignedResponse,
	type KakaVideoGenerationRequest,
	requestKakaVideoGeneration,
} from "./kakaApi";
import { resolveGrokImagineVideoRequest } from "./grokImagineVideoRouting";
import {
	normalizeImageReferenceAssetsForRequest,
} from "./kakaReferenceAssets";
import {
	groupReferenceAssetsByKind,
	summarizeReferenceAssetUrlsByKindOrExtensionFromReadyAssets,
	type ReferenceAssetWithUrl,
} from "./referenceAssetUtils";
import { getModelDisplayLabel } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";
import { isVeo31Model, resolveVeo31VideoRequest } from "./veo31Routing";
import {
	isFastVideoChoice,
	isMiniMaxHailuo23Request,
	isRunwayGen4Request,
	isSeedanceRequest,
	isSiliconFlowWan22Request,
	resolveMiniMaxHailuo23Duration,
	resolveMiniMaxHailuo23Model,
	resolveRunwayGen4Model,
	resolveSeedanceModel,
	resolveSiliconFlowWan22ImageSize,
	resolveSiliconFlowWan22Model,
} from "./videoProviderRouting";
import { getVideoModelCapability } from "./videoModelCapabilities";

function parseOptionalInteger(value?: string) {
	if (!value?.trim()) return undefined;
	const parsed = Number.parseInt(value.trim(), 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function isRetryableGrokVideoGatewayError(response: KakaAlignedResponse<unknown>) {
	const message =
		typeof response.error === "string"
			? response.error
			: typeof response.error?.message === "string"
				? response.error.message
				: typeof response.message === "string"
					? response.message
					: "";
	return /ConnectError|500 Internal Server|Server error ['"]?500|Gateway error/i.test(message);
}

function getGrokVideoFallbackModels(primaryModel: string, duration?: unknown) {
	const normalizedPrimary = primaryModel.trim();
	const seconds =
		typeof duration === "number"
			? duration
			: Number.parseInt(String(duration ?? ""), 10);
	const backups =
		seconds === 10
			? ["grok-video-3-10s(yunwu)", "grok-video-3(yunwu)"]
			: ["grok-video-3(yunwu)", "grok-video-3-10s(yunwu)"];
	return Array.from(new Set([normalizedPrimary, ...backups]));
}

function isInfinitalkFromAudioRequest(model: string, composer: ComposerPreset) {
	return [model, composer.model, getModelDisplayLabel(model), getModelDisplayLabel(composer.model)]
		.some((value) => value.trim().toLowerCase().includes("infinitalk"));
}

function blobToDataUrl(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("Unable to read video frame data."));
		reader.onerror = () => reject(reader.error ?? new Error("Unable to read video frame data."));
		reader.readAsDataURL(blob);
	});
}

async function extractVideoReferenceFrameDataUrl(videoUrl: string) {
	const videoResponse = await fetch(videoUrl);
	if (!videoResponse.ok) {
		throw new Error(`Unable to read video reference: ${videoResponse.status}`);
	}
	const videoBlob = await videoResponse.blob();
	const frameResponse = await fetch("/api/video/last-frame?position=first", {
		method: "POST",
		headers: {
			"Content-Type": videoBlob.type || "video/mp4",
		},
		body: videoBlob,
	});
	if (!frameResponse.ok) {
		const message = await frameResponse.text().catch(() => "");
		throw new Error(message || `Unable to extract video reference frame: ${frameResponse.status}`);
	}
	return blobToDataUrl(await frameResponse.blob());
}

export async function buildKakaVideoGenerationRequest({
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
	const videoCapability = getVideoModelCapability(model, composer);
	const isMiniMaxHailuo23 = isMiniMaxHailuo23Request(model, composer);
	const isSiliconFlowWan22 = isSiliconFlowWan22Request(model, composer);
	const isVeo31Request = isVeo31Model(model) || isVeo31Model(composer.model);
	const isRunwayGen4 = isRunwayGen4Request(model, composer);
	const isSeedance = isSeedanceRequest(model, composer);
	const isInfinitalkFromAudio = isInfinitalkFromAudioRequest(model, composer);
	const isGrokVideoRequest = [model, composer.model]
		.map((value) => getModelDisplayLabel(value).trim())
		.some((label) => label === "Grok Imagine Video");
	const shouldNormalizeVideoReference = isSiliconFlowWan22 || isVeo31Request || isMiniMaxHailuo23 || isGrokVideoRequest || isInfinitalkFromAudio;
	const requestVideoReferenceAssets = shouldNormalizeVideoReference && referenceAssets.length > 0
		? await normalizeImageReferenceAssetsForRequest(
			referenceAssets,
			isVeo31Request || isMiniMaxHailuo23 ? composer.aspectRatio : undefined,
		)
		: referenceAssets;
	const videoReferenceAssetsByKind = groupReferenceAssetsByKind(requestVideoReferenceAssets);
	const videoReferenceImageAssets = videoReferenceAssetsByKind.image;
	const videoReferenceUrlSummary = summarizeReferenceAssetUrlsByKindOrExtensionFromReadyAssets(requestVideoReferenceAssets);
	let videoReferenceImageUrls = videoReferenceUrlSummary.byKind.image;
	let firstVideoReferenceImageUrl = videoReferenceUrlSummary.first.image;
	if (isInfinitalkFromAudio && !firstVideoReferenceImageUrl && videoReferenceUrlSummary.first.video) {
		firstVideoReferenceImageUrl = await extractVideoReferenceFrameDataUrl(videoReferenceUrlSummary.first.video);
		videoReferenceImageUrls = [firstVideoReferenceImageUrl];
	}
	const videoReferenceVideoUrls = videoReferenceUrlSummary.byKind.video;
	const videoReferenceAudioUrls = videoReferenceUrlSummary.byKind.audio;
	const videoSeed = parseOptionalInteger(composer.seed);
	const siliconFlowWan22ImageSize = isSiliconFlowWan22
		? resolveSiliconFlowWan22ImageSize(composer.aspectRatio, composer.resolution)
		: undefined;
	const shouldSendVideoDuration =
		isMiniMaxHailuo23 ||
		!videoCapability.displayOnlyDuration ||
		composer.duration !== videoCapability.displayOnlyDuration;
	const parsedVideoDuration =
		shouldSendVideoDuration && composer.duration
			? Number.parseInt(composer.duration, 10)
			: Number.NaN;
	const minimaxHailuoDuration = isMiniMaxHailuo23 ? resolveMiniMaxHailuo23Duration(composer) : undefined;
	const seedanceFunctionMode =
		isSeedance &&
		(composer.videoGenerationMode === "multiReference" ||
			videoReferenceVideoUrls.length > 0 ||
			videoReferenceAudioUrls.length > 0)
			? "omni_reference"
			: undefined;
	const videoRouteRequest = resolveGrokImagineVideoRequest({
		model,
		composer,
		referenceAssets: videoReferenceImageAssets,
	}) ?? resolveVeo31VideoRequest({
		model,
		composer,
		referenceAssets: videoReferenceImageAssets,
	});
	const videoOptions = {
		video_generation_mode: composer.videoGenerationMode,
		video_tier: composer.videoTier,
		video_quality: composer.videoQuality,
		video_feature: composer.videoFeature,
		aspect_ratio: composer.aspectRatio,
		ratio: composer.aspectRatio,
		resolution: isMiniMaxHailuo23 ? (composer.resolution ?? "768P").toUpperCase() : composer.resolution,
		size: isMiniMaxHailuo23 ? (composer.resolution ?? "768P").toUpperCase() : composer.resolution,
		duration: isMiniMaxHailuo23 ? String(minimaxHailuoDuration ?? 6) : shouldSendVideoDuration ? composer.duration : undefined,
		prompt_optimizer: composer.promptExtend !== "false",
		fast_pretreatment: isMiniMaxHailuo23 && isFastVideoChoice(composer.videoQuality, composer.videoTier),
		aigc_watermark: composer.watermark === "true",
		seed: isSiliconFlowWan22 ? videoSeed : undefined,
		image_size: siliconFlowWan22ImageSize,
		functionMode: seedanceFunctionMode,
		images: videoReferenceImageUrls,
		reference_images: videoReferenceImageUrls,
		videos: videoReferenceVideoUrls,
		reference_videos: videoReferenceVideoUrls,
		audios: videoReferenceAudioUrls,
		reference_audios: videoReferenceAudioUrls,
		file_paths: videoReferenceUrlSummary.all,
	};
	const sentModel = isMiniMaxHailuo23
		? resolveMiniMaxHailuo23Model(composer)
		: isSiliconFlowWan22
			? resolveSiliconFlowWan22Model(videoReferenceUrlSummary.has.image)
			: isRunwayGen4
				? resolveRunwayGen4Model(composer)
				: isSeedance
					? resolveSeedanceModel(composer)
					: videoRouteRequest?.model ?? model;
	const requestBody: KakaVideoGenerationRequest = {
		model: sentModel,
		prompt: nextPrompt,
		image_url: firstVideoReferenceImageUrl,
		video_url: videoReferenceUrlSummary.first.video,
		audio_url: videoReferenceUrlSummary.first.audio,
		duration: isMiniMaxHailuo23 ? minimaxHailuoDuration : Number.isFinite(parsedVideoDuration) ? parsedVideoDuration : undefined,
		seed: isSiliconFlowWan22 ? videoSeed : undefined,
		options: {
			...videoOptions,
			...(videoRouteRequest?.options ?? {}),
		},
	};
	return { requestBody, sentModel, isGrokVideoRequest };
}

export async function requestVideoLikeGeneration({
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
	const { requestBody, sentModel, isGrokVideoRequest } =
		await buildKakaVideoGenerationRequest({
			model,
			composer,
			referenceAssets,
			nextPrompt,
		});
	if (!isGrokVideoRequest) {
		const alignedResponse = (await requestKakaVideoGeneration(config, requestBody)).data;
		return { alignedResponse, sentModel, isGrokVideoRequest };
	}

	let finalResponse: KakaAlignedResponse = { success: false, error: "Grok video request was not attempted." };
	let finalSentModel = sentModel;
	const fallbackModels = getGrokVideoFallbackModels(
		requestBody.model,
		requestBody.duration ?? requestBody.options?.duration,
	);
	for (const candidateModel of fallbackModels) {
		finalSentModel = candidateModel;
		finalResponse = (await requestKakaVideoGeneration(config, {
			...requestBody,
			model: candidateModel,
		})).data;
		if (finalResponse.success || !isRetryableGrokVideoGatewayError(finalResponse)) {
			break;
		}
	}
	return { alignedResponse: finalResponse, sentModel: finalSentModel, isGrokVideoRequest };
}
