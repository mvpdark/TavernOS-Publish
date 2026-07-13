import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect } from "react";

import type { PointerState } from "../appCanvasState";
import { collectBlobUrls } from "../appGeneratedAssetActions";
import { clamp } from "../appAspectRatioHelpers";
import type { CanvasNode } from "../canvas-types";

export type UseAppCanvasUiEffectsConfig = {
	pointerState: PointerState;
	pointerStateRef: MutableRefObject<PointerState>;
	resetNodeLift: () => void;
	nodes: CanvasNode[];
	uploadedUrlsRef: MutableRefObject<string[]>;
	canvasRef: MutableRefObject<HTMLDivElement | null>;
	handleCanvasWheel: (event: WheelEvent) => void;
	zoom: number;
	hasMountedZoomRef: MutableRefObject<boolean>;
	zoomHudTimeoutRef: MutableRefObject<number | null>;
	setShowZoomHud: Dispatch<SetStateAction<boolean>>;
	renamingNodeId: string | null;
	renameInputRef: MutableRefObject<HTMLInputElement | null>;
	initialDevicePixelRatioRef: MutableRefObject<number>;
};

export function useAppCanvasUiEffects({
	pointerState,
	pointerStateRef,
	resetNodeLift,
	nodes,
	uploadedUrlsRef,
	canvasRef,
	handleCanvasWheel,
	zoom,
	hasMountedZoomRef,
	zoomHudTimeoutRef,
	setShowZoomHud,
	renamingNodeId,
	renameInputRef,
	initialDevicePixelRatioRef,
}: UseAppCanvasUiEffectsConfig) {
	useEffect(() => {
		pointerStateRef.current = pointerState;
		if (
			pointerState.mode !== "node-pointer-down" &&
			pointerState.mode !== "dragging-nodes"
		) {
			resetNodeLift();
		}
	}, [pointerState, pointerStateRef, resetNodeLift]);

	useEffect(() => {
		const nextUrls = collectBlobUrls(nodes);
		uploadedUrlsRef.current.forEach((url) => {
			if (!nextUrls.has(url)) {
				URL.revokeObjectURL(url);
			}
		});
		uploadedUrlsRef.current = [...nextUrls];
	}, [nodes, uploadedUrlsRef]);

	useEffect(
		() => () => {
			uploadedUrlsRef.current.forEach((url) => {
				URL.revokeObjectURL(url);
			});
			uploadedUrlsRef.current = [];
		},
		[uploadedUrlsRef],
	);

	// TavernOS uses HashRouter — popstate listener is disabled to avoid
	// pathname conflicts. Canvas project switching is handled internally.
	// useEffect(() => {
	// 	const onPopState = () => setPathname(window.location.pathname);
	// 	window.addEventListener("popstate", onPopState);
	// 	return () => window.removeEventListener("popstate", onPopState);
	// }, [setPathname]);

	useEffect(() => {
		const element = canvasRef.current;
		if (!element) return;
		const onWheel = (event: WheelEvent) => {
			handleCanvasWheel(event);
		};
		element.addEventListener("wheel", onWheel, { passive: false });
		return () => element.removeEventListener("wheel", onWheel);
	}, [canvasRef, handleCanvasWheel]);

	useEffect(() => {
		if (!Number.isFinite(zoom)) return;
		if (!hasMountedZoomRef.current) {
			hasMountedZoomRef.current = true;
			return;
		}
		setShowZoomHud(true);
		if (zoomHudTimeoutRef.current) {
			window.clearTimeout(zoomHudTimeoutRef.current);
		}
		zoomHudTimeoutRef.current = window.setTimeout(() => {
			setShowZoomHud(false);
			zoomHudTimeoutRef.current = null;
		}, 900);
	}, [hasMountedZoomRef, setShowZoomHud, zoom, zoomHudTimeoutRef]);

	useEffect(
		() => () => {
			if (zoomHudTimeoutRef.current) {
				window.clearTimeout(zoomHudTimeoutRef.current);
			}
		},
		[zoomHudTimeoutRef],
	);

	useEffect(() => {
		if (!renamingNodeId) return;
		renameInputRef.current?.focus();
		renameInputRef.current?.select();
	}, [renameInputRef, renamingNodeId]);

	useEffect(() => {
		const updateLogoScale = () => {
			const currentRatio =
				window.devicePixelRatio || initialDevicePixelRatioRef.current;
			document.documentElement.style.setProperty(
				"--logo-fixed-scale",
				String(
					clamp(initialDevicePixelRatioRef.current / currentRatio, 0.5, 2),
				),
			);
		};
		updateLogoScale();
		window.addEventListener("resize", updateLogoScale);
		window.visualViewport?.addEventListener("resize", updateLogoScale);
		return () => {
			window.removeEventListener("resize", updateLogoScale);
			window.visualViewport?.removeEventListener("resize", updateLogoScale);
			document.documentElement.style.removeProperty("--logo-fixed-scale");
		};
	}, [initialDevicePixelRatioRef]);
}
