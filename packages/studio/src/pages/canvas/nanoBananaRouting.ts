import { getReferenceAssetUrlsFromReadyAssets, type ReferenceAssetWithUrl } from "./referenceAssetUtils";
import type { ComposerPreset } from "./canvas-types";

function compactModelName(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isNanoBananaModel(value: string) {
	const compact = compactModelName(value);
	return (
		compact.includes("nanobanana") ||
		compact.includes("gemini31flashimagepreview") ||
		compact.includes("gemini3proimagepreview")
	);
}

function resolveNanoBananaUpstreamModel(version?: string) {
	return version === "高级"
		? "gemini-3-pro-image-preview(yunwu)"
		: "gemini-3.1-flash-image-preview(yunwu)";
}

function resolveExplicitNanoBananaMode(...values: Array<string | undefined>) {
	const joined = values
		.filter((value): value is string => Boolean(value))
		.join(" ")
		.toLowerCase();
	if (
		joined.includes("gemini-3-pro-image-preview") ||
		joined.includes("nano-banana-pro") ||
		joined.includes("nano banana pro")
	) {
		return "高级";
	}
	if (
		joined.includes("gemini-3.1-flash-image-preview") ||
		joined.includes("nano-banana-2") ||
		joined.includes("nano banana 2")
	) {
		return "标准";
	}
	return undefined;
}

export function resolveNanoBananaImageRequest({
	model,
	composer,
	referenceAssets,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
}) {
	if (!isNanoBananaModel(model) && !isNanoBananaModel(composer.model)) {
		return null;
	}
	const referenceImages = getReferenceAssetUrlsFromReadyAssets(referenceAssets);
	const mode = resolveExplicitNanoBananaMode(model, composer.model) ?? (composer.version === "高级" ? "高级" : "标准");
	return {
		model: resolveNanoBananaUpstreamModel(mode),
		options: {
			nano_banana_mode: mode,
			resolution: composer.resolution || (mode === "高级" ? "1K" : "0.5K"),
			aspect_ratio: composer.aspectRatio,
			output_format: composer.outputFormat,
			reference_images: referenceImages,
		},
	};
}
