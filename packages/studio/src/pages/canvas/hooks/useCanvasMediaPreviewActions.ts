import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

import type {
	ImagePreviewState,
	VideoPreviewState,
} from "../appCanvasState";
import {
	buildImagePreviewState,
	buildVideoPreviewState,
} from "../appMediaPreviewState";
import { getVideoNodeSize } from "../canvasNodeSizing";
import type { CanvasNode } from "../canvas-types";

export type UseCanvasMediaPreviewActionsConfig = {
	nodeById: Map<string, CanvasNode>;
	setImagePreview: Dispatch<SetStateAction<ImagePreviewState>>;
	setVideoPreview: Dispatch<SetStateAction<VideoPreviewState>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
};

export function useCanvasMediaPreviewActions({
	nodeById,
	setImagePreview,
	setVideoPreview,
	setNodes,
}: UseCanvasMediaPreviewActionsConfig) {
	const openVideoPreview = useCallback(
		(nodeId: string) => {
			const node = nodeById.get(nodeId);
			if (!node) return;
			const preview = buildVideoPreviewState(node);
			if (preview) setVideoPreview(preview);
		},
		[nodeById, setVideoPreview],
	);

	const updateVideoNodeAspectSize = useCallback(
		(nodeId: string, width: number, height: number) => {
			const nextSize = getVideoNodeSize(width, height);
			setNodes((current) =>
				current.map((node) => {
					if (node.id !== nodeId || node.type !== "video") return node;
					if (
						Math.abs(node.width - nextSize.width) < 2 &&
						Math.abs(node.height - nextSize.height) < 2
					) {
						return node;
					}
					return { ...node, width: nextSize.width, height: nextSize.height };
				}),
			);
		},
		[setNodes],
	);

	const openImagePreview = useCallback(
		(nodeId: string) => {
			const node = nodeById.get(nodeId);
			if (!node) return;
			const preview = buildImagePreviewState(node);
			if (preview) setImagePreview(preview);
		},
		[nodeById, setImagePreview],
	);

	return {
		openVideoPreview,
		updateVideoNodeAspectSize,
		openImagePreview,
	};
}
