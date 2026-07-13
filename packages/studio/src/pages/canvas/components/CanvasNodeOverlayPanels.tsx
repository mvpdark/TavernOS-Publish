import type { PointerEvent } from "react";

import type { VideoExtensionModelInfo } from "../appVideoModelHelpers";
import {
	ImageUpscalePanel,
	VideoEnhancePanel,
	VideoExtendPanel,
} from "./CanvasNodeMediaPanels";
import {
	PerspectiveEditPanel,
	type PerspectiveEditSettings,
} from "./CanvasPerspectiveEditPanel";

export type CanvasNodeOverlayPanelsProps = {
	nodeId: string;
	nodeType: string;
	isImageUpscalePanelOpen: boolean;
	imageUpscaleSettings: { scale: string };
	isImageUpscaling: boolean;
	onImageUpscaleSettingChange: (key: "scale", value: string) => void;
	onGenerateImageUpscale: (nodeId: string) => void;
	onCloseImageUpscalePanel: () => void;
	isPerspectiveEditing: boolean;
	perspectiveEditSettings: PerspectiveEditSettings;
	isPerspectiveGenerating: boolean;
	onPerspectiveEditChange: (nextPartial: Partial<PerspectiveEditSettings>) => void;
	onPerspectiveEditGenerate: (nodeId: string) => void;
	onPerspectiveEditClose: () => void;
	isVideoEnhancePanelOpen: boolean;
	isVideoExtendPanelOpen: boolean;
	videoEnhanceSettings: { fps: string; scale: string; accelerator: "cpu" | "amd" };
	isVideoEnhancing: boolean;
	isVideoExtending: boolean;
	extensionModelInfo?: VideoExtensionModelInfo;
	videoExtendMode: "full" | "half";
	onVideoEnhanceSettingChange: (key: "fps" | "scale" | "accelerator", value: string) => void;
	onGenerateVideoEnhancement: (nodeId: string) => void;
	onCloseVideoEnhancePanel: () => void;
	onCloseVideoExtendPanel: () => void;
	onVideoExtendModeChange: (mode: "full" | "half") => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
};

export function CanvasNodeOverlayPanels({
	nodeId,
	nodeType,
	isImageUpscalePanelOpen,
	imageUpscaleSettings,
	isImageUpscaling,
	onImageUpscaleSettingChange,
	onGenerateImageUpscale,
	onCloseImageUpscalePanel,
	isPerspectiveEditing,
	perspectiveEditSettings,
	isPerspectiveGenerating,
	onPerspectiveEditChange,
	onPerspectiveEditGenerate,
	onPerspectiveEditClose,
	isVideoEnhancePanelOpen,
	isVideoExtendPanelOpen,
	videoEnhanceSettings,
	isVideoEnhancing,
	isVideoExtending,
	extensionModelInfo,
	videoExtendMode,
	onVideoEnhanceSettingChange,
	onGenerateVideoEnhancement,
	onCloseVideoEnhancePanel,
	onCloseVideoExtendPanel,
	onVideoExtendModeChange,
	stopNodeControlPointerDown,
}: CanvasNodeOverlayPanelsProps) {
	return (
		<>
			{isImageUpscalePanelOpen ? (
				<ImageUpscalePanel
					nodeId={nodeId}
					settings={imageUpscaleSettings}
					isGenerating={isImageUpscaling}
					onSettingChange={onImageUpscaleSettingChange}
					onGenerate={onGenerateImageUpscale}
					onClose={onCloseImageUpscalePanel}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			) : null}

			{isPerspectiveEditing ? (
				<PerspectiveEditPanel
					nodeId={nodeId}
					settings={perspectiveEditSettings}
					isGenerating={isPerspectiveGenerating}
					onChange={onPerspectiveEditChange}
					onGenerate={onPerspectiveEditGenerate}
					onClose={onPerspectiveEditClose}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			) : null}

			{nodeType === "video" && isVideoEnhancePanelOpen ? (
				<VideoEnhancePanel
					nodeId={nodeId}
					settings={videoEnhanceSettings}
					isGenerating={isVideoEnhancing}
					onSettingChange={onVideoEnhanceSettingChange}
					onGenerate={onGenerateVideoEnhancement}
					onClose={onCloseVideoEnhancePanel}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			) : null}

			{nodeType === "video" && isVideoExtendPanelOpen ? (
				<VideoExtendPanel
					nodeId={nodeId}
					settings={videoEnhanceSettings}
					isGenerating={isVideoExtending}
					extensionModelInfo={extensionModelInfo}
					videoExtendMode={videoExtendMode}
					onSettingChange={onVideoEnhanceSettingChange}
					onGenerate={onGenerateVideoEnhancement}
					onClose={onCloseVideoExtendPanel}
					onVideoExtendModeChange={onVideoExtendModeChange}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			) : null}
		</>
	);
}
