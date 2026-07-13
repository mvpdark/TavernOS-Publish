import type { ReferenceAssetWithUrl } from "./referenceAssetUtils";
import type { ComposerPreset } from "./canvas-types";

const Z_IMAGE_SIZES: Record<string, Record<string, string>> = {
	"16:9": {
		"720P": "1280x720",
		"1080P": "1920x1080",
	},
	"9:16": {
		"720P": "720x1280",
		"1080P": "1080x1920",
	},
	"1:1": {
		"720P": "1024x1024",
		"1080P": "1280x1280",
	},
	"4:3": {
		"720P": "1024x768",
		"1080P": "1440x1080",
	},
	"3:4": {
		"720P": "768x1024",
		"1080P": "1080x1440",
	},
};

function compactModelName(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isZImageTurboModel(value: string) {
	return compactModelName(value).includes("zimageturbo");
}

function resolveZImageSize(composer: ComposerPreset) {
	const aspectRatio = composer.aspectRatio || "16:9";
	const resolution = composer.resolution || "720P";
	return Z_IMAGE_SIZES[aspectRatio]?.[resolution] ?? "1280x720";
}

export function resolveZImageTurboRequest({
	model,
	composer,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
}) {
	if (!isZImageTurboModel(model) && !isZImageTurboModel(composer.model)) {
		return null;
	}
	return {
		model: "z-image-turbo(yunwu)",
		options: {
			z_image_turbo_route: true,
			size: resolveZImageSize(composer),
			n: 1,
			watermark: composer.watermark === "true",
			prompt_extend: composer.promptExtend !== "false",
		},
	};
}
