import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";

type LiftablePointerState = {
	mode: string;
	origin?: Array<{ id: string }>;
};

type UseCanvasOverlayControlsArgs<
	TMenuAt,
	TNodeMenuAt,
	TOpenDropdown,
	TPendingConnection,
	TMagnetPort,
	TConnectionCut,
	TVideoPreview,
> = {
	closeWorkshopContextMenu: () => void;
	pointerStateRef: MutableRefObject<LiftablePointerState>;
	setLiftedDragIds: Dispatch<SetStateAction<Set<string>>>;
	setMenuAt: Dispatch<SetStateAction<TMenuAt | null>>;
	setNodeMenuAt: Dispatch<SetStateAction<TNodeMenuAt | null>>;
	setOpenDropdown: Dispatch<SetStateAction<TOpenDropdown | null>>;
	setIsCanvasLibraryOpen: Dispatch<SetStateAction<boolean>>;
	setIsHiddenSettingsOpen: Dispatch<SetStateAction<boolean>>;
	setRenamingNodeId: Dispatch<SetStateAction<string | null>>;
	setRenameDraft: Dispatch<SetStateAction<string>>;
	setPendingConnection: Dispatch<SetStateAction<TPendingConnection | null>>;
	setMagnetPort: Dispatch<SetStateAction<TMagnetPort | null>>;
	setConnectionCut: Dispatch<SetStateAction<TConnectionCut | null>>;
	setVideoPreview: Dispatch<SetStateAction<TVideoPreview | null>>;
};

export function useCanvasOverlayControls<
	TMenuAt,
	TNodeMenuAt,
	TOpenDropdown,
	TPendingConnection,
	TMagnetPort,
	TConnectionCut extends { connectionId: string; visible: boolean },
	TVideoPreview,
>({
	closeWorkshopContextMenu,
	pointerStateRef,
	setLiftedDragIds,
	setMenuAt,
	setNodeMenuAt,
	setOpenDropdown,
	setIsCanvasLibraryOpen,
	setIsHiddenSettingsOpen,
	setRenamingNodeId,
	setRenameDraft,
	setPendingConnection,
	setMagnetPort,
	setConnectionCut,
	setVideoPreview,
}: UseCanvasOverlayControlsArgs<
	TMenuAt,
	TNodeMenuAt,
	TOpenDropdown,
	TPendingConnection,
	TMagnetPort,
	TConnectionCut,
	TVideoPreview
>) {
	const nodeLiftTimerRef = useRef<number | null>(null);
	const connectionCutTimerRef = useRef<number | null>(null);

	const clearNodeLiftTimer = useCallback(() => {
		if (nodeLiftTimerRef.current === null) return;
		window.clearTimeout(nodeLiftTimerRef.current);
		nodeLiftTimerRef.current = null;
	}, []);

	const clearConnectionCutTimer = useCallback(() => {
		if (connectionCutTimerRef.current === null) return;
		window.clearTimeout(connectionCutTimerRef.current);
		connectionCutTimerRef.current = null;
	}, []);

	const resetNodeLift = useCallback(() => {
		clearNodeLiftTimer();
		setLiftedDragIds((current) => (current.size === 0 ? current : new Set()));
	}, [clearNodeLiftTimer, setLiftedDragIds]);

	const dismissOverlays = useCallback(() => {
		setMenuAt(null);
		setNodeMenuAt(null);
		setOpenDropdown(null);
		setIsCanvasLibraryOpen(false);
		setIsHiddenSettingsOpen(false);
		closeWorkshopContextMenu();
		setRenamingNodeId(null);
		setRenameDraft("");
		setPendingConnection(null);
		setMagnetPort(null);
		clearConnectionCutTimer();
		setConnectionCut(null);
	}, [
		clearConnectionCutTimer,
		closeWorkshopContextMenu,
		setConnectionCut,
		setIsCanvasLibraryOpen,
		setIsHiddenSettingsOpen,
		setMagnetPort,
		setMenuAt,
		setNodeMenuAt,
		setOpenDropdown,
		setPendingConnection,
		setRenameDraft,
		setRenamingNodeId,
	]);

	const closeVideoPreview = useCallback(() => {
		setVideoPreview(null);
	}, [setVideoPreview]);

	const scheduleNodeLift = useCallback(() => {
		clearNodeLiftTimer();
		setLiftedDragIds(new Set());
		nodeLiftTimerRef.current = window.setTimeout(() => {
			const current = pointerStateRef.current;
			if (
				current.mode !== "node-pointer-down" &&
				current.mode !== "dragging-nodes"
			)
				return;
			const currentIds = new Set((current.origin ?? []).map((item) => item.id));
			setLiftedDragIds(currentIds);
			nodeLiftTimerRef.current = null;
		}, 500);
	}, [clearNodeLiftTimer, pointerStateRef, setLiftedDragIds]);

	const scheduleConnectionCutReveal = useCallback(
		(connectionId: string) => {
			connectionCutTimerRef.current = window.setTimeout(() => {
				setConnectionCut((current) =>
					current?.connectionId === connectionId
						? { ...current, visible: true }
						: current,
				);
				connectionCutTimerRef.current = null;
			}, 500);
		},
		[setConnectionCut],
	);

	useEffect(
		() => () => {
			clearNodeLiftTimer();
			clearConnectionCutTimer();
		},
		[clearConnectionCutTimer, clearNodeLiftTimer],
	);

	return {
		clearNodeLiftTimer,
		clearConnectionCutTimer,
		resetNodeLift,
		dismissOverlays,
		closeVideoPreview,
		scheduleNodeLift,
		scheduleConnectionCutReveal,
	};
}
