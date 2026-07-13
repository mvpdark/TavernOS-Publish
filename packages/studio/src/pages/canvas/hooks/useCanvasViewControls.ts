import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback } from "react";

type Point = { x: number; y: number };

type ScreenToWorld = (
	screenX: number,
	screenY: number,
	panX: number,
	panY: number,
	zoom: number,
) => Point;

type Clamp = (value: number, min: number, max: number) => number;

type UseCanvasViewControlsArgs = {
	canvasRef: MutableRefObject<HTMLDivElement | null>;
	dismissOverlays: () => void;
	pan: Point;
	zoom: number;
	setPan: Dispatch<SetStateAction<Point>>;
	setZoom: Dispatch<SetStateAction<number>>;
	screenToWorld: ScreenToWorld;
	clamp: Clamp;
	zoomMin: number;
	zoomMax: number;
};

export function useCanvasViewControls({
	canvasRef,
	dismissOverlays,
	pan,
	zoom,
	setPan,
	setZoom,
	screenToWorld,
	clamp,
	zoomMin,
	zoomMax,
}: UseCanvasViewControlsArgs) {
	const handleCanvasWheel = useCallback(
		(
			event: Pick<
				WheelEvent,
				| "preventDefault"
				| "ctrlKey"
				| "shiftKey"
				| "deltaY"
				| "clientX"
				| "clientY"
			>,
		) => {
			if (!canvasRef.current) return;
			event.preventDefault();
			dismissOverlays();
			if (event.ctrlKey) {
				const rect = canvasRef.current.getBoundingClientRect();
				const pointerX = event.clientX - rect.left;
				const pointerY = event.clientY - rect.top;
				const worldBefore = screenToWorld(
					pointerX,
					pointerY,
					pan.x,
					pan.y,
					zoom,
				);
				const nextZoom = clamp(
					zoom * (event.deltaY > 0 ? 0.92 : 1.08),
					zoomMin,
					zoomMax,
				);
				setZoom(nextZoom);
				setPan({
					x: pointerX - worldBefore.x * nextZoom,
					y: pointerY - worldBefore.y * nextZoom,
				});
			} else if (event.shiftKey)
				setPan((current) => ({
					...current,
					x: current.x - event.deltaY * 0.8,
				}));
			else
				setPan((current) => ({
					...current,
					y: current.y - event.deltaY * 0.8,
				}));
		},
		[
			canvasRef,
			clamp,
			dismissOverlays,
			pan.x,
			pan.y,
			screenToWorld,
			setPan,
			setZoom,
			zoom,
			zoomMax,
			zoomMin,
		],
	);

	const getWorldPointFromClient = useCallback(
		(clientX: number, clientY: number) => {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return null;
			return screenToWorld(
				clientX - rect.left,
				clientY - rect.top,
				pan.x,
				pan.y,
				zoom,
			);
		},
		[canvasRef, pan.x, pan.y, screenToWorld, zoom],
	);

	return {
		handleCanvasWheel,
		getWorldPointFromClient,
	};
}
