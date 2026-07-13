import { useCallback, type Dispatch, type SetStateAction } from "react";
import { getBaseNameWithoutExtension } from "../appAssetRuntime";
import {
	type FfmpegInstallPromptState,
	type NodeAsset,
} from "../appCanvasState";
import {
	getConnectedAudioUrls,
	requestLocalImageUpscale,
	requestLocalVideoEnhancement,
	resolveReadableLocalMediaAsset,
} from "../appLocalMediaActions";
import {
	requestLocalFfmpegInstall,
	requestLocalFfmpegStatus,
	type CloudAssetUploadResult,
} from "../appServerApi";
import { cloneComposer } from "../canvasNodeActions";
import { createConnection } from "../canvasConnectionActions";
import type {
	ImageUpscaleSettings,
	VideoEnhanceSettings,
} from "../components/CanvasNodeView";
import type { CanvasNode } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UploadGeneratedAsset = (
	file: File,
	category: "video" | "audio" | "music" | "image",
) => Promise<CloudAssetUploadResult>;

type UseFfmpegGeneratedMediaActionsArgs = {
	nodeById: Map<string, CanvasNode>;
	nodes: CanvasNode[];
	connections: NodeConnection[];
	ffmpegInstallPrompt: FfmpegInstallPromptState;
	imageUpscaleSettings: ImageUpscaleSettings;
	videoEnhanceSettings: VideoEnhanceSettings;
	setFfmpegInstallPrompt: Dispatch<SetStateAction<FfmpegInstallPromptState>>;
	setFfmpegInstallingNodeId: Dispatch<SetStateAction<string | null>>;
	setImageUpscalingNodeId: Dispatch<SetStateAction<string | null>>;
	setVideoEnhancingNodeId: Dispatch<SetStateAction<string | null>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	pushUndoSnapshot: () => void;
	closeImageUpscalePanel: () => void;
	closeVideoEnhancePanel: () => void;
	openFfmpegPanelAfterInstall: (
		prompt: NonNullable<FfmpegInstallPromptState>,
	) => void;
	uploadGeneratedAssetToCloudDrive: UploadGeneratedAsset;
};

function buildGeneratedNodeAsset(file: File, uploaded: CloudAssetUploadResult) {
	return {
		name: file.name,
		url: uploaded.url,
		mime: file.type,
		cloudPath: uploaded.cloudPath,
	};
}

function getVideoEnhanceAcceleratorText(accelerator: string) {
	if (accelerator === "amd") {
		return "AMD 显卡编码已使用；补帧/缩放仍由 FFmpeg 滤镜处理。";
	}
	if (accelerator === "cpu-fallback") {
		return "AMD 编码不可用，已自动回退到 CPU 编码。";
	}
	return "CPU 编码模式已使用。";
}

export function useFfmpegGeneratedMediaActions({
	nodeById,
	nodes,
	connections,
	ffmpegInstallPrompt,
	imageUpscaleSettings,
	videoEnhanceSettings,
	setFfmpegInstallPrompt,
	setFfmpegInstallingNodeId,
	setImageUpscalingNodeId,
	setVideoEnhancingNodeId,
	setNodes,
	setConnections,
	setSelectedIds,
	pushRuntimeNotice,
	pushUndoSnapshot,
	closeImageUpscalePanel,
	closeVideoEnhancePanel,
	openFfmpegPanelAfterInstall,
	uploadGeneratedAssetToCloudDrive,
}: UseFfmpegGeneratedMediaActionsArgs) {
	const confirmFfmpegInstall = useCallback(async () => {
		const prompt = ffmpegInstallPrompt;
		if (!prompt) return;
		setFfmpegInstallingNodeId(prompt.nodeId);
		pushRuntimeNotice(
			"正在打开 FFmpeg 安装窗口，请在弹出的窗口里查看进度。",
			"info",
			"ffmpeg-install-start",
		);
		try {
			const result = await requestLocalFfmpegInstall();
			if (result.opened) {
				pushRuntimeNotice(
					result.message ||
						"已打开 FFmpeg 安装窗口，请在窗口中查看下载和解压进度。",
					"info",
					"ffmpeg-install-window-opened",
				);
				setFfmpegInstallPrompt(null);
				return;
			}
			if (!result.available) {
				pushRuntimeNotice(
					result.message ||
						"FFmpeg 已安装，但当前服务暂时还未识别到。请重启 Kaka Studio 后再试。",
					"warning",
					"ffmpeg-install-restart-needed",
				);
				setFfmpegInstallPrompt(null);
				return;
			}
			pushRuntimeNotice(
				result.message || "FFmpeg 已安装到系统环境并可用，可以继续刚才的操作。",
				"info",
				"ffmpeg-install-done",
			);
			setFfmpegInstallPrompt(null);
			openFfmpegPanelAfterInstall(prompt);
		} catch (error) {
			pushRuntimeNotice(
				error instanceof Error ? error.message : "FFmpeg 自动安装失败。",
				"warning",
				"ffmpeg-install-failed",
			);
			setFfmpegInstallPrompt((current) => current ?? prompt);
		} finally {
			setFfmpegInstallingNodeId(null);
		}
	}, [
		ffmpegInstallPrompt,
		openFfmpegPanelAfterInstall,
		pushRuntimeNotice,
		setFfmpegInstallPrompt,
		setFfmpegInstallingNodeId,
	]);

	const upscaleImageAsset = useCallback(
		async (nodeId: string) => {
			const node = nodeById.get(nodeId);
			const asset = node?.asset;
			if (!node || node.type !== "image" || !asset) return;
			const readableAsset = resolveReadableLocalMediaAsset(asset);
			if (!readableAsset) return;
			try {
				const status = await requestLocalFfmpegStatus();
				if (!status.available) {
					setFfmpegInstallPrompt({
						nodeId,
						message: "图片提升分辨率需要本机 FFmpeg。是否现在自动安装？",
						panelToOpen: "image-upscale",
					});
					return;
				}
			} catch {
				setFfmpegInstallPrompt({
					nodeId,
					message: "无法确认 FFmpeg 状态。是否现在自动安装后再继续？",
					panelToOpen: "image-upscale",
				});
				return;
			}

			setImageUpscalingNodeId(nodeId);
			const settings = imageUpscaleSettings;
			pushRuntimeNotice(
				`正在用本机 FFmpeg 放大图片：${settings.scale}x。`,
				"info",
				`image-upscale-start-${nodeId}`,
			);
			try {
				const upscaled = await requestLocalImageUpscale(readableAsset, settings);
				const baseName = getBaseNameWithoutExtension(asset.name || "image");
				const file = new File(
					[upscaled.blob],
					`${baseName}-ffmpeg-${settings.scale}x.png`,
					{ type: upscaled.mime || "image/png" },
				);
				const uploaded = await uploadGeneratedAssetToCloudDrive(file, "image");
				const enhancedNodeId = `image-ffmpeg-${Date.now()}`;
				const enhancedNode: CanvasNode = {
					...node,
					id: enhancedNodeId,
					x: node.x + node.width + 120,
					y: node.y,
					title: `${node.title || "图片"} · 放大`,
					composer: node.composer ? cloneComposer(node.composer) : undefined,
					asset: buildGeneratedNodeAsset(file, uploaded),
					style: node.style ? { ...node.style } : undefined,
				};
				pushUndoSnapshot();
				setNodes((current) => [...current, enhancedNode]);
				setConnections((current) => [
					...current,
					createConnection(
						{ nodeId, side: "right" },
						{ nodeId: enhancedNodeId, side: "left" },
					),
				]);
				setSelectedIds([enhancedNodeId]);
				closeImageUpscalePanel();
				pushRuntimeNotice(
					"图片放大完成，已在当前图片后生成新节点。",
					"info",
					`image-upscale-done-${nodeId}`,
				);
			} catch (error) {
				pushRuntimeNotice(
					error instanceof Error ? error.message : "本机 FFmpeg 图片放大失败。",
					"warning",
					`image-upscale-failed-${nodeId}`,
				);
			} finally {
				setImageUpscalingNodeId((current) => (current === nodeId ? null : current));
			}
		},
		[
			closeImageUpscalePanel,
			imageUpscaleSettings,
			nodeById,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setConnections,
			setFfmpegInstallPrompt,
			setImageUpscalingNodeId,
			setNodes,
			setSelectedIds,
			uploadGeneratedAssetToCloudDrive,
		],
	);

	const enhanceVideoAsset = useCallback(
		async (nodeId: string) => {
			const node = nodeById.get(nodeId);
			const asset = node?.asset;
			if (!node || node.type !== "video" || !asset) return;
			const readableAsset = resolveReadableLocalMediaAsset(asset);
			if (!readableAsset) return;
			const settings = videoEnhanceSettings;
			const connectedAudioUrls = getConnectedAudioUrls(nodeId, connections, nodes).slice(
				0,
				3,
			);
			const hasAudio = connectedAudioUrls.length > 0;
			try {
				const status = await requestLocalFfmpegStatus();
				if (!status.available) {
					setFfmpegInstallPrompt({
						nodeId,
						message: "生成增强视频需要本机 FFmpeg。是否现在自动安装？",
						panelToOpen: "video-enhance",
					});
					return;
				}
			} catch {
				setFfmpegInstallPrompt({
					nodeId,
					message: "无法确认 FFmpeg 状态。是否现在自动安装后再继续？",
					panelToOpen: "video-enhance",
				});
				return;
			}

			setVideoEnhancingNodeId(nodeId);
			const fpsLabel = settings.fps === "original" ? "保持原帧率" : `${settings.fps}fps`;
			const audioNotice = hasAudio
				? `，并将 ${connectedAudioUrls.length} 段音频混入视频`
				: "";
			pushRuntimeNotice(
				`正在调用本机 FFmpeg 增强视频：${fpsLabel} + ${settings.scale}x 分辨率${audioNotice}。`,
				"info",
				`video-enhance-start-${nodeId}`,
			);
			try {
				const enhanced = await requestLocalVideoEnhancement(
					readableAsset,
					settings,
					connectedAudioUrls,
				);
				const baseName = getBaseNameWithoutExtension(asset.name || "video");
				const fpsSlug =
					settings.fps === "original" ? "original-fps" : `${settings.fps}fps`;
				const file = new File(
					[enhanced.blob],
					`${baseName}-ffmpeg-${fpsSlug}-${settings.scale}x.mp4`,
					{ type: enhanced.mime || "video/mp4" },
				);
				const uploaded = await uploadGeneratedAssetToCloudDrive(file, "video");
				const enhancedNodeId = `video-ffmpeg-${Date.now()}`;
				const enhancedNode: CanvasNode = {
					...node,
					id: enhancedNodeId,
					x: node.x + node.width + 120,
					y: node.y,
					title: `${node.title || "视频"} · 增强`,
					composer: node.composer ? cloneComposer(node.composer) : undefined,
					asset: buildGeneratedNodeAsset(file, uploaded) as NodeAsset,
					style: node.style ? { ...node.style } : undefined,
				};
				pushUndoSnapshot();
				setNodes((current) => [...current, enhancedNode]);
				setConnections((current) => [
					...current,
					createConnection(
						{ nodeId, side: "right" },
						{ nodeId: enhancedNodeId, side: "left" },
					),
				]);
				setSelectedIds([enhancedNodeId]);
				closeVideoEnhancePanel();
				pushRuntimeNotice(
					`FFmpeg 增强完成，已在当前视频后生成新节点。${getVideoEnhanceAcceleratorText(enhanced.accelerator)}`,
					"info",
					`video-enhance-done-${nodeId}`,
				);
			} catch (error) {
				pushRuntimeNotice(
					error instanceof Error ? error.message : "本机 FFmpeg 增强失败。",
					"warning",
					`video-enhance-failed-${nodeId}`,
				);
			} finally {
				setVideoEnhancingNodeId((current) =>
					current === nodeId ? null : current,
				);
			}
		},
		[
			closeVideoEnhancePanel,
			connections,
			nodeById,
			nodes,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setConnections,
			setFfmpegInstallPrompt,
			setNodes,
			setSelectedIds,
			setVideoEnhancingNodeId,
			uploadGeneratedAssetToCloudDrive,
			videoEnhanceSettings,
		],
	);

	return {
		confirmFfmpegInstall,
		upscaleImageAsset,
		enhanceVideoAsset,
	};
}
