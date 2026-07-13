import type { WorkshopRoleTab } from "./appUiConfig";
import type {
	WorkshopExtractedEntity,
	WorkshopExtractionState,
} from "./workshopExtractionHelpers";

type WorkshopRolePanelState = {
	label: string;
	entities: WorkshopExtractedEntity[];
};

const WORKSHOP_ROLE_LABEL_BY_TAB: Record<WorkshopRoleTab, string> = {
	角色设定: "角色",
	场景设定: "场景",
	物品设定: "物品",
};

export function getWorkshopRolePanelState(
	tab: WorkshopRoleTab,
	extraction: WorkshopExtractionState,
): WorkshopRolePanelState {
	if (tab === "角色设定") {
		return {
			label: WORKSHOP_ROLE_LABEL_BY_TAB[tab],
			entities: extraction.characters,
		};
	}
	if (tab === "场景设定") {
		return {
			label: WORKSHOP_ROLE_LABEL_BY_TAB[tab],
			entities: extraction.scenes,
		};
	}
	return {
		label: WORKSHOP_ROLE_LABEL_BY_TAB[tab],
		entities: extraction.props,
	};
}
