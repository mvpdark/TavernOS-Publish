export type KeyboardShortcutAction =
	| { type: "escape" }
	| { type: "deleteSelection" }
	| { type: "undo" }
	| { type: "redo" }
	| { type: "copyNode" }
	| { type: "pasteNode" }
	| { type: "zoomIn" }
	| { type: "zoomOut" }
	| { type: "resetZoom" }
	| { type: "selectAllNodes" }
	| { type: "resetPan" }
	| { type: "toggleAgent" }
	| { type: "focusComposer" };

export function resolveKeyboardShortcutAction({
	key,
	code,
	ctrlKey = false,
	metaKey = false,
	shiftKey = false,
	isCanvasWorkspace,
	isTypingTarget,
	hasSelection,
	hasPrimaryNode,
	hasCopiedNode,
}: {
	key: string;
	code?: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	isCanvasWorkspace: boolean;
	isTypingTarget: boolean;
	hasSelection: boolean;
	hasPrimaryNode: boolean;
	hasCopiedNode: boolean;
}): KeyboardShortcutAction | null {
	const normalizedKey = key.toLowerCase();
	if (!isCanvasWorkspace && normalizedKey !== "escape") return null;
	if (isTypingTarget && normalizedKey !== "escape") return null;

	if (normalizedKey === "escape") return { type: "escape" };
	if ((key === "Delete" || key === "Backspace") && hasSelection) {
		return { type: "deleteSelection" };
	}

	const command = ctrlKey || metaKey;
	if (command && normalizedKey === "z") {
		return shiftKey ? { type: "redo" } : { type: "undo" };
	}
	if (command && normalizedKey === "c" && hasPrimaryNode) {
		return { type: "copyNode" };
	}
	if (command && normalizedKey === "v" && hasCopiedNode) {
		return { type: "pasteNode" };
	}
	if (command && (key === "+" || key === "=")) {
		return { type: "zoomIn" };
	}
	if (command && key === "-") {
		return { type: "zoomOut" };
	}
	if (command && (normalizedKey === "0" || code === "Digit0")) {
		return { type: "resetZoom" };
	}
	if (shiftKey && (normalizedKey === "0" || code === "Digit0")) {
		return { type: "selectAllNodes" };
	}
	if (command && normalizedKey === " ") {
		return { type: "resetPan" };
	}
	if (command && normalizedKey === "j") {
		return { type: "toggleAgent" };
	}
	if (command && normalizedKey === "i") {
		return { type: "focusComposer" };
	}
	if (normalizedKey === "v") {
		return { type: "focusComposer" };
	}
	return null;
}
