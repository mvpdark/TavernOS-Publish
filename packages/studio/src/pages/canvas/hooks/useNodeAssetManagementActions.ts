import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
	getBaseNameWithoutExtension,
} from "../appAssetRuntime";
import {
	fetchLocalMediaAssetBlob,
} from "../appLocalMediaActions";
import {
	ASSET_LIBRARY_SPACE_NAME,
	buildRenamedNodeAsset,
	buildSavedLibraryAsset,
	createNodeAssetLibraryFile,
	getNodeAssetLibraryCategory,
	isAssetSavedToLibrary,
	requireReadableNodeAssetForLibrary,
	resolveAssetLibraryCollectionName,
	resolveNodeAssetLibraryCloudPath,
} from "../appNodeAssetLibraryActions";
import {
	renameAssetInCloudDrive,
	uploadAssetToLibraryCloudDrive,
} from "../appServerApi";
import { cloneComposer } from "../canvasNodeActions";
import { reconcileAutoNodeStyles } from "../connectionInteractionHelpers";
import type { CanvasNode, StyleLibraryState } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type UseNodeAssetManagementActionsArgs = {
	nodeById: Map<string, CanvasNode>;
	renamingNodeId: string | null;
	renameDraft: string;
	currentCanvasProjectTitle?: string;
	currentWorkshopProjectTitle?: string;
	styleLibrary: StyleLibraryState;
	copiedNodeRef: MutableRefObject<CanvasNode | null>;
	setRenamingNodeId: Dispatch<SetStateAction<string | null>>;
	setRenameDraft: Dispatch<SetStateAction<string>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	pushRuntimeNotice: PushRuntimeNotice;
	pushUndoSnapshot: () => void;
	dismissOverlays: () => void;
};

export function useNodeAssetManagementActions({
	nodeById,
	renamingNodeId,
	renameDraft,
	currentCanvasProjectTitle,
	currentWorkshopProjectTitle,
	styleLibrary,
	copiedNodeRef,
	setRenamingNodeId,
	setRenameDraft,
	setNodes,
	setConnections,
	setSelectedIds,
	pushRuntimeNotice,
	pushUndoSnapshot,
	dismissOverlays,
}: UseNodeAssetManagementActionsArgs) {
	function openRenameEditor(nodeId: string) {
		const assetName = nodeById.get(nodeId)?.asset?.name;
		if (!assetName) return;
		setRenamingNodeId(nodeId);
		setRenameDraft(getBaseNameWithoutExtension(assetName));
	}

	async function saveNodeAssetToLibrary(nodeId: string) {
		const node = nodeById.get(nodeId);
		const asset = node?.asset;
		if (!node || !asset) return;
		if (isAssetSavedToLibrary(asset)) {
			pushRuntimeNotice(
				"资产已经保存到 115 资产库。",
				"info",
				`asset-library-existing-${nodeId}`,
			);
			dismissOverlays();
			return;
		}

		try {
			const readableAsset = requireReadableNodeAssetForLibrary(asset);
			const blob = await fetchLocalMediaAssetBlob(readableAsset, "资产");
			const file = createNodeAssetLibraryFile(readableAsset, blob);
			const assetCollectionName = resolveAssetLibraryCollectionName(
				currentCanvasProjectTitle,
				currentWorkshopProjectTitle,
			);
			const assetCategory = getNodeAssetLibraryCategory(node.type, file);
			const uploaded = await uploadAssetToLibraryCloudDrive(
				file,
				ASSET_LIBRARY_SPACE_NAME,
				assetCollectionName,
				assetCategory,
			);
			pushUndoSnapshot();
			setNodes((current) =>
				current.map((entry) =>
					entry.id === nodeId && entry.asset
						? {
							...entry,
							asset: buildSavedLibraryAsset(entry.asset, file, uploaded),
						}
						: entry,
				),
			);
			pushRuntimeNotice(
				`资产已保存到 115 资产库：${assetCollectionName} / ${assetCategory}`,
				"info",
				`asset-library-saved-${nodeId}`,
			);
		} catch (error) {
			console.error("Failed to save asset to library.", error);
			pushRuntimeNotice(
				error instanceof Error ? error.message : "资产保存到素材库失败，请稍后重试。",
				"warning",
				"asset-library-save-failed",
			);
		} finally {
			dismissOverlays();
		}
	}

	async function submitRenameNodeAsset() {
		if (!renamingNodeId) return;
		const node = nodeById.get(renamingNodeId);
		const asset = node?.asset;
		if (!node || !asset?.name) return;
		const requestedBaseName = getBaseNameWithoutExtension(renameDraft.trim());
		const currentBaseName = getBaseNameWithoutExtension(asset.name);
		if (!requestedBaseName || requestedBaseName === currentBaseName) {
			dismissOverlays();
			return;
		}

		try {
			let nextAsset = buildRenamedNodeAsset(asset, requestedBaseName);
			const assetCloudPath = resolveNodeAssetLibraryCloudPath(asset);
			if (assetCloudPath) {
				const renamed = await renameAssetInCloudDrive(
					assetCloudPath,
					requestedBaseName,
				);
				nextAsset = buildRenamedNodeAsset(asset, requestedBaseName, renamed);
			}
			pushUndoSnapshot();
			setNodes((current) =>
				current.map((entry) =>
					entry.id === renamingNodeId && entry.asset
						? { ...entry, asset: { ...entry.asset, ...nextAsset } }
						: entry,
				),
			);
			pushRuntimeNotice(
				`资产已重命名为 ${nextAsset.name}`,
				"info",
				`asset-renamed-${renamingNodeId}`,
			);
		} catch (error) {
			console.error("Failed to rename asset.", error);
			pushRuntimeNotice(
				error instanceof Error ? error.message : "资产重命名失败，请稍后重试。",
				"warning",
				"asset-rename-failed",
			);
		}
		dismissOverlays();
	}

	function deleteNode(nodeId: string) {
		pushUndoSnapshot();
		setConnections((current) => {
			const nextConnections = current.filter(
				(connection) =>
					connection.from.nodeId !== nodeId && connection.to.nodeId !== nodeId,
			);
			setNodes((nodesCurrent) =>
				reconcileAutoNodeStyles(
					nodesCurrent.filter((node) => node.id !== nodeId),
					nextConnections,
					styleLibrary,
				),
			);
			return nextConnections;
		});
		setSelectedIds((current) => current.filter((id) => id !== nodeId));
		dismissOverlays();
	}

	async function copyNodeToClipboard(nodeId: string) {
		const node = nodeById.get(nodeId);
		if (!node) return;
		copiedNodeRef.current = {
			...node,
			composer: node.composer ? cloneComposer(node.composer) : undefined,
			asset: node.asset ? { ...node.asset } : undefined,
			style: node.style ? { ...node.style } : undefined,
		};
		try {
			await navigator.clipboard.writeText(
				JSON.stringify({
					type: node.type,
					title: node.title,
					assetName: node.asset?.name ?? null,
				}),
			);
		} catch (error) {
			void error;
		}
		dismissOverlays();
	}

	return {
		openRenameEditor,
		saveNodeAssetToLibrary,
		submitRenameNodeAsset,
		deleteNode,
		copyNodeToClipboard,
	};
}
