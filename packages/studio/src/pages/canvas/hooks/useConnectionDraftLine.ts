import type {
	Dispatch,
	MutableRefObject,
	PointerEvent as ReactPointerEvent,
	SetStateAction,
} from "react";
import { useCallback } from "react";

import { getConnectionPortPoint } from "../appConnectionPortGeometry";
import {
	createMagnetPortState,
	createReferenceAddNodeMenuState,
} from "../appConnectionDraftHelpers";
import type {
	AddNodeMenuState,
	MagnetPortState,
	PointerState,
} from "../appCanvasState";
import type { CanvasPoint } from "../canvasNodeActions";
import type { CanvasNode, OpenDropdown } from "../canvas-types";
import type { NodePort, PortSide } from "./useConnectionInteractionHelpers";

type PendingConnectionState =
	| (NodePort & { pointerX: number; pointerY: number })
	| null;

type NearestConnectionPort = {
	nodeId: string;
	side: PortSide;
	distance: number;
	dx: number;
	dy: number;
} | null;

type NodeMenuState = {
	x: number;
	y: number;
	nodeId: string;
};

export type UseConnectionDraftLineConfig = {
	canvasRef: MutableRefObject<HTMLDivElement | null>;
	nodeById: Map<string, CanvasNode>;
	zoom: number;
	getWorldPointFromClient: (
		clientX: number,
		clientY: number,
	) => CanvasPoint | null;
	findNearestConnectionPort: (
		clientX: number,
		clientY: number,
		source?: NodePort | null,
	) => NearestConnectionPort;
	completeConnection: (from: NodePort, to: NodePort) => void;
	resetNodeLift: () => void;
	setPendingConnection: Dispatch<SetStateAction<PendingConnectionState>>;
	setMagnetPort: Dispatch<SetStateAction<MagnetPortState>>;
	setMenuAt: Dispatch<SetStateAction<AddNodeMenuState | null>>;
	setNodeMenuAt: Dispatch<SetStateAction<NodeMenuState | null>>;
	setOpenDropdown: Dispatch<SetStateAction<OpenDropdown>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setPointerState: Dispatch<SetStateAction<PointerState>>;
};

export function useConnectionDraftLine({
	canvasRef,
	nodeById,
	zoom,
	getWorldPointFromClient,
	findNearestConnectionPort,
	completeConnection,
	resetNodeLift,
	setPendingConnection,
	setMagnetPort,
	setMenuAt,
	setNodeMenuAt,
	setOpenDropdown,
	setSelectedIds,
	setPointerState,
}: UseConnectionDraftLineConfig) {
	const getPortPoint = useCallback(
		(nodeId: string, side: PortSide) => {
			const node = nodeById.get(nodeId);
			if (!node) return null;
			return getConnectionPortPoint(node, side);
		},
		[nodeById],
	);

	const handleConnectionPortPointerDown = useCallback(
		(
			event: ReactPointerEvent<HTMLButtonElement>,
			nodeId: string,
			side: PortSide,
		) => {
			event.preventDefault();
			event.stopPropagation();
			const point = getPortPoint(nodeId, side);
			if (!point) return;
			const pointerId = event.pointerId;
			const portElement = event.currentTarget;
			const sourcePort: NodePort = { nodeId, side };
			let finished = false;
			const updateDraftLine = (clientX: number, clientY: number) => {
				const pointer = getWorldPointFromClient(clientX, clientY);
				if (!pointer) return;
				setPendingConnection((current) =>
					current?.nodeId === sourcePort.nodeId &&
					current.side === sourcePort.side
						? { ...current, pointerX: pointer.x, pointerY: pointer.y }
						: current,
				);
				const nearestPort = findNearestConnectionPort(
					clientX,
					clientY,
					sourcePort,
				);
				setMagnetPort(createMagnetPortState(nearestPort, zoom));
			};
			const cleanupDraftListeners = () => {
				window.removeEventListener("pointermove", handleWindowPointerMove, true);
				window.removeEventListener("pointerup", handleWindowPointerUp, true);
				window.removeEventListener(
					"pointercancel",
					handleWindowPointerCancel,
					true,
				);
				portElement.removeEventListener("pointerup", handlePortPointerUp);
				portElement.releasePointerCapture?.(pointerId);
			};
			const finishDraftLine = (clientX: number, clientY: number) => {
				if (finished) return;
				finished = true;
				cleanupDraftListeners();
				updateDraftLine(clientX, clientY);
				const nearestPort = findNearestConnectionPort(
					clientX,
					clientY,
					sourcePort,
				);
				const targetNodeId = nearestPort?.nodeId;
				const targetSide = nearestPort?.side;
				if (targetNodeId && (targetSide === "left" || targetSide === "right")) {
					completeConnection(sourcePort, {
						nodeId: targetNodeId,
						side: targetSide,
					});
				} else {
					const rect = canvasRef.current?.getBoundingClientRect();
					const pointer = getWorldPointFromClient(clientX, clientY);
					if (rect && pointer) {
						setMenuAt(
							createReferenceAddNodeMenuState({
								clientX,
								clientY,
								canvasRect: rect,
								worldPoint: pointer,
								sourcePort,
							}),
						);
					}
				}
				setPendingConnection(null);
				setMagnetPort(null);
			};
			function handleWindowPointerMove(pointerEvent: PointerEvent) {
				if (pointerEvent.pointerId !== pointerId) return;
				updateDraftLine(pointerEvent.clientX, pointerEvent.clientY);
			}
			function handleWindowPointerUp(pointerEvent: PointerEvent) {
				if (pointerEvent.pointerId !== pointerId) return;
				pointerEvent.preventDefault();
				pointerEvent.stopPropagation();
				finishDraftLine(pointerEvent.clientX, pointerEvent.clientY);
			}
			function handleWindowPointerCancel(pointerEvent: PointerEvent) {
				if (pointerEvent.pointerId !== pointerId) return;
				cleanupDraftListeners();
				setPendingConnection(null);
				setMagnetPort(null);
			}
			function handlePortPointerUp(pointerEvent: PointerEvent) {
				if (pointerEvent.pointerId !== pointerId) return;
				pointerEvent.preventDefault();
				pointerEvent.stopPropagation();
				finishDraftLine(pointerEvent.clientX, pointerEvent.clientY);
			}
			portElement.setPointerCapture?.(pointerId);
			window.addEventListener("pointermove", handleWindowPointerMove, true);
			window.addEventListener("pointerup", handleWindowPointerUp, true);
			window.addEventListener("pointercancel", handleWindowPointerCancel, true);
			portElement.addEventListener("pointerup", handlePortPointerUp, {
				once: true,
			});
			setMenuAt(null);
			setNodeMenuAt(null);
			setOpenDropdown(null);
			setSelectedIds([nodeId]);
			resetNodeLift();
			setPointerState({ mode: "idle" });
			setPendingConnection({
				nodeId,
				side,
				pointerX: point.x,
				pointerY: point.y,
			});
		},
		[
			canvasRef,
			completeConnection,
			findNearestConnectionPort,
			getPortPoint,
			getWorldPointFromClient,
			resetNodeLift,
			setMagnetPort,
			setMenuAt,
			setNodeMenuAt,
			setOpenDropdown,
			setPendingConnection,
			setPointerState,
			setSelectedIds,
			zoom,
		],
	);

	return {
		getPortPoint,
		handleConnectionPortPointerDown,
	};
}
