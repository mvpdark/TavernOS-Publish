import type {
	Dispatch,
	PointerEvent as ReactPointerEvent,
	SetStateAction,
} from "react";
import { useCallback } from "react";

import { clamp } from "../appAspectRatioHelpers";
import type { MagnetPortState } from "../appCanvasState";
import type { NodePort, PortSide } from "./useConnectionInteractionHelpers";

export type PendingConnectionState =
	| (NodePort & { pointerX: number; pointerY: number })
	| null;

export type UseConnectionPortHoverConfig = {
	pendingConnection: PendingConnectionState;
	zoom: number;
	setMagnetPort: Dispatch<SetStateAction<MagnetPortState>>;
};

export function useConnectionPortHover({
	pendingConnection,
	zoom,
	setMagnetPort,
}: UseConnectionPortHoverConfig) {
	const handleConnectionPortPointerMove = useCallback(
		(
			event: ReactPointerEvent<HTMLButtonElement>,
			nodeId: string,
			side: PortSide,
		) => {
			if (pendingConnection) return;
			const rect = event.currentTarget.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			setMagnetPort({
				nodeId,
				side,
				x: clamp(((event.clientX - centerX) / zoom) * 0.32, -22, 22),
				y: clamp(((event.clientY - centerY) / zoom) * 0.32, -22, 22),
			});
		},
		[pendingConnection, setMagnetPort, zoom],
	);

	const handleConnectionPortPointerLeave = useCallback(
		(nodeId: string, side: PortSide) => {
			setMagnetPort((current) =>
				current?.nodeId === nodeId && current.side === side ? null : current,
			);
		},
		[setMagnetPort],
	);

	return {
		handleConnectionPortPointerMove,
		handleConnectionPortPointerLeave,
	};
}
