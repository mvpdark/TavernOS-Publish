import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useEffect,
} from "react";

import type { NodePort, PortSide } from "./useConnectionInteractionHelpers";

type PendingConnectionDraft = NodePort & {
	pointerX: number;
	pointerY: number;
};

type MagnetPortState = {
	nodeId: string;
	side: PortSide;
	x: number;
	y: number;
} | null;

type ReferenceMenuState = {
	mode: "reference";
	x: number;
	y: number;
	worldX: number;
	worldY: number;
	from: NodePort;
} | null;

type UsePendingConnectionDraftArgs = {
	canvasRef: RefObject<HTMLDivElement | null>;
	clamp: (value: number, min: number, max: number) => number;
	completeConnection: (source: NodePort, target: NodePort) => void;
	findNearestConnectionPort: (
		clientX: number,
		clientY: number,
		source?: NodePort | null,
	) => {
		nodeId: string;
		side: PortSide;
		distance: number;
		dx: number;
		dy: number;
	} | null;
	getWorldPointFromClient: (
		clientX: number,
		clientY: number,
	) => { x: number; y: number } | null;
	pendingConnection: PendingConnectionDraft | null;
	setMagnetPort: (value: MagnetPortState) => void;
	setMenuAt: (value: ReferenceMenuState) => void;
	setPendingConnection: Dispatch<SetStateAction<PendingConnectionDraft | null>>;
	zoom: number;
};

export function usePendingConnectionDraft({
	canvasRef,
	clamp,
	completeConnection,
	findNearestConnectionPort,
	getWorldPointFromClient,
	pendingConnection,
	setMagnetPort,
	setMenuAt,
	setPendingConnection,
	zoom,
}: UsePendingConnectionDraftArgs) {
	useEffect(() => {
		if (!pendingConnection) return;
		const sourcePort: NodePort = {
			nodeId: pendingConnection.nodeId,
			side: pendingConnection.side,
		};
		const updateDraftLine = (event: PointerEvent) => {
			const pointer = getWorldPointFromClient(event.clientX, event.clientY);
			if (!pointer) return;
			setPendingConnection((current) =>
				current
					? { ...current, pointerX: pointer.x, pointerY: pointer.y }
					: current,
			);
			const nearestPort = findNearestConnectionPort(
				event.clientX,
				event.clientY,
				sourcePort,
			);
			if (nearestPort) {
				setMagnetPort({
					nodeId: nearestPort.nodeId,
					side: nearestPort.side,
					x: clamp((nearestPort.dx / zoom) * 0.28, -18, 18),
					y: clamp((nearestPort.dy / zoom) * 0.28, -18, 18),
				});
			} else {
				setMagnetPort(null);
			}
		};
		const finishDraftLine = (event: PointerEvent) => {
			updateDraftLine(event);
			const nearestPort = findNearestConnectionPort(
				event.clientX,
				event.clientY,
				sourcePort,
			);
			const targetNodeId = nearestPort?.nodeId;
			const targetSide = nearestPort?.side;
			if (targetNodeId && (targetSide === "left" || targetSide === "right")) {
				completeConnection(sourcePort, { nodeId: targetNodeId, side: targetSide });
				setPendingConnection(null);
			} else {
				const rect = canvasRef.current?.getBoundingClientRect();
				const pointer = getWorldPointFromClient(event.clientX, event.clientY);
				if (rect && pointer) {
					setMenuAt({
						mode: "reference",
						x: clamp(event.clientX - rect.left, 24, rect.width - 320),
						y: clamp(event.clientY - rect.top, 24, rect.height - 280),
						worldX: pointer.x,
						worldY: pointer.y,
						from: {
							nodeId: sourcePort.nodeId,
							side: sourcePort.side,
						},
					});
				}
				setPendingConnection(null);
			}
			setMagnetPort(null);
		};
		window.addEventListener("pointermove", updateDraftLine);
		window.addEventListener("pointerup", finishDraftLine, { once: true });
		return () => {
			window.removeEventListener("pointermove", updateDraftLine);
			window.removeEventListener("pointerup", finishDraftLine);
		};
	}, [
		canvasRef,
		clamp,
		completeConnection,
		findNearestConnectionPort,
		getWorldPointFromClient,
		pendingConnection?.nodeId,
		pendingConnection?.side,
		setMagnetPort,
		setMenuAt,
		setPendingConnection,
		zoom,
	]);
}
