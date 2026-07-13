import {
	useCallback,
	useMemo,
	type Dispatch,
	type RefObject,
	type SetStateAction,
} from "react";

import { fuseWorkshopFramesWithLocalFfmpeg } from "../appWorkshopFrameFusion";
import { getWorkshopRolePanelState } from "../appWorkshopRoleState";
import { STORAGE_KEYS } from "../canvasPersistence";
import type {
	WorkshopFrameTab,
	WorkshopRoleTab,
} from "../appUiConfig";
import type { WorkshopExtractionState } from "../workshopExtractionHelpers";
import { useWorkshopContextMenu } from "./useWorkshopContextMenu";
import { useWorkshopDirectExtraction } from "./useWorkshopDirectExtraction";
import { useWorkshopFrameActions } from "./useWorkshopFrameActions";
import type { WorkshopStep } from "./useWorkshopLocalState";
import { useWorkshopTextModelOptions } from "./useWorkshopTextModelOptions";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UseWorkshopRouteControllerArgs = {
	upstreamTextModels: string[];
	defaultKakaApiBaseUrl: string;
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	workshopTextareaRef: RefObject<HTMLTextAreaElement | null>;
	workshopStep: WorkshopStep;
	setWorkshopStep: Dispatch<SetStateAction<WorkshopStep>>;
	workshopScript: string;
	setWorkshopScript: Dispatch<SetStateAction<string>>;
	workshopDirectExtractTemplateFile: string;
	workshopTextModel: string;
	setWorkshopTextModel: Dispatch<SetStateAction<string>>;
	workshopRoleTab: WorkshopRoleTab;
	setWorkshopRoleTab: Dispatch<SetStateAction<WorkshopRoleTab>>;
	workshopFrameTab: WorkshopFrameTab;
	workshopFrameCards: string[];
	setWorkshopScriptExpanded: Dispatch<SetStateAction<boolean>>;
	workshopExtraction: WorkshopExtractionState;
	setWorkshopExtraction: Dispatch<SetStateAction<WorkshopExtractionState>>;
	isWorkshopExtracting: boolean;
	setIsWorkshopExtracting: Dispatch<SetStateAction<boolean>>;
	setWorkshopFrameCards: Dispatch<SetStateAction<string[]>>;
	onNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
};

export function useWorkshopRouteController({
	upstreamTextModels,
	defaultKakaApiBaseUrl,
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	workshopTextareaRef,
	workshopStep,
	setWorkshopStep,
	workshopScript,
	setWorkshopScript,
	workshopDirectExtractTemplateFile,
	workshopTextModel,
	setWorkshopTextModel,
	workshopRoleTab,
	setWorkshopRoleTab,
	workshopFrameTab,
	workshopFrameCards,
	setWorkshopScriptExpanded,
	workshopExtraction,
	setWorkshopExtraction,
	isWorkshopExtracting,
	setIsWorkshopExtracting,
	setWorkshopFrameCards,
	onNotice,
}: UseWorkshopRouteControllerArgs) {
	const { workshopTextModelCatalog, workshopTextModelOptions } =
		useWorkshopTextModelOptions({
			upstreamTextModels,
			workshopTextModel,
			setWorkshopTextModel,
		});
	const handleWorkshopDirectExtractWithAi = useWorkshopDirectExtraction({
		isExtracting: isWorkshopExtracting,
		defaultKakaApiBaseUrl,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		workshopScript,
		workshopTextModel,
		workshopTextModelCatalog,
		onNotice,
		setIsExtracting: setIsWorkshopExtracting,
		setWorkshopExtraction,
	});
	const handleWorkshopFrameFfmpegFusion = useCallback(
		fuseWorkshopFramesWithLocalFfmpeg,
		[],
	);
	const workshopFrameActions = useWorkshopFrameActions({
		workshopScript,
		workshopStep,
		workshopRoleTab,
		workshopFrameTab,
		workshopFrameCards,
		workshopDirectExtractTemplateFile,
		workshopDraftStorageKey: STORAGE_KEYS.workshopDraft,
		onNotice,
		onDirectExtract: handleWorkshopDirectExtractWithAi,
		onMergeFrames: handleWorkshopFrameFfmpegFusion,
		setWorkshopStep,
		setWorkshopRoleTab,
		setWorkshopScriptExpanded,
		setWorkshopFrameCards,
	});
	const workshopContext = useWorkshopContextMenu({
		workshopStep,
		workshopTextareaRef,
		setWorkshopScript,
		onNotice,
	});
	const {
		label: workshopRoleTabLabel,
		entities: currentWorkshopEntities,
	} = useMemo(
		() => getWorkshopRolePanelState(workshopRoleTab, workshopExtraction),
		[workshopExtraction, workshopRoleTab],
	);

	return {
		workshopTextModelOptions,
		workshopRoleTabLabel,
		currentWorkshopEntities,
		...workshopFrameActions,
		...workshopContext,
	};
}
