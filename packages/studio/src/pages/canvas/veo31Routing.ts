import { getUniqueReferenceAssetUrlsFromReadyAssets, type ReferenceAssetWithUrl } from "./referenceAssetUtils";
import type { ComposerPreset } from "./canvas-types";

type Veo31Quality = "lite" | "fast" | "standard" | "pro";
type Veo31Resolution = "1K" | "4K";

const VEO31_MODEL_MATRIX: Record<Veo31Quality, Record<Veo31Resolution, string>> = {
	lite: {
		"1K": "veo_3_1-lite",
		"4K": "veo_3_1-lite-4K",
	},
	fast: {
		"1K": "veo3.1-fast",
		"4K": "veo3.1-4k",
	},
	standard: {
		"1K": "veo3.1",
		"4K": "veo3.1-4k",
	},
	pro: {
		"1K": "veo3.1-pro",
		"4K": "veo3.1-pro-4k",
	},
};

function compactModelName(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isVeo31Model(value: string) {
	const compact = compactModelName(value);
	return compact.includes("veo31") || compact.includes("veo31yunwu");
}

function resolveQuality(quality?: string, fallbackTier?: string): Veo31Quality {
	const value = (quality || fallbackTier || "").trim().toLowerCase();
	if (value.includes("轻") || value.includes("lite")) return "lite";
	if (value.includes("快") || value.includes("fast")) return "fast";
	if (value.includes("高") || value.includes("pro")) return "pro";
	return "standard";
}

function resolveResolution(resolution?: string): Veo31Resolution {
	return (resolution ?? "").trim().toLowerCase() === "4k" ? "4K" : "1K";
}

function resolveRequestedMode(composer: ComposerPreset, referenceCount: number) {
	if (referenceCount > 2) return "multiReference";
	if (referenceCount === 2) return "firstLastFrame";
	if (referenceCount === 1) return "firstFrame";
	return composer.videoGenerationMode || "text";
}

function resolveConcreteModel(composer: ComposerPreset, referenceCount: number) {
	const quality = resolveQuality(composer.videoQuality, composer.videoTier);
	const resolution = resolveResolution(composer.resolution);
	const mode = resolveRequestedMode(composer, referenceCount);

	if (mode === "multiReference") {
		if (resolution === "4K") return "veo3.1-components-4k";
		if (quality === "fast" || quality === "lite") return "veo3.1-fast-components";
		return "veo3.1-components";
	}

	return VEO31_MODEL_MATRIX[quality][resolution];
}

export function resolveVeo31VideoRequest({
	model,
	composer,
	referenceAssets,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
}) {
	if (!isVeo31Model(model) && !isVeo31Model(composer.model)) {
		return null;
	}
	const referenceUrls = getUniqueReferenceAssetUrlsFromReadyAssets(referenceAssets);
	const requestedMode = resolveRequestedMode(composer, referenceUrls.length);
	const concreteModel = resolveConcreteModel(composer, referenceUrls.length);
	const enableUpsample = resolveResolution(composer.resolution) === "4K";
	return {
		model: `${concreteModel}(yunwu)`,
		options: {
			veo31_route: true,
			video_generation_mode: requestedMode,
			video_quality: composer.videoQuality || composer.videoTier || "标准",
			aspect_ratio: composer.aspectRatio === "9:16" ? "9:16" : "16:9",
			resolution: composer.resolution || "1K",
			duration: composer.duration || "8s",
			reference_images: referenceUrls,
			images: referenceUrls,
			first_image_url: referenceUrls[0],
			last_image_url: requestedMode === "firstLastFrame" ? referenceUrls[1] : undefined,
			enhance_prompt: true,
			enable_upsample: enableUpsample,
		},
	};
}
