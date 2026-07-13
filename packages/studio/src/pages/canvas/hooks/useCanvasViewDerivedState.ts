import { useMemo } from "react";

import {
	buildCanvasPreviewState,
	type PreviewFilter,
} from "../appPreviewHelpers";
import {
	CANVAS_MODES,
	COPY,
	type CanvasMode,
} from "../appUiConfig";
import type { CanvasNode, NodeType } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

export type CanvasViewDerivedStateConfig = {
	appView: string;
	canvasMode: CanvasMode;
	activeTool: NodeType;
	nodes: CanvasNode[];
	connections: NodeConnection[];
	nodeById: Map<string, CanvasNode>;
	previewFilter: PreviewFilter;
	primaryNode: CanvasNode | null;
	agentOpen: boolean;
};

export function deriveCanvasModeChromeState({
	appView,
	canvasMode,
	activeTool,
	agentOpen,
}: Pick<
	CanvasViewDerivedStateConfig,
	"appView" | "canvasMode" | "activeTool" | "agentOpen"
>) {
	const canvasModeMeta =
		CANVAS_MODES.find((mode) => mode.id === canvasMode) ?? CANVAS_MODES[0];
	const modePrimaryTool = canvasMode === "director" ? "shot" : activeTool;
	const primaryCreateLabel =
		canvasMode === "director" ? "新增镜头" : COPY.createAsset;
	const isInspectorOpen = false; // Inspector panel disabled; settings moved to inline node pills
	const isCanvasSidePanelOpen = agentOpen || isInspectorOpen;
	const isDirectorMode = appView === "canvas" && canvasMode === "director";
	const isPreviewMode = appView === "canvas" && canvasMode === "preview";
	const showCreationChrome = appView === "canvas" && !isPreviewMode;

	return {
		canvasModeMeta,
		modePrimaryTool,
		primaryCreateLabel,
		isInspectorOpen,
		isCanvasSidePanelOpen,
		isDirectorMode,
		isPreviewMode,
		showCreationChrome,
	};
}

export function useCanvasViewDerivedState({
	appView,
	canvasMode,
	activeTool,
	nodes,
	connections,
	nodeById,
	previewFilter,
	agentOpen,
}: CanvasViewDerivedStateConfig) {
	const previewModeActive = appView === "canvas" && canvasMode === "preview";
	const previewState = useMemo(
		() =>
			buildCanvasPreviewState({
				previewModeActive,
				nodes,
				connections,
				nodeById,
				previewFilter,
			}),
		[connections, nodeById, nodes, previewFilter, previewModeActive],
	);
	const chromeState = deriveCanvasModeChromeState({
		appView,
		canvasMode,
		activeTool,
		agentOpen,
	});

	return {
		previewModeActive,
		...previewState,
		...chromeState,
	};
}
