import {
	type MouseEvent as ReactMouseEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

type WorkshopContextMenuState = {
	x: number;
	y: number;
	selectionStart: number;
	selectionEnd: number;
	value: string;
};

type UseWorkshopContextMenuParams = {
	workshopStep: 1 | 2 | 3 | 4;
	workshopTextareaRef: RefObject<HTMLTextAreaElement | null>;
	setWorkshopScript: (value: string) => void;
	onNotice: (
		message: string,
		tone?: "info" | "warning",
		dedupeKey?: string,
	) => void;
};

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function useWorkshopContextMenu({
	workshopStep,
	workshopTextareaRef,
	setWorkshopScript,
	onNotice,
}: UseWorkshopContextMenuParams) {
	const [workshopContextMenu, setWorkshopContextMenu] =
		useState<WorkshopContextMenuState | null>(null);
	const workshopStudioRef = useRef<HTMLElement | null>(null);
	const workshopStudioContextMenuHandlerRef = useRef<
		((event: MouseEvent) => void) | null
	>(null);

	const closeWorkshopContextMenu = useCallback(() => {
		setWorkshopContextMenu(null);
	}, []);

	const setWorkshopStudioRef = useCallback((node: HTMLElement | null) => {
		const previousNode = workshopStudioRef.current;
		const previousHandler = workshopStudioContextMenuHandlerRef.current;
		if (previousNode && previousHandler) {
			previousNode.removeEventListener("contextmenu", previousHandler);
		}
		workshopStudioRef.current = node;
		if (!node) {
			workshopStudioContextMenuHandlerRef.current = null;
			return;
		}
		const handleWorkshopContextMenu = (event: MouseEvent) =>
			event.preventDefault();
		workshopStudioContextMenuHandlerRef.current = handleWorkshopContextMenu;
		node.addEventListener("contextmenu", handleWorkshopContextMenu);
	}, []);

	const handleWorkshopTextareaContextMenu = useCallback(
		(event: ReactMouseEvent<HTMLTextAreaElement>) => {
			event.preventDefault();
			event.stopPropagation();
			const textarea = event.currentTarget;
			const stage = textarea.closest(".workshop-stage");
			if (!stage) return;
			const stageRect = stage.getBoundingClientRect();
			const menuWidth = 164;
			const menuHeight = 96;
			const x = clamp(
				event.clientX - stageRect.left,
				16,
				Math.max(16, stageRect.width - menuWidth - 16),
			);
			const y = clamp(
				event.clientY - stageRect.top,
				16,
				Math.max(16, stageRect.height - menuHeight - 16),
			);
			setWorkshopContextMenu({
				x,
				y,
				selectionStart: textarea.selectionStart ?? 0,
				selectionEnd: textarea.selectionEnd ?? 0,
				value: textarea.value,
			});
		},
		[],
	);

	const handleWorkshopCopyFromMenu = useCallback(async () => {
		const selection = workshopContextMenu;
		if (!selection) return;
		const start = Math.min(selection.selectionStart, selection.selectionEnd);
		const end = Math.max(selection.selectionStart, selection.selectionEnd);
		const text =
			start === end ? selection.value : selection.value.slice(start, end);
		try {
			await navigator.clipboard.writeText(text);
			closeWorkshopContextMenu();
		} catch {
			onNotice(
				"复制失败，请检查浏览器剪贴板权限。",
				"warning",
				"workshop-copy-failed",
			);
		}
	}, [closeWorkshopContextMenu, onNotice, workshopContextMenu]);

	const handleWorkshopPasteFromMenu = useCallback(async () => {
		const textarea = workshopTextareaRef.current;
		const selection = workshopContextMenu;
		if (!textarea || !selection) return;
		try {
			const text = await navigator.clipboard.readText();
			const start = Math.min(selection.selectionStart, selection.selectionEnd);
			const end = Math.max(selection.selectionStart, selection.selectionEnd);
			const nextValue = `${selection.value.slice(0, start)}${text}${selection.value.slice(end)}`;
			setWorkshopScript(nextValue);
			requestAnimationFrame(() => {
				textarea.focus();
				const nextCursor = start + text.length;
				textarea.setSelectionRange(nextCursor, nextCursor);
			});
			closeWorkshopContextMenu();
		} catch {
			onNotice(
				"粘贴失败，请检查浏览器剪贴板权限。",
				"warning",
				"workshop-paste-failed",
			);
		}
	}, [
		closeWorkshopContextMenu,
		onNotice,
		setWorkshopScript,
		workshopContextMenu,
		workshopTextareaRef,
	]);

	useEffect(() => {
		if (!workshopContextMenu) return;
		const handleWorkshopMenuPointerDown = (event: PointerEvent) => {
			const target = event.target instanceof HTMLElement ? event.target : null;
			if (target?.closest(".workshop-context-menu")) return;
			setWorkshopContextMenu(null);
		};
		const handleWorkshopMenuKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setWorkshopContextMenu(null);
		};
		const handleWorkshopMenuScroll = () => setWorkshopContextMenu(null);
		window.addEventListener("pointerdown", handleWorkshopMenuPointerDown, true);
		window.addEventListener("keydown", handleWorkshopMenuKeyDown, true);
		window.addEventListener("scroll", handleWorkshopMenuScroll, true);
		return () => {
			window.removeEventListener(
				"pointerdown",
				handleWorkshopMenuPointerDown,
				true,
			);
			window.removeEventListener("keydown", handleWorkshopMenuKeyDown, true);
			window.removeEventListener("scroll", handleWorkshopMenuScroll, true);
		};
	}, [workshopContextMenu]);

	useEffect(() => {
		if (workshopStep) setWorkshopContextMenu(null);
	}, [workshopStep]);

	return {
		workshopContextMenu,
		closeWorkshopContextMenu,
		setWorkshopStudioRef,
		handleWorkshopTextareaContextMenu,
		handleWorkshopCopyFromMenu,
		handleWorkshopPasteFromMenu,
	};
}
