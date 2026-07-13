import {
	WORKSHOP_FRAME_TABS,
	type WorkshopFrameTab,
} from "../appUiConfig";
import { getWorkshopFrameOptionLabel } from "../appWorkshopFrameState";

export type WorkshopFramesAssistantPanelProps = {
	activeTab: WorkshopFrameTab;
	onTabChange: (tab: WorkshopFrameTab) => void;
};

export function WorkshopFramesAssistantPanel({
	activeTab,
	onTabChange,
}: WorkshopFramesAssistantPanelProps) {
	return (
		<aside className="workshop-frames__right">
			<div className="workshop-frames__right-head">
				<span className="workshop-frames__eyebrow">辅助区</span>
				<strong>模板 / 生图 / 生视频</strong>
			</div>
			<div className="workshop-frames__right-tabs">
				{WORKSHOP_FRAME_TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						className={activeTab === tab ? "is-active" : ""}
						onClick={() => onTabChange(tab)}
					>
						{tab}
					</button>
				))}
			</div>
			<div className="workshop-frames__field">
				<span className="workshop-frames__field-label">{activeTab}</span>
				<select>
					<option>{getWorkshopFrameOptionLabel(activeTab)}</option>
				</select>
			</div>
		</aside>
	);
}
