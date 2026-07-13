import type { CanvasNode } from "./canvas-types";

export type ConnectionPortSide = "left" | "right";
export type ConnectionPortLike = { nodeId: string; side: ConnectionPortSide };
export type NearestConnectionPort = {
	nodeId: string;
	side: ConnectionPortSide;
	distance: number;
	dx: number;
	dy: number;
};

type CanvasRectLike = Pick<DOMRect, "left" | "top">;
type Point = { x: number; y: number };

export function getConnectionPortPoint(
	node: Pick<CanvasNode, "x" | "y" | "width" | "height">,
	side: ConnectionPortSide,
) {
	return {
		x: side === "left" ? node.x : node.x + node.width,
		y: node.y + node.height / 2,
	};
}

export function findNearestConnectionPortFromGeometry({
	clientX,
	clientY,
	source,
	canvasRect,
	nodes,
	pan,
	zoom,
}: {
	clientX: number;
	clientY: number;
	source?: ConnectionPortLike | null;
	canvasRect: CanvasRectLike;
	nodes: CanvasNode[];
	pan: Point;
	zoom: number;
}): NearestConnectionPort | null {
	let best: NearestConnectionPort | null = null;
	nodes.forEach((node) => {
		if (source?.nodeId === node.id) return;
		const nodeRect = {
			left: canvasRect.left + pan.x + node.x * zoom,
			right: canvasRect.left + pan.x + (node.x + node.width) * zoom,
			top: canvasRect.top + pan.y + node.y * zoom,
			bottom: canvasRect.top + pan.y + (node.y + node.height) * zoom,
		};
		const expandedPadding = Math.max(28, Math.min(64, 42 * zoom));
		(["left", "right"] as const).forEach((side) => {
			if (source && source.side === side) return;
			const center = {
				x:
					canvasRect.left +
					pan.x +
					(side === "left" ? node.x : node.x + node.width) * zoom,
				y: canvasRect.top + pan.y + (node.y + node.height / 2) * zoom,
			};
			const dx = clientX - center.x;
			const dy = clientY - center.y;
			let distance = Math.hypot(dx, dy);
			const isInsideExpandedNode =
				clientX >= nodeRect.left - expandedPadding &&
				clientX <= nodeRect.right + expandedPadding &&
				clientY >= nodeRect.top - expandedPadding &&
				clientY <= nodeRect.bottom + expandedPadding;
			if (isInsideExpandedNode) {
				const clampedX = Math.max(nodeRect.left, Math.min(clientX, nodeRect.right));
				const clampedY = Math.max(nodeRect.top, Math.min(clientY, nodeRect.bottom));
				const nodeHitDistance = Math.hypot(clientX - clampedX, clientY - clampedY);
				distance = Math.min(distance, nodeHitDistance);
			}
			if (!isInsideExpandedNode && distance > 96) return;
			if (!best || distance < best.distance) {
				best = { nodeId: node.id, side, distance, dx, dy };
			}
		});
	});
	return best;
}
