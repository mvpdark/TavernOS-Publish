import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback } from "react";

import { clamp } from "../appAspectRatioHelpers";
import { ZOOM_MAX } from "../appCanvasState";
import { cropImageAsset } from "../appGeneratedAssetActions";
import { createCanvasNode } from "../canvasNodeActions";
import type {
	CropBox,
	PerspectiveEditSettings,
} from "../components/CanvasNodeView";
import { createStyleRef } from "../styleLibrary";
import type { CanvasNode, ComposerPreset, NodeType } from "../canvas-types";

type CanvasPoint = { x: number; y: number };
type PushRuntimeNotice = (
	message: string,
	tone?: "info" | "warning",
	dedupeKey?: string,
) => void;

export type UseCanvasImageEditActionsConfig = {
	canvasRef: MutableRefObject<HTMLDivElement | null>;
	canvasFocusTimerRef: MutableRefObject<number | null>;
	latestNodesRef: MutableRefObject<CanvasNode[]>;
	imageComposer: ComposerPreset;
	dismissOverlays: () => void;
	pushUndoSnapshot: () => void;
	pushRuntimeNotice: PushRuntimeNotice;
	handleReversePromptGenerate: (nodeId: string) => void;
	handleThreeDDirectorGenerate: (nodeId: string) => void;
	openImageUpscalePanel: (nodeId: string) => void | Promise<void>;
	setIsCanvasFocusAnimating: Dispatch<SetStateAction<boolean>>;
	setZoom: Dispatch<SetStateAction<number>>;
	setPan: Dispatch<SetStateAction<CanvasPoint>>;
	setPerspectiveEditSettings: Dispatch<SetStateAction<PerspectiveEditSettings>>;
	setPerspectiveEditNodeId: Dispatch<SetStateAction<string | null>>;
	setRedrawEditingNodeId: Dispatch<SetStateAction<string | null>>;
	setCropEditingNodeId: Dispatch<SetStateAction<string | null>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setActiveTool: Dispatch<SetStateAction<NodeType>>;
};

export function useCanvasImageEditActions({
	canvasRef,
	canvasFocusTimerRef,
	latestNodesRef,
	imageComposer,
	dismissOverlays,
	pushUndoSnapshot,
	pushRuntimeNotice,
	handleReversePromptGenerate,
	handleThreeDDirectorGenerate,
	openImageUpscalePanel,
	setIsCanvasFocusAnimating,
	setZoom,
	setPan,
	setPerspectiveEditSettings,
	setPerspectiveEditNodeId,
	setRedrawEditingNodeId,
	setCropEditingNodeId,
	setSelectedIds,
	setNodes,
	setActiveTool,
}: UseCanvasImageEditActionsConfig) {
	const focusImageNodeForCrop = useCallback(
		(node: CanvasNode) => {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;
			const nextZoom = clamp(
				Math.min(
					(rect.width * 0.9) / node.width,
					(rect.height * 0.8) / node.height,
				),
				1.25,
				ZOOM_MAX,
			);
			setIsCanvasFocusAnimating(true);
			setZoom(nextZoom);
			setPan({
				x: rect.width / 2 - (node.x + node.width / 2) * nextZoom,
				y: rect.height / 2 - (node.y + node.height / 2) * nextZoom,
			});
			if (canvasFocusTimerRef.current) {
				window.clearTimeout(canvasFocusTimerRef.current);
			}
			canvasFocusTimerRef.current = window.setTimeout(() => {
				setIsCanvasFocusAnimating(false);
				canvasFocusTimerRef.current = null;
			}, 620);
		},
		[
			canvasFocusTimerRef,
			canvasRef,
			setIsCanvasFocusAnimating,
			setPan,
			setZoom,
		],
	);

	const handlePerspectiveEditChange = useCallback(
		(nextPartial: Partial<PerspectiveEditSettings>) => {
			setPerspectiveEditSettings((current) => ({
				...current,
				...nextPartial,
			}));
		},
		[setPerspectiveEditSettings],
	);

	const closePerspectiveEdit = useCallback(() => {
		setPerspectiveEditNodeId(null);
	}, [setPerspectiveEditNodeId]);

	const closeRedrawEdit = useCallback(() => {
		setRedrawEditingNodeId(null);
	}, [setRedrawEditingNodeId]);

	const handleImageToolbarAction = useCallback(
		(nodeId: string, actionKey: string, cropBox?: CropBox) => {
			if (actionKey === "crop-cancel") {
				setCropEditingNodeId(null);
				return;
			}
			const node = latestNodesRef.current.find((entry) => entry.id === nodeId);
			if (!node || node.type !== "image" || !node.asset) return;
			if (actionKey === "redraw") {
				setSelectedIds([nodeId]);
				setCropEditingNodeId(null);
				setPerspectiveEditNodeId(null);
				setRedrawEditingNodeId((current) =>
					current === nodeId ? null : nodeId,
				);
				dismissOverlays();
				return;
			}
			if (actionKey === "reverse-prompt") {
				handleReversePromptGenerate(nodeId);
				dismissOverlays();
				return;
			}
			if (actionKey === "wand") {
				setSelectedIds([nodeId]);
				setCropEditingNodeId(null);
				setRedrawEditingNodeId(null);
				setPerspectiveEditNodeId(null);
				handleThreeDDirectorGenerate(nodeId);
				dismissOverlays();
				return;
			}
			if (actionKey === "upscale") {
				setSelectedIds([nodeId]);
				setCropEditingNodeId(null);
				setRedrawEditingNodeId(null);
				setPerspectiveEditNodeId(null);
				void openImageUpscalePanel(nodeId);
				dismissOverlays();
				return;
			}
			if (actionKey === "crop-confirm") {
				if (!cropBox) {
					setCropEditingNodeId(null);
					return;
				}
				setCropEditingNodeId(null);
				const sourceAsset = node.asset;
				void (async () => {
					try {
						const cropped = await cropImageAsset(
							sourceAsset,
							cropBox,
							{ width: node.width, height: node.height },
						);
						const nextNode = createCanvasNode(
							"image",
							{
								x: node.x + node.width + 34,
								y: node.y,
							},
							node.composer ?? imageComposer,
							cropped.size,
							cropped.asset,
							node.style ?? createStyleRef(),
						);
						pushUndoSnapshot();
						setNodes((current) => [...current, nextNode]);
						setSelectedIds([nextNode.id]);
						setActiveTool("image");
						pushRuntimeNotice(
							"裁剪图片已生成，并放在当前节点右侧。",
							"info",
							"image-crop-created",
						);
					} catch (error) {
						console.error("Failed to crop image asset.", error);
						pushRuntimeNotice(
							error instanceof Error ? error.message : "裁剪图片生成失败。",
							"warning",
							"image-crop-failed",
						);
					}
				})();
				return;
			}
			if (actionKey === "perspective") {
				setSelectedIds([nodeId]);
				setCropEditingNodeId(null);
				setRedrawEditingNodeId(null);
				setPerspectiveEditNodeId((current) =>
					current === nodeId ? null : nodeId,
				);
				dismissOverlays();
				return;
			}
			if (actionKey !== "crop") return;
			setSelectedIds([nodeId]);
			setPerspectiveEditNodeId(null);
			setRedrawEditingNodeId(null);
			setCropEditingNodeId(nodeId);
			dismissOverlays();
			focusImageNodeForCrop(node);
		},
		[
			dismissOverlays,
			focusImageNodeForCrop,
			handleReversePromptGenerate,
			handleThreeDDirectorGenerate,
			imageComposer,
			latestNodesRef,
			openImageUpscalePanel,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setActiveTool,
			setCropEditingNodeId,
			setNodes,
			setPerspectiveEditNodeId,
			setRedrawEditingNodeId,
			setSelectedIds,
		],
	);

	return {
		focusImageNodeForCrop,
		handlePerspectiveEditChange,
		closePerspectiveEdit,
		closeRedrawEdit,
		handleImageToolbarAction,
	};
}
