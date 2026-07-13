import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect } from "react";

import type { PointerState } from "../appCanvasState";
import { getSelectedNodeIdsInSelection } from "../appSelectionHelpers";
import type { CanvasNode } from "../canvas-types";

export type CanvasSelectionBoxState = {
	left: number;
	top: number;
	width: number;
	height: number;
} | null;

export type UseCanvasSelectionBoxConfig = {
	nodes: CanvasNode[];
	pointerState: PointerState;
	canvasRef: MutableRefObject<HTMLDivElement | null>;
	pan: { x: number; y: number };
	zoom: number;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export function useCanvasSelectionBox({
	nodes,
	pointerState,
	canvasRef,
	pan,
	zoom,
	setSelectedIds,
}: UseCanvasSelectionBoxConfig) {
	useEffect(() => {
		if (pointerState.mode !== "selecting") return;
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;
		setSelectedIds(
			getSelectedNodeIdsInSelection({
				nodes,
				pointerState,
				canvasRect: rect,
				panX: pan.x,
				panY: pan.y,
				zoom,
			}),
		);
	}, [canvasRef, nodes, pan.x, pan.y, pointerState, setSelectedIds, zoom]);

	if (pointerState.mode !== "selecting" || !canvasRef.current) return null;
	const rect = canvasRef.current.getBoundingClientRect();
	return {
		left: Math.min(pointerState.startX, pointerState.currentX) - rect.left,
		top: Math.min(pointerState.startY, pointerState.currentY) - rect.top,
		width: Math.abs(pointerState.currentX - pointerState.startX),
		height: Math.abs(pointerState.currentY - pointerState.startY),
	} satisfies CanvasSelectionBoxState;
}
