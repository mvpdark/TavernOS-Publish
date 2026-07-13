import type { NodeConnection, NodePort } from "./hooks/useConnectionInteractionHelpers";
import type { CanvasNode, ComposerPreset } from "./canvas-types";

function normalizeConnection(connection: NodeConnection): NodeConnection {
	return connection.from.side === "left" && connection.to.side === "right"
		? { ...connection, from: connection.to, to: connection.from }
		: connection;
}

export function createConnection(from: NodePort, to: NodePort): NodeConnection {
	const normalized =
		from.side === "left" && to.side === "right"
			? { from: to, to: from }
			: { from, to };
	return {
		id: `connection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		from: { ...normalized.from },
		to: { ...normalized.to },
	};
}

export function isSameConnection(left: NodeConnection, right: NodeConnection) {
	const normalizedLeft = normalizeConnection(left);
	const normalizedRight = normalizeConnection(right);
	return (
		normalizedLeft.from.nodeId === normalizedRight.from.nodeId &&
		normalizedLeft.from.side === normalizedRight.from.side &&
		normalizedLeft.to.nodeId === normalizedRight.to.nodeId &&
		normalizedLeft.to.side === normalizedRight.to.side
	);
}

export function findConnectedVideoNodeForText(
	textNodeId: string,
	nodes: CanvasNode[],
	connections: NodeConnection[],
) {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const linkedNodeIds = connections
		.filter(
			(connection) =>
				connection.from.nodeId === textNodeId || connection.to.nodeId === textNodeId,
		)
		.map((connection) =>
			connection.from.nodeId === textNodeId
				? connection.to.nodeId
				: connection.from.nodeId,
		);
	return (
		linkedNodeIds
			.map((nodeId) => nodeById.get(nodeId) ?? null)
			.find((node): node is CanvasNode => Boolean(node?.type === "video" && node.asset?.url)) ??
		null
	);
}

export function getTextToImagePromptTransfer(
	sourceNode: CanvasNode | null | undefined,
	targetNode: CanvasNode | null | undefined,
) {
	const textNode =
		sourceNode?.type === "text"
			? sourceNode
			: targetNode?.type === "text"
				? targetNode
				: null;
	const imageNode =
		sourceNode?.type === "image"
			? sourceNode
			: targetNode?.type === "image"
				? targetNode
				: null;
	const prompt = textNode?.composer?.prompt?.trim() ?? "";
	if (!textNode || !imageNode || !prompt) return null;
	return {
		textNodeId: textNode.id,
		imageNodeId: imageNode.id,
		prompt,
	};
}

export function applyTextPromptToImageNode(
	nodes: CanvasNode[],
	imageNodeId: string,
	prompt: string,
	fallbackComposer: ComposerPreset,
) {
	return nodes.map((node) =>
		node.id === imageNodeId
			? {
					...node,
					composer: {
						...(node.composer ?? fallbackComposer),
						prompt,
					},
				}
			: node,
	);
}
