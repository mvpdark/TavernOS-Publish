import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import { useCallback } from "react";
import { findNearestConnectionPortFromGeometry } from "../appConnectionPortGeometry";
import { reconcileAutoNodeStyles } from "../connectionInteractionHelpers";
import type { CanvasNode, StyleLibraryState } from "../canvas-types";

export type PortSide = "left" | "right";
export type NodePort = { nodeId: string; side: PortSide };
export type NodeConnection = { id: string; from: NodePort; to: NodePort };
export type ConnectionCutState = {
	connectionId: string;
	x: number;
	y: number;
	visible: boolean;
} | null;

type Point = { x: number; y: number };

type UseConnectionInteractionHelpersArgs = {
	canvasRef: RefObject<HTMLDivElement | null>;
	nodes: CanvasNode[];
	pan: Point;
	zoom: number;
	styleLibrary: StyleLibraryState;
	setConnectionCut: Dispatch<SetStateAction<ConnectionCutState>>;
	clearConnectionCutTimer: () => void;
	scheduleConnectionCutReveal: (connectionId: string) => void;
	pushUndoSnapshot: () => void;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
};

export function useConnectionInteractionHelpers({
	canvasRef,
	nodes,
	pan,
	zoom,
	styleLibrary,
	setConnectionCut,
	clearConnectionCutTimer,
	scheduleConnectionCutReveal,
	pushUndoSnapshot,
	setConnections,
	setNodes,
}: UseConnectionInteractionHelpersArgs) {
	const findNearestConnectionPort = useCallback(
		(
			clientX: number,
			clientY: number,
			source?: NodePort | null,
		): {
			nodeId: string;
			side: PortSide;
			distance: number;
			dx: number;
			dy: number;
		} | null => {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return null;
			return findNearestConnectionPortFromGeometry({
				clientX,
				clientY,
				source,
				canvasRect: rect,
				nodes,
				pan,
				zoom,
			});
		},
		[canvasRef, nodes, pan, zoom],
	);

	const updateConnectionCutPosition = useCallback(
		(
			connectionId: string,
			clientX: number,
			clientY: number,
			visible?: boolean,
		) => {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;
			setConnectionCut((current) => ({
				connectionId,
				x: clientX - rect.left,
				y: clientY - rect.top,
				visible: visible ?? current?.visible ?? false,
			}));
		},
		[canvasRef, setConnectionCut],
	);

	const handleConnectionHoverMove = useCallback(
		(event: ReactPointerEvent<SVGPathElement>, connectionId: string) => {
			updateConnectionCutPosition(connectionId, event.clientX, event.clientY);
		},
		[updateConnectionCutPosition],
	);

	const handleConnectionHoverEnter = useCallback(
		(event: ReactPointerEvent<SVGPathElement>, connectionId: string) => {
			clearConnectionCutTimer();
			updateConnectionCutPosition(
				connectionId,
				event.clientX,
				event.clientY,
				false,
			);
			scheduleConnectionCutReveal(connectionId);
		},
		[
			clearConnectionCutTimer,
			scheduleConnectionCutReveal,
			updateConnectionCutPosition,
		],
	);

	const handleConnectionHoverLeave = useCallback(
		(event: ReactPointerEvent<SVGPathElement>, connectionId: string) => {
			const nextTarget =
				event.relatedTarget instanceof Element ? event.relatedTarget : null;
			if (nextTarget?.closest(".connection-cut-button")) return;
			clearConnectionCutTimer();
			setConnectionCut((current) =>
				current?.connectionId === connectionId ? null : current,
			);
		},
		[clearConnectionCutTimer, setConnectionCut],
	);

	const cutConnection = useCallback(
		(connectionId: string) => {
			pushUndoSnapshot();
			setConnections((current) => {
				const nextConnections = current.filter(
					(connection) => connection.id !== connectionId,
				);
				setNodes((nodesCurrent) =>
					reconcileAutoNodeStyles(nodesCurrent, nextConnections, styleLibrary),
				);
				return nextConnections;
			});
			clearConnectionCutTimer();
			setConnectionCut(null);
		},
		[
			clearConnectionCutTimer,
			pushUndoSnapshot,
			setConnectionCut,
			setConnections,
			setNodes,
			styleLibrary,
		],
	);

	return {
		findNearestConnectionPort,
		updateConnectionCutPosition,
		handleConnectionHoverMove,
		handleConnectionHoverEnter,
		handleConnectionHoverLeave,
		cutConnection,
	};
}
