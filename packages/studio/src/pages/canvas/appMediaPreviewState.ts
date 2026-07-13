import type {
	ImagePreviewState,
	VideoPreviewState,
} from "./appCanvasState";
import { isThreeDDirectorAsset } from "./appThreeDDirector";
import { getReferenceAssetUrl } from "./referenceAssetUtils";
import type { CanvasNode } from "./canvas-types";

const DEFAULT_IMAGE_PREVIEW_NAME = "\u56fe\u7247\u9884\u89c8";
const DEFAULT_INLINE_PREVIEW_NAME = "\u5a92\u4f53\u9884\u89c8";
const DEFAULT_MEDIA_ASSET_NAME = "\u5a92\u4f53\u7d20\u6750";

export type MediaInlinePreviewAsset = {
	url: string;
	name: string;
	isThreeDDirector: boolean;
	providerMetadata: NonNullable<CanvasNode["asset"]>["providerMetadata"];
};

export type CanvasNodeAssetPreviewState = {
	inlineAsset: MediaInlinePreviewAsset | null;
	assetDisplayName: string;
	isImageAsset: boolean;
	isVideoAsset: boolean;
	isAudioAsset: boolean;
	hasFullBleedAsset: boolean;
	shouldShowAssetName: boolean;
	isThreeDDirectorImage: boolean;
};

export function resolveMediaPreviewAssetName(
	node: Pick<CanvasNode, "asset" | "title">,
	fallbackName = DEFAULT_MEDIA_ASSET_NAME,
) {
	return node.asset?.name.trim() || node.title.trim() || fallbackName;
}

export function resolveMediaPreviewAssetUrl(
	asset?: Pick<NonNullable<CanvasNode["asset"]>, "url"> | null,
) {
	if (!asset) return null;
	return getReferenceAssetUrl(asset) || null;
}

function resolveImagePreviewName(node: CanvasNode) {
	return resolveMediaPreviewAssetName(node, DEFAULT_IMAGE_PREVIEW_NAME);
}

function resolveInlinePreviewName(node: CanvasNode) {
	return resolveMediaPreviewAssetName(node, DEFAULT_INLINE_PREVIEW_NAME);
}

export function buildMediaInlinePreviewAsset(node: CanvasNode): MediaInlinePreviewAsset | null {
	const asset = node.asset;
	const assetUrl = resolveMediaPreviewAssetUrl(asset);
	if (!asset || !assetUrl) return null;
	return {
		url: assetUrl,
		name: resolveInlinePreviewName(node),
		isThreeDDirector: isThreeDDirectorAsset(asset),
		providerMetadata: asset.providerMetadata,
	};
}

export function buildCanvasNodeAssetPreviewState(node: CanvasNode): CanvasNodeAssetPreviewState {
	const inlineAsset = buildMediaInlinePreviewAsset(node);
	const assetDisplayName = inlineAsset?.name ?? resolveMediaPreviewAssetName(node);
	const hasInlineAsset = Boolean(inlineAsset);
	const isImageAsset = node.type === "image" && hasInlineAsset;
	const isVideoAsset = node.type === "video" && hasInlineAsset;
	const isAudioAsset = (node.type === "audio" || node.type === "music") && hasInlineAsset;
	const shouldShowAssetName = Boolean(inlineAsset?.name) && !(
		node.type === "image" ||
		node.type === "video" ||
		node.type === "editor"
	);
	return {
		inlineAsset,
		assetDisplayName,
		isImageAsset,
		isVideoAsset,
		isAudioAsset,
		hasFullBleedAsset: isImageAsset || isVideoAsset || isAudioAsset,
		shouldShowAssetName,
		isThreeDDirectorImage: node.type === "image" && Boolean(inlineAsset?.isThreeDDirector),
	};
}

export function buildVideoPreviewState(node: CanvasNode): VideoPreviewState {
	const assetUrl = resolveMediaPreviewAssetUrl(node.asset);
	if (!assetUrl) return null;
	return {
		nodeId: node.id,
		url: assetUrl,
	};
}

export function buildImagePreviewState(node: CanvasNode): ImagePreviewState {
	const asset = node.asset;
	const assetUrl = resolveMediaPreviewAssetUrl(asset);
	if (!assetUrl) return null;
	return {
		nodeId: node.id,
		url: assetUrl,
		name: resolveImagePreviewName(node),
		isThreeDDirector: isThreeDDirectorAsset(asset),
		providerMetadata: asset?.providerMetadata,
	};
}
