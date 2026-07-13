import type { CSSProperties } from "react";

import type {
	ComposerPreset,
	NodeStyleRef,
	NodeType,
	OpenDropdown,
	ReferenceAssetSlotInputList,
	StyleLibraryState,
} from "../canvas-types";
import type { ImageModelCapability } from "../imageModelCapabilities";
import type {
	AudioComposerOptionKey,
	ImageComposerOptionKey,
	MusicComposerOptionKey,
	TextComposerOptionKey,
	VideoComposerOptionKey,
} from "../appComposerOptionUpdates";
import type {
	VideoGenerationModeId,
	VideoModelCapability,
} from "../videoModelCapabilities";
import { Composer } from "./Composer";
import { StylePicker } from "./StylePicker";
import { VideoComposer } from "./VideoComposer";

export type FloatingComposerPanelProps = {
	type: NodeType;
	composer: ComposerPreset;
	panelStyle: CSSProperties;
	selectedNodeId: string | null;
	styleLibrary: StyleLibraryState;
	selectedStyle?: NodeStyleRef;
	imageModelCapability: ImageModelCapability | null;
	promptPrefix?: string;
	referenceAssets: ReferenceAssetSlotInputList;
	canAddReferenceAsset: boolean;
	videoModelCapability: VideoModelCapability | null;
	recommendedVideoMode: VideoGenerationModeId | null;
	modelOptions: string[];
	imageRatios: string[];
	imageResolutions: string[];
	openDropdown: OpenDropdown;
	isSending: boolean;
	onChangeStyle: (nodeId: string, presetId: string) => void;
	onPromptChange: (type: NodeType, prompt: string) => void;
	onToggleDropdown: (dropdown: Exclude<OpenDropdown, null>) => void;
	onCloseDropdown: () => void;
	onSwitchModel: (model: string) => void;
	onUpdateImageOption: (
		key: ImageComposerOptionKey,
		value: string | boolean,
	) => void;
	onUpdateTextOption: (key: TextComposerOptionKey, value: string) => void;
	onUpdateAudioOption: (key: AudioComposerOptionKey, value: string) => void;
	onUpdateMusicOption: (
		key: MusicComposerOptionKey,
		value: string,
	) => void;
	onUpdateVideoOption: (
		key: VideoComposerOptionKey,
		value: string,
	) => void;
	onUploadReferenceAsset: (nodeId: string, slotIndex: number) => void;
	onSend: () => void;
};

export function FloatingComposerPanel({
	type,
	composer,
	panelStyle,
	selectedNodeId,
	styleLibrary,
	selectedStyle,
	imageModelCapability,
	promptPrefix,
	referenceAssets,
	canAddReferenceAsset,
	videoModelCapability,
	recommendedVideoMode,
	modelOptions,
	imageRatios,
	imageResolutions,
	openDropdown,
	isSending,
	onChangeStyle,
	onPromptChange,
	onToggleDropdown,
	onCloseDropdown,
	onSwitchModel,
	onUpdateImageOption,
	onUpdateTextOption,
	onUpdateAudioOption,
	onUpdateMusicOption,
	onUpdateVideoOption,
	onUploadReferenceAsset,
	onSend,
}: FloatingComposerPanelProps) {
	const styleControl = selectedNodeId ? (
		<StylePicker
			library={styleLibrary}
			value={selectedStyle}
			onChange={(presetId) => onChangeStyle(selectedNodeId, presetId)}
		/>
	) : undefined;

	return (
		<div className="floating-composer-wrap" style={panelStyle}>
			{type === "video" && videoModelCapability ? (
				<VideoComposer
					composer={composer}
					capability={videoModelCapability}
					referenceAssets={referenceAssets}
					canAddReferenceAsset={canAddReferenceAsset}
					recommendedMode={recommendedVideoMode}
					modelOptions={modelOptions}
					openDropdown={openDropdown}
					floating
					styleControl={styleControl}
					onPromptChange={(prompt) => onPromptChange("video", prompt)}
					onToggleDropdown={onToggleDropdown}
					onCloseDropdown={onCloseDropdown}
					onSwitchModel={onSwitchModel}
					onUpdateVideoOption={onUpdateVideoOption}
					onUploadReferenceAsset={(slotIndex) => {
						if (!selectedNodeId) return;
						onUploadReferenceAsset(selectedNodeId, slotIndex);
					}}
					onSend={onSend}
					isSending={isSending}
				/>
			) : (
				<Composer
					type={type}
					composer={composer}
					styleControl={type === "music" ? undefined : styleControl}
					promptPrefix={type === "text" ? promptPrefix : undefined}
					referenceAssets={referenceAssets}
					canAddReferenceAsset={
						type === "image" || type === "editor" || type === "music"
							? canAddReferenceAsset
							: undefined
					}
					modelOptions={modelOptions}
					imageRatios={imageRatios}
					imageResolutions={imageResolutions}
					imageModelCapability={imageModelCapability}
					openDropdown={openDropdown}
					floating
					onPromptChange={onPromptChange}
					onToggleDropdown={onToggleDropdown}
					onCloseDropdown={onCloseDropdown}
					onSwitchModel={onSwitchModel}
					onUpdateImageOption={onUpdateImageOption}
					onUpdateTextOption={onUpdateTextOption}
					onUpdateAudioOption={onUpdateAudioOption}
					onUpdateMusicOption={onUpdateMusicOption}
					onUploadReferenceAsset={(slotIndex) => {
						if (!selectedNodeId) return;
						onUploadReferenceAsset(selectedNodeId, slotIndex);
					}}
					onSend={onSend}
					isSending={isSending}
				/>
			)}
		</div>
	);
}
