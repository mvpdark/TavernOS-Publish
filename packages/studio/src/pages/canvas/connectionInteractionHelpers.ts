import type {
	NodeConnection,
	NodePort,
} from "./hooks/useConnectionInteractionHelpers";
import { createStyleRef, syncStyleRef } from "./styleLibrary";
import {
	getConnectedNodeIds,
	getDominantStyleForNodeIds,
	getPreferredInheritedStyle,
} from "./stylePropagation";
import type { CanvasNode, StyleLibraryState } from "./canvas-types";

type SetConnectionState = (
	value:
		| NodeConnection[]
		| ((current: NodeConnection[]) => NodeConnection[]),
) => void;

type SetNodeState = (
	value: CanvasNode[] | ((current: CanvasNode[]) => CanvasNode[]),
) => void;

type CompletePendingConnectionArgs = {
	pendingConnection: NodePort;
	target: NodePort;
	connections: NodeConnection[];
	nodes: CanvasNode[];
	styleLibrary: StyleLibraryState;
	pushUndoSnapshot: () => void;
	setConnections: SetConnectionState;
	setNodes: SetNodeState;
	createConnection: (from: NodePort, to: NodePort) => NodeConnection;
	isSameConnection: (
		left: NodeConnection,
		right: NodeConnection,
	) => boolean;
};

export function completePendingConnectionWithStylePropagation({
	pendingConnection,
	target,
	connections,
	nodes,
	styleLibrary,
	pushUndoSnapshot,
	setConnections,
	setNodes,
	createConnection,
	isSameConnection,
}: CompletePendingConnectionArgs) {
	const sourcePort = {
		nodeId: pendingConnection.nodeId,
		side: pendingConnection.side,
	};
	const nextConnection = createConnection(sourcePort, target);
	const connectionExists = connections.some((connection) =>
		isSameConnection(connection, nextConnection),
	);
	if (!connectionExists) {
		pushUndoSnapshot();
	}
	const nextConnections = [...connections, nextConnection];
	const sourceComponentIds = getConnectedNodeIds(sourcePort.nodeId, connections);
	const targetComponentIds = getConnectedNodeIds(target.nodeId, connections);
	const sourceDominantStyle = getDominantStyleForNodeIds(
		sourceComponentIds,
		nodes,
	);
	const targetDominantStyle = getDominantStyleForNodeIds(
		targetComponentIds,
		nodes,
	);
	const winningStyle =
		sourceDominantStyle?.source === "manual"
			? sourceDominantStyle
			: targetDominantStyle?.source === "manual"
				? targetDominantStyle
				: (sourceDominantStyle ??
					targetDominantStyle ??
					createStyleRef(undefined, "auto", styleLibrary));

	setConnections((current) => {
		const exists = current.some((connection) =>
			isSameConnection(connection, nextConnection),
		);
		return exists ? current : [...current, nextConnection];
	});

	if (!connectionExists) {
		const connectedIds = getConnectedNodeIds(target.nodeId, nextConnections);
		setNodes((current) =>
			current.map((node) =>
				connectedIds.has(node.id)
					? {
							...node,
							style: syncStyleRef(
								styleLibrary,
								winningStyle.presetId,
								winningStyle.source,
							),
						}
					: node,
			),
		);
	}
}

export function reconcileAutoNodeStyles(
	nodes: CanvasNode[],
	connections: NodeConnection[],
	styleLibrary: StyleLibraryState,
) {
	let changed = false;
	const nextNodes = nodes.map((node) => {
		if (!node.style || node.style.source !== "auto") return node;
		const inheritedStyle = getPreferredInheritedStyle(
			node.id,
			nodes,
			connections,
		);
		const nextStyle = inheritedStyle
			? syncStyleRef(styleLibrary, inheritedStyle.presetId, "auto")
			: createStyleRef(undefined, "auto", styleLibrary);
		if (
			node.style.presetId === nextStyle.presetId &&
			node.style.categoryId === nextStyle.categoryId &&
			node.style.source === nextStyle.source
		) {
			return node;
		}
		changed = true;
		return { ...node, style: nextStyle };
	});
	return changed ? nextNodes : nodes;
}
