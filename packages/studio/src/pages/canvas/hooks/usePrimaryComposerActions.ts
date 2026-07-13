import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
} from "react";

import {
	type AudioComposerOptionKey,
	type ImageComposerOptionKey,
	type MusicComposerOptionKey,
	type VideoComposerOptionKey,
	applyAudioComposerOption,
	applyImageComposerOption,
	applyModelSelectionToComposer,
	applyMusicComposerOption,
	applyVideoComposerOption,
} from "../appComposerOptionUpdates";
import { getNodeCopy } from "../canvasNodeActions";
import {
	getModelDisplayLabel,
	type ModelOptionCatalog,
} from "../modelOptions";
import type {
	CanvasNode,
	ComposerPreset,
	NodeType,
	OpenDropdown,
} from "../canvas-types";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UsePrimaryComposerActionsConfig = {
	composerByType: Record<NodeType, ComposerPreset>;
	compatiblePrimaryModel: string;
	currentComposerModel: string;
	modelOptionCatalog: ModelOptionCatalog;
	primaryNode: CanvasNode | null;
	primaryType: NodeType;
	setComposerByType: Dispatch<SetStateAction<Record<NodeType, ComposerPreset>>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setOpenDropdown: Dispatch<SetStateAction<OpenDropdown>>;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
};

export function usePrimaryComposerActions({
	composerByType,
	compatiblePrimaryModel,
	currentComposerModel,
	modelOptionCatalog,
	primaryNode,
	primaryType,
	setComposerByType,
	setNodes,
	setOpenDropdown,
	pushRuntimeNotice,
}: UsePrimaryComposerActionsConfig) {
	const syncNodeComposer = useCallback(
		(type: NodeType, updater: (composer: ComposerPreset) => ComposerPreset) => {
			setComposerByType((current) => {
				const nextComposer = updater(current[type]);
				return { ...current, [type]: nextComposer };
			});
			if (primaryNode?.type !== type) return;
			setNodes((current) =>
				current.map((node) =>
					node.id === primaryNode.id
						? {
								...node,
								composer: updater(node.composer ?? composerByType[type]),
							}
						: node,
				),
			);
		},
		[composerByType, primaryNode, setComposerByType, setNodes],
	);

	const applyModelSelection = useCallback(
		(type: NodeType, nextModel: string) => {
			syncNodeComposer(type, (current) =>
				applyModelSelectionToComposer(type, current, nextModel),
			);
		},
		[syncNodeComposer],
	);

	const switchModel = useCallback(
		(nextModel: string) => {
			applyModelSelection(
				primaryType,
				modelOptionCatalog.preferredRawLabelByModel[nextModel] ?? nextModel,
			);
			setOpenDropdown(null);
		},
		[applyModelSelection, modelOptionCatalog, primaryType, setOpenDropdown],
	);

	useEffect(() => {
		if (
			getModelDisplayLabel(currentComposerModel).trim() ===
			getModelDisplayLabel(compatiblePrimaryModel).trim()
		)
			return;
		applyModelSelection(primaryType, compatiblePrimaryModel);
	}, [
		applyModelSelection,
		compatiblePrimaryModel,
		currentComposerModel,
		primaryType,
	]);

	const updatePrompt = useCallback(
		(type: NodeType, prompt: string) => {
			syncNodeComposer(type, (current) => ({ ...current, prompt }));
		},
		[syncNodeComposer],
	);

	const updatePrimaryNodeTitle = useCallback(
		(nextTitle: string) => {
			if (!primaryNode) return;
			setNodes((current) =>
				current.map((node) =>
					node.id === primaryNode.id
						? { ...node, title: nextTitle || getNodeCopy(node.type).label }
						: node,
				),
			);
		},
		[primaryNode, setNodes],
	);

	const updatePrimaryNodePrompt = useCallback(
		(nextPrompt: string) => {
			if (!primaryNode) return;
			updatePrompt(primaryNode.type, nextPrompt);
		},
		[primaryNode, updatePrompt],
	);

	const updatePrimaryShotField = useCallback(
		(key: "shotSize" | "cameraAngle" | "frameRatio", value: string) => {
			if (primaryNode?.type !== "shot") return;
			syncNodeComposer("shot", (current) => ({
				...current,
				[key]: value,
			}));
		},
		[primaryNode, syncNodeComposer],
	);

	const updateImageOption = useCallback(
		(key: ImageComposerOptionKey, value: string | boolean) => {
			const imageType = primaryType === "editor" ? "editor" : "image";
			syncNodeComposer(imageType, (current) =>
				applyImageComposerOption(current, key, value),
			);
		},
		[primaryType, syncNodeComposer],
	);

	const updateVideoOption = useCallback(
		(key: VideoComposerOptionKey, value: string) => {
			syncNodeComposer("video", (current) => {
				const { composer: nextComposer, notice } = applyVideoComposerOption(
					current,
					key,
					value,
				);
				if (notice) {
					pushRuntimeNotice(
						notice.message,
						notice.tone,
						notice.dedupeKey,
					);
				}
				return nextComposer;
			});
		},
		[pushRuntimeNotice, syncNodeComposer],
	);

	const updateTextOption = useCallback(
		(key: "textMode", value: string) => {
			syncNodeComposer("text", (current) => ({ ...current, [key]: value }));
		},
		[syncNodeComposer],
	);

	const updateAudioOption = useCallback(
		(key: AudioComposerOptionKey, value: string) => {
			syncNodeComposer("audio", (current) =>
				applyAudioComposerOption(current, key, value),
			);
		},
		[syncNodeComposer],
	);

	const updateMusicOption = useCallback(
		(key: MusicComposerOptionKey, value: string) => {
			syncNodeComposer("music", (current) =>
				applyMusicComposerOption(current, key, value),
			);
		},
		[syncNodeComposer],
	);

	return {
		switchModel,
		updatePrompt,
		updatePrimaryNodeTitle,
		updatePrimaryNodePrompt,
		updatePrimaryShotField,
		updateImageOption,
		updateVideoOption,
		updateTextOption,
		updateAudioOption,
		updateMusicOption,
	};
}
