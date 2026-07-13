import type { PointerEvent } from "react";

import type { NodePortSide } from "./CanvasNodeView";

type CanvasNodeConnectionPortsProps = {
	nodeId: string;
	showPorts: boolean;
	pendingConnectionSide: NodePortSide | null;
	magnetPort: { side: NodePortSide; x: number; y: number } | null;
	onConnectionPortPointerDown: (
		event: PointerEvent<HTMLButtonElement>,
		nodeId: string,
		side: NodePortSide,
	) => void;
	onConnectionPortPointerMove: (
		event: PointerEvent<HTMLButtonElement>,
		nodeId: string,
		side: NodePortSide,
	) => void;
	onConnectionPortPointerLeave: (nodeId: string, side: NodePortSide) => void;
};

export function CanvasNodeConnectionPorts({
	nodeId,
	showPorts,
	pendingConnectionSide,
	magnetPort,
	onConnectionPortPointerDown,
	onConnectionPortPointerMove,
	onConnectionPortPointerLeave,
}: CanvasNodeConnectionPortsProps) {
	return (
		<>
			{(["left", "right"] as const).map((side) => {
				const isMagnetized = magnetPort?.side === side;
				return (
					<button
						key={side}
						className={`node-port-zone node-port-zone--${side} ${isMagnetized ? "is-magnetized" : ""}`}
						type="button"
						data-node-id={nodeId}
						data-port-side={side}
						onPointerDown={(event) =>
							onConnectionPortPointerDown(event, nodeId, side)
						}
						onPointerMove={(event) =>
							onConnectionPortPointerMove(event, nodeId, side)
						}
						onPointerLeave={() => onConnectionPortPointerLeave(nodeId, side)}
						onClick={(event) => event.stopPropagation()}
						aria-label={`从${side === "left" ? "左侧" : "右侧"}端口建立连接`}
					>
						<span
							className={`node-plus node-plus--${side} ${showPorts || isMagnetized ? "is-visible" : ""} ${
								pendingConnectionSide === side ? "is-connecting" : ""
							}`}
							style={
								isMagnetized
									? {
											["--magnet-x" as string]: `${magnetPort.x}px`,
											["--magnet-y" as string]: `${magnetPort.y}px`,
										}
									: undefined
							}
						>
							+
						</span>
					</button>
				);
			})}
		</>
	);
}
