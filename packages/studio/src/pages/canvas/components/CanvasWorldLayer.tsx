import type { CanvasConnectionLayerProps } from "./CanvasConnectionLayer";
import { CanvasConnectionLayer } from "./CanvasConnectionLayer";
import type { CanvasNodeLayerProps } from "./CanvasNodeLayer";
import { CanvasNodeLayer } from "./CanvasNodeLayer";
import type { CanvasSelectionOverlaysProps } from "./CanvasSelectionOverlays";
import { CanvasSelectionOverlays } from "./CanvasSelectionOverlays";

type CanvasWorldLayerProps = {
	pan: { x: number; y: number };
	zoom: number;
	connectionLayerProps: CanvasConnectionLayerProps;
	selectionOverlayProps: CanvasSelectionOverlaysProps;
	nodeLayerProps: CanvasNodeLayerProps;
};

export function CanvasWorldLayer({
	pan,
	zoom,
	connectionLayerProps,
	selectionOverlayProps,
	nodeLayerProps,
}: CanvasWorldLayerProps) {
	return (
		<div
			className="canvas-world"
			style={{
				transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
			}}
		>
			<CanvasConnectionLayer {...connectionLayerProps} />
			<CanvasSelectionOverlays {...selectionOverlayProps} />
			<CanvasNodeLayer {...nodeLayerProps} />
		</div>
	);
}
