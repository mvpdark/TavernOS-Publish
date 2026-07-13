import {
	PREVIEW_FILTERS,
	type PreviewFilter,
} from "../appPreviewHelpers";
import {
	CANVAS_MODES,
	LEFT_TOOLS,
	type CanvasMode,
} from "../appUiConfig";
import type { RuntimeNotice } from "../hooks/useRuntimeNotices";
import type { NodeType, StyleLibraryState } from "../canvas-types";
import {
	CanvasLeftDock,
	CanvasModeBanner,
	CanvasNotices,
	CanvasTopToolbar,
} from "./CanvasChrome";
import {
	CanvasModeSwitch,
	PreviewFilterBar,
} from "./CanvasModeControls";

type CanvasViewChromeProps = {
	isCanvasView: boolean;
	isPreviewMode: boolean;
	modeBannerMode: "director" | "preview" | null;
	canvasMode: CanvasMode;
	sidePanelOpen: boolean;
	onSelectMode: (mode: CanvasMode) => void;
	previewFilter: PreviewFilter;
	previewFilterCounts: Record<PreviewFilter, number>;
	previewMatchingMediaNodeCount: number;
	onSelectPreviewFilter: (filter: PreviewFilter) => void;
	showCreationChrome: boolean;
	globalAspectRatio: string;
	isGlobalAspectMenuOpen: boolean;
	styleLibrary: StyleLibraryState;
	globalStylePresetId: string;
	isGlobalStyleMenuOpen: boolean;
	primaryCreateLabel: string;
	groupLabel: string;
	onToggleAspectMenu: () => void;
	onApplyAspectRatio: (aspectRatio: string) => void;
	onToggleStyleMenu: () => void;
	onApplyStyle: (presetId: string) => void;
	onCreatePrimary: () => void;
	runtimeNotices: RuntimeNotice[];
	showHotkeyNotice: boolean;
	showConnectionTip: boolean;
	onDismissRuntimeNotice: (id: string) => void;
	onDismissHotkeyNotice: () => void;
	onDismissConnectionTip: () => void;
	activeTool: NodeType;
	nodeCount: number;
	onSelectTool: (type: NodeType) => void;
};

export function CanvasViewChrome({
	isCanvasView,
	isPreviewMode,
	modeBannerMode,
	canvasMode,
	sidePanelOpen,
	onSelectMode,
	previewFilter,
	previewFilterCounts,
	previewMatchingMediaNodeCount,
	onSelectPreviewFilter,
	showCreationChrome,
	globalAspectRatio,
	isGlobalAspectMenuOpen,
	styleLibrary,
	globalStylePresetId,
	isGlobalStyleMenuOpen,
	primaryCreateLabel,
	groupLabel,
	onToggleAspectMenu,
	onApplyAspectRatio,
	onToggleStyleMenu,
	onApplyStyle,
	onCreatePrimary,
	runtimeNotices,
	showHotkeyNotice,
	showConnectionTip,
	onDismissRuntimeNotice,
	onDismissHotkeyNotice,
	onDismissConnectionTip,
	activeTool,
	nodeCount,
	onSelectTool,
}: CanvasViewChromeProps) {
	return (
		<>
			{isCanvasView ? (
				<CanvasModeSwitch
					modes={CANVAS_MODES}
					activeMode={canvasMode}
					sidePanelOpen={sidePanelOpen}
					onSelectMode={onSelectMode}
				/>
			) : null}

			{isPreviewMode ? (
				<PreviewFilterBar
					filters={PREVIEW_FILTERS}
					activeFilter={previewFilter}
					counts={previewFilterCounts}
					matchingMediaNodeCount={previewMatchingMediaNodeCount}
					sidePanelOpen={sidePanelOpen}
					onSelectFilter={onSelectPreviewFilter}
				/>
			) : null}

			<CanvasTopToolbar
				isVisible={showCreationChrome}
				sidePanelOpen={sidePanelOpen}
				globalAspectRatio={globalAspectRatio}
				isGlobalAspectMenuOpen={isGlobalAspectMenuOpen}
				styleLibrary={styleLibrary}
				globalStylePresetId={globalStylePresetId}
				isGlobalStyleMenuOpen={isGlobalStyleMenuOpen}
				primaryCreateLabel={primaryCreateLabel}
				groupLabel={groupLabel}
				onToggleAspectMenu={onToggleAspectMenu}
				onApplyAspectRatio={onApplyAspectRatio}
				onToggleStyleMenu={onToggleStyleMenu}
				onApplyStyle={onApplyStyle}
				onCreatePrimary={onCreatePrimary}
			/>

			<CanvasNotices
				runtimeNotices={runtimeNotices}
				showHotkeyNotice={showHotkeyNotice}
				showConnectionTip={showConnectionTip}
				sidePanelOpen={sidePanelOpen}
				onDismissRuntimeNotice={onDismissRuntimeNotice}
				onDismissHotkeyNotice={onDismissHotkeyNotice}
				onDismissConnectionTip={onDismissConnectionTip}
			/>

			<CanvasModeBanner mode={modeBannerMode} sidePanelOpen={sidePanelOpen} />

			<CanvasLeftDock
				isVisible={showCreationChrome}
				tools={LEFT_TOOLS}
				activeTool={activeTool}
				nodeCount={nodeCount}
				onSelectTool={onSelectTool}
			/>
		</>
	);
}
