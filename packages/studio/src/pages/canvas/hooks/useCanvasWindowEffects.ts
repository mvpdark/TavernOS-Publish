import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import type { OpenDropdown } from "../canvas-types";

type PointerState =
	| { mode: "idle" }
	| {
			mode: "node-pointer-down";
			startX: number;
			startY: number;
			origin: Array<{ id: string; x: number; y: number }>;
	  }
	| {
			mode: "dragging-nodes";
			startX: number;
			startY: number;
			origin: Array<{ id: string; x: number; y: number }>;
	  }
	| {
			mode: "panning";
			startX: number;
			startY: number;
			originX: number;
			originY: number;
	  }
	| {
			mode: "selecting";
			startX: number;
			startY: number;
			currentX: number;
			currentY: number;
	  };

type UseCanvasWindowEffectsArgs = {
	openDropdown: OpenDropdown;
	resetNodeLift: () => void;
	setOpenDropdown: Dispatch<SetStateAction<OpenDropdown>>;
	setPointerState: Dispatch<SetStateAction<PointerState>>;
};

const OPEN_DROPDOWN_ALLOWLIST_SELECTOR =
	".model-pill, .composer-meta--button, .model-menu, .inline-menu, .image-options-panel, .video-options-panel, .music-style-panel, .style-picker, .tool-square, .send-btn, .composer-option-input";

export function useCanvasWindowEffects({
	openDropdown,
	resetNodeLift,
	setOpenDropdown,
	setPointerState,
}: UseCanvasWindowEffectsArgs) {
	useEffect(() => {
		const onWindowUp = () => {
			resetNodeLift();
			setPointerState((current) =>
				current.mode === "idle" ? current : { mode: "idle" },
			);
		};
		window.addEventListener("pointerup", onWindowUp);
		return () => window.removeEventListener("pointerup", onWindowUp);
	}, [resetNodeLift, setPointerState]);

	useEffect(() => {
		if (!openDropdown) return;

		const handleGlobalPointerDown = (event: PointerEvent) => {
			const target = event.target instanceof HTMLElement ? event.target : null;
			if (!target) return;
			if (target.closest(OPEN_DROPDOWN_ALLOWLIST_SELECTOR)) return;
			setOpenDropdown(null);
		};

		window.addEventListener("pointerdown", handleGlobalPointerDown, true);
		return () =>
			window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
	}, [openDropdown, setOpenDropdown]);
}
