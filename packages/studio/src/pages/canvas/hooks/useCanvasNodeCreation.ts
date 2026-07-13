import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback } from "react";
import {
	cloneComposer,
	createCanvasNode,
	getDefaultNodeSize,
	screenToWorld,
} from "../canvasNodeActions";
import { createConnection } from "../canvasConnectionActions";
import { createStyleRef } from "../styleLibrary";
import type { CanvasNode, ComposerPreset, NodeType, StyleLibraryState } from "../canvas-types";
import type { NodeConnection, NodePort } from "./useConnectionInteractionHelpers";

type Point = { x: number; y: number };
type AddNodeMenuState =
	| { mode: "blank"; x: number; y: number; worldX: number; worldY: number }
	| {
			mode: "reference";
			x: number;
			y: number;
			worldX: number;
			worldY: number;
			from: NodePort;
	  };

type UseCanvasNodeCreationArgs = {
	canvasRef: RefObject<HTMLDivElement | null>;
	nodes: CanvasNode[];
	connections: NodeConnection[];
	nodeById: Map<string, CanvasNode>;
	menuAt: AddNodeMenuState | null;
	pan: Point;
	zoom: number;
	composerByType: Record<NodeType, ComposerPreset>;
	globalStylePresetId: string;
	styleLibrary: StyleLibraryState;
	buildShotPromptPrefix: (composer?: ComposerPreset) => string;
	pushUndoSnapshot: () => void;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setActiveTool: Dispatch<SetStateAction<NodeType>>;
	dismissOverlays: () => void;
};

export function useCanvasNodeCreation({
	canvasRef,
	nodes,
	connections,
	nodeById,
	menuAt,
	pan,
	zoom,
	composerByType,
	globalStylePresetId,
	styleLibrary,
	buildShotPromptPrefix,
	pushUndoSnapshot,
	setNodes,
	setConnections,
	setSelectedIds,
	setActiveTool,
	dismissOverlays,
}: UseCanvasNodeCreationArgs) {
	const createNode = useCallback(
		(type: NodeType) => {
			const viewRect = canvasRef.current?.getBoundingClientRect();
			const size = getDefaultNodeSize(type);
			const lastNode = nodes[nodes.length - 1];
			const centerWorld = screenToWorld(
				(viewRect?.width ?? 960) * 0.4,
				(viewRect?.height ?? 680) * 0.38,
				pan.x,
				pan.y,
				zoom,
			);
			const menuWorld =
				menuAt?.mode === "blank"
					? {
							x: menuAt.worldX - size.width / 2,
							y: menuAt.worldY - size.height / 2,
						}
					: null;
			const point = {
				x:
					menuWorld?.x ??
					(lastNode
						? lastNode.x + lastNode.width + 170
						: centerWorld.x - size.width / 2),
				y:
					menuWorld?.y ??
					(lastNode ? lastNode.y + 10 : centerWorld.y - size.height / 2),
			};
			const node = createCanvasNode(
				type,
				point,
				composerByType[type],
				size,
				undefined,
				createStyleRef(globalStylePresetId || undefined, "manual", styleLibrary),
			);
			pushUndoSnapshot();
			setNodes((current) => [...current, node]);
			setSelectedIds([node.id]);
			setActiveTool(type);
			dismissOverlays();
		},
		[
			canvasRef,
			composerByType,
			dismissOverlays,
			globalStylePresetId,
			menuAt,
			nodes,
			pan.x,
			pan.y,
			pushUndoSnapshot,
			setActiveTool,
			setNodes,
			setSelectedIds,
			styleLibrary,
			zoom,
		],
	);

	const createReferencedNode = useCallback(
		(type: NodeType, menu: Extract<AddNodeMenuState, { mode: "reference" }>) => {
			const size = getDefaultNodeSize(type);
			const sourceNode = nodeById.get(menu.from.nodeId);
			const inheritedStyle =
				sourceNode?.style ??
				createStyleRef(globalStylePresetId || undefined, "manual", styleLibrary);
			const baseComposer = cloneComposer(composerByType[type]);
			const inheritedPrompt =
				sourceNode?.type === "shot" && sourceNode.composer && (type === "image" || type === "video")
					? `${buildShotPromptPrefix(sourceNode.composer)}${sourceNode.composer.prompt}`.trim()
					: baseComposer.prompt;
			const node = createCanvasNode(
				type,
				{ x: menu.worldX - size.width / 2, y: menu.worldY - size.height / 2 },
				{
					...baseComposer,
					prompt: inheritedPrompt,
				},
				size,
				undefined,
				inheritedStyle,
			);
			pushUndoSnapshot();
			setNodes((current) => [...current, node]);
			const newNodePort: NodePort = {
				nodeId: node.id,
				side: menu.from.side === "left" ? "right" : "left",
			};
			setConnections((current) => [
				...current,
				createConnection(menu.from, newNodePort),
			]);
			setSelectedIds([node.id]);
			setActiveTool(type);
			dismissOverlays();
		},
		[
			buildShotPromptPrefix,
			composerByType,
			dismissOverlays,
			globalStylePresetId,
			nodeById,
			pushUndoSnapshot,
			setActiveTool,
			setConnections,
			setNodes,
			setSelectedIds,
			styleLibrary,
		],
	);

	const createLinkedNodeFromSource = useCallback(
		(sourceNodeId: string, type: NodeType) => {
			const sourceNode = nodeById.get(sourceNodeId);
			if (!sourceNode) return;
			const size = getDefaultNodeSize(type);
			const linkedCount = connections.filter(
				(connection) =>
					connection.from.nodeId === sourceNodeId || connection.to.nodeId === sourceNodeId,
			).length;
			const point = {
				x: sourceNode.x + sourceNode.width + 160,
				y: sourceNode.y + linkedCount * 28,
			};
			const node = createCanvasNode(
				type,
				point,
				composerByType[type],
				size,
				undefined,
				sourceNode.style ??
					createStyleRef(globalStylePresetId || undefined, "manual", styleLibrary),
			);
			pushUndoSnapshot();
			setNodes((current) => [...current, node]);
			setConnections((current) => [
				...current,
				createConnection(
					{ nodeId: sourceNodeId, side: "right" },
					{ nodeId: node.id, side: "left" },
				),
			]);
			setSelectedIds([node.id]);
			setActiveTool(type);
			dismissOverlays();
		},
		[
			composerByType,
			connections,
			dismissOverlays,
			globalStylePresetId,
			nodeById,
			pushUndoSnapshot,
			setActiveTool,
			setConnections,
			setNodes,
			setSelectedIds,
			styleLibrary,
		],
	);

	const duplicateNode = useCallback(
		(nodeId: string) => {
			const source = nodeById.get(nodeId);
			if (!source) return;
			pushUndoSnapshot();
			const copy = {
				...source,
				id: crypto.randomUUID(),
				x: source.x + 36,
				y: source.y + 28,
				composer: source.composer ? cloneComposer(source.composer) : undefined,
				asset: source.asset ? { ...source.asset } : undefined,
				style: source.style ? { ...source.style } : undefined,
			};
			setNodes((current) => [...current, copy]);
			setSelectedIds([copy.id]);
			dismissOverlays();
		},
		[dismissOverlays, nodeById, pushUndoSnapshot, setNodes, setSelectedIds],
	);

	return {
		createNode,
		createReferencedNode,
		createLinkedNodeFromSource,
		duplicateNode,
	};
}
