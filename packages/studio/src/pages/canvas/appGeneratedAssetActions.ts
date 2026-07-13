import { clamp } from "./appAspectRatioHelpers";
import {
	getBaseNameWithoutExtension,
} from "./appAssetRuntime";
import {
	getGeneratedAssetCategory,
	getImageNodeSize,
	measureImageFile,
	resolveUploadNodeType,
} from "./appCanvasMediaHelpers";
import {
	importGeneratedAssetToCloudDrive,
	uploadGeneratedAssetToCloudDrive,
} from "./appServerApi";
import {
	createCanvasNode,
	getDefaultNodeSize,
} from "./canvasNodeActions";
import type { CropBox } from "./components/CanvasNodeView";
import { getImageGridSplitRects } from "./imageSplitGeometry";
import { getModelDisplayLabel } from "./modelOptions";
import { getReferenceAssetUrl } from "./referenceAssetUtils";
import type { AssetRef, CanvasNode, ComposerPreset, NodeStyleRef, NodeType } from "./canvas-types";
import { ensureFileExtension } from "./canvasAssetActions";

export type NodeSize = { width: number; height: number };

export type GeneratedAssetPayload = {
	assetUrl?: string;
	assetMime?: string;
	assetName?: string;
	provider?: string;
	providerModel?: string;
	taskId?: string;
	taskStatus?: string;
	taskMessage?: string;
	metadata?: unknown;
};

export type GeneratedAssetNodeUpdate = {
	asset: AssetRef;
	generatedImageNodeSize: NodeSize | null;
	splitNodes: CanvasNode[];
	persistFailed: boolean;
	splitFailed: boolean;
};

export type ReadableGeneratedAsset<T extends Pick<AssetRef, "url"> = AssetRef> = T & {
	url: string;
};
type GeneratedAssetUrlSource =
	| Pick<AssetRef, "url">
	| ReadableGeneratedAsset<Pick<AssetRef, "url">>
	| string;

export function attachGeneratedProviderContext(
	asset: AssetRef,
	payload: GeneratedAssetPayload,
): AssetRef {
	return {
		...asset,
		...(payload.provider ? { provider: payload.provider } : {}),
		...(payload.providerModel ? { providerModel: payload.providerModel } : {}),
		...(payload.taskId ? { providerTaskId: payload.taskId } : {}),
		...(payload.taskStatus ? { providerTaskStatus: payload.taskStatus } : {}),
		...(payload.taskMessage ? { providerTaskMessage: payload.taskMessage } : {}),
		...(payload.metadata !== undefined ? { providerMetadata: payload.metadata } : {}),
	};
}

function shouldPersistGeneratedAsset(type: NodeType) {
	return (
		type === "image" ||
		type === "editor" ||
		type === "video" ||
		type === "audio" ||
		type === "music"
	);
}

export function requireGeneratedAssetUrl(
	asset: GeneratedAssetUrlSource | null | undefined,
	errorLabel: string,
) {
	const url = resolveGeneratedAssetUrl(asset);
	if (!url) throw new Error(`${errorLabel} asset URL is empty.`);
	return url;
}

export function resolveGeneratedAssetUrl(
	asset: GeneratedAssetUrlSource | null | undefined,
) {
	const url =
		typeof asset === "string"
			? asset.trim()
			: asset
				? getReferenceAssetUrl(asset)
				: "";
	return url || undefined;
}

export function resolveReadableGeneratedAsset<T extends Pick<AssetRef, "url">>(
	asset: T | null | undefined,
	errorLabel: string,
): ReadableGeneratedAsset<T> {
	const url = requireGeneratedAssetUrl(asset, errorLabel);
	if (!asset) throw new Error(`${errorLabel} asset URL is empty.`);
	return {
		...asset,
		url,
	} as ReadableGeneratedAsset<T>;
}

export function isReadableGeneratedAsset(
	asset: GeneratedAssetUrlSource | null | undefined,
): asset is ReadableGeneratedAsset<Pick<AssetRef, "url">> {
	if (!asset || typeof asset !== "object" || typeof asset.url !== "string") {
		return false;
	}
	return resolveGeneratedAssetUrl(asset) === asset.url;
}

export async function fetchGeneratedAssetBlob(
	asset: GeneratedAssetUrlSource | null | undefined,
	errorLabel: string,
) {
	const url = isReadableGeneratedAsset(asset)
		? asset.url
		: requireGeneratedAssetUrl(asset, errorLabel);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${errorLabel}: ${response.status}`);
	}
	return response.blob();
}

export async function buildGeneratedAssetNodeUpdate({
	payload,
	requestType,
	requestComposer,
	gatewayModel,
	requestNode,
	imageComposerFallback,
	splitNodeStyle,
}: {
	payload: GeneratedAssetPayload & { assetUrl: string };
	requestType: NodeType;
	requestComposer: ComposerPreset;
	gatewayModel: string;
	requestNode: CanvasNode;
	imageComposerFallback: ComposerPreset;
	splitNodeStyle: NodeStyleRef;
}): Promise<GeneratedAssetNodeUpdate> {
	let persistFailed = false;
	let splitFailed = false;
	const sourceUrl = requireGeneratedAssetUrl(payload.assetUrl, "generated asset");
	let nextAsset = attachGeneratedProviderContext(
		{
			name: payload.assetName ?? `${requestType}-result`,
			url: sourceUrl,
			mime: payload.assetMime ?? "application/octet-stream",
		},
		payload,
	);

	if (shouldPersistGeneratedAsset(requestType)) {
		try {
			nextAsset = attachGeneratedProviderContext(
				await persistGeneratedAsset(sourceUrl, payload, requestType),
				payload,
			);
		} catch (error) {
			persistFailed = true;
			console.warn("Failed to persist generated asset to CloudDrive.", error);
		}
	}

	const generatedImageNodeSize =
		requestType === "image" || requestType === "editor"
			? await measureImageFile(nextAsset.url)
			: null;
	let splitNodes: CanvasNode[] = [];

	if (shouldAutoSplitMidjourneyGrid(requestType, requestComposer, gatewayModel)) {
		try {
			const splitAssets = await splitImageAssetIntoQuadrants(nextAsset);
			const splitSize = getDefaultNodeSize("image");
			const splitComposer = {
				...(requestNode.composer ?? imageComposerFallback),
				model: "Midjourney",
			};
			splitNodes = splitAssets.map((asset, index) =>
				createCanvasNode(
					"image",
					{
						x: requestNode.x + (index % 2) * (splitSize.width + 22),
						y:
							requestNode.y +
							requestNode.height +
							34 +
							Math.floor(index / 2) * (splitSize.height + 22),
					},
					splitComposer,
					splitSize,
					{
						...asset,
						provider: nextAsset.provider,
						providerModel: nextAsset.providerModel,
						providerTaskId: nextAsset.providerTaskId,
						providerTaskIndex: index + 1,
						providerTaskStatus: nextAsset.providerTaskStatus,
						providerTaskMessage: nextAsset.providerTaskMessage,
						providerMetadata: nextAsset.providerMetadata,
					},
					splitNodeStyle,
				),
			);
		} catch (error) {
			splitFailed = true;
			console.warn("Failed to split Midjourney grid.", error);
		}
	}

	return {
		asset: nextAsset,
		generatedImageNodeSize,
		splitNodes,
		persistFailed,
		splitFailed,
	};
}

export async function persistGeneratedAsset(
	assetUrl: string,
	payload: { assetName?: string; assetMime?: string },
	fallbackType: NodeType,
): Promise<AssetRef> {
	const fallbackMime = payload.assetMime ?? "application/octet-stream";
	const fallbackName = ensureFileExtension(
		payload.assetName ?? `${fallbackType}-result`,
		fallbackMime,
	);
	const initialCategory = getGeneratedAssetCategory(fallbackType);
	const sourceAsset = resolveReadableGeneratedAsset({ url: assetUrl }, "generated asset");
	try {
		const blob = await fetchGeneratedAssetBlob(sourceAsset, "generated asset");
		const mime = blob.type || fallbackMime;
		const file = new File([blob], ensureFileExtension(fallbackName, mime), {
			type: mime,
		});
		const detectedType = await resolveUploadNodeType(
			file,
			initialCategory === "image" ? "image" : initialCategory,
		);
		const category = getGeneratedAssetCategory(detectedType);
		const uploaded = await uploadGeneratedAssetToCloudDrive(file, category);
		return {
			name: file.name,
			url: uploaded.url,
			mime: mime || fallbackMime,
			cloudPath: uploaded.cloudPath,
		};
	} catch {
		const imported = await importGeneratedAssetToCloudDrive(
			sourceAsset,
			fallbackName,
			initialCategory,
			fallbackMime,
		);
		return {
			name: fallbackName,
			url: imported.url,
			mime: fallbackMime,
			cloudPath: imported.cloudPath,
		};
	}
}

export function canvasToPngBlob(canvas: HTMLCanvasElement) {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("Failed to encode split image"));
			}
		}, "image/png");
	});
}

export async function splitImageAssetIntoQuadrants(asset: AssetRef) {
	const readableAsset = resolveReadableGeneratedAsset(asset, "image for split");
	const sourceBlob = await fetchGeneratedAssetBlob(readableAsset, "image for split");
	const bitmap = await createImageBitmap(sourceBlob);
	const baseName = getBaseNameWithoutExtension(readableAsset.name || "midjourney-grid");
	const splitRects = getImageGridSplitRects(bitmap.width, bitmap.height, 2, 2);
	const splitAssets: AssetRef[] = [];

	try {
		for (const [rectIndex, rect] of splitRects.entries()) {
			const canvas = document.createElement("canvas");
			canvas.width = rect.width;
			canvas.height = rect.height;
			const context = canvas.getContext("2d");
			if (!context) {
				throw new Error("Canvas 2D context is not available");
			}
			context.drawImage(
				bitmap,
				rect.x,
				rect.y,
				rect.width,
				rect.height,
				0,
				0,
				rect.width,
				rect.height,
			);
			const blob = await canvasToPngBlob(canvas);
			const file = new File([blob], `${baseName}-split-${rectIndex + 1}.png`, {
				type: "image/png",
			});
			const uploaded = await uploadGeneratedAssetToCloudDrive(file, "image");
			splitAssets.push({
				name: file.name,
				url: uploaded.url,
				mime: "image/png",
				cloudPath: uploaded.cloudPath,
			});
		}
	} finally {
		bitmap.close();
	}

	return splitAssets;
}

export async function cropImageAsset(
	asset: AssetRef,
	cropBox: CropBox,
	displaySize: NodeSize,
): Promise<{ asset: AssetRef; size: NodeSize }> {
	const readableAsset = resolveReadableGeneratedAsset(asset, "image for crop");
	const sourceBlob = await fetchGeneratedAssetBlob(readableAsset, "image for crop");
	const bitmap = await createImageBitmap(sourceBlob);
	let canvas: HTMLCanvasElement;
	try {
		const displayWidth = Math.max(displaySize.width, 1);
		const displayHeight = Math.max(displaySize.height, 1);
		const imageScale = Math.max(
			displayWidth / bitmap.width,
			displayHeight / bitmap.height,
		);
		const renderedWidth = bitmap.width * imageScale;
		const renderedHeight = bitmap.height * imageScale;
		const overflowX = Math.max(0, renderedWidth - displayWidth) / 2;
		const overflowY = Math.max(0, renderedHeight - displayHeight) / 2;
		const cropLeftPx = (cropBox.left / 100) * displayWidth;
		const cropTopPx = (cropBox.top / 100) * displayHeight;
		const cropWidthPx = (cropBox.width / 100) * displayWidth;
		const cropHeightPx = (cropBox.height / 100) * displayHeight;
		const sourceX = clamp((cropLeftPx + overflowX) / imageScale, 0, bitmap.width - 1);
		const sourceY = clamp((cropTopPx + overflowY) / imageScale, 0, bitmap.height - 1);
		const sourceWidth = clamp(cropWidthPx / imageScale, 1, bitmap.width - sourceX);
		const sourceHeight = clamp(cropHeightPx / imageScale, 1, bitmap.height - sourceY);
		canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(sourceWidth));
		canvas.height = Math.max(1, Math.round(sourceHeight));
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Failed to create crop canvas context.");
		}
		context.drawImage(
			bitmap,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			0,
			0,
			canvas.width,
			canvas.height,
		);
	} finally {
		bitmap.close();
	}
	const blob = await canvasToPngBlob(canvas);
	const baseName = getBaseNameWithoutExtension(readableAsset.name || "image");
	const file = new File([blob], `${baseName}-裁剪.png`, { type: "image/png" });
	const uploaded = await uploadGeneratedAssetToCloudDrive(file, "image");
	return {
		asset: {
			name: file.name,
			url: uploaded.url,
			mime: "image/png",
			cloudPath: uploaded.cloudPath,
		},
		size: getImageNodeSize(canvas.width, canvas.height),
	};
}

export function shouldAutoSplitMidjourneyGrid(
	type: NodeType,
	composer: ComposerPreset,
	gatewayModel: string,
) {
	if (type !== "image") return false;
	if (composer.midjourneyAction && composer.midjourneyAction !== "imagine") return false;
	const labels = [
		composer.model,
		gatewayModel,
		getModelDisplayLabel(composer.model),
		getModelDisplayLabel(gatewayModel),
	]
		.join(" ")
		.toLowerCase();
	return (
		labels.includes("midjourney") ||
		labels.includes("mj_imagine") ||
		labels.includes("midjourney-v7")
	);
}

export function collectBlobUrls(nodes: CanvasNode[]) {
	const urls = new Set<string>();
	nodes.forEach((node) => {
		const assetUrl = node.asset ? getReferenceAssetUrl(node.asset) : "";
		if (assetUrl.startsWith("blob:")) {
			urls.add(assetUrl);
		}
		node.composer?.referenceAssets?.forEach((asset) => {
			if (!asset) return;
			const referenceUrl = getReferenceAssetUrl(asset);
			if (referenceUrl.startsWith("blob:")) {
				urls.add(referenceUrl);
			}
		});
	});
	return urls;
}

