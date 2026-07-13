import type { PreviewFilter } from "../appPreviewHelpers";
import type { CanvasMode } from "../appUiConfig";

type CanvasModeOption = {
	id: CanvasMode;
	label: string;
	description: string;
};

type CanvasModeSwitchProps = {
	modes: readonly CanvasModeOption[];
	activeMode: CanvasMode;
	sidePanelOpen: boolean;
	onSelectMode: (mode: CanvasMode) => void;
};

export function CanvasModeSwitch({
	modes,
	activeMode,
	sidePanelOpen,
	onSelectMode,
}: CanvasModeSwitchProps) {
	return (
		<div
			className={`canvas-mode-switch-zone ${sidePanelOpen ? "canvas-mode-switch-zone--sidepanel-open" : ""}`}
		>
			<div className="canvas-mode-switch">
				{modes.map((mode) => (
					<button
						type="button"
						key={mode.id}
						className={`canvas-mode-switch__item ${activeMode === mode.id ? "is-active" : ""}`}
						onClick={() => onSelectMode(mode.id)}
					>
						<strong>{mode.label}</strong>
						<span>{mode.description}</span>
					</button>
				))}
			</div>
		</div>
	);
}

type PreviewFilterOption = {
	id: PreviewFilter;
	label: string;
};

type PreviewFilterBarProps = {
	filters: readonly PreviewFilterOption[];
	activeFilter: PreviewFilter;
	counts: Record<PreviewFilter, number>;
	matchingMediaNodeCount: number;
	sidePanelOpen: boolean;
	onSelectFilter: (filter: PreviewFilter) => void;
};

export function PreviewFilterBar({
	filters,
	activeFilter,
	counts,
	matchingMediaNodeCount,
	sidePanelOpen,
	onSelectFilter,
}: PreviewFilterBarProps) {
	const activeCount = counts[activeFilter];
	const summary =
		activeCount > 0
			? `当前筛选命中 ${activeCount} 个结果，仅保留相关结果节点。`
			: matchingMediaNodeCount > 0
				? `当前筛选还没有产出结果，先保留 ${matchingMediaNodeCount} 个相关节点方便继续生成。`
				: "当前筛选下没有可预览节点。";

	return (
		<div className={`preview-filter-bar ${sidePanelOpen ? "preview-filter-bar--sidepanel-open" : ""}`}>
			<div className="preview-filter-bar__row">
				{filters.map((filter) => (
					<button
						type="button"
						key={filter.id}
						className={`preview-filter-bar__item ${activeFilter === filter.id ? "is-active" : ""}`}
						onClick={() => onSelectFilter(filter.id)}
					>
						<span>{filter.label}</span>
						<em>{counts[filter.id]}</em>
					</button>
				))}
			</div>
			<div className="preview-filter-bar__summary">{summary}</div>
		</div>
	);
}
