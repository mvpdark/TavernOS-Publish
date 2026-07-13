import type {
	DragEventHandler,
	MouseEventHandler,
	PointerEventHandler,
	ReactNode,
	Ref,
} from "react";
import type { PointerState } from "../appCanvasState";

type CanvasStageShellProps = {
	sidePanelOpen: boolean;
	canvasRef: Ref<HTMLDivElement>;
	pointerMode: PointerState["mode"];
	isLiftingNode: boolean;
	isDropActive: boolean;
	isFocusAnimating: boolean;
	isCropMode: boolean;
	onBlankPointerDown: PointerEventHandler<HTMLDivElement>;
	onCanvasPointerMove: PointerEventHandler<HTMLDivElement>;
	onCanvasPointerUp: PointerEventHandler<HTMLDivElement>;
	onCanvasDragEnter: DragEventHandler<HTMLDivElement>;
	onCanvasDragOver: DragEventHandler<HTMLDivElement>;
	onCanvasDragLeave: DragEventHandler<HTMLDivElement>;
	onCanvasDrop: DragEventHandler<HTMLDivElement>;
	onCanvasDoubleClick: MouseEventHandler<HTMLDivElement>;
	children: ReactNode;
};

export function CanvasStageShell({
	sidePanelOpen,
	canvasRef,
	pointerMode,
	isLiftingNode,
	isDropActive,
	isFocusAnimating,
	isCropMode,
	onBlankPointerDown,
	onCanvasPointerMove,
	onCanvasPointerUp,
	onCanvasDragEnter,
	onCanvasDragOver,
	onCanvasDragLeave,
	onCanvasDrop,
	onCanvasDoubleClick,
	children,
}: CanvasStageShellProps) {
	const surfaceClassName = [
		"canvas-surface",
		pointerMode === "panning" ? "is-panning" : "",
		pointerMode === "dragging-nodes" ? "is-dragging-node" : "",
		isLiftingNode ? "is-lifting-node" : "",
		isDropActive ? "is-drop-active" : "",
		isFocusAnimating ? "is-focus-animating" : "",
		isCropMode ? "is-crop-mode" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<section className={`canvas-stage ${sidePanelOpen ? "" : "canvas-stage--wide"}`}>
			<div
				ref={canvasRef}
				className={surfaceClassName}
				role="application"
				aria-label="画布工作区"
				onPointerDown={onBlankPointerDown}
				onPointerMove={onCanvasPointerMove}
				onPointerUp={onCanvasPointerUp}
				onDragEnter={onCanvasDragEnter}
				onDragOver={onCanvasDragOver}
				onDragLeave={onCanvasDragLeave}
				onDrop={onCanvasDrop}
				onDoubleClick={onCanvasDoubleClick}
				onContextMenu={(event) => event.preventDefault()}
			>
				{children}
			</div>
		</section>
	);
}
