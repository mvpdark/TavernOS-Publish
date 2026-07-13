export const CANVAS_INTERACTIVE_TARGET_SELECTOR =
	".canvas-node, .floating-composer-wrap, .composer, .text-format-bar, .add-node-menu, .node-context-menu, .model-menu, .canvas-library, .hidden-settings, .right-panel, .left-dock, .top-toolbar, .bottom-zoom, .video-preview-modal, .image-preview-modal";

export function isTypingTag(
	tagName: string | undefined,
	isContentEditable = false,
) {
	const normalizedTagName = tagName?.toUpperCase();
	return (
		normalizedTagName === "INPUT" ||
		normalizedTagName === "TEXTAREA" ||
		isContentEditable
	);
}

export function isTypingTarget(target: EventTarget | null) {
	return target instanceof HTMLElement
		? isTypingTag(target.tagName, target.isContentEditable)
		: false;
}

export function isCanvasInteractiveTarget(target: EventTarget | null) {
	return target instanceof HTMLElement
		? Boolean(target.closest(CANVAS_INTERACTIVE_TARGET_SELECTOR))
		: false;
}
