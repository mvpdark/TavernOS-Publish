import { useEffect, useState } from "react";

import type { CanvasInspectorMenuKey } from "./canvasInspectorTypes";

export type UseCanvasInspectorControlsConfig = {
	isInteractionBlocked: boolean;
	selectedVoiceName: string;
	selectedVoiceId: string;
};

export function useCanvasInspectorControls({
	isInteractionBlocked,
	selectedVoiceName,
	selectedVoiceId,
}: UseCanvasInspectorControlsConfig) {
	const [openMenu, setOpenMenu] = useState<CanvasInspectorMenuKey | null>(null);
	const [voiceAliasDraft, setVoiceAliasDraft] = useState("");
	const [voiceIdDraft, setVoiceIdDraft] = useState("");
	const voiceAliasSaveId = voiceIdDraft.trim() || selectedVoiceId.trim();

	useEffect(() => {
		if (!isInteractionBlocked) return;
		setOpenMenu(null);
	}, [isInteractionBlocked]);

	useEffect(() => {
		setVoiceAliasDraft(selectedVoiceName);
	}, [selectedVoiceName]);

	function toggleMenu(menuKey: CanvasInspectorMenuKey) {
		setOpenMenu((current) => (current === menuKey ? null : menuKey));
	}

	function closeMenu() {
		setOpenMenu(null);
	}

	function selectAndClose(action: () => void) {
		action();
		closeMenu();
	}

	return {
		openMenu,
		toggleMenu,
		closeMenu,
		selectAndClose,
		voiceAliasDraft,
		setVoiceAliasDraft,
		voiceIdDraft,
		setVoiceIdDraft,
		voiceAliasSaveId,
	};
}
