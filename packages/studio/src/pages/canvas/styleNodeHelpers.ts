import { syncStyleRef } from "./styleLibrary";
import { getConnectedNodeIds } from "./stylePropagation";
import type { CanvasNode, StyleLibraryState, StyleSource } from "./canvas-types";

type NodeConnectionLike = {
	id: string;
	from: { nodeId: string; side: "left" | "right" };
	to: { nodeId: string; side: "left" | "right" };
};

export function getStyleReferenceCounts(nodes: CanvasNode[]) {
	const counts = {
		categories: {} as Record<string, number>,
		presets: {} as Record<string, number>,
	};
	for (const node of nodes) {
		if (!node.style) continue;
		counts.categories[node.style.categoryId] =
			(counts.categories[node.style.categoryId] ?? 0) + 1;
		counts.presets[node.style.presetId] =
			(counts.presets[node.style.presetId] ?? 0) + 1;
	}
	return counts;
}

export function applyStyleToConnectedChain({
	nodes,
	connections,
	startNodeId,
	presetId,
	source,
	styleLibrary,
}: {
	nodes: CanvasNode[];
	connections: NodeConnectionLike[];
	startNodeId: string;
	presetId: string;
	source: StyleSource;
	styleLibrary: StyleLibraryState;
}) {
	const connectedIds = getConnectedNodeIds(startNodeId, connections);
	return nodes.map((node) =>
		connectedIds.has(node.id)
			? { ...node, style: syncStyleRef(styleLibrary, presetId, source) }
			: node,
	);
}
