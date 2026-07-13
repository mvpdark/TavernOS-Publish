import type { AddNodeMenuState, MagnetPortState } from "./appCanvasState";
import type {
	ConnectionPortLike,
	NearestConnectionPort,
} from "./appConnectionPortGeometry";

type CanvasRectLike = Pick<DOMRect, "left" | "top" | "width" | "height">;
type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function createMagnetPortState(
	nearestPort: NearestConnectionPort | null,
	zoom: number,
): MagnetPortState {
	if (!nearestPort) return null;
	return {
		nodeId: nearestPort.nodeId,
		side: nearestPort.side,
		x: clamp((nearestPort.dx / zoom) * 0.28, -18, 18),
		y: clamp((nearestPort.dy / zoom) * 0.28, -18, 18),
	};
}

export function createReferenceAddNodeMenuState({
	clientX,
	clientY,
	canvasRect,
	worldPoint,
	sourcePort,
	padding = 24,
	menuWidth = 320,
	menuHeight = 280,
}: {
	clientX: number;
	clientY: number;
	canvasRect: CanvasRectLike;
	worldPoint: Point;
	sourcePort: ConnectionPortLike;
	padding?: number;
	menuWidth?: number;
	menuHeight?: number;
}): Extract<AddNodeMenuState, { mode: "reference" }> {
	return {
		mode: "reference",
		x: clamp(clientX - canvasRect.left, padding, canvasRect.width - menuWidth),
		y: clamp(clientY - canvasRect.top, padding, canvasRect.height - menuHeight),
		worldX: worldPoint.x,
		worldY: worldPoint.y,
		from: sourcePort,
	};
}
