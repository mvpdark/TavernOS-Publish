import type { WorkshopFrameTab } from "./appUiConfig";

const WORKSHOP_FRAME_OPTION_LABEL_BY_TAB: Record<WorkshopFrameTab, string> = {
	模板: "绘图模板-六宫格",
	生图: "生图模型-标准",
	生视频: "生视频模型-标准",
};

export function getWorkshopFrameOptionLabel(tab: WorkshopFrameTab) {
	return WORKSHOP_FRAME_OPTION_LABEL_BY_TAB[tab];
}
