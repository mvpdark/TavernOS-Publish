import { GLOBAL_ASPECT_RATIO_OPTIONS } from "../appAspectRatioHelpers";
import {
	createStyleRef,
	getStyleLabel,
} from "../styleLibrary";
import type { RuntimeNotice } from "../hooks/useRuntimeNotices";
import type { NodeType, StyleLibraryState } from "../canvas-types";

type CanvasNoticesProps = {
	runtimeNotices: RuntimeNotice[];
	showHotkeyNotice: boolean;
	showConnectionTip: boolean;
	sidePanelOpen: boolean;
	onDismissRuntimeNotice: (id: string) => void;
	onDismissHotkeyNotice: () => void;
	onDismissConnectionTip: () => void;
};

export function CanvasNotices({
	runtimeNotices,
	showHotkeyNotice,
	showConnectionTip,
	sidePanelOpen,
	onDismissRuntimeNotice,
	onDismissHotkeyNotice,
	onDismissConnectionTip,
}: CanvasNoticesProps) {
	if (!showHotkeyNotice && !showConnectionTip && !runtimeNotices.length) {
		return null;
	}

	return (
		<div className={`canvas-notices ${sidePanelOpen ? "canvas-notices--agent-open" : ""}`}>
			{runtimeNotices.map((notice) => (
				<button
					type="button"
					key={notice.id}
					className={`canvas-notice canvas-notice--${notice.tone}`}
					onClick={() => onDismissRuntimeNotice(notice.id)}
				>
					<span>{notice.message}</span>
					<strong>关闭</strong>
				</button>
			))}
			{showHotkeyNotice ? (
				<button
					type="button"
					className="canvas-notice"
					onClick={onDismissHotkeyNotice}
				>
					<span>快捷键已启用：`Ctrl+J` 开关助手，`Ctrl+I` 聚焦输入。</span>
					<strong>关闭</strong>
				</button>
			) : null}
			{showConnectionTip ? (
				<button
					type="button"
					className="canvas-notice"
					onClick={onDismissConnectionTip}
				>
					<span>拖动节点 `+` 可以建立引用链路，松到空白处会触发引用生成菜单。</span>
					<strong>知道了</strong>
				</button>
			) : null}
		</div>
	);
}

type CanvasModeBannerProps = {
	mode: "director" | "preview" | null;
	sidePanelOpen: boolean;
};

export function CanvasModeBanner({ mode, sidePanelOpen }: CanvasModeBannerProps) {
	if (!mode) return null;

	const copy =
		mode === "director"
			? {
					label: "导演模式",
					message: "当前聚焦镜头组织，已隐藏底部生成面板。",
				}
			: {
					label: "预览模式",
					message: "当前聚焦结果查看，已隐藏编辑浮层。",
				};

	return (
		<div className={`canvas-mode-banner ${sidePanelOpen ? "canvas-mode-banner--sidepanel-open" : ""}`}>
			<span className="canvas-mode-banner__label">{copy.label}</span>
			<strong>{copy.message}</strong>
		</div>
	);
}

const NODE_TYPE_LABELS: Record<NodeType, string> = {
	text: "文本",
	shot: "镜头",
	character: "角色",
	scene: "场景",
	image: "图片",
	video: "视频",
	audio: "音频",
	music: "音乐",
	editor: "图片编辑器",
};

type CanvasLeftDockProps = {
	isVisible: boolean;
	tools: ReadonlyArray<{ type: NodeType; icon: string }>;
	activeTool: NodeType;
	nodeCount: number;
	onSelectTool: (type: NodeType) => void;
};

export function CanvasLeftDock({
	isVisible,
	tools,
	activeTool,
	nodeCount,
	onSelectTool,
}: CanvasLeftDockProps) {
	if (!isVisible) return null;

	return (
		<aside className="left-dock">
			<div className="left-dock__rail">
				{tools.map((tool) => {
					const label = NODE_TYPE_LABELS[tool.type];
					return (
						<button
							type="button"
							key={tool.type}
							className={`left-dock__tool ${activeTool === tool.type ? "is-active" : ""}`}
							data-label={label}
							aria-label={label}
							onClick={() => onSelectTool(tool.type)}
						>
							{tool.icon}
						</button>
					);
				})}
				<div className="left-dock__counter">{nodeCount}</div>
			</div>
		</aside>
	);
}

type CanvasTopToolbarProps = {
	isVisible: boolean;
	sidePanelOpen: boolean;
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
};

export function CanvasTopToolbar({
	isVisible,
	sidePanelOpen,
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
}: CanvasTopToolbarProps) {
	if (!isVisible) return null;

	const isMenuOpen = isGlobalAspectMenuOpen || isGlobalStyleMenuOpen;

	return (
		<div
			className={`top-toolbar ${sidePanelOpen ? "top-toolbar--agent-open" : ""} ${isMenuOpen ? "top-toolbar--menu-open" : ""}`}
		>
			<div
				className={`global-aspect-picker ${isGlobalAspectMenuOpen ? "is-open" : ""}`}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					className="toolbar-pill toolbar-pill--aspect"
					onClick={onToggleAspectMenu}
				>
					<span>比例 {globalAspectRatio}</span>
				</button>
				{isGlobalAspectMenuOpen ? (
					<div
						className="global-aspect-menu"
						onWheelCapture={(event) => event.stopPropagation()}
					>
						{GLOBAL_ASPECT_RATIO_OPTIONS.map((ratio) => (
							<button
								key={ratio}
								type="button"
								className={ratio === globalAspectRatio ? "is-active" : ""}
								onClick={() => onApplyAspectRatio(ratio)}
							>
								{ratio}
							</button>
						))}
					</div>
				) : null}
			</div>
			<div
				className={`global-style-picker ${isGlobalStyleMenuOpen ? "is-open" : ""}`}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					className="toolbar-pill toolbar-pill--style"
					onClick={onToggleStyleMenu}
				>
					<span>
						{getStyleLabel(
							styleLibrary,
							createStyleRef(globalStylePresetId || undefined, "manual", styleLibrary),
						)}
					</span>
				</button>
				{isGlobalStyleMenuOpen ? (
					<div
						className="global-style-menu"
						onWheelCapture={(event) => event.stopPropagation()}
					>
						{styleLibrary.categories.map((category) => {
							const presets = styleLibrary.presets.filter(
								(preset) => preset.categoryId === category.id,
							);
							return (
								<section key={category.id} className="global-style-menu__section">
									<strong>{category.name}</strong>
									<div className="global-style-menu__grid">
										{presets.map((preset) => (
											<button
												key={preset.id}
												type="button"
												className={preset.id === globalStylePresetId ? "is-active" : ""}
												onClick={() => onApplyStyle(preset.id)}
											>
												{preset.name}
											</button>
										))}
									</div>
								</section>
							);
						})}
					</div>
				) : null}
			</div>
			<button
				type="button"
				className="toolbar-pill"
				onClick={onCreatePrimary}
			>
				{primaryCreateLabel}
			</button>
			<button type="button" className="toolbar-pill toolbar-pill--secondary">
				{groupLabel}
			</button>
		</div>
	);
}

type CanvasZoomHudProps = {
	visible: boolean;
	zoom: number;
	zoomMin: number;
	zoomMax: number;
	onResetZoom: () => void;
};

export function CanvasZoomHud({
	visible,
	zoom,
	zoomMin,
	zoomMax,
	onResetZoom,
}: CanvasZoomHudProps) {
	const progress = ((zoom - zoomMin) / (zoomMax - zoomMin)) * 100;

	return (
		<div className={`bottom-zoom ${visible ? "is-visible" : ""}`}>
			<button
				type="button"
				className="zoom-icon"
				onClick={onResetZoom}
				aria-label="重置缩放"
			>
				1:1
			</button>
			<div className="zoom-slider">
				<span className="zoom-track" />
				<span
					className="zoom-thumb"
					style={{
						left: `${progress}%`,
					}}
				/>
			</div>
			<span className="bottom-zoom__value">{Math.round(zoom * 100)}%</span>
			<button type="button" className="zoom-help" aria-label="缩放帮助">
				?
			</button>
		</div>
	);
}
