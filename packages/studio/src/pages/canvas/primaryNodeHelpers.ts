import { getModelDisplayLabel } from "./modelOptions";
import {
	countReferenceAssets,
	createReferenceAssetWithUrl,
	type ReferenceAssetWithUrl,
} from "./referenceAssetUtils";
import type { CanvasNode, ComposerPreset, NodeType, ReferenceAsset } from "./canvas-types";

type NodeConnection = {
	id: string;
	from: { nodeId: string; side: "left" | "right" };
	to: { nodeId: string; side: "left" | "right" };
};

type ComposerByType = Record<NodeType, ComposerPreset>;

export type PrimaryReferenceAsset = ReferenceAsset & {
	id: string;
} & ReferenceAssetWithUrl;

function createPrimaryReferenceAssetFromNode(
	node: CanvasNode | undefined,
	allowedTypes: ReadonlySet<NodeType>,
) {
	if (!node?.asset || !allowedTypes.has(node.type)) return null;
	return createReferenceAssetWithUrl(node.asset, {
		id: node.id,
		name: node.asset.name ?? node.title,
		mime: node.asset.mime ?? "",
		provider: node.asset.provider,
		providerModel: node.asset.providerModel,
		providerTaskId: node.asset.providerTaskId,
		providerTaskIndex: node.asset.providerTaskIndex,
		providerTaskStatus: node.asset.providerTaskStatus,
		providerTaskMessage: node.asset.providerTaskMessage,
		providerMetadata: node.asset.providerMetadata,
	});
}

function getManualReferenceAssets(primaryNode: CanvasNode) {
	return (
		primaryNode.composer?.referenceAssets?.map((asset, index) => {
			if (!asset) return null;
			return createReferenceAssetWithUrl(asset, {
				id: `manual-${primaryNode.id}-${index}`,
				name: asset.name,
				mime: asset.mime,
				provider: asset.provider,
				providerModel: asset.providerModel,
				providerTaskId: asset.providerTaskId,
				providerTaskIndex: asset.providerTaskIndex,
				providerTaskStatus: asset.providerTaskStatus,
				providerTaskMessage: asset.providerTaskMessage,
				providerMetadata: asset.providerMetadata,
			});
		}) ?? []
	);
}

function getConnectedReferenceAssets(
	primaryNode: CanvasNode,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
	allowedTypes: ReadonlySet<NodeType>,
	includeBidirectional = false,
) {
	return connections
		.flatMap((connection) => {
			if (connection.to.nodeId === primaryNode.id) {
				const asset = createPrimaryReferenceAssetFromNode(
					nodeById.get(connection.from.nodeId),
					allowedTypes,
				);
				return asset ? [asset] : [];
			}
			if (includeBidirectional && connection.from.nodeId === primaryNode.id) {
				const asset = createPrimaryReferenceAssetFromNode(
					nodeById.get(connection.to.nodeId),
					allowedTypes,
				);
				return asset ? [asset] : [];
			}
			return [];
		});
}

function getConnectedImageReferenceAssets(
	primaryNode: CanvasNode,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
	includeBidirectional = false,
) {
	return getConnectedReferenceAssets(
		primaryNode,
		connections,
		nodeById,
		new Set<NodeType>(["image", "editor"]),
		includeBidirectional,
	);
}

function getConnectedVideoRequestReferenceAssets(
	primaryNode: CanvasNode,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
) {
	return getConnectedReferenceAssets(
		primaryNode,
		connections,
		nodeById,
		new Set<NodeType>(["image", "editor", "video", "audio", "music"]),
	);
}

function mergeReferenceAssets(
	manualReferenceAssets: Array<PrimaryReferenceAsset | null>,
	connectedReferenceAssets: PrimaryReferenceAsset[],
) {
	const mergedReferenceAssets = [...manualReferenceAssets];
	connectedReferenceAssets.forEach((asset) => {
		const emptyIndex = mergedReferenceAssets.findIndex(
			(referenceAsset) => !referenceAsset,
		);
		if (emptyIndex >= 0) {
			mergedReferenceAssets[emptyIndex] = asset;
		} else {
			mergedReferenceAssets.push(asset);
		}
	});
	return mergedReferenceAssets;
}

export function derivePrimaryNodeState(
	selectedIds: string[],
	nodes: CanvasNode[],
	activeTool: NodeType,
	composerByType: ComposerByType,
) {
	const selectedIdSet = new Set(selectedIds);
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));
	const primaryNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
	const primaryType = primaryNode?.type ?? activeTool;
	const composer = primaryNode?.composer ?? composerByType[primaryType];

	return {
		selectedIdSet,
		nodeById,
		selectedNodes,
		primaryNode,
		primaryType,
		composer,
	};
}

export function getTextNodePromptPrefix(
	node: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
) {
	if (!node || node.type !== "text") return "";
	const targetConnection = connections.find(
		(connection) => connection.from.nodeId === node.id,
	);
	if (!targetConnection) return "";
	const targetNode = nodeById.get(targetConnection.to.nodeId);
	if (!targetNode?.composer) return "";
	const targetModelLabel = getModelDisplayLabel(targetNode.composer.model);
	if (targetNode.type === "image")
		return `生成${targetModelLabel}模型的提示词：`;
	if (targetNode.type === "video")
		return `生成${targetModelLabel}视频模型的提示词：`;
	if (targetNode.type === "audio")
		return `生成${targetModelLabel}音频模型的提示词：`;
	return "";
}

export function getTextNodeImageGenerationTarget(
	node: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
) {
	if (!node || node.type !== "text") return null;
	const targetConnection = connections.find(
		(connection) => connection.from.nodeId === node.id,
	);
	if (!targetConnection) return null;
	const targetNode = nodeById.get(targetConnection.to.nodeId);
	if (
		targetNode &&
		(targetNode.type === "image" || targetNode.type === "editor") &&
		!targetNode.asset?.url
	) {
		return targetNode;
	}
	return null;
}

export function getPrimaryVideoReferenceAssets(
	primaryNode: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
): Array<PrimaryReferenceAsset | null> {
	if (!primaryNode || primaryNode.type !== "video") return [];
	return mergeReferenceAssets(
		getManualReferenceAssets(primaryNode),
		getConnectedImageReferenceAssets(primaryNode, connections, nodeById),
	);
}

export function getPrimaryVideoRequestReferenceAssets(
	primaryNode: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
): Array<PrimaryReferenceAsset | null> {
	if (!primaryNode || primaryNode.type !== "video") return [];
	return mergeReferenceAssets(
		getManualReferenceAssets(primaryNode),
		getConnectedVideoRequestReferenceAssets(primaryNode, connections, nodeById),
	);
}

export function getPrimaryReferenceAssets(
	primaryNode: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
): Array<PrimaryReferenceAsset | null> {
	if (
		!primaryNode ||
		(primaryNode.type !== "video" &&
			primaryNode.type !== "image" &&
			primaryNode.type !== "editor")
	) {
		return [];
	}
	return mergeReferenceAssets(
		getManualReferenceAssets(primaryNode),
		getConnectedImageReferenceAssets(
			primaryNode,
			connections,
			nodeById,
			primaryNode.type === "image" || primaryNode.type === "editor",
		),
	);
}

export function countVideoReferenceAssets(
	node: CanvasNode,
	nodeById: Map<string, CanvasNode>,
	connections: NodeConnection[],
) {
	return countReferenceAssets(getPrimaryVideoReferenceAssets(node, connections, nodeById));
}

export function getShotSourceNode(
	node: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
) {
	if (!node || (node.type !== "image" && node.type !== "video")) return null;
	const sourceConnection = connections.find(
		(connection) =>
			connection.to.nodeId === node.id && nodeById.get(connection.from.nodeId)?.type === "shot",
	);
	if (!sourceConnection) return null;
	const sourceNode = nodeById.get(sourceConnection.from.nodeId);
	return sourceNode?.type === "shot" ? sourceNode : null;
}

export function getShotLinkedNodes(
	node: CanvasNode | null,
	connections: NodeConnection[],
	nodeById: Map<string, CanvasNode>,
) {
	if (!node || node.type !== "shot") {
		return { characters: [] as CanvasNode[], scenes: [] as CanvasNode[] };
	}
	const linkedNodes = connections
		.filter((connection) =>
			connection.from.nodeId === node.id || connection.to.nodeId === node.id,
		)
		.map((connection) => {
			const linkedId =
				connection.from.nodeId === node.id
					? connection.to.nodeId
					: connection.from.nodeId;
			return nodeById.get(linkedId) ?? null;
		})
		.filter((linked): linked is CanvasNode => Boolean(linked));

	return {
		characters: linkedNodes.filter((linked) => linked.type === "character"),
		scenes: linkedNodes.filter((linked) => linked.type === "scene"),
	};
}
