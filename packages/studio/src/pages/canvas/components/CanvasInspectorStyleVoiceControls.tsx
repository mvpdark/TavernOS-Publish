import { formatNodeMetric } from "../parameterPanelPresentation";
import type {
	CanvasInspectorRenderState,
	InspectorStyleRenderState,
	InspectorVoiceCatalogState,
} from "./CanvasInspectorContentTypes";
import { StyleSelectCard, VoiceManagerCard } from "./InspectorParamCards";

export type CanvasInspectorStyleVoiceControlsProps =
	CanvasInspectorRenderState &
		InspectorStyleRenderState & {
			isAudioNode: boolean;
			voiceCatalogState: InspectorVoiceCatalogState;
			isVoiceCatalogLoading?: boolean;
			voiceAliasDraft: string;
			setVoiceAliasDraft: (value: string) => void;
			voiceIdDraft: string;
			setVoiceIdDraft: (value: string) => void;
			voiceAliasSaveId: string;
			onChangeStyle: (presetId: string) => void;
			onRefreshVoiceCatalog?: () => void;
			onSelectVoice?: (voiceId: string, displayName: string) => void;
			onSaveVoiceAlias?: (voiceId: string, displayName: string) => void;
		};

export function CanvasInspectorStyleVoiceControls({
	composer,
	selectedStyle,
	openMenu,
	toggleMenu,
	selectAndClose,
	styleLabel,
	styleCategories,
	activeStyleCategoryId,
	activeStylePresets,
	previewPreset,
	setActiveStyleCategoryId,
	setHoveredStylePresetId,
	isAudioNode,
	voiceCatalogState,
	isVoiceCatalogLoading,
	voiceAliasDraft,
	setVoiceAliasDraft,
	voiceIdDraft,
	setVoiceIdDraft,
	voiceAliasSaveId,
	onChangeStyle,
	onRefreshVoiceCatalog,
	onSelectVoice,
	onSaveVoiceAlias,
}: CanvasInspectorStyleVoiceControlsProps) {
	return (
		<>
			<StyleSelectCard
				value={formatNodeMetric(styleLabel)}
				isOpen={openMenu === "style"}
				categories={styleCategories}
				activeCategoryId={activeStyleCategoryId}
				presets={activeStylePresets}
				selectedPresetId={selectedStyle?.presetId}
				previewPreset={previewPreset}
				onToggle={() => toggleMenu("style")}
				onCategorySelect={setActiveStyleCategoryId}
				onPresetHover={setHoveredStylePresetId}
				onPresetSelect={(presetId) =>
					selectAndClose(() => onChangeStyle(presetId))
				}
			/>

			{isAudioNode ? (
				<VoiceManagerCard
					menuKey="voiceCatalog"
					isOpen={openMenu === "voiceCatalog"}
					options={voiceCatalogState.voiceSelectOptions}
					value={
						voiceCatalogState.selectedVoice?.displayName ??
						composer.audioVoiceName ??
						"选择一个音色"
					}
					selectedValue={
						voiceCatalogState.selectedVoice?.voiceId ?? composer.audioVoiceId
					}
					isLoading={isVoiceCatalogLoading}
					voiceIdDraft={voiceIdDraft}
					voiceIdPlaceholder={
						voiceCatalogState.selectedVoiceId || "粘贴历史 voice_id"
					}
					voiceAliasDraft={voiceAliasDraft}
					voiceAliasSaveId={voiceAliasSaveId}
					onToggle={toggleMenu}
					onSelect={(value) =>
						selectAndClose(() => {
							const voice = voiceCatalogState.voices.find(
								(item) => item.voiceId === value,
							);
							if (!voice) return;
							setVoiceIdDraft("");
							onSelectVoice?.(voice.voiceId, voice.displayName);
						})
					}
					onRefresh={onRefreshVoiceCatalog}
					onVoiceIdDraftChange={setVoiceIdDraft}
					onVoiceAliasDraftChange={setVoiceAliasDraft}
					onSaveAlias={() => onSaveVoiceAlias?.(voiceAliasSaveId, voiceAliasDraft)}
				/>
			) : null}
		</>
	);
}
