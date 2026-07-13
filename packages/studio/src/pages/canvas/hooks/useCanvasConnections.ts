import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import {
	applyTextPromptToImageNode,
	createConnection,
	getTextToImagePromptTransfer,
	isSameConnection,
} from "../canvasConnectionActions";
import { completePendingConnectionWithStylePropagation } from "../connectionInteractionHelpers";
import type { NodeConnection, NodePort } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";
import type { CanvasNode, ComposerPreset, StyleLibraryState } from "../canvas-types";

type UseCanvasConnectionsArgs = {
	nodes: CanvasNode[];
	connections: NodeConnection[];
	styleLibrary: StyleLibraryState;
	imageComposer: ComposerPreset;
	pushUndoSnapshot: () => void;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
};

export function useCanvasConnections({
	nodes,
	connections,
	styleLibrary,
	imageComposer,
	pushUndoSnapshot,
	pushRuntimeNotice,
	setConnections,
	setNodes,
}: UseCanvasConnectionsArgs) {
	const completeConnection = useCallback(
		(source: NodePort, target: NodePort) => {
			if (source.nodeId === target.nodeId || source.side === target.side) return;
			const sourceNode = nodes.find((node) => node.id === source.nodeId);
			const targetNode = nodes.find((node) => node.id === target.nodeId);
			const textToImagePromptTransfer = getTextToImagePromptTransfer(
				sourceNode,
				targetNode,
			);
			completePendingConnectionWithStylePropagation({
				pendingConnection: source,
				target,
				connections,
				nodes,
				styleLibrary,
				pushUndoSnapshot,
				setConnections,
				setNodes,
				createConnection,
				isSameConnection,
			});
			if (!textToImagePromptTransfer) return;
			setNodes((current) =>
				applyTextPromptToImageNode(
					current,
					textToImagePromptTransfer.imageNodeId,
					textToImagePromptTransfer.prompt,
					imageComposer,
				),
			);
			pushRuntimeNotice(
				"已把文本节点内容自动填入图片节点提示词栏。",
				"info",
				`text-to-image-prompt-${textToImagePromptTransfer.imageNodeId}`,
			);
		},
		[
			connections,
			imageComposer,
			nodes,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setConnections,
			setNodes,
			styleLibrary,
		],
	);

	return { completeConnection };
}
