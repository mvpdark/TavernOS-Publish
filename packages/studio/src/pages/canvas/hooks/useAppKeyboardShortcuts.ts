import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect, useRef } from "react";

import { clamp } from "../appAspectRatioHelpers";
import {
	ZOOM_MAX,
	ZOOM_MIN,
	type ImagePreviewState,
	type VideoPreviewState,
} from "../appCanvasState";
import { isTypingTarget } from "../appInteractionTargetHelpers";
import { resolveKeyboardShortcutAction } from "../appKeyboardShortcutActions";
import {
	cloneNodeForClipboard,
	createPastedNodeFromClipboard,
} from "../appNodeClipboard";
import { reconcileAutoNodeStyles } from "../connectionInteractionHelpers";
import type { AppView, CanvasNode, StyleLibraryState } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

export type UseAppKeyboardShortcutsConfig = {
	appView: AppView;
	primaryNode: CanvasNode | null;
	imagePreview: ImagePreviewState;
	videoPreview: VideoPreviewState;
	selectedIdsLength: number;
	selectedIdSet: Set<string>;
	styleLibrary: StyleLibraryState;
	copiedNodeRef: MutableRefObject<CanvasNode | null>;
	latestNodesRef: MutableRefObject<CanvasNode[]>;
	dismissOverlays: () => void;
	closeVideoPreview: () => void;
	pushUndoSnapshot: () => void;
	undoNodes: () => void;
	redoNodes: () => void;
	setImagePreview: Dispatch<SetStateAction<ImagePreviewState>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setZoom: Dispatch<SetStateAction<number>>;
	setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
	setAgentOpen: Dispatch<SetStateAction<boolean>>;
};

export function useAppKeyboardShortcuts({
	appView,
	primaryNode,
	imagePreview,
	videoPreview,
	selectedIdsLength,
	selectedIdSet,
	styleLibrary,
	copiedNodeRef,
	latestNodesRef,
	dismissOverlays,
	closeVideoPreview,
	pushUndoSnapshot,
	undoNodes,
	redoNodes,
	setImagePreview,
	setConnections,
	setNodes,
	setSelectedIds,
	setZoom,
	setPan,
	setAgentOpen,
}: UseAppKeyboardShortcutsConfig) {
	const selectedIdSetRef = useRef(selectedIdSet);
	selectedIdSetRef.current = selectedIdSet;
	useEffect(() => {
		const focusComposer = () =>
			document
				.querySelector<HTMLTextAreaElement>(
					primaryNode
						? ".floating-composer-wrap .composer__textarea"
						: ".right-panel .composer__textarea",
				)
				?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			const action = resolveKeyboardShortcutAction({
				key: event.key,
				code: event.code,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				shiftKey: event.shiftKey,
				isCanvasWorkspace: appView === "canvas",
				isTypingTarget: isTypingTarget(event.target),
				hasSelection: selectedIdsLength > 0,
				hasPrimaryNode: Boolean(primaryNode),
				hasCopiedNode: Boolean(copiedNodeRef.current),
			});
			if (!action) return;
			if (action.type === "escape") {
				if (imagePreview) {
					setImagePreview(null);
					return;
				}
				if (videoPreview) {
					closeVideoPreview();
					return;
				}
				dismissOverlays();
				return;
			}
			if (action.type === "deleteSelection") {
				event.preventDefault();
				pushUndoSnapshot();
				setConnections((current) => {
					const nextConnections = current.filter(
						(connection) =>
							!selectedIdSetRef.current.has(connection.from.nodeId) &&
							!selectedIdSetRef.current.has(connection.to.nodeId),
					);
					setNodes((nodesCurrent) =>
						reconcileAutoNodeStyles(
							nodesCurrent.filter((node) => !selectedIdSetRef.current.has(node.id)),
							nextConnections,
							styleLibrary,
						),
					);
					return nextConnections;
				});
				setSelectedIds([]);
				return;
			}
			if (action.type === "undo" || action.type === "redo") {
				event.preventDefault();
				action.type === "redo" ? redoNodes() : undoNodes();
				return;
			}
			if (action.type === "copyNode" && primaryNode) {
				event.preventDefault();
				copiedNodeRef.current = cloneNodeForClipboard(primaryNode);
				return;
			}
			if (action.type === "pasteNode" && copiedNodeRef.current) {
				event.preventDefault();
				pushUndoSnapshot();
				const source = copiedNodeRef.current;
				const id = `${source.type}-${Date.now()}`;
				setNodes((current) => [
					...current,
					createPastedNodeFromClipboard(source, {
						id,
					}),
				]);
				setSelectedIds([id]);
				return;
			}
			if (action.type === "zoomIn") {
				event.preventDefault();
				setZoom((current) => clamp(current * 1.08, ZOOM_MIN, ZOOM_MAX));
				return;
			}
			if (action.type === "zoomOut") {
				event.preventDefault();
				setZoom((current) => clamp(current * 0.92, ZOOM_MIN, ZOOM_MAX));
				return;
			}
			if (action.type === "resetZoom") {
				event.preventDefault();
				setZoom(1);
				return;
			}
			if (action.type === "selectAllNodes") {
				event.preventDefault();
				setSelectedIds(latestNodesRef.current.map((node) => node.id));
				return;
			}
			if (action.type === "resetPan") {
				event.preventDefault();
				setPan({ x: 0, y: 0 });
				return;
			}
			if (action.type === "toggleAgent") {
				event.preventDefault();
				setAgentOpen((current) => !current);
				dismissOverlays();
				return;
			}
			if (action.type === "focusComposer") {
				event.preventDefault();
				focusComposer();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		appView,
		closeVideoPreview,
		copiedNodeRef,
		dismissOverlays,
		imagePreview,
		latestNodesRef,
		primaryNode,
		pushUndoSnapshot,
		redoNodes,
		selectedIdsLength,
		setAgentOpen,
		setConnections,
		setImagePreview,
		setNodes,
		setPan,
		setSelectedIds,
		setZoom,
		styleLibrary,
		undoNodes,
		videoPreview,
	]);
}
