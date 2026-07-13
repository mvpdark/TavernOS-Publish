import { CanvasInspectorParameterSections } from "./CanvasInspectorParameterSections";
import { CanvasInspectorPrimaryControls } from "./CanvasInspectorPrimaryControls";
import { CanvasInspectorStyleVoiceControls } from "./CanvasInspectorStyleVoiceControls";
import type { CanvasInspectorContentProps } from "./CanvasInspectorContentTypes";

export function CanvasInspectorContent({
	projectTitle,
	modeLabel,
	composer,
	styleLabel,
	selectedStyle,
	modelOptions,
	openMenu,
	toggleMenu,
	closeMenu,
	selectAndClose,
	onSwitchModel,
	onChangeStyle,
	onUpdateImageOption,
	isImageLikeNode,
	isVideoNode,
	isAudioNode,
	isMusicNode,
	isShotNode,
	isMidjourneyImageLayout,
	imageAspectRatioOptions,
	primaryModeFields,
	imageParameterFields,
	videoParameterFields,
	shotParameterFields,
	musicParameterFields,
	styleCategories,
	activeStyleCategoryId,
	activeStylePresets,
	previewPreset,
	setActiveStyleCategoryId,
	setHoveredStylePresetId,
	voiceCatalogState,
	isVoiceCatalogLoading,
	voiceAliasDraft,
	setVoiceAliasDraft,
	voiceIdDraft,
	setVoiceIdDraft,
	voiceAliasSaveId,
	onRefreshVoiceCatalog,
	onSelectVoice,
	onSaveVoiceAlias,
}: CanvasInspectorContentProps) {
	const renderState = {
		composer,
		selectedStyle,
		openMenu,
		toggleMenu,
		closeMenu,
		selectAndClose,
		onUpdateImageOption,
	};

	return (
		<aside className="right-panel right-panel--inspector" aria-label="节点检查器">
			<div className="inspector-panel__chrome">
				<div className="inspector-panel__project">
					{projectTitle} / {modeLabel}
				</div>
			</div>
			<div className="right-panel__content inspector-panel__content">
				<section className="inspector-panel__section">
					<div className="inspector-panel__section-head">
						<h3>节点设置</h3>
					</div>
					<div className="inspector-panel__grid inspector-panel__grid--two inspector-panel__grid--controls">
						<CanvasInspectorPrimaryControls
							{...renderState}
							modelOptions={modelOptions}
							primaryModeFields={primaryModeFields}
							onSwitchModel={onSwitchModel}
							isMidjourneyImageLayout={isMidjourneyImageLayout}
							imageAspectRatioOptions={imageAspectRatioOptions}
						/>
						<CanvasInspectorParameterSections
							{...renderState}
							isImageLikeNode={isImageLikeNode}
							isVideoNode={isVideoNode}
							isMusicNode={isMusicNode}
							isShotNode={isShotNode}
							imageParameterFields={imageParameterFields}
							videoParameterFields={videoParameterFields}
							shotParameterFields={shotParameterFields}
							musicParameterFields={musicParameterFields}
						/>
						<CanvasInspectorStyleVoiceControls
							{...renderState}
							styleLabel={styleLabel}
							styleCategories={styleCategories}
							activeStyleCategoryId={activeStyleCategoryId}
							activeStylePresets={activeStylePresets}
							previewPreset={previewPreset}
							setActiveStyleCategoryId={setActiveStyleCategoryId}
							setHoveredStylePresetId={setHoveredStylePresetId}
							isAudioNode={isAudioNode}
							voiceCatalogState={voiceCatalogState}
							isVoiceCatalogLoading={isVoiceCatalogLoading}
							voiceAliasDraft={voiceAliasDraft}
							setVoiceAliasDraft={setVoiceAliasDraft}
							voiceIdDraft={voiceIdDraft}
							setVoiceIdDraft={setVoiceIdDraft}
							voiceAliasSaveId={voiceAliasSaveId}
							onChangeStyle={onChangeStyle}
							onRefreshVoiceCatalog={onRefreshVoiceCatalog}
							onSelectVoice={onSelectVoice}
							onSaveVoiceAlias={onSaveVoiceAlias}
						/>
					</div>
				</section>
			</div>
		</aside>
	);
}
