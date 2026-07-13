import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef } from "react";

type WorkspaceSnapshot<TNode, TConnection> = {
	nodes: TNode[];
	connections: TConnection[];
};

type UseWorkspaceSnapshotsArgs<TNode, TConnection> = {
	nodes: TNode[];
	connections: TConnection[];
	setNodes: Dispatch<SetStateAction<TNode[]>>;
	setConnections: Dispatch<SetStateAction<TConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	dismissOverlays: () => void;
	cloneNodes: (snapshot: TNode[]) => TNode[];
	cloneConnections: (snapshot: TConnection[]) => TConnection[];
	cloneWorkspaceSnapshot: (
		snapshot: WorkspaceSnapshot<TNode, TConnection>,
	) => WorkspaceSnapshot<TNode, TConnection>;
};

export function useWorkspaceSnapshots<TNode, TConnection>({
	nodes,
	connections,
	setNodes,
	setConnections,
	setSelectedIds,
	dismissOverlays,
	cloneNodes,
	cloneConnections,
	cloneWorkspaceSnapshot,
}: UseWorkspaceSnapshotsArgs<TNode, TConnection>) {
	const undoStackRef = useRef<WorkspaceSnapshot<TNode, TConnection>[]>([]);
	const redoStackRef = useRef<WorkspaceSnapshot<TNode, TConnection>[]>([]);

	const pushUndoSnapshot = useCallback(
		(snapshot: WorkspaceSnapshot<TNode, TConnection> = { nodes, connections }) => {
			undoStackRef.current = [
				...undoStackRef.current.slice(-39),
				cloneWorkspaceSnapshot(snapshot),
			];
			redoStackRef.current = [];
		},
		[cloneWorkspaceSnapshot, connections, nodes],
	);

	const restoreWorkspace = useCallback(
		(snapshot: WorkspaceSnapshot<TNode, TConnection>) => {
			setNodes(cloneNodes(snapshot.nodes));
			setConnections(cloneConnections(snapshot.connections));
			setSelectedIds([]);
			dismissOverlays();
		},
		[
			cloneConnections,
			cloneNodes,
			dismissOverlays,
			setConnections,
			setNodes,
			setSelectedIds,
		],
	);

	const undoNodes = useCallback(() => {
		const previous = undoStackRef.current.pop();
		if (!previous) return;
		redoStackRef.current = [
			...redoStackRef.current.slice(-39),
			cloneWorkspaceSnapshot({ nodes, connections }),
		];
		restoreWorkspace(previous);
	}, [cloneWorkspaceSnapshot, connections, nodes, restoreWorkspace]);

	const redoNodes = useCallback(() => {
		const next = redoStackRef.current.pop();
		if (!next) return;
		undoStackRef.current = [
			...undoStackRef.current.slice(-39),
			cloneWorkspaceSnapshot({ nodes, connections }),
		];
		restoreWorkspace(next);
	}, [cloneWorkspaceSnapshot, connections, nodes, restoreWorkspace]);

	const resetWorkspaceHistory = useCallback(() => {
		undoStackRef.current = [];
		redoStackRef.current = [];
	}, []);

	return {
		pushUndoSnapshot,
		restoreWorkspace,
		undoNodes,
		redoNodes,
		resetWorkspaceHistory,
	};
}
