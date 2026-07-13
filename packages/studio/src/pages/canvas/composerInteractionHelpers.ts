export const COMPOSER_INTERACTIVE_SELECTOR = [
	".model-pill",
	".composer-meta--button",
	".model-menu",
	".style-picker",
	".tool-square",
	".send-btn",
].join(", ");

export type ComposerStoppableEvent = {
	stopPropagation: () => void;
};

export function stopComposerEvent(event: ComposerStoppableEvent) {
	event.stopPropagation();
}

export function isComposerInteractiveTarget(
	target: EventTarget | null,
	extraSelectors: readonly string[] = [],
) {
	const element = target instanceof HTMLElement ? target : null;
	if (!element) return false;
	const selector = [COMPOSER_INTERACTIVE_SELECTOR, ...extraSelectors].join(", ");
	return Boolean(element.closest(selector));
}
