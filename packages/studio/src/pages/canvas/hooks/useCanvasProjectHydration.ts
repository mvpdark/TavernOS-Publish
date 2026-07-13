import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from "react";

import {
	buildCanvasSnapshotCacheForLiveWorkspace,
	buildCanvasSnapshotCacheWithClonedSnapshot,
	readCanvasViewportStorage,
	readCanvasWorkspaceStorage,
	resolveCanvasViewportForProject,
	resolveCanvasWorkspaceSnapshotForHydration,
} from "../appProjectCreationPlanning";
import { areRouteProjectIdsEqual } from "../appRouting";
import { loadCanvasFromServer } from "../appServerApi";
import {
	cloneInitialNodes,
	hydrateWorkspaceSnapshot,
	type CanvasWorkspaceSnapshot,
} from "../appWorkspaceDefaults";
import type { CanvasNode } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

export type UseCanvasProjectHydrationConfig = {
	canvasProjectId: string | null;
	canvasSnapshotsRef: MutableRefObject<Record<string, CanvasWorkspaceSnapshot>>;
	previousCanvasProjectIdRef: MutableRefObject<string | null>;
	latestNodesRef: MutableRefObject<CanvasNode[]>;
	latestConnectionsRef: MutableRefObject<NodeConnection[]>;
	resetWorkspaceHistory: () => void;
	dismissOverlays: () => void;
	setHydratedCanvasProjectId: Dispatch<SetStateAction<string | null>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
	setZoom: Dispatch<SetStateAction<number>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
};

function snapshotCurrentWorkspace({
	canvasSnapshotsRef,
	latestNodesRef,
	latestConnectionsRef,
	projectId,
}: Pick<
	UseCanvasProjectHydrationConfig,
	"canvasSnapshotsRef" | "latestNodesRef" | "latestConnectionsRef"
> & { projectId: string }) {
	canvasSnapshotsRef.current = buildCanvasSnapshotCacheForLiveWorkspace({
		snapshotCache: canvasSnapshotsRef.current,
		projectId,
		nodes: latestNodesRef.current,
		connections: latestConnectionsRef.current,
	});
}

export function useCanvasProjectHydration({
	canvasProjectId,
	canvasSnapshotsRef,
	previousCanvasProjectIdRef,
	latestNodesRef,
	latestConnectionsRef,
	resetWorkspaceHistory,
	dismissOverlays,
	setHydratedCanvasProjectId,
	setSelectedIds,
	setPan,
	setZoom,
	setNodes,
	setConnections,
}: UseCanvasProjectHydrationConfig) {
	useEffect(() => {
		let cancelled = false;
		resetWorkspaceHistory();
		if (!canvasProjectId) {
			setHydratedCanvasProjectId(null);
			const previousId = previousCanvasProjectIdRef.current;
			if (previousId) {
				snapshotCurrentWorkspace({
					canvasSnapshotsRef,
					latestNodesRef,
					latestConnectionsRef,
					projectId: previousId,
				});
			}
			previousCanvasProjectIdRef.current = null;
			return () => {
				cancelled = true;
			};
		}
		setHydratedCanvasProjectId(null);
		const previousId = previousCanvasProjectIdRef.current;
		if (previousId && !areRouteProjectIdsEqual(previousId, canvasProjectId)) {
			snapshotCurrentWorkspace({
				canvasSnapshotsRef,
				latestNodesRef,
				latestConnectionsRef,
				projectId: previousId,
			});
		}
		setSelectedIds([]);
		dismissOverlays();
		const viewportStorage = readCanvasViewportStorage();
		const viewport = resolveCanvasViewportForProject({
			viewportStorage,
			projectId: canvasProjectId,
			fallbackViewport: {
				x: 0,
				y: 0,
				zoom: 1,
			},
		});
		setPan({ x: viewport.x, y: viewport.y });
		setZoom(viewport.zoom);
		previousCanvasProjectIdRef.current = canvasProjectId;
		const persistedWorkspaces = readCanvasWorkspaceStorage();
		loadCanvasFromServer(canvasProjectId)
			.then((serverSnapshot) => {
				const snapshot = resolveCanvasWorkspaceSnapshotForHydration({
					snapshotCache: canvasSnapshotsRef.current,
					serverSnapshot,
					workspaceStorage: persistedWorkspaces,
					projectId: canvasProjectId,
				});
				if (!snapshot) return { nodes: cloneInitialNodes(), connections: [] };
				return hydrateWorkspaceSnapshot(snapshot);
			})
			.then((hydratedSnapshot) => {
				if (cancelled) return;
				canvasSnapshotsRef.current = buildCanvasSnapshotCacheWithClonedSnapshot({
					snapshotCache: canvasSnapshotsRef.current,
					projectId: canvasProjectId,
					snapshot: hydratedSnapshot,
				});
				setNodes(hydratedSnapshot.nodes);
				setConnections(hydratedSnapshot.connections);
				setHydratedCanvasProjectId(canvasProjectId);
			});
		return () => {
			cancelled = true;
		};
	}, [canvasProjectId, dismissOverlays, resetWorkspaceHistory]);
}
