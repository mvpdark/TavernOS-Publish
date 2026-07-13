import type { ConnectionCutState } from "../hooks/useConnectionInteractionHelpers";

export type CanvasConnectionCutButtonProps = {
	connectionCut: ConnectionCutState;
	onClear: () => void;
	onCut: (connectionId: string) => void;
};

export function CanvasConnectionCutButton({
	connectionCut,
	onClear,
	onCut,
}: CanvasConnectionCutButtonProps) {
	if (!connectionCut?.visible) return null;
	return (
		<button
			type="button"
			className="connection-cut-button"
			style={{
				transform: `translate(${connectionCut.x}px, ${connectionCut.y}px) translate(-50%, -50%)`,
			}}
			onPointerDown={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			onPointerLeave={onClear}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onCut(connectionCut.connectionId);
			}}
			aria-label="切断连线"
		>
			•
		</button>
	);
}
