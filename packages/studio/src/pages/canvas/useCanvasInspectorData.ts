import { useMemo } from "react";

import type {
	AudioComposerOptionKey,
	ImageComposerOptionKey,
	MusicComposerOptionKey,
	TextComposerOptionKey,
	VideoComposerOptionKey,
} from "./appComposerOptionUpdates";
import {
	buildImageParameterFields,
	buildMusicParameterFields,
	buildPrimaryModeFields,
	buildShotParameterFields,
	buildVideoParameterFields,
} from "./canvasInspectorFieldBuilders";
import { buildCanvasInspectorOptionState } from "./canvasInspectorOptionState";
import type { CanvasInspectorShotOptions as ShotOptions } from "./canvasInspectorTypes";
import {
	buildVoiceCatalogState,
	type InspectorVoiceCatalogEntry,
} from "./canvasInspectorVoiceCatalog";
import { getModelDisplayLabel } from "./modelOptions";
import type {
	CanvasNode,
	ComposerPreset,
	NodeStyleRef,
	StyleLibraryState,
} from "./canvas-types";
import { useInspectorStyleSelection } from "./useInspectorStyleSelection";

type UseCanvasInspectorDataConfig = {
	node: CanvasNode;
	styleLibrary: StyleLibraryState;
	selectedStyle?: NodeStyleRef | null;
	referenceCount: number;
	modelOptions: string[];
	voiceCatalog?: InspectorVoiceCatalogEntry[];
	shotOptions: ShotOptions;
	onUpdateShotField: (
		key: "shotSize" | "cameraAngle" | "frameRatio",
		value: string,
	) => void;
	onUpdateTextOption: (key: TextComposerOptionKey, value: string) => void;
	onUpdateImageOption: (
		key: ImageComposerOptionKey,
		value: string | boolean,
	) => void;
	onUpdateAudioOption: (key: AudioComposerOptionKey, value: string) => void;
	onUpdateMusicOption: (key: MusicComposerOptionKey, value: string) => void;
	onUpdateVideoOption: (key: VideoComposerOptionKey, value: string) => void;
};

const EMPTY_COMPOSER: ComposerPreset = {
	model: "",
	variants: "",
	credits: "",
	placeholder: "",
	meta: [],
	prompt: "",
};

export function useCanvasInspectorData({
	node,
	styleLibrary,
	selectedStyle,
	referenceCount,
	modelOptions: rawModelOptions,
	voiceCatalog,
	shotOptions,
	onUpdateShotField,
	onUpdateTextOption,
	onUpdateImageOption,
	onUpdateAudioOption,
	onUpdateMusicOption,
	onUpdateVideoOption,
}: UseCanvasInspectorDataConfig) {
	const composer = node.composer ?? EMPTY_COMPOSER;
	const nodeType = node.type;
	const isTextNode = nodeType === "text";
	const isImageLikeNode = nodeType === "image" || nodeType === "editor";
	const isVideoNode = nodeType === "video";
	const isAudioNode = nodeType === "audio";
	const isMusicNode = nodeType === "music";
	const isShotNode = nodeType === "shot";

	const styleSelection = useInspectorStyleSelection(styleLibrary, selectedStyle);
	const modelOptions = useMemo(
		() =>
			rawModelOptions.map((model) => ({
				value: model,
				label: getModelDisplayLabel(model),
			})),
		[rawModelOptions],
	);

	const optionState = buildCanvasInspectorOptionState({
		composer,
		asset: node.asset,
		referenceCount,
		isImageLikeNode,
		isVideoNode,
		isAudioNode,
		isMusicNode,
	});
	const voiceCatalogState = buildVoiceCatalogState(voiceCatalog, composer);

	const primaryModeFields = buildPrimaryModeFields({
		composer,
		isTextNode,
		isImageLikeNode,
		isVideoNode,
		isAudioNode,
		optionState,
		onUpdateTextOption,
		onUpdateImageOption,
		onUpdateVideoOption,
		onUpdateAudioOption,
	});
	const imageParameterFields = buildImageParameterFields({
		composer,
		optionState,
		onUpdateImageOption,
	});
	const videoParameterFields = buildVideoParameterFields({
		composer,
		optionState,
		onUpdateVideoOption,
	});
	const shotParameterFields = buildShotParameterFields({
		composer,
		shotOptions,
		onUpdateShotField,
	});
	const musicParameterFields = buildMusicParameterFields({
		composer,
		optionState,
		onUpdateMusicOption,
	});

	return {
		composer,
		isImageLikeNode,
		isVideoNode,
		isAudioNode,
		isMusicNode,
		isShotNode,
		modelOptions,
		optionState,
		voiceCatalogState,
		primaryModeFields,
		imageParameterFields,
		videoParameterFields,
		shotParameterFields,
		musicParameterFields,
		...styleSelection,
	};
}
