import type {
	Dispatch,
	MutableRefObject,
	SetStateAction,
} from "react";
import { useCallback } from "react";

import type { PointerState } from "../appCanvasState";
import type { CanvasNode } from "../canvas-types";

export type CanvasNodePointerDownEvent = Pick<
	PointerEvent,
	"button" | "clientX" | "clientY" | "stopPropagation"
>;

export type UseCanvasNodeDragStartConfig = {
	nodes: CanvasNode[];
	selectedIdSet: Set<string>;
	isDraggingNodePositionChangeSnapshotTakenRef: MutableRefObject<boolean>;
	dismissOverlays: () => void;
	scheduleNodeLift: () => void;
	setPointerState: Dispatch<SetStateAction<PointerState>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export function useCanvasNodeDragStart({
	nodes,
	selectedIdSet,
	isDraggingNodePositionChangeSnapshotTakenRef,
	dismissOverlays,
	scheduleNodeLift,
	setPointerState,
	setSelectedIds,
}: UseCanvasNodeDragStartConfig) {
	return useCallback(
		(event: CanvasNodePointerDownEvent, id: string) => {
			if (event.button !== 0) return;
			event.stopPropagation();
			dismissOverlays();
			const dragIds = selectedIdSet.has(id) ? selectedIdSet : new Set([id]);
			if (!selectedIdSet.has(id)) setSelectedIds([id]);
			const origin = nodes
				.filter((node) => dragIds.has(node.id))
				.map((node) => ({ id: node.id, x: node.x, y: node.y }));
			isDraggingNodePositionChangeSnapshotTakenRef.current = false;
			scheduleNodeLift();
			setPointerState({
				mode: "node-pointer-down",
				startX: event.clientX,
				startY: event.clientY,
				origin,
			});
		},
		[
			dismissOverlays,
			isDraggingNodePositionChangeSnapshotTakenRef,
			nodes,
			scheduleNodeLift,
			selectedIdSet,
			setPointerState,
			setSelectedIds,
		],
	);
}
