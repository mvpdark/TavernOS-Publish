import { getUniqueReferenceAssetUrlsFromReadyAssets, type ReferenceAssetWithUrl } from "./referenceAssetUtils";
import type { ComposerPreset } from "./canvas-types";

function compactModelName(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isGptImageModel(value: string) {
	const compact = compactModelName(value);
	return compact.includes("gptimage");
}

function resolveGptImageUpstreamModel(version?: string, _hasReferenceImages = false) {
	const isAdvanced = isGptImageAdvancedMode(version);
	// GPT Image uses the *-all upstream model first.  The backend fallback
	// then retries the same family without "-all" if upstream rejects/fails.
	return isAdvanced ? "gpt-image-2-all(yunwu)" : "gpt-image-1.5-all(yunwu)";
}

function isGptImageAdvancedMode(value?: string) {
	const text = (value ?? "").trim().toLowerCase();
	return (
		text === "高级" ||
		text === "advanced" ||
		text === "advance" ||
		text === "pro" ||
		text === "2" ||
		text === "v2" ||
		text.includes("高级") ||
		text.includes("gpt image 2") ||
		text.includes("gpt-image-2")
	);
}

function isGptImageStandardMode(value?: string) {
	const text = (value ?? "").trim().toLowerCase();
	return (
		text === "标准" ||
		text === "standard" ||
		text === "normal" ||
		text === "default" ||
		text === "1.5" ||
		text === "v1.5" ||
		text.includes("标准") ||
		text.includes("gpt image 1.5") ||
		text.includes("gpt-image-1.5")
	);
}

function resolveExplicitGptImageVersion(...values: Array<string | undefined>) {
	const joined = values
		.filter((value): value is string => Boolean(value))
		.join(" ")
		.toLowerCase();
	if (/\bgpt-image-2\b/.test(joined) || joined.includes("gpt image 2")) return "高级";
	if (/\bgpt-image-1\.5\b/.test(joined) || joined.includes("gpt image 1.5")) return "标准";
	return undefined;
}

function resolveGptImageSize(composer: ComposerPreset) {
	const aspectRatio = (composer.aspectRatio || "auto").trim();
	const resolution = (composer.resolution || "auto").trim();
	if (aspectRatio === "auto" || resolution === "auto") return "auto";

	// Keep the panel's ratio/resolution intent. The upstream OpenAI-compatible
	// image proxy accepts WxH strings; do not fall back from 9:16 1K to 4K.
	const sizeMap: Record<string, Record<string, string>> = {
		"1:1": {
			"1K": "1024x1024",
			"1.5K": "1024x1024",
			"2K": "2048x2048",
			"4K": "4096x4096",
		},
		"3:2": {
			"1K": "1536x1024",
			"1.5K": "1536x1024",
			"2K": "2048x1366",
			"4K": "3072x2048",
		},
		"2:3": {
			"1K": "1024x1536",
			"1.5K": "1024x1536",
			"2K": "1366x2048",
			"4K": "2048x3072",
		},
		"16:9": {
			"1K": "1536x1024",
			"1.5K": "1536x1024",
			"2K": "2048x1152",
			"4K": "3840x2160",
		},
		"9:16": {
			"1K": "1024x1536",
			"1.5K": "1024x1536",
			"2K": "1152x2048",
			"4K": "2160x3840",
		},
	};

	const ratioMap = sizeMap[aspectRatio];
	if (ratioMap && ratioMap[resolution]) {
		return ratioMap[resolution];
	}

	// Fallback: use first available resolution for this ratio, or auto
	if (ratioMap) {
		const first = Object.keys(ratioMap)[0];
		return ratioMap[first];
	}

	return "auto";
}

export function resolveGptImageRequest({
	model,
	composer,
	referenceAssets,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
}) {
	if (!isGptImageModel(model) && !isGptImageModel(composer.model)) {
		return null;
	}
	// The UI mode is the source of truth.  The stored model for the unified
	// "GPT Image" option may still be the default gpt-image-1.5(yunwu), so do
	// not let that stale raw model override a user-selected "高级".
	const uiMode = isGptImageAdvancedMode(composer.version)
		? "高级"
		: isGptImageStandardMode(composer.version)
			? "标准"
			: undefined;
	const mode = uiMode ?? resolveExplicitGptImageVersion(model, composer.model) ?? "标准";
	const referenceImages = getUniqueReferenceAssetUrlsFromReadyAssets(referenceAssets);
	const hasReferenceImages = referenceImages.length > 0;
	const outputFormat = composer.outputFormat || "png";
	const quality = composer.quality || "auto";
	const background = composer.background || "auto";
	return {
		model: resolveGptImageUpstreamModel(mode, hasReferenceImages),
		options: {
			gpt_image_route: true,
			gpt_image_mode: mode,
			gpt_image_has_references: hasReferenceImages,
			size: resolveGptImageSize(composer),
			quality,
			output_format: outputFormat,
			format: outputFormat,
			background,
			n: composer.quantity ? Number.parseInt(composer.quantity, 10) : 1,
			reference_images: referenceImages,
			image: referenceImages,
		},
	};
}
