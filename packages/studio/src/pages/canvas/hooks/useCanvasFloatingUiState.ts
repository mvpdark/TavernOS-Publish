import { useMemo } from "react";

import type { PointerState } from "../appCanvasState";
import {
	getFloatingComposerStyle,
	getFloatingTextToolbarStyle,
	getSelectedNodeBounds,
	shouldShowFloatingComposer,
	shouldShowFloatingTextToolbar,
} from "../appDisplayHelpers";
import type { CanvasNode, NodeType } from "../canvas-types";

export type UseCanvasFloatingUiStateConfig = {
	primaryNode: CanvasNode | null;
	primaryType: NodeType;
	selectedNodes: CanvasNode[];
	pointerState: PointerState;
	isDirectorMode: boolean;
	isPreviewMode: boolean;
	pan: {
		x: number;
		y: number;
	};
	zoom: number;
};

export function useCanvasFloatingUiState({
	primaryNode,
	primaryType,
	selectedNodes,
	pointerState,
	isDirectorMode,
	isPreviewMode,
	pan,
	zoom,
}: UseCanvasFloatingUiStateConfig) {
	const isDraggingNodes = pointerState.mode === "dragging-nodes";
	const showFloatingComposer =
		!isDirectorMode && !isPreviewMode
			? shouldShowFloatingComposer(primaryNode, isDraggingNodes)
			: false;
	const showFloatingTextToolbar = shouldShowFloatingTextToolbar(
		showFloatingComposer,
		primaryType,
	);
	const groupBounds = useMemo(
		() => getSelectedNodeBounds(selectedNodes),
		[selectedNodes],
	);
	const floatingTextToolbarStyle = useMemo(() => {
		return getFloatingTextToolbarStyle(
			primaryNode
				? {
						node: primaryNode,
						zoom,
						panX: pan.x,
						panY: pan.y,
					}
				: null,
			primaryType,
		);
	}, [pan.x, pan.y, primaryNode, primaryType, zoom]);
	const floatingComposerStyle = useMemo(() => {
		return getFloatingComposerStyle(
			primaryNode
				? {
						node: primaryNode,
						zoom,
						panX: pan.x,
						panY: pan.y,
					}
				: null,
			primaryType,
		);
	}, [pan.x, pan.y, primaryNode, primaryType, zoom]);

	return {
		groupBounds,
		showFloatingComposer,
		showFloatingTextToolbar,
		floatingTextToolbarStyle,
		floatingComposerStyle,
	};
}
