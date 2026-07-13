import type { MutableRefObject } from "react";

import type { CanvasNodePointerDownEvent } from "../hooks/useCanvasNodeDragStart";
import type {
	CanvasNodeClickEvent,
	CanvasNodeContextMenuEvent,
} from "../hooks/useCanvasPointerInteractions";
import type { NodeType } from "../canvas-types";

const NODE_INTERACTIVE_SELECTOR = [
	"button",
	"input",
	"textarea",
	"select",
	"a",
	'[contenteditable="true"]',
	'[data-node-interactive="true"]',
	".image-crop-editor",
	".crop-extension-panel",
	".perspective-editor",
	".redraw-mask-editor",
	".redraw-mask-panel",
].join(", ");

function isInteractiveTarget(target: EventTarget | null) {
	return target instanceof HTMLElement && Boolean(target.closest(NODE_INTERACTIVE_SELECTOR));
}

export type CanvasNodeInteractionBridgeOptions = {
	nodeElement: HTMLDivElement;
	nodeId: string;
	nodeTypeRef: MutableRefObject<NodeType>;
	nodeAssetUrlRef: MutableRefObject<string | null>;
	onPointerDown: (event: CanvasNodePointerDownEvent, id: string) => void;
	onClick: (event: CanvasNodeClickEvent, id: string) => void;
	onContextMenu: (event: CanvasNodeContextMenuEvent, id: string) => void;
	onOpenImagePreviewRef: MutableRefObject<(nodeId: string) => void>;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
};

export function attachCanvasNodeInteractionBridge({
	nodeElement,
	nodeId,
	nodeTypeRef,
	nodeAssetUrlRef,
	onPointerDown,
	onClick,
	onContextMenu,
	onOpenImagePreviewRef,
	onMouseEnter,
	onMouseLeave,
}: CanvasNodeInteractionBridgeOptions) {
	const handlePointerDown = (event: globalThis.PointerEvent) => {
		if (isInteractiveTarget(event.target)) return;
		onPointerDown(event, nodeId);
	};

	const handleClick = (event: globalThis.MouseEvent) => {
		if (isInteractiveTarget(event.target)) return;
		onClick(event, nodeId);
	};

	const handleContextMenu = (event: globalThis.MouseEvent) => {
		if (isInteractiveTarget(event.target)) return;
		onContextMenu(event, nodeId);
	};

	const handleDoubleClick = (event: globalThis.MouseEvent) => {
		if (nodeTypeRef.current !== "image" || !nodeAssetUrlRef.current) return;
		const target = event.target instanceof HTMLElement ? event.target : null;
		const isPanoramaPreviewTarget = Boolean(target?.closest(".three-d-director-panorama"));
		if (isInteractiveTarget(event.target) && !isPanoramaPreviewTarget) return;
		if (!target?.closest(".canvas-node__asset-preview--image")) return;
		event.preventDefault();
		event.stopPropagation();
		onOpenImagePreviewRef.current(nodeId);
	};

	nodeElement.addEventListener("pointerdown", handlePointerDown);
	nodeElement.addEventListener("click", handleClick);
	nodeElement.addEventListener("contextmenu", handleContextMenu);
	nodeElement.addEventListener("dblclick", handleDoubleClick);
	nodeElement.addEventListener("mouseenter", onMouseEnter);
	nodeElement.addEventListener("mouseleave", onMouseLeave);

	return () => {
		nodeElement.removeEventListener("pointerdown", handlePointerDown);
		nodeElement.removeEventListener("click", handleClick);
		nodeElement.removeEventListener("contextmenu", handleContextMenu);
		nodeElement.removeEventListener("dblclick", handleDoubleClick);
		nodeElement.removeEventListener("mouseenter", onMouseEnter);
		nodeElement.removeEventListener("mouseleave", onMouseLeave);
	};
}
