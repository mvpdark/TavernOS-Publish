import { getModelDisplayLabel } from "./modelOptions";
import { getUniqueReferenceAssetUrlsFromReadyAssets, type ReferenceAssetWithUrl } from "./referenceAssetUtils";
import type { ComposerPreset } from "./canvas-types";

function isGrokImagineVideoModel(model: string) {
	return getModelDisplayLabel(model).trim() === "Grok Imagine Video";
}

function resolveGrokModel() {
	return "grok-videos(yunwu)";
}

function resolveGrokDuration(composer: ComposerPreset) {
	if (composer.videoTier?.includes("10")) return 10;
	const parsed = Number.parseInt(composer.duration || "", 10);
	return Number.isFinite(parsed) ? parsed : 10;
}

export function resolveGrokImagineVideoRequest({
	model,
	composer,
	referenceAssets,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
}) {
	if (!isGrokImagineVideoModel(model) && !isGrokImagineVideoModel(composer.model)) {
		return null;
	}
	const referenceUrls = getUniqueReferenceAssetUrlsFromReadyAssets(referenceAssets);
	return {
		model: resolveGrokModel(),
		options: {
			grok_imagine_video_route: true,
			video_generation_mode: "firstFrame",
			video_tier: composer.videoTier || "10秒",
			aspect_ratio: composer.aspectRatio || "3:2",
			size: composer.resolution || "720P",
			resolution: composer.resolution || "720P",
			duration: resolveGrokDuration(composer),
			images: referenceUrls,
			reference_images: referenceUrls,
		},
	};
}
