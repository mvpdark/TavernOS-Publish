import { useState } from "react";

import { COMPOSER_PRESETS } from "../appComposerPresets";
import {
	WORKSHOP_DIRECT_EXTRACT_TEMPLATE_FILE,
	type WorkshopFrameTab,
	type WorkshopRoleTab,
} from "../appUiConfig";
import type { WorkshopExtractionState } from "../workshopExtractionHelpers";

export type WorkshopStep = 1 | 2 | 3 | 4;

export type WorkshopLocalStateSnapshot = {
	workshopStep: WorkshopStep;
	workshopScript: string;
	workshopDirectExtractTemplateFile: string;
	workshopTextModel: string;
	workshopRoleTab: WorkshopRoleTab;
	workshopFrameTab: WorkshopFrameTab;
	workshopScriptExpanded: boolean;
	workshopExtraction: WorkshopExtractionState;
	isWorkshopExtracting: boolean;
	workshopFrameCards: string[];
};

export function createInitialWorkshopState(): WorkshopLocalStateSnapshot {
	return {
		workshopStep: 1,
		workshopScript: "",
		workshopDirectExtractTemplateFile: WORKSHOP_DIRECT_EXTRACT_TEMPLATE_FILE,
		workshopTextModel: COMPOSER_PRESETS.text.model,
		workshopRoleTab: "角色设定",
		workshopFrameTab: "模板",
		workshopScriptExpanded: true,
		workshopExtraction: {
			characters: [],
			scenes: [],
			props: [],
		},
		isWorkshopExtracting: false,
		workshopFrameCards: [],
	};
}

export function useWorkshopLocalState() {
	const initialState = createInitialWorkshopState();
	const [workshopStep, setWorkshopStep] = useState<WorkshopStep>(
		initialState.workshopStep,
	);
	const [workshopScript, setWorkshopScript] = useState(
		initialState.workshopScript,
	);
	const [
		workshopDirectExtractTemplateFile,
		setWorkshopDirectExtractTemplateFile,
	] = useState(initialState.workshopDirectExtractTemplateFile);
	const [workshopTextModel, setWorkshopTextModel] = useState(
		initialState.workshopTextModel,
	);
	const [workshopRoleTab, setWorkshopRoleTab] =
		useState<WorkshopRoleTab>(initialState.workshopRoleTab);
	const [workshopFrameTab, setWorkshopFrameTab] =
		useState<WorkshopFrameTab>(initialState.workshopFrameTab);
	const [workshopScriptExpanded, setWorkshopScriptExpanded] = useState(
		initialState.workshopScriptExpanded,
	);
	const [workshopExtraction, setWorkshopExtraction] =
		useState<WorkshopExtractionState>(initialState.workshopExtraction);
	const [isWorkshopExtracting, setIsWorkshopExtracting] = useState(
		initialState.isWorkshopExtracting,
	);
	const [workshopFrameCards, setWorkshopFrameCards] = useState<string[]>(
		initialState.workshopFrameCards,
	);

	return {
		workshopStep,
		setWorkshopStep,
		workshopScript,
		setWorkshopScript,
		workshopDirectExtractTemplateFile,
		setWorkshopDirectExtractTemplateFile,
		workshopTextModel,
		setWorkshopTextModel,
		workshopRoleTab,
		setWorkshopRoleTab,
		workshopFrameTab,
		setWorkshopFrameTab,
		workshopScriptExpanded,
		setWorkshopScriptExpanded,
		workshopExtraction,
		setWorkshopExtraction,
		isWorkshopExtracting,
		setIsWorkshopExtracting,
		workshopFrameCards,
		setWorkshopFrameCards,
	};
}
