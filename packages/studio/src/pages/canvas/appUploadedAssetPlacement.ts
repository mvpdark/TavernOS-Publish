import {
	createCanvasNode,
	getDefaultNodeSize,
	getNodeCopy,
	screenToWorld,
} from "./canvasNodeActions";
import type { NodeAsset, NodeSize, UploadIntent } from "./appCanvasState";
import {
	normalizeCloudAssetUploadResult,
	type CloudAssetUploadResult,
} from "./appServerApi";
import type {
	CanvasNode,
	ComposerPreset,
	NodeStyleRef,
	NodeType,
} from "./canvas-types";

const DEFAULT_UPLOADED_ASSET_NAME = "uploaded-asset";

function normalizeOptionalUploadedAssetField(value: string | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

export function resolveUploadedAssetTargetType(
	existingNodeType: NodeType | undefined,
	parsedTargetType: NodeType,
) {
	if (
		existingNodeType === "music" &&
		(parsedTargetType === "audio" || parsedTargetType === "music")
	) {
		return "music";
	}
	if (
		existingNodeType === "audio" &&
		(parsedTargetType === "audio" || parsedTargetType === "music")
	) {
		return "audio";
	}
	return parsedTargetType;
}

export function getUploadedAssetMime(fileType: string, targetType: NodeType) {
	const normalizedFileType = fileType.trim();
	if (normalizedFileType) return normalizedFileType;
	if (targetType === "video") return "video/mp4";
	if (targetType === "audio" || targetType === "music") return "audio/mpeg";
	return "application/octet-stream";
}

export function createUploadedNodeAsset({
	file,
	targetType,
	runtimeUrl,
	cloudPath,
	storageUrl,
	storageKey,
}: {
	file: Pick<File, "name" | "type">;
	targetType: NodeType;
	runtimeUrl: string;
	cloudPath?: string;
	storageUrl?: string;
	storageKey?: string;
}): NodeAsset {
	const url = runtimeUrl.trim();
	if (!url) {
		throw new Error("Uploaded asset URL is empty.");
	}
	return {
		name: file.name.trim() || DEFAULT_UPLOADED_ASSET_NAME,
		url,
		mime: getUploadedAssetMime(file.type, targetType),
		cloudPath: normalizeOptionalUploadedAssetField(cloudPath),
		storageUrl: normalizeOptionalUploadedAssetField(storageUrl),
		storageKey: normalizeOptionalUploadedAssetField(storageKey),
	};
}

export function createUploadedCloudNodeAsset({
	file,
	targetType,
	uploaded,
}: {
	file: Pick<File, "name" | "type">;
	targetType: NodeType;
	uploaded: CloudAssetUploadResult;
}): NodeAsset {
	const normalizedUpload = normalizeCloudAssetUploadResult(
		uploaded,
		"Uploaded asset",
	);
	return createUploadedNodeAsset({
		file,
		targetType,
		runtimeUrl: normalizedUpload.url,
		cloudPath: normalizedUpload.cloudPath,
	});
}

export function isPersistentUploadedMedia(targetType: NodeType) {
	return (
		targetType === "video" ||
		targetType === "audio" ||
		targetType === "music"
	);
}

export function getReferenceUploadActiveTool(
	intentType: Exclude<UploadIntent, null>["type"],
	targetType: NodeType,
) {
	if (intentType) return intentType;
	return targetType === "image" || targetType === "editor" ? targetType : "video";
}

export function updateNodeWithUploadedAsset(
	node: CanvasNode,
	targetType: NodeType,
	composerByType: Record<NodeType, ComposerPreset>,
	asset: NodeAsset,
	fittedImageSize: NodeSize | null,
	style: NodeStyleRef,
) {
	const defaultSize = getDefaultNodeSize(targetType);
	return {
		...node,
		type: targetType,
		title: getNodeCopy(targetType).label,
		width: fittedImageSize?.width ?? defaultSize.width,
		height: fittedImageSize?.height ?? defaultSize.height,
		composer:
			node.composer && node.type === targetType
				? node.composer
				: { ...composerByType[targetType] },
		style: node.style ?? style,
		asset,
	};
}

export function createNodeForUploadedAsset({
	nodes,
	intent,
	targetType,
	composerByType,
	asset,
	fittedImageSize,
	viewSize,
	pan,
	zoom,
	style,
}: {
	nodes: CanvasNode[];
	intent: Exclude<UploadIntent, null>;
	targetType: NodeType;
	composerByType: Record<NodeType, ComposerPreset>;
	asset: NodeAsset;
	fittedImageSize: NodeSize | null;
	viewSize: { width: number; height: number } | null;
	pan: { x: number; y: number };
	zoom: number;
	style: NodeStyleRef;
}) {
	const defaultSize = getDefaultNodeSize(targetType);
	const size = {
		width: fittedImageSize?.width ?? defaultSize.width,
		height: fittedImageSize?.height ?? defaultSize.height,
	};
	const lastNode = nodes[nodes.length - 1];
	const centerWorld = screenToWorld(
		(viewSize?.width ?? 960) * 0.4,
		(viewSize?.height ?? 680) * 0.38,
		pan.x,
		pan.y,
		zoom,
	);
	const explicitPoint =
		typeof intent.worldX === "number" && typeof intent.worldY === "number"
			? {
					x: intent.worldX - size.width / 2,
					y: intent.worldY - size.height / 2,
				}
			: null;
	const point = {
		x:
			explicitPoint?.x ??
			(lastNode
				? lastNode.x + lastNode.width + 170
				: centerWorld.x - size.width / 2),
		y:
			explicitPoint?.y ??
			(lastNode ? lastNode.y + 10 : centerWorld.y - size.height / 2),
	};

	return createCanvasNode(
		targetType,
		point,
		composerByType[targetType],
		size,
		asset,
		style,
	);
}
