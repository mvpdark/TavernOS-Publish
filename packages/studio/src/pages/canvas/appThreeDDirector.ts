import type { KakaImageGenerationRequest } from "./kakaApi";
import { createCanvasNode } from "./canvasNodeActions";
import type { CanvasNodeSize } from "./canvasNodeSizing";
import type { AssetRef, CanvasNode, ComposerPreset } from "./canvas-types";

export const THREE_D_DIRECTOR_LABEL = "3D导演台";
export const THREE_D_DIRECTOR_PROMPT = "将此图转化为720°全景图";
export const THREE_D_DIRECTOR_MODEL = "gpt-image-2-all(yunwu)";

export type ThreeDDirectorViewerMode = "character-orbit" | "panorama-drag";

export type ThreeDDirectorMetadata = {
	kind: "three-d-director";
	viewer: ThreeDDirectorViewerMode;
	sourceWidth: number;
	sourceHeight: number;
	sourceAspectRatio: string;
	prompt: typeof THREE_D_DIRECTOR_PROMPT;
	model: typeof THREE_D_DIRECTOR_MODEL;
	createdAt: number;
};

export type ThreeDDirectorProviderContext = Pick<
	AssetRef,
	"provider" | "providerModel" | "providerMetadata"
>;

export function normalizeThreeDDirectorSourceImage(sourceImage: string) {
	return sourceImage.trim();
}

export function resolveThreeDDirectorAssetUrl(
	asset?: Pick<AssetRef, "url"> | null,
) {
	if (typeof asset?.url !== "string") return null;
	return normalizeThreeDDirectorSourceImage(asset.url) || null;
}

export function normalizeThreeDDirectorAssetName(
	sourceName: string,
	fallback = "3d-director",
) {
	return sourceName.trim() || fallback;
}

export function formatThreeDDirectorAspectRatio(width: number, height: number) {
	const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
	const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
	const gcd = getGreatestCommonDivisor(Math.round(safeWidth), Math.round(safeHeight));
	return `${Math.round(safeWidth) / gcd}:${Math.round(safeHeight) / gcd}`;
}

export function createThreeDDirectorMetadata({
	sourceWidth,
	sourceHeight,
	now = Date.now(),
}: {
	sourceWidth: number;
	sourceHeight: number;
	now?: number;
}): ThreeDDirectorMetadata {
	return {
		kind: "three-d-director",
		viewer: "panorama-drag",
		sourceWidth,
		sourceHeight,
		sourceAspectRatio: formatThreeDDirectorAspectRatio(sourceWidth, sourceHeight),
		prompt: THREE_D_DIRECTOR_PROMPT,
		model: THREE_D_DIRECTOR_MODEL,
		createdAt: now,
	};
}

export function isThreeDDirectorMetadata(value: unknown): value is ThreeDDirectorMetadata {
	return Boolean(
		value &&
			typeof value === "object" &&
			(value as { kind?: unknown }).kind === "three-d-director" &&
			((value as { viewer?: unknown }).viewer === "character-orbit" ||
				(value as { viewer?: unknown }).viewer === "panorama-drag"),
	);
}

export function getThreeDDirectorViewerMode(
	metadata?: unknown,
): ThreeDDirectorViewerMode {
	if (isThreeDDirectorMetadata(metadata)) {
		return metadata.viewer;
	}
	return "panorama-drag";
}

export function isThreeDDirectorAsset(asset?: Pick<AssetRef, "provider" | "providerMetadata"> | null) {
	return Boolean(
		asset &&
			(asset.provider === "three-d-director" ||
				isThreeDDirectorMetadata(asset.providerMetadata)),
	);
}

export function createThreeDDirectorProviderContext(
	metadata: ThreeDDirectorMetadata,
): ThreeDDirectorProviderContext {
	return {
		provider: "three-d-director",
		providerModel: THREE_D_DIRECTOR_MODEL,
		providerMetadata: metadata,
	};
}

export function createThreeDDirectorResultAsset({
	sourceName,
	resultUrl,
	metadata,
}: {
	sourceName: string;
	resultUrl: string;
	metadata: ThreeDDirectorMetadata;
}): AssetRef {
	const normalizedSourceName = normalizeThreeDDirectorAssetName(sourceName);
	const normalizedResultUrl = normalizeThreeDDirectorSourceImage(resultUrl);
	return {
		name: `${normalizedSourceName}-720全景导演台.png`,
		url: normalizedResultUrl,
		mime: "image/png",
		...createThreeDDirectorProviderContext(metadata),
	};
}

export function createThreeDDirectorComposer(
	baseComposer: ComposerPreset,
): ComposerPreset {
	return {
		...baseComposer,
		model: "GPT Image 2",
		version: "高级",
		prompt: THREE_D_DIRECTOR_PROMPT,
	};
}

export function createThreeDDirectorCanvasNode({
	sourceNode,
	baseComposer,
	directorNodeSize,
	resultAsset,
	offsetX = 34,
}: {
	sourceNode: Pick<
		CanvasNode,
		"x" | "y" | "width" | "height" | "composer" | "style"
	>;
	baseComposer: ComposerPreset;
	directorNodeSize?: CanvasNodeSize;
	resultAsset: AssetRef;
	offsetX?: number;
}) {
	const generatedNode = createCanvasNode(
		"image",
		{ x: sourceNode.x + sourceNode.width + offsetX, y: sourceNode.y },
		createThreeDDirectorComposer(sourceNode.composer ?? baseComposer),
		directorNodeSize ?? {
			width: sourceNode.width,
			height: sourceNode.height,
		},
		resultAsset,
		sourceNode.style,
	);
	generatedNode.title = THREE_D_DIRECTOR_LABEL;
	return generatedNode;
}

export function buildThreeDDirectorImageRequest(sourceImage: string): KakaImageGenerationRequest {
	const normalizedSourceImage = normalizeThreeDDirectorSourceImage(sourceImage);
	const sourceImages = normalizedSourceImage ? [normalizedSourceImage] : [];
	return {
		model: THREE_D_DIRECTOR_MODEL,
		prompt: THREE_D_DIRECTOR_PROMPT,
		image: normalizedSourceImage,
		image_url: normalizedSourceImage,
		image_size: "auto",
		options: {
			gpt_image_route: true,
			gpt_image_mode: "高级",
			gpt_image_has_references: true,
			size: "auto",
			quality: "auto",
			output_format: "png",
			format: "png",
			background: "auto",
			n: 1,
			prompt: THREE_D_DIRECTOR_PROMPT,
			image: normalizedSourceImage,
			image_url: normalizedSourceImage,
			reference_images: sourceImages,
			images: sourceImages,
		},
	};
}

function getGreatestCommonDivisor(left: number, right: number): number {
	let a = Math.abs(left);
	let b = Math.abs(right);
	while (b) {
		const next = a % b;
		a = b;
		b = next;
	}
	return a || 1;
}
