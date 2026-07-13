import type { PointerEvent, ReactNode } from "react";

import type { VideoExtensionModelInfo } from "../appVideoModelHelpers";
import type { ImageUpscaleSettings, VideoEnhanceSettings } from "./CanvasNodeView";

type PanelShellProps = {
	className: string;
	kicker: string;
	title: string;
	closeLabel: string;
	onClose: () => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
	children: ReactNode;
};

function PanelShell({
	className,
	kicker,
	title,
	closeLabel,
	onClose,
	stopNodeControlPointerDown,
	children,
}: PanelShellProps) {
	return (
		<div className={className} data-node-interactive="true" onPointerDown={stopNodeControlPointerDown}>
			<div className="video-enhance-panel__head">
				<div>
					<span>{kicker}</span>
					<strong>{title}</strong>
				</div>
				<button type="button" onClick={onClose} aria-label={closeLabel}>×</button>
			</div>
			{children}
		</div>
	);
}

export function VideoEnhancePanel({
	nodeId,
	settings,
	isGenerating,
	onSettingChange,
	onGenerate,
	onClose,
	stopNodeControlPointerDown,
}: {
	nodeId: string;
	settings: VideoEnhanceSettings;
	isGenerating: boolean;
	onSettingChange: (key: keyof VideoEnhanceSettings, value: string) => void;
	onGenerate: (nodeId: string) => void;
	onClose: () => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
	return (
		<PanelShell
			className="video-enhance-panel"
			kicker="本机 FFmpeg 增强"
			title="生成新视频节点"
			closeLabel="关闭增强设置"
			onClose={onClose}
			stopNodeControlPointerDown={stopNodeControlPointerDown}
		>
			<div className="video-enhance-panel__grid">
				<label>
					<span>目标帧率</span>
					<select value={settings.fps} onChange={(event) => onSettingChange("fps", event.target.value)} disabled={isGenerating}>
						<option value="original">保持原帧率</option>
						<option value="24">24 fps</option>
						<option value="30">30 fps</option>
						<option value="48">48 fps</option>
						<option value="60">60 fps</option>
						<option value="120">120 fps</option>
					</select>
				</label>
				<label>
					<span>分辨率倍率</span>
					<select value={settings.scale} onChange={(event) => onSettingChange("scale", event.target.value)} disabled={isGenerating}>
						<option value="1">保持原分辨率</option>
						<option value="1.5">1.5x</option>
						<option value="2">2x</option>
						<option value="3">3x</option>
						<option value="4">4x</option>
					</select>
				</label>
				<label>
					<span>显卡加速</span>
					<select value={settings.accelerator} onChange={(event) => onSettingChange("accelerator", event.target.value)} disabled={isGenerating}>
						<option value="cpu">CPU 兼容模式</option>
						<option value="amd">AMD 编码加速</option>
					</select>
				</label>
			</div>
			<p className="video-enhance-panel__hint">AMD 模式主要加速最终编码；补帧与缩放仍会占用 CPU。</p>
			<button
				type="button"
				className="video-enhance-panel__generate"
				disabled={isGenerating}
				onClick={() => onGenerate(nodeId)}
			>
				{isGenerating ? "生成中…" : "生成增强视频"}
			</button>
		</PanelShell>
	);
}

export function ImageUpscalePanel({
	nodeId,
	settings,
	isGenerating,
	onSettingChange,
	onGenerate,
	onClose,
	stopNodeControlPointerDown,
}: {
	nodeId: string;
	settings: ImageUpscaleSettings;
	isGenerating: boolean;
	onSettingChange: (key: keyof ImageUpscaleSettings, value: string) => void;
	onGenerate: (nodeId: string) => void;
	onClose: () => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
	return (
		<PanelShell
			className="video-enhance-panel image-upscale-panel"
			kicker="本机 FFmpeg 放大"
			title="生成高分辨率图片节点"
			closeLabel="关闭图片放大设置"
			onClose={onClose}
			stopNodeControlPointerDown={stopNodeControlPointerDown}
		>
			<div className="video-enhance-panel__grid video-enhance-panel__grid--single">
				<label>
					<span>分辨率倍率</span>
					<select value={settings.scale} onChange={(event) => onSettingChange("scale", event.target.value)} disabled={isGenerating}>
						<option value="1.5">1.5x</option>
						<option value="2">2x</option>
						<option value="3">3x</option>
						<option value="4">4x</option>
					</select>
				</label>
			</div>
			<button
				type="button"
				className="video-enhance-panel__generate"
				disabled={isGenerating}
				onClick={() => onGenerate(nodeId)}
			>
				{isGenerating ? "生成中…" : "生成高分辨率图片"}
			</button>
		</PanelShell>
	);
}

export function VideoExtendPanel({
	nodeId,
	settings,
	isGenerating,
	extensionModelInfo,
	videoExtendMode,
	onSettingChange,
	onGenerate,
	onClose,
	onVideoExtendModeChange,
	stopNodeControlPointerDown,
}: {
	nodeId: string;
	settings: VideoEnhanceSettings;
	isGenerating: boolean;
	extensionModelInfo?: VideoExtensionModelInfo;
	videoExtendMode: "full" | "half";
	onSettingChange: (key: keyof VideoEnhanceSettings, value: string) => void;
	onGenerate: (nodeId: string) => void;
	onClose: () => void;
	onVideoExtendModeChange: (mode: "full" | "half") => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
	return (
		<PanelShell
			className="video-enhance-panel"
			kicker="本机 FFmpeg + Gemini 扩展"
			title="从最后一帧生成后续视频"
			closeLabel="关闭扩展面板"
			onClose={onClose}
			stopNodeControlPointerDown={stopNodeControlPointerDown}
		>
			{extensionModelInfo ? (
				<div className="video-extension-model-info">
					<div>
						<span>扩展模型：</span>
						<strong>{extensionModelInfo.resolvedModelLabel}</strong>
					</div>
					<div className="video-extension-model-info__source">
						来源：{extensionModelInfo.source}
					</div>
					{extensionModelInfo.fallbackCandidates.length > 0 ? (
						<div className="video-extension-model-info__candidates" title={extensionModelInfo.fallbackCandidates.join(" / ")}>
							候选：{extensionModelInfo.fallbackCandidates.join(" / ")}
						</div>
					) : null}
				</div>
			) : null}
			<div className="video-enhance-panel__grid">
				<label>
					<span>目标帧率</span>
					<select value={settings.fps} onChange={(event) => onSettingChange("fps", event.target.value)}>
						<option value="original">保持原帧率</option>
						<option value="24">24 fps</option>
						<option value="30">30 fps</option>
						<option value="48">48 fps</option>
						<option value="60">60 fps</option>
						<option value="120">120 fps</option>
					</select>
				</label>
				<label>
					<span>分辨率倍率</span>
					<select value={settings.scale} onChange={(event) => onSettingChange("scale", event.target.value)}>
						<option value="1">保持原分辨率</option>
						<option value="1.5">1.5x</option>
						<option value="2">2x</option>
						<option value="3">3x</option>
						<option value="4">4x</option>
					</select>
				</label>
				<label>
					<span>硬件加速</span>
					<select value={settings.accelerator} onChange={(event) => onSettingChange("accelerator", event.target.value)}>
						<option value="cpu">CPU</option>
						<option value="amd">AMD</option>
					</select>
				</label>
			</div>
			<div className="video-enhance-panel__grid video-enhance-panel__grid--single">
				<label>
					<span>扩展模式</span>
					<div className="extend-mode-toggle">
						<button
							type="button"
							className={`extend-mode-chip ${videoExtendMode === "half" ? "is-active" : ""}`}
							onClick={() => onVideoExtendModeChange("half")}
						>
							半扩展（仅新视频）
						</button>
						<button
							type="button"
							className={`extend-mode-chip ${videoExtendMode === "full" ? "is-active" : ""}`}
							onClick={() => onVideoExtendModeChange("full")}
						>
							全扩展（拼接原片）
						</button>
					</div>
				</label>
			</div>
			<div className="video-enhance-panel__actions">
				<button
					type="button"
					className="perspective-editor__primary"
					disabled={isGenerating}
					onClick={() => onGenerate(nodeId)}
				>
					{isGenerating ? "扩展中…" : "开始扩展"}
				</button>
			</div>
		</PanelShell>
	);
}
