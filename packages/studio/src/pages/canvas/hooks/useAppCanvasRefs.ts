import { useEffect, useRef } from "react";

import { parseAppRoute } from "../appRouting";
import type { PointerState } from "../appCanvasState";
import type { CanvasWorkspaceSnapshot } from "../appWorkspaceDefaults";
import type { CanvasNode } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

export type UseAppCanvasRefsConfig = {
	nodes: CanvasNode[];
	connections: NodeConnection[];
	initialPath: string;
	initialCanvasProjectId: string;
};

export function useAppCanvasRefs({
	nodes,
	connections,
	initialPath,
	initialCanvasProjectId,
}: UseAppCanvasRefsConfig) {
	const initialPreviousCanvasProjectId =
		parseAppRoute(initialPath).page === "canvas-workspace"
			? initialCanvasProjectId
			: null;
	const isDraggingNodePositionChangeSnapshotTakenRef = useRef(false);
	const canvasRef = useRef<HTMLDivElement | null>(null);
	const renameInputRef = useRef<HTMLInputElement | null>(null);
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const workshopTextareaRef = useRef<HTMLTextAreaElement | null>(null);
	const uploadedUrlsRef = useRef<string[]>([]);
	const canvasDragDepthRef = useRef(0);
	const canvasFocusTimerRef = useRef<number | null>(null);
	const initialDevicePixelRatioRef = useRef(
		typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
	);
	const zoomHudTimeoutRef = useRef<number | null>(null);
	const hasMountedZoomRef = useRef(false);
	const copiedNodeRef = useRef<CanvasNode | null>(null);
	const canvasSnapshotsRef = useRef<Record<string, CanvasWorkspaceSnapshot>>({});
	const previousCanvasProjectIdRef = useRef<string | null>(
		initialPreviousCanvasProjectId,
	);
	const pointerStateRef = useRef<PointerState>({ mode: "idle" });
	const latestNodesRef = useRef(nodes);
	const latestConnectionsRef = useRef(connections);

	useEffect(() => {
		latestNodesRef.current = nodes;
		latestConnectionsRef.current = connections;
	}, [connections, nodes]);

	useEffect(
		() => () => {
			if (canvasFocusTimerRef.current) {
				window.clearTimeout(canvasFocusTimerRef.current);
			}
		},
		[],
	);

	return {
		isDraggingNodePositionChangeSnapshotTakenRef,
		canvasRef,
		renameInputRef,
		uploadInputRef,
		workshopTextareaRef,
		uploadedUrlsRef,
		canvasDragDepthRef,
		canvasFocusTimerRef,
		initialDevicePixelRatioRef,
		zoomHudTimeoutRef,
		hasMountedZoomRef,
		copiedNodeRef,
		canvasSnapshotsRef,
		previousCanvasProjectIdRef,
		pointerStateRef,
		latestNodesRef,
		latestConnectionsRef,
	};
}
