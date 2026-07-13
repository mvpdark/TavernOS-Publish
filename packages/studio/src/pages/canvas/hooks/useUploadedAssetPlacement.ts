import type { Dispatch, RefObject, SetStateAction } from "react";

import {
	applyReferenceAssetToNodeComposer,
	canNodeAcceptReferenceAsset,
} from "../appReferenceAssetUpload";
import {
	createStoredAssetKey,
	readFileAsDataUrl,
	writeStoredAsset,
} from "../appAssetRuntime";
import {
	measureImageFile,
	resolveUploadNodeType,
} from "../appCanvasMediaHelpers";
import type {
	NodeAsset,
	NodeSize,
	UploadIntent,
} from "../appCanvasState";
import { uploadAssetToCloudDrive } from "../appServerApi";
import {
	createUploadedCloudNodeAsset,
	createUploadedNodeAsset,
	createNodeForUploadedAsset,
	getReferenceUploadActiveTool,
	getUploadedAssetMime,
	isPersistentUploadedMedia,
	resolveUploadedAssetTargetType,
	updateNodeWithUploadedAsset,
} from "../appUploadedAssetPlacement";
import {
	getUploadAssetCategory,
	isFileCompatibleWithUploadIntent,
} from "../canvasAssetActions";
import { createStyleRef } from "../styleLibrary";
import type {
	CanvasNode,
	ComposerPreset,
	NodeType,
	StyleLibraryState,
} from "../canvas-types";
import type { RuntimeNotice } from "./useRuntimeNotices";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type UseUploadedAssetPlacementArgs = {
	canvasRef: RefObject<HTMLDivElement | null>;
	nodes: CanvasNode[];
	nodeById: Map<string, CanvasNode>;
	composerByType: Record<NodeType, ComposerPreset>;
	canvasProjectId: string | null;
	canvasProjectTitle?: string;
	globalStylePresetId: string;
	styleLibrary: StyleLibraryState;
	pan: { x: number; y: number };
	zoom: number;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setActiveTool: Dispatch<SetStateAction<NodeType>>;
	pushRuntimeNotice: PushRuntimeNotice;
	pushUndoSnapshot: () => void;
	dismissOverlays: () => void;
};

export function useUploadedAssetPlacement({
	canvasRef,
	nodes,
	nodeById,
	composerByType,
	canvasProjectId,
	canvasProjectTitle,
	globalStylePresetId,
	styleLibrary,
	pan,
	zoom,
	setNodes,
	setSelectedIds,
	setActiveTool,
	pushRuntimeNotice,
	pushUndoSnapshot,
	dismissOverlays,
}: UseUploadedAssetPlacementArgs) {
	async function applyUploadedFile(
		file: File,
		intent: Exclude<UploadIntent, null>,
	) {
		if (!isFileCompatibleWithUploadIntent(file, intent)) return;
		const existingNodeType = intent.nodeId
			? nodeById.get(intent.nodeId)?.type
			: undefined;
		const parsedTargetType = await resolveUploadNodeType(
			file,
			intent.type ?? "image",
		);
		const targetType = resolveUploadedAssetTargetType(
			existingNodeType,
			parsedTargetType,
		);
		const mime = getUploadedAssetMime(file.type, targetType);
		const isPersistentMedia = isPersistentUploadedMedia(targetType);
		const localFallbackStorageUrlPromise = isPersistentMedia
			? Promise.resolve<string | undefined>(undefined)
			: readFileAsDataUrl(file);
		let asset: NodeAsset;
		let storageUrl: string | undefined;
		let storageKey: string | undefined;

		try {
			const cloudAsset = await uploadAssetToCloudDrive(
				file,
				canvasProjectId,
				canvasProjectTitle ?? canvasProjectId ?? "canvas",
				getUploadAssetCategory(targetType, file),
			);
			asset = createUploadedCloudNodeAsset({
				file,
				targetType,
				uploaded: cloudAsset,
			});
		} catch (error) {
			console.warn("CloudDrive 上传失败，已回退到本地浏览器存储。", error);
			pushRuntimeNotice(
				"CloudDrive 上传失败，已临时回退到本地浏览器存储。",
				"warning",
				"clouddrive-upload-failed",
			);
			storageKey = isPersistentMedia ? createStoredAssetKey(file) : undefined;
			if (storageKey) {
				await writeStoredAsset(storageKey, file);
			}
			storageUrl = isPersistentMedia
				? undefined
				: await localFallbackStorageUrlPromise;
			const runtimeUrl = isPersistentMedia
				? URL.createObjectURL(file)
				: (storageUrl ?? "");
			asset = createUploadedNodeAsset({
				file,
				targetType,
				runtimeUrl,
				storageUrl,
				storageKey,
			});
		}

		let fittedImageSize: NodeSize | null = null;
		if (targetType === "image" && mime.startsWith("image/")) {
			const imageMeasureUrl = asset.cloudPath ? URL.createObjectURL(file) : asset.url;
			fittedImageSize = await measureImageFile(imageMeasureUrl);
			if (asset.cloudPath) URL.revokeObjectURL(imageMeasureUrl);
		}

		pushUndoSnapshot();

		if (intent.nodeId && typeof intent.referenceSlot === "number") {
			const slotIndex = intent.referenceSlot;
			setNodes((current) =>
				current.map((node) => {
					if (node.id !== intent.nodeId || !canNodeAcceptReferenceAsset(node)) {
						return node;
					}
					return applyReferenceAssetToNodeComposer(
						node,
						composerByType,
						slotIndex,
						asset,
					);
				}),
			);
			setSelectedIds([intent.nodeId]);
			setActiveTool(getReferenceUploadActiveTool(intent.type, targetType));
			return;
		}

		const style = createStyleRef(
			globalStylePresetId || undefined,
			"manual",
			styleLibrary,
		);
		if (intent.nodeId) {
			setNodes((current) =>
				current.map((node) =>
					node.id === intent.nodeId
						? updateNodeWithUploadedAsset(
								node,
								targetType,
								composerByType,
								asset,
								fittedImageSize,
								style,
							)
						: node,
				),
			);
			setSelectedIds([intent.nodeId]);
			setActiveTool(targetType);
			return;
		}

		const viewRect = canvasRef.current?.getBoundingClientRect();
		const node = createNodeForUploadedAsset({
			nodes,
			intent,
			targetType,
			composerByType,
			asset,
			fittedImageSize,
			viewSize: viewRect
				? { width: viewRect.width, height: viewRect.height }
				: null,
			pan,
			zoom,
			style,
		});
		setNodes((current) => [...current, node]);
		setSelectedIds([node.id]);
		setActiveTool(targetType);
		dismissOverlays();
	}

	return { applyUploadedFile };
}
