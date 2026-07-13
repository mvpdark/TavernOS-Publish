import type { Dispatch, SetStateAction } from "react";

import { applyAspectRatioToComposer } from "../appAspectRatioHelpers";
import { createStyleRef, getStyleLabel } from "../styleLibrary";
import { applyStyleToConnectedChain } from "../styleNodeHelpers";
import type {
	CanvasNode,
	ComposerPreset,
	NodeType,
	OpenDropdown,
	StyleLibraryState,
	StyleSource,
} from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type UseCanvasStyleAspectActionsArgs = {
	connections: NodeConnection[];
	composerByType: Record<NodeType, ComposerPreset>;
	primaryNode: CanvasNode | null;
	styleLibrary: StyleLibraryState;
	setGlobalAspectRatio: Dispatch<SetStateAction<string>>;
	setIsGlobalAspectMenuOpen: Dispatch<SetStateAction<boolean>>;
	setGlobalStylePresetId: Dispatch<SetStateAction<string>>;
	setIsGlobalStyleMenuOpen: Dispatch<SetStateAction<boolean>>;
	setComposerByType: Dispatch<SetStateAction<Record<NodeType, ComposerPreset>>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setOpenDropdown: Dispatch<SetStateAction<OpenDropdown>>;
	pushRuntimeNotice: PushRuntimeNotice;
	pushUndoSnapshot: () => void;
};

export function useCanvasStyleAspectActions({
	connections,
	composerByType,
	primaryNode,
	styleLibrary,
	setGlobalAspectRatio,
	setIsGlobalAspectMenuOpen,
	setGlobalStylePresetId,
	setIsGlobalStyleMenuOpen,
	setComposerByType,
	setNodes,
	setOpenDropdown,
	pushRuntimeNotice,
	pushUndoSnapshot,
}: UseCanvasStyleAspectActionsArgs) {
	function updateNodeStyle(
		nodeId: string,
		presetId: string,
		source: StyleSource = "manual",
	) {
		setNodes((current) =>
			applyStyleToConnectedChain({
				nodes: current,
				connections,
				startNodeId: nodeId,
				presetId,
				source,
				styleLibrary,
			}),
		);
	}

	function applyGlobalStyle(presetId: string) {
		const preset = styleLibrary.presets.find((item) => item.id === presetId);
		if (!preset) return;
		setGlobalStylePresetId(presetId);
		setIsGlobalStyleMenuOpen(false);
		pushUndoSnapshot();
		const nextStyle = createStyleRef(presetId, "manual", styleLibrary);
		setNodes((current) =>
			current.map((node) => ({
				...node,
				style: nextStyle,
			})),
		);
		pushRuntimeNotice(
			`整体风格已统一为 ${getStyleLabel(styleLibrary, nextStyle)}。`,
			"info",
			`global-style-${presetId}`,
		);
	}

	function applyGlobalAspectRatio(aspectRatio: string) {
		setGlobalAspectRatio(aspectRatio);
		setIsGlobalAspectMenuOpen(false);
		pushUndoSnapshot();
		setComposerByType((current) => {
			let changed = false;
			const nextComposerByType = Object.fromEntries(
				(Object.entries(current) as Array<[NodeType, ComposerPreset]>).map(
					([type, currentComposer]) => {
						const nextComposer = applyAspectRatioToComposer(
							type,
							currentComposer,
							aspectRatio,
						);
						if (nextComposer !== currentComposer) changed = true;
						return [type, nextComposer];
					},
				),
			) as Record<NodeType, ComposerPreset>;
			return changed ? nextComposerByType : current;
		});
		setNodes((current) =>
			current.map((node) => {
				if (!node.composer) return node;
				const nextComposer = applyAspectRatioToComposer(
					node.type,
					node.composer,
					aspectRatio,
				);
				return nextComposer === node.composer
					? node
					: { ...node, composer: nextComposer };
			}),
		);
		pushRuntimeNotice(
			`全局画幅已设为 ${aspectRatio}，并同步到兼容节点与默认参数。`,
			"info",
			`global-aspect-ratio-${aspectRatio}`,
		);
	}

	function toggleDropdown(dropdown: Exclude<OpenDropdown, null>) {
		setOpenDropdown((current) => (current === dropdown ? null : dropdown));
	}

	function setAudioVoiceMode(nodeId: string, mode: "clone" | "design") {
		pushUndoSnapshot();
		setNodes((current) =>
			current.map((node) => {
				if (node.id !== nodeId || node.type !== "audio") return node;
				return {
					...node,
					composer: {
						...(node.composer ?? composerByType.audio),
						audioVoiceMode: mode,
					},
				};
			}),
		);
		if (primaryNode?.id === nodeId) {
			setComposerByType((current) => ({
				...current,
				audio: { ...current.audio, audioVoiceMode: mode },
			}));
		}
	}

	return {
		applyGlobalAspectRatio,
		applyGlobalStyle,
		setAudioVoiceMode,
		toggleDropdown,
		updateNodeStyle,
	};
}
