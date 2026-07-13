import type {
	MouseEvent as ReactMouseEvent,
	RefCallback,
	RefObject,
} from "react";
import type {
	WorkshopFrameTab,
	WorkshopRoleTab,
} from "../appUiConfig";
import type { WorkshopExtractedEntity } from "../workshopExtractionHelpers";
import { WorkshopAnalysisStage } from "./WorkshopAnalysisStage";
import { WorkshopFramesAssistantPanel } from "./WorkshopFramesAssistantPanel";
import { WorkshopFramesBoard } from "./WorkshopFramesBoard";
import { WorkshopFramesSidebar } from "./WorkshopFramesSidebar";
import { WorkshopRoleStage } from "./WorkshopRoleStage";
import { WorkshopScriptStage } from "./WorkshopScriptStage";
import type { WorkshopScriptContextMenuState } from "./WorkshopScriptStage";
import {
	WorkshopStepper,
	WorkshopStudioTopbar,
	type WorkshopStepId,
} from "./WorkshopStudioChrome";

export type WorkshopStudioProps = {
	studioRef: RefCallback<HTMLElement>;
	projectTitle: string;
	step: WorkshopStepId;
	onStepChange: (step: WorkshopStepId) => void;
	onBackToProjects: () => void;
	onUploadToCloud: () => void;
	onSaveLocal: () => void;
	templateFile: string;
	templateValue: string;
	templateLabel: string;
	textModel: string;
	textModelOptions: string[];
	script: string;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	contextMenu: WorkshopScriptContextMenuState;
	isExtracting: boolean;
	onTemplateFileChange: (value: string) => void;
	onTextModelChange: (value: string) => void;
	onScriptChange: (value: string) => void;
	onTextareaScroll: () => void;
	onTextareaContextMenu: (
		event: ReactMouseEvent<HTMLTextAreaElement>,
	) => void;
	onCopyFromMenu: () => void;
	onPasteFromMenu: () => void;
	onDirectExtract: () => void;
	onAutoEpisodeBreakdown: () => void;
	onAiEpisodeSplit: () => void;
	roleTab: WorkshopRoleTab;
	roleTabLabel: string;
	roleEntities: WorkshopExtractedEntity[];
	onRoleTabChange: (tab: WorkshopRoleTab) => void;
	frameActionKey: string | null;
	scriptExpanded: boolean;
	frameCards: string[];
	frameTab: WorkshopFrameTab;
	onToggleScript: () => void;
	onFrameInfer: () => void;
	onFrameValidate: () => void;
	onFrameMerge: () => void;
	onFrameReferenceRecognition: () => void;
	onFrameAdd: () => void;
	onFrameImport: () => void;
	onFrameClear: () => void;
	onFrameTabChange: (tab: WorkshopFrameTab) => void;
};

export function WorkshopStudio({
	studioRef,
	projectTitle,
	step,
	onStepChange,
	onBackToProjects,
	onUploadToCloud,
	onSaveLocal,
	templateFile,
	templateValue,
	templateLabel,
	textModel,
	textModelOptions,
	script,
	textareaRef,
	contextMenu,
	isExtracting,
	onTemplateFileChange,
	onTextModelChange,
	onScriptChange,
	onTextareaScroll,
	onTextareaContextMenu,
	onCopyFromMenu,
	onPasteFromMenu,
	onDirectExtract,
	onAutoEpisodeBreakdown,
	onAiEpisodeSplit,
	roleTab,
	roleTabLabel,
	roleEntities,
	onRoleTabChange,
	frameActionKey,
	scriptExpanded,
	frameCards,
	frameTab,
	onToggleScript,
	onFrameInfer,
	onFrameValidate,
	onFrameMerge,
	onFrameReferenceRecognition,
	onFrameAdd,
	onFrameImport,
	onFrameClear,
	onFrameTabChange,
}: WorkshopStudioProps) {
	return (
		<section ref={studioRef} className="workshop-studio">
			<WorkshopStudioTopbar
				projectTitle={projectTitle}
				onBackToProjects={onBackToProjects}
				onUploadToCloud={onUploadToCloud}
				onSaveLocal={onSaveLocal}
			/>

			<WorkshopStepper activeStep={step} onStepChange={onStepChange} />

			<main className="workshop-studio__canvas">
				{step === 1 ? (
					<WorkshopScriptStage
						templateFile={templateFile}
						templateValue={templateValue}
						templateLabel={templateLabel}
						textModel={textModel}
						textModelOptions={textModelOptions}
						script={script}
						textareaRef={textareaRef}
						contextMenu={contextMenu}
						isExtracting={isExtracting}
						onTemplateFileChange={onTemplateFileChange}
						onTextModelChange={onTextModelChange}
						onScriptChange={onScriptChange}
						onTextareaScroll={onTextareaScroll}
						onTextareaContextMenu={onTextareaContextMenu}
						onCopyFromMenu={onCopyFromMenu}
						onPasteFromMenu={onPasteFromMenu}
						onDirectExtract={onDirectExtract}
						onAutoEpisodeBreakdown={onAutoEpisodeBreakdown}
						onNext={() => onStepChange(2)}
					/>
				) : null}

				{step === 2 ? (
					<WorkshopAnalysisStage
						textModel={textModel}
						textModelOptions={textModelOptions}
						onTextModelChange={onTextModelChange}
						onAiEpisodeSplit={onAiEpisodeSplit}
						onPrevious={() => onStepChange(1)}
						onNext={() => onStepChange(3)}
					/>
				) : null}

				{step === 3 ? (
					<WorkshopRoleStage
						activeTab={roleTab}
						tabLabel={roleTabLabel}
						entities={roleEntities}
						isExtracting={isExtracting}
						onTabChange={onRoleTabChange}
						onPrevious={() => onStepChange(2)}
						onNext={() => onStepChange(4)}
					/>
				) : null}

				{step === 4 ? (
					<div className="workshop-stage workshop-stage--frames">
						<WorkshopFramesSidebar
							actionKey={frameActionKey}
							script={script}
							scriptExpanded={scriptExpanded}
							frameCount={frameCards.length}
							onClear={onFrameClear}
							onToggleScript={onToggleScript}
							onInfer={onFrameInfer}
							onValidate={onFrameValidate}
							onMerge={onFrameMerge}
							onReferenceRecognition={onFrameReferenceRecognition}
							onAdd={onFrameAdd}
							onImport={onFrameImport}
						/>

						<WorkshopFramesBoard frames={frameCards} activeTab={frameTab} />

						<WorkshopFramesAssistantPanel
							activeTab={frameTab}
							onTabChange={onFrameTabChange}
						/>
					</div>
				) : null}
			</main>
		</section>
	);
}
