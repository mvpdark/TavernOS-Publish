import type {
	AudioComposerOptionKey,
	ImageComposerOptionKey,
	MusicComposerOptionKey,
	TextComposerOptionKey,
	VideoComposerOptionKey,
} from "../appComposerOptionUpdates";
import type { CanvasInspectorShotOptions as ShotOptions } from "../canvasInspectorTypes";
import type { InspectorVoiceCatalogEntry } from "../canvasInspectorVoiceCatalog";
import type { CanvasNode, NodeStyleRef, StyleLibraryState } from "../canvas-types";
import { useCanvasInspectorControls } from "../useCanvasInspectorControls";
import { useCanvasInspectorData } from "../useCanvasInspectorData";
import { CanvasInspectorContent } from "./CanvasInspectorContent";

export type CanvasInspectorPanelProps = {
	projectTitle: string;
	modeLabel: string;
	node: CanvasNode;
	typeLabel: string;
	styleLabel: string;
	styleLibrary: StyleLibraryState;
	selectedStyle?: NodeStyleRef | null;
	referenceCount: number;
	shotSourceTitle: string | null;
	shotLinkedCharacterTitles: string[];
	shotLinkedSceneTitles: string[];
	isInteractionBlocked: boolean;
	modelOptions: string[];
	onUpdateTitle: (title: string) => void;
	onUpdatePrompt: (prompt: string) => void;
	onSwitchModel: (model: string) => void;
	onChangeStyle: (presetId: string) => void;
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
	voiceCatalog?: InspectorVoiceCatalogEntry[];
	isVoiceCatalogLoading?: boolean;
	onRefreshVoiceCatalog?: () => void;
	onSelectVoice?: (voiceId: string, displayName: string) => void;
	onSaveVoiceAlias?: (voiceId: string, displayName: string) => void;
	onUpdateMusicOption: (key: MusicComposerOptionKey, value: string) => void;
	onUpdateVideoOption: (key: VideoComposerOptionKey, value: string) => void;
	onCreateLinkedCharacter?: () => void;
	onCreateLinkedScene?: () => void;
	shotOptions: ShotOptions;
};

export function CanvasInspectorPanel(props: CanvasInspectorPanelProps) {
	const inspector = useCanvasInspectorData({
		node: props.node,
		styleLibrary: props.styleLibrary,
		selectedStyle: props.selectedStyle,
		referenceCount: props.referenceCount,
		modelOptions: props.modelOptions,
		voiceCatalog: props.voiceCatalog,
		shotOptions: props.shotOptions,
		onUpdateShotField: props.onUpdateShotField,
		onUpdateTextOption: props.onUpdateTextOption,
		onUpdateImageOption: props.onUpdateImageOption,
		onUpdateAudioOption: props.onUpdateAudioOption,
		onUpdateMusicOption: props.onUpdateMusicOption,
		onUpdateVideoOption: props.onUpdateVideoOption,
	});
	const {
		openMenu,
		toggleMenu,
		closeMenu,
		selectAndClose,
		voiceAliasDraft,
		setVoiceAliasDraft,
		voiceIdDraft,
		setVoiceIdDraft,
		voiceAliasSaveId,
	} = useCanvasInspectorControls({
		isInteractionBlocked: props.isInteractionBlocked,
		selectedVoiceName: inspector.voiceCatalogState.selectedVoiceName,
		selectedVoiceId: inspector.voiceCatalogState.selectedVoiceId,
	});

	return (
		<CanvasInspectorContent
			projectTitle={props.projectTitle}
			modeLabel={props.modeLabel}
			composer={inspector.composer}
			styleLabel={props.styleLabel}
			selectedStyle={props.selectedStyle}
			modelOptions={inspector.modelOptions}
			openMenu={openMenu}
			toggleMenu={toggleMenu}
			closeMenu={closeMenu}
			selectAndClose={selectAndClose}
			onSwitchModel={props.onSwitchModel}
			onChangeStyle={props.onChangeStyle}
			onUpdateImageOption={props.onUpdateImageOption}
			isImageLikeNode={inspector.isImageLikeNode}
			isVideoNode={inspector.isVideoNode}
			isAudioNode={inspector.isAudioNode}
			isMusicNode={inspector.isMusicNode}
			isShotNode={inspector.isShotNode}
			isMidjourneyImageLayout={inspector.optionState.isMidjourneyImageLayout}
			imageAspectRatioOptions={inspector.optionState.imageAspectRatioOptions}
			primaryModeFields={inspector.primaryModeFields}
			imageParameterFields={inspector.imageParameterFields}
			videoParameterFields={inspector.videoParameterFields}
			shotParameterFields={inspector.shotParameterFields}
			musicParameterFields={inspector.musicParameterFields}
			styleCategories={inspector.styleCategories}
			activeStyleCategoryId={inspector.activeStyleCategoryId}
			activeStylePresets={inspector.activeStylePresets}
			previewPreset={inspector.previewPreset}
			setActiveStyleCategoryId={inspector.setActiveStyleCategoryId}
			setHoveredStylePresetId={inspector.setHoveredStylePresetId}
			voiceCatalogState={inspector.voiceCatalogState}
			isVoiceCatalogLoading={props.isVoiceCatalogLoading}
			voiceAliasDraft={voiceAliasDraft}
			setVoiceAliasDraft={setVoiceAliasDraft}
			voiceIdDraft={voiceIdDraft}
			setVoiceIdDraft={setVoiceIdDraft}
			voiceAliasSaveId={voiceAliasSaveId}
			onRefreshVoiceCatalog={props.onRefreshVoiceCatalog}
			onSelectVoice={props.onSelectVoice}
			onSaveVoiceAlias={props.onSaveVoiceAlias}
		/>
	);
}
