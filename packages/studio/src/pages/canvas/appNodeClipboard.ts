import { cloneComposer } from "./canvasNodeActions";
import type { CanvasNode } from "./canvas-types";

export function cloneNodeForClipboard(node: CanvasNode): CanvasNode {
	return {
		...node,
		composer: node.composer ? cloneComposer(node.composer) : undefined,
		asset: node.asset ? { ...node.asset } : undefined,
		style: node.style ? { ...node.style } : undefined,
	};
}

export function createPastedNodeFromClipboard(
	source: CanvasNode,
	options: { id?: string; offsetX?: number; offsetY?: number } = {},
): CanvasNode {
	return {
		...source,
		id: options.id ?? `${source.type}-${Date.now()}`,
		x: source.x + (options.offsetX ?? 36),
		y: source.y + (options.offsetY ?? 28),
		composer: source.composer ? cloneComposer(source.composer) : undefined,
		asset: source.asset ? { ...source.asset } : undefined,
		style: source.style ? { ...source.style } : undefined,
	};
}
