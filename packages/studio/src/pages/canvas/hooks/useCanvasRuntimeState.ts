import { useState } from "react";

import {
	DEFAULT_IMAGE_UPSCALE_SETTINGS,
	DEFAULT_VIDEO_ENHANCE_SETTINGS,
	type FfmpegInstallPromptState,
	type ImagePreviewState,
	type VideoFusionAnalysisState,
	type VideoFusionPromptState,
	type VideoPreviewState,
} from "../appCanvasState";
import type { VideoExtensionModelInfo } from "../appVideoModelHelpers";
import { DEFAULT_PERSPECTIVE_EDIT_SETTINGS } from "../appUiConfig";
import type {
	ImageUpscaleSettings,
	PerspectiveEditSettings,
	VideoEnhanceSettings,
} from "../components/CanvasNodeView";

export type CanvasRuntimeInitialState = {
	videoPreview: VideoPreviewState;
	imagePreview: ImagePreviewState;
	videoEnhancingNodeId: string | null;
	videoExtendingNodeId: string | null;
	videoExtensionModelInfos: Record<string, VideoExtensionModelInfo>;
	videoFusionHoverNodeId: string | null;
	videoFusionPrompt: VideoFusionPromptState;
	videoFusionAnalysis: VideoFusionAnalysisState;
	videoFusingPairKey: string | null;
	videoExtendMode: "full" | "half";
	videoEnhanceSettings: VideoEnhanceSettings;
	imageUpscaleSettings: ImageUpscaleSettings;
	imageUpscalingNodeId: string | null;
	ffmpegInstallPrompt: FfmpegInstallPromptState;
	ffmpegInstallingNodeId: string | null;
	isCanvasDropActive: boolean;
	cropEditingNodeId: string | null;
	redrawEditingNodeId: string | null;
	redrawGeneratingNodeId: string | null;
	perspectiveEditNodeId: string | null;
	perspectiveEditSettings: PerspectiveEditSettings;
	perspectiveGeneratingNodeId: string | null;
	threeDDirectorGeneratingNodeId: string | null;
	reversePromptGeneratingNodeId: string | null;
	isCanvasFocusAnimating: boolean;
	liftedDragIds: Set<string>;
};

export function createInitialCanvasRuntimeState(): CanvasRuntimeInitialState {
	return {
		videoPreview: null,
		imagePreview: null,
		videoEnhancingNodeId: null,
		videoExtendingNodeId: null,
		videoExtensionModelInfos: {},
		videoFusionHoverNodeId: null,
		videoFusionPrompt: null,
		videoFusionAnalysis: null,
		videoFusingPairKey: null,
		videoExtendMode: "half",
		videoEnhanceSettings: { ...DEFAULT_VIDEO_ENHANCE_SETTINGS },
		imageUpscaleSettings: { ...DEFAULT_IMAGE_UPSCALE_SETTINGS },
		imageUpscalingNodeId: null,
		ffmpegInstallPrompt: null,
		ffmpegInstallingNodeId: null,
		isCanvasDropActive: false,
		cropEditingNodeId: null,
		redrawEditingNodeId: null,
		redrawGeneratingNodeId: null,
		perspectiveEditNodeId: null,
		perspectiveEditSettings: { ...DEFAULT_PERSPECTIVE_EDIT_SETTINGS },
		perspectiveGeneratingNodeId: null,
		threeDDirectorGeneratingNodeId: null,
		reversePromptGeneratingNodeId: null,
		isCanvasFocusAnimating: false,
		liftedDragIds: new Set(),
	};
}

export function useCanvasRuntimeState() {
	const initialState = createInitialCanvasRuntimeState();
	const [videoPreview, setVideoPreview] = useState<VideoPreviewState>(
		initialState.videoPreview,
	);
	const [imagePreview, setImagePreview] = useState<ImagePreviewState>(
		initialState.imagePreview,
	);
	const [videoEnhancingNodeId, setVideoEnhancingNodeId] = useState<
		string | null
	>(initialState.videoEnhancingNodeId);
	const [videoExtendingNodeId, setVideoExtendingNodeId] = useState<
		string | null
	>(initialState.videoExtendingNodeId);
	const [videoExtensionModelInfos, setVideoExtensionModelInfos] = useState<
		Record<string, VideoExtensionModelInfo>
	>(initialState.videoExtensionModelInfos);
	const [videoFusionHoverNodeId, setVideoFusionHoverNodeId] = useState<
		string | null
	>(initialState.videoFusionHoverNodeId);
	const [videoFusionPrompt, setVideoFusionPrompt] =
		useState<VideoFusionPromptState>(initialState.videoFusionPrompt);
	const [videoFusionAnalysis, setVideoFusionAnalysis] =
		useState<VideoFusionAnalysisState>(initialState.videoFusionAnalysis);
	const [videoFusingPairKey, setVideoFusingPairKey] = useState<string | null>(
		initialState.videoFusingPairKey,
	);
	const [videoExtendMode, setVideoExtendMode] = useState<"full" | "half">(
		initialState.videoExtendMode,
	);
	const [videoEnhanceSettings, setVideoEnhanceSettings] =
		useState<VideoEnhanceSettings>(initialState.videoEnhanceSettings);
	const [imageUpscaleSettings, setImageUpscaleSettings] =
		useState<ImageUpscaleSettings>(initialState.imageUpscaleSettings);
	const [imageUpscalingNodeId, setImageUpscalingNodeId] = useState<
		string | null
	>(initialState.imageUpscalingNodeId);
	const [ffmpegInstallPrompt, setFfmpegInstallPrompt] =
		useState<FfmpegInstallPromptState>(initialState.ffmpegInstallPrompt);
	const [ffmpegInstallingNodeId, setFfmpegInstallingNodeId] = useState<
		string | null
	>(initialState.ffmpegInstallingNodeId);
	const [isCanvasDropActive, setIsCanvasDropActive] = useState(
		initialState.isCanvasDropActive,
	);
	const [cropEditingNodeId, setCropEditingNodeId] = useState<string | null>(
		initialState.cropEditingNodeId,
	);
	const [redrawEditingNodeId, setRedrawEditingNodeId] = useState<
		string | null
	>(initialState.redrawEditingNodeId);
	const [redrawGeneratingNodeId, setRedrawGeneratingNodeId] = useState<
		string | null
	>(initialState.redrawGeneratingNodeId);
	const [perspectiveEditNodeId, setPerspectiveEditNodeId] = useState<
		string | null
	>(initialState.perspectiveEditNodeId);
	const [perspectiveEditSettings, setPerspectiveEditSettings] =
		useState<PerspectiveEditSettings>(initialState.perspectiveEditSettings);
	const [perspectiveGeneratingNodeId, setPerspectiveGeneratingNodeId] =
		useState<string | null>(initialState.perspectiveGeneratingNodeId);
	const [
		threeDDirectorGeneratingNodeId,
		setThreeDDirectorGeneratingNodeId,
	] = useState<string | null>(initialState.threeDDirectorGeneratingNodeId);
	const [reversePromptGeneratingNodeId, setReversePromptGeneratingNodeId] =
		useState<string | null>(initialState.reversePromptGeneratingNodeId);
	const [isCanvasFocusAnimating, setIsCanvasFocusAnimating] = useState(
		initialState.isCanvasFocusAnimating,
	);
	const [liftedDragIds, setLiftedDragIds] = useState<Set<string>>(
		() => new Set(initialState.liftedDragIds),
	);

	return {
		videoPreview,
		setVideoPreview,
		imagePreview,
		setImagePreview,
		videoEnhancingNodeId,
		setVideoEnhancingNodeId,
		videoExtendingNodeId,
		setVideoExtendingNodeId,
		videoExtensionModelInfos,
		setVideoExtensionModelInfos,
		videoFusionHoverNodeId,
		setVideoFusionHoverNodeId,
		videoFusionPrompt,
		setVideoFusionPrompt,
		videoFusionAnalysis,
		setVideoFusionAnalysis,
		videoFusingPairKey,
		setVideoFusingPairKey,
		videoExtendMode,
		setVideoExtendMode,
		videoEnhanceSettings,
		setVideoEnhanceSettings,
		imageUpscaleSettings,
		setImageUpscaleSettings,
		imageUpscalingNodeId,
		setImageUpscalingNodeId,
		ffmpegInstallPrompt,
		setFfmpegInstallPrompt,
		ffmpegInstallingNodeId,
		setFfmpegInstallingNodeId,
		isCanvasDropActive,
		setIsCanvasDropActive,
		cropEditingNodeId,
		setCropEditingNodeId,
		redrawEditingNodeId,
		setRedrawEditingNodeId,
		redrawGeneratingNodeId,
		setRedrawGeneratingNodeId,
		perspectiveEditNodeId,
		setPerspectiveEditNodeId,
		perspectiveEditSettings,
		setPerspectiveEditSettings,
		perspectiveGeneratingNodeId,
		setPerspectiveGeneratingNodeId,
		threeDDirectorGeneratingNodeId,
		setThreeDDirectorGeneratingNodeId,
		reversePromptGeneratingNodeId,
		setReversePromptGeneratingNodeId,
		isCanvasFocusAnimating,
		setIsCanvasFocusAnimating,
		liftedDragIds,
		setLiftedDragIds,
	};
}
