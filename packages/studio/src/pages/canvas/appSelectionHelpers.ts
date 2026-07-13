import type { PointerState } from "./appCanvasState";
import type { CanvasNode } from "./canvas-types";

type RectLike = Pick<DOMRect, "left" | "top">;

export type SelectionBounds = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
};

export function getSelectionBoundsFromPointer(
	pointerState: PointerState,
	canvasRect: RectLike,
): SelectionBounds | null {
	if (pointerState.mode !== "selecting") return null;
	return {
		minX: Math.min(pointerState.startX, pointerState.currentX) - canvasRect.left,
		minY: Math.min(pointerState.startY, pointerState.currentY) - canvasRect.top,
		maxX: Math.max(pointerState.startX, pointerState.currentX) - canvasRect.left,
		maxY: Math.max(pointerState.startY, pointerState.currentY) - canvasRect.top,
	};
}

export function isNodeInsideSelectionBounds({
	node,
	bounds,
	panX,
	panY,
	zoom,
}: {
	node: CanvasNode;
	bounds: SelectionBounds;
	panX: number;
	panY: number;
	zoom: number;
}) {
	const left = node.x * zoom + panX;
	const top = node.y * zoom + panY;
	return (
		left + node.width * zoom >= bounds.minX &&
		left <= bounds.maxX &&
		top + node.height * zoom >= bounds.minY &&
		top <= bounds.maxY
	);
}

export function getSelectedNodeIdsInSelection({
	nodes,
	pointerState,
	canvasRect,
	panX,
	panY,
	zoom,
}: {
	nodes: CanvasNode[];
	pointerState: PointerState;
	canvasRect: RectLike;
	panX: number;
	panY: number;
	zoom: number;
}) {
	const bounds = getSelectionBoundsFromPointer(pointerState, canvasRect);
	if (!bounds) return [];
	return nodes
		.filter((node) =>
			isNodeInsideSelectionBounds({ node, bounds, panX, panY, zoom }),
		)
		.map((node) => node.id);
}
