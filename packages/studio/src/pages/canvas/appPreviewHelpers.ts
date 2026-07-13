import type { CanvasNode, NodeType } from "./canvas-types";

export type PreviewFilter = "all" | "image" | "video" | "audio" | "music";

export const PREVIEW_FILTERS: Array<{ id: PreviewFilter; label: string }> = [
	{ id: "all", label: "全部" },
	{ id: "image", label: "图片" },
	{ id: "video", label: "视频" },
	{ id: "audio", label: "音频" },
	{ id: "music", label: "音乐" },
];

type PreviewConnection = {
	from: { nodeId: string };
	to: { nodeId: string };
};

export function isPreviewMediaNodeType(type: NodeType) {
	return (
		type === "image" ||
		type === "video" ||
		type === "audio" ||
		type === "music" ||
		type === "editor"
	);
}

export function doesNodeMatchPreviewFilter(
	node: CanvasNode,
	filter: PreviewFilter,
) {
	if (!isPreviewMediaNodeType(node.type)) return false;
	if (filter === "all") return true;
	if (filter === "image") return node.type === "image" || node.type === "editor";
	return node.type === filter;
}

export function collectPreviewReachableNodeIds(
	nodes: Array<Pick<CanvasNode, "id">>,
	connections: PreviewConnection[],
	seedIds: string[],
) {
	if (!seedIds.length) return new Set<string>();
	const adjacency = new Map<string, Set<string>>();
	nodes.forEach((node) => {
		adjacency.set(node.id, new Set());
	});
	connections.forEach((connection) => {
		adjacency.get(connection.from.nodeId)?.add(connection.to.nodeId);
		adjacency.get(connection.to.nodeId)?.add(connection.from.nodeId);
	});
	const visited = new Set<string>(seedIds);
	const queue = [...seedIds];
	while (queue.length) {
		const currentId = queue.shift();
		if (!currentId) continue;
		for (const neighborId of adjacency.get(currentId) ?? []) {
			if (visited.has(neighborId)) continue;
			visited.add(neighborId);
			queue.push(neighborId);
		}
	}
	return visited;
}

export function buildCanvasPreviewState<C extends PreviewConnection>({
	previewModeActive,
	nodes,
	connections,
	nodeById,
	previewFilter,
}: {
	previewModeActive: boolean;
	nodes: CanvasNode[];
	connections: C[];
	nodeById: Map<string, CanvasNode>;
	previewFilter: PreviewFilter;
}) {
	const matchingMediaNodes = previewModeActive
		? nodes.filter((node) => doesNodeMatchPreviewFilter(node, previewFilter))
		: [];
	const filledResults = matchingMediaNodes.filter((node) => Boolean(node.asset));
	const focusMediaNodes =
		previewModeActive && filledResults.length ? filledResults : matchingMediaNodes;
	const filterCounts = Object.fromEntries(
		PREVIEW_FILTERS.map((filter) => [
			filter.id,
			nodes.filter(
				(node) => doesNodeMatchPreviewFilter(node, filter.id) && Boolean(node.asset),
			).length,
		]),
	) as Record<PreviewFilter, number>;
	const visibleNodeIds = (() => {
		if (!previewModeActive) return new Set<string>();
		const reachableNodeIds = collectPreviewReachableNodeIds(
			nodes,
			connections,
			focusMediaNodes.map((node) => node.id),
		);
		const nextVisibleNodeIds = new Set<string>();
		reachableNodeIds.forEach((nodeId) => {
			const node = nodeById.get(nodeId);
			if (!node) return;
			if (
				isPreviewMediaNodeType(node.type) &&
				!doesNodeMatchPreviewFilter(node, previewFilter)
			) {
				return;
			}
			nextVisibleNodeIds.add(nodeId);
		});
		return nextVisibleNodeIds;
	})();
	const focusMediaIdSet = new Set(focusMediaNodes.map((node) => node.id));
	return {
		matchingMediaNodes,
		focusMediaNodes,
		filterCounts,
		visibleNodeIds,
		focusMediaIdSet,
		visibleNodes: previewModeActive
			? nodes.filter((node) => visibleNodeIds.has(node.id))
			: nodes,
		visibleConnections: previewModeActive
			? connections.filter(
					(connection) =>
						visibleNodeIds.has(connection.from.nodeId) &&
						visibleNodeIds.has(connection.to.nodeId),
				)
			: connections,
	};
}
