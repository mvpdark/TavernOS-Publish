import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";

import type { FfmpegInstallPromptState } from "../appCanvasState";
import { requestLocalFfmpegStatus } from "../appServerApi";
import {
	resolveVideoExtensionModelInfo,
	withVideoExtensionModelInfo,
	type VideoExtensionModelInfo,
} from "../appVideoModelHelpers";
import type {
	ImageUpscaleSettings,
	VideoEnhanceSettings,
} from "../components/CanvasNodeView";
import type { CanvasNode, ComposerPreset } from "../canvas-types";

export type UseFfmpegPanelActionsConfig = {
	nodeById: Map<string, CanvasNode>;
	primaryNode: CanvasNode | null;
	videoComposer: ComposerPreset;
	setFfmpegInstallPrompt: Dispatch<SetStateAction<FfmpegInstallPromptState>>;
	setVideoExtensionModelInfos: Dispatch<
		SetStateAction<Record<string, VideoExtensionModelInfo>>
	>;
	setVideoEnhanceSettings: Dispatch<SetStateAction<VideoEnhanceSettings>>;
	setImageUpscaleSettings: Dispatch<SetStateAction<ImageUpscaleSettings>>;
};

function buildFfmpegStatusErrorMessage(error: unknown) {
	return error instanceof Error && error.message.trim()
		? `${error.message}\n是否尝试自动安装 FFmpeg？`
		: "无法确认 FFmpeg 状态，是否尝试自动安装？";
}

export function useFfmpegPanelActions({
	nodeById,
	videoComposer,
	setFfmpegInstallPrompt,
	setVideoExtensionModelInfos,
	setVideoEnhanceSettings,
	setImageUpscaleSettings,
}: UseFfmpegPanelActionsConfig) {
	const [videoEnhancePanelNodeId, setVideoEnhancePanelNodeId] =
		useState<string | null>(null);
	const [videoExtendPanelNodeId, setVideoExtendPanelNodeId] =
		useState<string | null>(null);
	const [imageUpscalePanelNodeId, setImageUpscalePanelNodeId] =
		useState<string | null>(null);

	const rememberVideoExtensionModelInfo = useCallback(
		(nodeId: string, node: CanvasNode) => {
			const fallbackVideoComposer = videoComposer;
			const extensionModelInfo = resolveVideoExtensionModelInfo(
				node.composer,
				node.asset,
				fallbackVideoComposer,
			);
			if (!extensionModelInfo) return;
			setVideoExtensionModelInfos((current) =>
				withVideoExtensionModelInfo(current, nodeId, extensionModelInfo),
			);
		},
		[setVideoExtensionModelInfos, videoComposer],
	);

	const openVideoEnhancePanel = useCallback(
		async (nodeId: string) => {
			if (videoEnhancePanelNodeId === nodeId) {
				setVideoEnhancePanelNodeId(null);
				return;
			}
			const node = nodeById.get(nodeId);
			if (!node?.asset) return;
			try {
				const status = await requestLocalFfmpegStatus();
				if (status.available) {
					setFfmpegInstallPrompt(null);
					setVideoEnhancePanelNodeId(nodeId);
					return;
				}
				setFfmpegInstallPrompt({
					nodeId,
					message:
						"当前电脑还没有可用的 FFmpeg。是否现在自动安装？安装完成后会继续打开增强参数。",
					panelToOpen: "video-enhance",
				});
			} catch (error) {
				setFfmpegInstallPrompt({
					nodeId,
					message: buildFfmpegStatusErrorMessage(error),
					panelToOpen: "video-enhance",
				});
			}
		},
		[nodeById, setFfmpegInstallPrompt, videoEnhancePanelNodeId],
	);

	const openVideoExtendPanel = useCallback(
		async (nodeId: string) => {
			if (videoExtendPanelNodeId === nodeId) {
				setVideoExtendPanelNodeId(null);
				return;
			}
			const node = nodeById.get(nodeId);
			if (!node?.asset) return;
			rememberVideoExtensionModelInfo(nodeId, node);
			try {
				const status = await requestLocalFfmpegStatus();
				if (status.available) {
					setFfmpegInstallPrompt(null);
					setVideoExtendPanelNodeId(nodeId);
					return;
				}
				setFfmpegInstallPrompt({
					nodeId,
					message:
						"视频扩展需要本机 FFmpeg 提取最后一帧。是否现在自动安装？",
					panelToOpen: "video-extend",
				});
			} catch (error) {
				setFfmpegInstallPrompt({
					nodeId,
					message: buildFfmpegStatusErrorMessage(error),
					panelToOpen: "video-extend",
				});
			}
		},
		[
			nodeById,
			rememberVideoExtensionModelInfo,
			setFfmpegInstallPrompt,
			videoExtendPanelNodeId,
		],
	);

	const updateVideoEnhanceSetting = useCallback(
		(key: keyof VideoEnhanceSettings, value: string) => {
			setVideoEnhanceSettings((current) => ({ ...current, [key]: value }));
		},
		[setVideoEnhanceSettings],
	);

	const updateImageUpscaleSetting = useCallback(
		(key: keyof ImageUpscaleSettings, value: string) => {
			setImageUpscaleSettings((current) => ({ ...current, [key]: value }));
		},
		[setImageUpscaleSettings],
	);

	const openImageUpscalePanel = useCallback(
		async (nodeId: string) => {
			if (imageUpscalePanelNodeId === nodeId) {
				setImageUpscalePanelNodeId(null);
				return;
			}
			const node = nodeById.get(nodeId);
			if (!node?.asset) return;
			try {
				const status = await requestLocalFfmpegStatus();
				if (status.available) {
					setFfmpegInstallPrompt(null);
					setImageUpscalePanelNodeId(nodeId);
					return;
				}
				setFfmpegInstallPrompt({
					nodeId,
					message:
						"图片提升分辨率需要本机 FFmpeg。是否现在自动安装？安装完成后再点击提升分辨率即可继续。",
					panelToOpen: "image-upscale",
				});
			} catch (error) {
				setFfmpegInstallPrompt({
					nodeId,
					message: buildFfmpegStatusErrorMessage(error),
					panelToOpen: "image-upscale",
				});
			}
		},
		[imageUpscalePanelNodeId, nodeById, setFfmpegInstallPrompt],
	);

	const closeVideoEnhancePanel = useCallback(
		() => setVideoEnhancePanelNodeId(null),
		[],
	);

	const closeVideoExtendPanel = useCallback(
		() => setVideoExtendPanelNodeId(null),
		[],
	);

	const closeImageUpscalePanel = useCallback(
		() => setImageUpscalePanelNodeId(null),
		[],
	);

	const openFfmpegPanelAfterInstall = useCallback(
		(prompt: NonNullable<FfmpegInstallPromptState>) => {
			if (prompt.panelToOpen === "video-enhance") {
				setVideoEnhancePanelNodeId(prompt.nodeId);
				return;
			}
			if (prompt.panelToOpen === "video-extend") {
				setVideoExtendPanelNodeId(prompt.nodeId);
				return;
			}
			if (prompt.panelToOpen === "image-upscale") {
				setImageUpscalePanelNodeId(prompt.nodeId);
			}
		},
		[],
	);

	return {
		videoEnhancePanelNodeId,
		videoExtendPanelNodeId,
		imageUpscalePanelNodeId,
		openVideoEnhancePanel,
		openVideoExtendPanel,
		closeVideoEnhancePanel,
		closeVideoExtendPanel,
		closeImageUpscalePanel,
		openFfmpegPanelAfterInstall,
		updateVideoEnhanceSetting,
		updateImageUpscaleSetting,
		openImageUpscalePanel,
	};
}
