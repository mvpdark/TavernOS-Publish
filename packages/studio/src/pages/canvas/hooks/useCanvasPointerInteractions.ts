import type {
	Dispatch,
	MouseEvent as ReactMouseEvent,
	MutableRefObject,
	PointerEvent as ReactPointerEvent,
	SetStateAction,
} from "react";
import { useCallback } from "react";

import { clamp } from "../appAspectRatioHelpers";
import type {
	AddNodeMenuState,
	PointerState,
	VideoFusionPromptState,
} from "../appCanvasState";
import { getNodeOverlapArea } from "../appCanvasMediaHelpers";
import { isCanvasInteractiveTarget } from "../appInteractionTargetHelpers";
import type { CanvasPoint } from "../canvasNodeActions";
import type { CanvasNode, OpenDropdown } from "../canvas-types";

type NodeMenuState = {
	x: number;
	y: number;
	nodeId: string;
};

export type CanvasNodeClickEvent = Pick<MouseEvent, "stopPropagation">;
export type CanvasNodeContextMenuEvent = Pick<
	MouseEvent,
	"clientX" | "clientY" | "preventDefault" | "stopPropagation"
>;

type ScreenToWorld = (
	screenX: number,
	screenY: number,
	panX: number,
	panY: number,
	zoom: number,
) => CanvasPoint;

export type UseCanvasPointerInteractionsConfig = {
	canvasRef: MutableRefObject<HTMLDivElement | null>;
	pan: CanvasPoint;
	zoom: number;
	pointerState: PointerState;
	latestNodesRef: MutableRefObject<CanvasNode[]>;
	isDraggingNodePositionChangeSnapshotTakenRef: MutableRefObject<boolean>;
	videoFusionHoverNodeId: string | null;
	dismissOverlays: () => void;
	clearNodeLiftTimer: () => void;
	resetNodeLift: () => void;
	pushUndoSnapshot: () => void;
	fuseAudioVideoNodes: (
		sourceNodeId: string,
		targetNodeId: string,
	) => void | Promise<void>;
	screenToWorld: ScreenToWorld;
	setPointerState: Dispatch<SetStateAction<PointerState>>;
	setPan: Dispatch<SetStateAction<CanvasPoint>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setLiftedDragIds: Dispatch<SetStateAction<Set<string>>>;
	setVideoFusionHoverNodeId: Dispatch<SetStateAction<string | null>>;
	setVideoFusionPrompt: Dispatch<SetStateAction<VideoFusionPromptState>>;
	setMenuAt: Dispatch<SetStateAction<AddNodeMenuState | null>>;
	setNodeMenuAt: Dispatch<SetStateAction<NodeMenuState | null>>;
	setOpenDropdown: Dispatch<SetStateAction<OpenDropdown>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export function useCanvasPointerInteractions({
	canvasRef,
	pan,
	zoom,
	pointerState,
	latestNodesRef,
	isDraggingNodePositionChangeSnapshotTakenRef,
	videoFusionHoverNodeId,
	dismissOverlays,
	clearNodeLiftTimer,
	resetNodeLift,
	pushUndoSnapshot,
	fuseAudioVideoNodes,
	screenToWorld,
	setPointerState,
	setPan,
	setNodes,
	setLiftedDragIds,
	setVideoFusionHoverNodeId,
	setVideoFusionPrompt,
	setMenuAt,
	setNodeMenuAt,
	setOpenDropdown,
	setSelectedIds,
}: UseCanvasPointerInteractionsConfig) {
	const updateVideoFusionHover = useCallback(
		(
			origin: Array<{ id: string; x: number; y: number }>,
			deltaX: number,
			deltaY: number,
		) => {
			const draggedFusionSource = origin
				.map((item) => {
					const node = latestNodesRef.current.find(
						(candidate) => candidate.id === item.id,
					);
					return node &&
						(node.type === "video" ||
							node.type === "audio" ||
							node.type === "music") &&
						node.asset
						? { ...node, x: item.x + deltaX, y: item.y + deltaY }
						: null;
				})
				.find((node): node is CanvasNode => node !== null);
			if (!draggedFusionSource) {
				setVideoFusionHoverNodeId(null);
				return;
			}
			const target = latestNodesRef.current
				.filter(
					(node) =>
						node.id !== draggedFusionSource.id &&
						!origin.some((item) => item.id === node.id) &&
						node.type === "video" &&
						node.asset,
				)
				.map((node) => ({
					node,
					area: getNodeOverlapArea(draggedFusionSource, node),
				}))
				.filter(
					({ area }) =>
						area >
						Math.min(
							draggedFusionSource.width * draggedFusionSource.height,
							1,
						) *
							0.18,
				)
				.sort((a, b) => b.area - a.area)[0]?.node;
			setVideoFusionHoverNodeId(target?.id ?? null);
		},
		[latestNodesRef, setVideoFusionHoverNodeId],
	);

	const handleBlankPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (isCanvasInteractiveTarget(event.target)) return;
			dismissOverlays();
			if (event.button === 2) {
				event.preventDefault();
				setPointerState({
					mode: "panning",
					startX: event.clientX,
					startY: event.clientY,
					originX: pan.x,
					originY: pan.y,
				});
				return;
			}
			if (event.button === 0)
				setPointerState({
					mode: "selecting",
					startX: event.clientX,
					startY: event.clientY,
					currentX: event.clientX,
					currentY: event.clientY,
				});
		},
		[dismissOverlays, pan.x, pan.y, setPointerState],
	);

	const handleCanvasPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (pointerState.mode === "node-pointer-down") {
				const deltaX = (event.clientX - pointerState.startX) / zoom;
				const deltaY = (event.clientY - pointerState.startY) / zoom;
				if (
					Math.hypot(
						event.clientX - pointerState.startX,
						event.clientY - pointerState.startY,
					) < 1
				)
					return;
				if (!isDraggingNodePositionChangeSnapshotTakenRef.current) {
					pushUndoSnapshot();
					isDraggingNodePositionChangeSnapshotTakenRef.current = true;
				}
				clearNodeLiftTimer();
				setLiftedDragIds(new Set(pointerState.origin.map((item) => item.id)));
				setNodes((current) =>
					current.map((node) => {
						const start = pointerState.origin.find(
							(item) => item.id === node.id,
						);
						return start
							? { ...node, x: start.x + deltaX, y: start.y + deltaY }
							: node;
					}),
				);
				updateVideoFusionHover(pointerState.origin, deltaX, deltaY);
				setPointerState({
					mode: "dragging-nodes",
					startX: pointerState.startX,
					startY: pointerState.startY,
					origin: pointerState.origin,
				});
				return;
			}
			if (pointerState.mode === "dragging-nodes") {
				const deltaX = (event.clientX - pointerState.startX) / zoom;
				const deltaY = (event.clientY - pointerState.startY) / zoom;
				setNodes((current) =>
					current.map((node) => {
						const start = pointerState.origin.find(
							(item) => item.id === node.id,
						);
						return start
							? { ...node, x: start.x + deltaX, y: start.y + deltaY }
							: node;
					}),
				);
				updateVideoFusionHover(pointerState.origin, deltaX, deltaY);
			} else if (pointerState.mode === "panning") {
				setPan({
					x: pointerState.originX + event.clientX - pointerState.startX,
					y: pointerState.originY + event.clientY - pointerState.startY,
				});
			} else if (pointerState.mode === "selecting") {
				setPointerState({
					...pointerState,
					currentX: event.clientX,
					currentY: event.clientY,
				});
			}
		},
		[
			clearNodeLiftTimer,
			isDraggingNodePositionChangeSnapshotTakenRef,
			pointerState,
			pushUndoSnapshot,
			setLiftedDragIds,
			setNodes,
			setPan,
			setPointerState,
			updateVideoFusionHover,
			zoom,
		],
	);

	const handleCanvasPointerUp = useCallback(() => {
		if (pointerState.mode === "dragging-nodes" && videoFusionHoverNodeId) {
			const sourceNodeId = pointerState.origin
				.map((item) =>
					latestNodesRef.current.find((node) => node.id === item.id),
				)
				.find(
					(node) =>
						node?.asset &&
						(node.type === "video" ||
							node.type === "audio" ||
							node.type === "music"),
				)?.id;
			const sourceNode = sourceNodeId
				? latestNodesRef.current.find((node) => node.id === sourceNodeId)
				: null;
			const targetNode = latestNodesRef.current.find(
				(node) => node.id === videoFusionHoverNodeId,
			);
			if (
				sourceNode?.type === "video" &&
				sourceNode.asset &&
				targetNode?.type === "video" &&
				targetNode.asset
			) {
				setVideoFusionPrompt({
					sourceNodeId: sourceNode.id,
					targetNodeId: targetNode.id,
				});
			} else if (
				(sourceNode?.type === "audio" || sourceNode?.type === "music") &&
				sourceNode.asset &&
				targetNode?.type === "video" &&
				targetNode.asset
			) {
				void fuseAudioVideoNodes(sourceNode.id, targetNode.id);
			}
		}
		setVideoFusionHoverNodeId(null);
		resetNodeLift();
		isDraggingNodePositionChangeSnapshotTakenRef.current = false;
		setPointerState((current) =>
			current.mode === "idle" ? current : { mode: "idle" },
		);
	}, [
		fuseAudioVideoNodes,
		isDraggingNodePositionChangeSnapshotTakenRef,
		latestNodesRef,
		pointerState,
		resetNodeLift,
		setPointerState,
		setVideoFusionHoverNodeId,
		setVideoFusionPrompt,
		videoFusionHoverNodeId,
	]);

	const handleCanvasDoubleClick = useCallback(
		(event: ReactMouseEvent<HTMLDivElement>) => {
			if (isCanvasInteractiveTarget(event.target)) return;
			event.preventDefault();
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;
			const worldPoint = screenToWorld(
				event.clientX - rect.left,
				event.clientY - rect.top,
				pan.x,
				pan.y,
				zoom,
			);
			setMenuAt({
				mode: "blank",
				x: clamp(event.clientX - rect.left, 48, rect.width - 360),
				y: clamp(event.clientY - rect.top, 48, rect.height - 460),
				worldX: worldPoint.x,
				worldY: worldPoint.y,
			});
		},
		[canvasRef, pan.x, pan.y, screenToWorld, setMenuAt, zoom],
	);

	const handleNodeClick = useCallback(
		(event: CanvasNodeClickEvent, id: string) => {
			event.stopPropagation();
			dismissOverlays();
			setSelectedIds([id]);
		},
		[dismissOverlays, setSelectedIds],
	);

	const handleNodeContextMenu = useCallback(
		(event: CanvasNodeContextMenuEvent, id: string) => {
			event.preventDefault();
			event.stopPropagation();
			setSelectedIds([id]);
			setOpenDropdown(null);
			setMenuAt(null);
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;
			setNodeMenuAt({
				nodeId: id,
				x: clamp(event.clientX - rect.left, 24, rect.width - 300),
				y: clamp(event.clientY - rect.top, 24, rect.height - 360),
			});
		},
		[
			canvasRef,
			setMenuAt,
			setNodeMenuAt,
			setOpenDropdown,
			setSelectedIds,
		],
	);

	return {
		handleBlankPointerDown,
		handleCanvasPointerMove,
		handleCanvasPointerUp,
		handleCanvasDoubleClick,
		handleNodeClick,
		handleNodeContextMenu,
	};
}
