import type { CSSProperties } from "react";

import type { KakaApiValidationState } from "./hooks/useKakaApiModels";
import type { CanvasNode, NodeType } from "./canvas-types";

export type KakaApiValidationTone = {
	accent: string;
	border: string;
	background: string;
	shadow: string;
};

export type NodeBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

type FloatingLayoutInput = {
	node: CanvasNode;
	zoom: number;
	panX: number;
	panY: number;
};

export function getKakaApiValidationTone(
	validation: KakaApiValidationState,
): KakaApiValidationTone {
	return validation.status === "valid"
		? {
				accent: "#43d787",
				border: "rgba(67, 215, 135, 0.45)",
				background: "rgba(22, 64, 44, 0.42)",
				shadow: "0 0 0 1px rgba(67, 215, 135, 0.22)",
			}
		: validation.status === "invalid"
			? {
					accent: "#ff6b7c",
					border: "rgba(255, 107, 124, 0.45)",
					background: "rgba(90, 24, 36, 0.4)",
					shadow: "0 0 0 1px rgba(255, 107, 124, 0.18)",
				}
			: {
					accent: "rgba(240, 244, 255, 0.88)",
					border: "rgba(255, 255, 255, 0.12)",
					background: "rgba(255, 255, 255, 0.04)",
					shadow: "none",
				};
}

export function getSelectedNodeBounds(
	selectedNodes: CanvasNode[],
): NodeBounds | null {
	if (selectedNodes.length === 0) return null;
	const left = Math.min(...selectedNodes.map((node) => node.x));
	const top = Math.min(...selectedNodes.map((node) => node.y));
	const right = Math.max(...selectedNodes.map((node) => node.x + node.width));
	const bottom = Math.max(...selectedNodes.map((node) => node.y + node.height));
	return {
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}

export function shouldShowFloatingComposer(
	primaryNode: CanvasNode | null,
	isDraggingNodes: boolean,
) {
	if (!primaryNode || isDraggingNodes) return false;
	const isAssetBackedMediaNode =
		Boolean(primaryNode.asset) &&
		(primaryNode.type === "image" ||
			primaryNode.type === "editor" ||
			primaryNode.type === "video" ||
			primaryNode.type === "audio" ||
			primaryNode.type === "music");
	return !isAssetBackedMediaNode;
}

export function shouldShowFloatingTextToolbar(
	showFloatingComposer: boolean,
	primaryType: NodeType,
) {
	return Boolean(showFloatingComposer && primaryType === "text");
}

export function getFloatingTextToolbarStyle(
	input: FloatingLayoutInput | null,
	primaryType: NodeType,
): CSSProperties | undefined {
	if (!input || primaryType !== "text") return undefined;
	const left = input.node.x * input.zoom + input.panX;
	const top = input.node.y * input.zoom + input.panY;
	const width = Math.min(
		460,
		Math.max(360, input.node.width * input.zoom + 64),
	);
	return {
		width: `${width}px`,
		left: `${left + (input.node.width * input.zoom) / 2 - width / 2}px`,
		top: `${top - 68}px`,
	};
}

export function getFloatingComposerStyle(
	input: FloatingLayoutInput | null,
	primaryType: NodeType,
): CSSProperties | undefined {
	if (!input) return undefined;
	const left = input.node.x * input.zoom + input.panX;
	const top = input.node.y * input.zoom + input.panY;
	const width =
		primaryType === "text"
			? Math.min(672, Math.max(520, input.node.width * input.zoom + 260))
			: primaryType === "image"
				? Math.min(920, Math.max(720, input.node.width * input.zoom + 360))
				: primaryType === "video"
					? Math.min(900, Math.max(680, input.node.width * input.zoom + 360))
					: Math.min(780, Math.max(560, input.node.width * input.zoom + 260));
	return {
		width: `${width}px`,
		left: `${left + (input.node.width * input.zoom) / 2 - width / 2}px`,
		top: `${top + input.node.height * input.zoom + (primaryType === "image" ? 18 : 12)}px`,
	};
}
