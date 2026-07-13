import {
	type KakaApiConfig,
	type KakaImageGenerationRequest,
	requestKakaImageGeneration,
} from "./kakaApi";
import { isGptImageModel, resolveGptImageRequest } from "./gptImageRouting";
import {
	isKolorsRequest,
	isQwenImageEdit2509Request,
} from "./imageProviderRouting";
import { resolveIdeogramImageRequest } from "./ideogramRouting";
import {
	getReferenceAssetUrlsFromReadyAssets,
	type ReferenceAssetWithUrl,
} from "./referenceAssetUtils";
import {
	normalizeImageReferenceAssetsForRequest,
} from "./kakaReferenceAssets";
import type { KakaSendRouteContext } from "./kakaSendRouting";
import { resolveMidjourneyImageRequest } from "./midjourneyRouting";
import { resolveNanoBananaImageRequest } from "./nanoBananaRouting";
import type { ComposerPreset } from "./canvas-types";
import { resolveZImageTurboRequest } from "./zImageRouting";

export async function buildKakaImageGenerationRequest({
	model,
	composer,
	referenceAssets,
	routeContext,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
	routeContext: Pick<
		KakaSendRouteContext,
		"midjourneyAction" | "midjourneyTaskId" | "midjourneyTaskSource" | "nextPrompt"
	>;
}) {
	// Only explicit/manual or connected image references should be sent upstream.
	// Do not silently reuse the current node's own asset as a reference; that
	// turns normal text-to-image requests into image-to-image and can create
	// unexpected follow-up images behind an existing/blank image node.
	const imageReferenceAssets = referenceAssets;
	const modelRouteRequest = resolveZImageTurboRequest({
		model,
		composer,
		referenceAssets: imageReferenceAssets,
	}) ?? resolveIdeogramImageRequest({
		model,
		composer,
	}) ?? resolveMidjourneyImageRequest({
		model,
		composer,
		referenceAssets: imageReferenceAssets,
	}) ?? resolveGptImageRequest({
		model,
		composer,
		referenceAssets: imageReferenceAssets,
	}) ?? resolveNanoBananaImageRequest({
		model,
		composer,
		referenceAssets: imageReferenceAssets,
	});
	const imageOptions = {
		version: composer.version,
		image_size: composer.imageSize,
		aspect_ratio: composer.aspectRatio,
		ratio: composer.aspectRatio,
		resolution: composer.resolution,
		output_format: composer.outputFormat,
		format: composer.outputFormat,
		quality: composer.quality,
		midjourney_action: composer.midjourneyAction,
		taskId: routeContext.midjourneyTaskId,
		task_id: routeContext.midjourneyTaskId,
		index: routeContext.midjourneyTaskSource?.providerTaskIndex,
		task_index: routeContext.midjourneyTaskSource?.providerTaskIndex,
		action: routeContext.midjourneyAction,
		customId: undefined,
		provider_metadata: routeContext.midjourneyTaskSource?.providerMetadata,
		speed_mode: composer.speedMode,
		background: composer.background,
		watermark: composer.watermark === "true",
		prompt_extend: composer.promptExtend === "true",
		prompt_optimizer: composer.promptExtend === "true",
		aigc_watermark: composer.watermark === "true",
		n: composer.quantity ? Number.parseInt(composer.quantity, 10) : undefined,
		batch_size: isKolorsRequest(model, composer)
			? (composer.quantity ? Number.parseInt(composer.quantity, 10) : undefined)
			: undefined,
		seed: composer.seed ? Number.parseInt(composer.seed, 10) : undefined,
		width: composer.width ? Number.parseInt(composer.width, 10) : undefined,
		height: composer.height ? Number.parseInt(composer.height, 10) : undefined,
		num_inference_steps: composer.imageInferenceSteps
			? Number.parseInt(composer.imageInferenceSteps, 10)
			: undefined,
		steps: composer.imageInferenceSteps
			? Number.parseInt(composer.imageInferenceSteps, 10)
			: undefined,
		guidance_scale: composer.imageGuidanceScale
			? Number.parseFloat(composer.imageGuidanceScale)
			: undefined,
		enable_sequential: composer.enableSequential,
		thinking_mode: composer.thinkingMode,
		reference_images: getReferenceAssetUrlsFromReadyAssets(imageReferenceAssets),
	};
	const sentModel = modelRouteRequest?.model ?? model;
	const shouldNormalizeImageReferences =
		isQwenImageEdit2509Request(sentModel, composer) ||
		isGptImageModel(sentModel);
	const requestReferenceAssets = shouldNormalizeImageReferences
		? await normalizeImageReferenceAssetsForRequest(imageReferenceAssets)
		: imageReferenceAssets;
	const requestReferenceUrls = getReferenceAssetUrlsFromReadyAssets(requestReferenceAssets);
	const routedOptions = modelRouteRequest?.options as
		| Record<string, unknown>
		| undefined;
	const routedSize = routedOptions?.size;
	const requestBody: KakaImageGenerationRequest = {
		model: sentModel,
		prompt: routeContext.nextPrompt,
		image_url: requestReferenceUrls[0],
		image: requestReferenceUrls[0],
		image_size: typeof routedSize === "string" ? routedSize : composer.imageSize,
		options: {
			...imageOptions,
			...(routedOptions ?? {}),
			reference_images: requestReferenceUrls,
			images: requestReferenceUrls,
			image: requestReferenceUrls[0],
			image2: requestReferenceUrls[1],
			image3: requestReferenceUrls[2],
		},
	};
	return { requestBody, sentModel };
}

export async function requestImageLikeGeneration({
	config,
	model,
	composer,
	referenceAssets,
	routeContext,
}: {
	config: KakaApiConfig;
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
	routeContext: Pick<
		KakaSendRouteContext,
		"midjourneyAction" | "midjourneyTaskId" | "midjourneyTaskSource" | "nextPrompt"
	>;
}) {
	const { requestBody, sentModel } = await buildKakaImageGenerationRequest({
		model,
		composer,
		referenceAssets,
		routeContext,
	});
	const alignedResponse = (await requestKakaImageGeneration(config, requestBody)).data;
	return { alignedResponse, sentModel };
}
