import type { PointerEvent as ReactPointerEvent } from "react";

import { getConnectionPath } from "../appCanvasMediaHelpers";
import type {
	NodeConnection,
	NodePort,
	PortSide,
} from "../hooks/useConnectionInteractionHelpers";

type Point = { x: number; y: number };

export type PendingConnectionState =
	| (NodePort & { pointerX: number; pointerY: number })
	| null;

export type CanvasConnectionLayerProps = {
	visibleConnections: NodeConnection[];
	pendingConnection: PendingConnectionState;
	getPortPoint: (nodeId: string, side: PortSide) => Point | null;
	onConnectionHoverEnter: (
		event: ReactPointerEvent<SVGPathElement>,
		connectionId: string,
	) => void;
	onConnectionHoverMove: (
		event: ReactPointerEvent<SVGPathElement>,
		connectionId: string,
	) => void;
	onConnectionHoverLeave: (
		event: ReactPointerEvent<SVGPathElement>,
		connectionId: string,
	) => void;
};

export function CanvasConnectionLayer({
	visibleConnections,
	pendingConnection,
	getPortPoint,
	onConnectionHoverEnter,
	onConnectionHoverMove,
	onConnectionHoverLeave,
}: CanvasConnectionLayerProps) {
	return (
		<svg className="connection-layer" aria-hidden="true">
			<defs>
				<marker
					id="connection-arrow"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M 0 0 L 10 5 L 0 10 z" />
				</marker>
			</defs>
			{visibleConnections.map((connection) => {
				const start = getPortPoint(
					connection.from.nodeId,
					connection.from.side,
				);
				const end = getPortPoint(connection.to.nodeId, connection.to.side);
				if (!start || !end) return null;
				const path = getConnectionPath(
					start,
					end,
					connection.from.side,
					connection.to.side,
				);
				return (
					<g key={connection.id} className="connection-group">
						<path
							className="connection-path"
							d={path}
							markerEnd="url(#connection-arrow)"
						/>
						<path
							className="connection-hit-path"
							d={path}
							onPointerEnter={(event) =>
								onConnectionHoverEnter(event, connection.id)
							}
							onPointerMove={(event) =>
								onConnectionHoverMove(event, connection.id)
							}
							onPointerLeave={(event) =>
								onConnectionHoverLeave(event, connection.id)
							}
							onPointerDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
						/>
					</g>
				);
			})}
			{pendingConnection
				? (() => {
						const start = getPortPoint(
							pendingConnection.nodeId,
							pendingConnection.side,
						);
						if (!start) return null;
						return (
							<path
								className="connection-path connection-path--draft"
								d={getConnectionPath(
									start,
									{
										x: pendingConnection.pointerX,
										y: pendingConnection.pointerY,
									},
									pendingConnection.side,
									pendingConnection.side === "left" ? "right" : "left",
								)}
							/>
						);
					})()
				: null}
		</svg>
	);
}
