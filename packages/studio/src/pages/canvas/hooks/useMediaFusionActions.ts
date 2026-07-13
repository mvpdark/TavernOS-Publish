import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
	buildAudioVideoFusionContentParts,
	createAudioVideoFusionFrameTimes,
} from "../audioVideoFusionPrompt";
import { getBaseNameWithoutExtension } from "../appAssetRuntime";
import type {
	FfmpegInstallPromptState,
	VideoFusionAnalysisState,
	VideoFusionPromptState,
} from "../appCanvasState";
import {
	analyzeAudioBlob,
	fetchLocalMediaAssetBlobs,
	requestLocalAudioVideoFusion,
	resolveReadableLocalMediaAssetPair,
	type AudioAnalysisSummary,
} from "../appLocalMediaActions";
import { extractChatCompletionText } from "../appResponseParsing";
import {
	requestLocalFfmpegStatus,
	type CloudAssetUploadResult,
} from "../appServerApi";
import { cloneComposer } from "../canvasNodeActions";
import { createConnection } from "../canvasConnectionActions";
import {
	buildFrameMergePayload,
	normalizeAudioVideoFusionPlan,
	resolveAudioVideoFusionMode,
	type AudioVideoFusionPlan,
} from "../mediaFusionPlanning";
import { requestKakaChatCompletion } from "../kakaApi";
import type { CanvasNode } from "../canvas-types";
import {
	blobToDataUrl,
	extractVideoKeyFramesFromBlob,
	getVideoBlobInfo,
} from "../videoFrameHelpers";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import { DEFAULT_KAKA_API_BASE_URL } from "./useKakaApiModels";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UploadGeneratedAsset = (
	file: File,
	category: "video" | "audio" | "music" | "image",
) => Promise<CloudAssetUploadResult>;

type UseMediaFusionActionsArgs = {
	nodeById: Map<string, CanvasNode>;
	videoFusionAnalysis: VideoFusionAnalysisState;
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	setVideoFusingPairKey: Dispatch<SetStateAction<string | null>>;
	setVideoFusionPrompt: Dispatch<SetStateAction<VideoFusionPromptState>>;
	setVideoFusionAnalysis: Dispatch<SetStateAction<VideoFusionAnalysisState>>;
	setFfmpegInstallPrompt: Dispatch<SetStateAction<FfmpegInstallPromptState>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	pushUndoSnapshot: () => void;
	uploadGeneratedAssetToCloudDrive: UploadGeneratedAsset;
};

function mediaFusionDebug(...args: unknown[]) {
	if (
		import.meta.env.DEV &&
		typeof window !== "undefined" &&
		window.localStorage.getItem("kakashow:debug-video-fusion") === "1"
	) {
		console.debug(...args);
	}
}

async function assertFfmpegAvailable(
	nodeId: string,
	setFfmpegInstallPrompt: Dispatch<SetStateAction<FfmpegInstallPromptState>>,
	message: string,
) {
	try {
		const status = await requestLocalFfmpegStatus();
		if (status.available) return true;
		setFfmpegInstallPrompt({ nodeId, message });
		return false;
	} catch {
		setFfmpegInstallPrompt({
			nodeId,
			message: "无法确认 FFmpeg 状态。是否现在自动安装后再继续？",
		});
		return false;
	}
}

function getKakaApiErrorMessage(error: unknown) {
	if (!error) return null;
	if (typeof error === "string") return error;
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message || "Gemini API 返回错误。";
	}
	return "Gemini API 返回错误。";
}

export function useMediaFusionActions({
	nodeById,
	videoFusionAnalysis,
	kakaApiBaseUrl,
	kakaApiKey,
	setVideoFusingPairKey,
	setVideoFusionPrompt,
	setVideoFusionAnalysis,
	setFfmpegInstallPrompt,
	setNodes,
	setConnections,
	setSelectedIds,
	pushRuntimeNotice,
	pushUndoSnapshot,
	uploadGeneratedAssetToCloudDrive,
}: UseMediaFusionActionsArgs) {
	const fuseAudioVideoNodes = useCallback(
		async (sourceNodeId: string, targetNodeId: string) => {
			const sourceNode = nodeById.get(sourceNodeId);
			const targetNode = nodeById.get(targetNodeId);
			if (!sourceNode || !targetNode) {
				pushRuntimeNotice(
					"视频融合需要两个带素材的视频节点。",
					"warning",
					"video-fusion-missing-assets",
				);
				return;
			}
			const mediaAssets = resolveReadableLocalMediaAssetPair({
				sourceAsset: sourceNode?.asset,
				targetAsset: targetNode?.asset,
			});
			if (
				!sourceNode ||
				!targetNode ||
				(sourceNode.type !== "audio" && sourceNode.type !== "music") ||
				targetNode.type !== "video" ||
				!mediaAssets
			) {
				return;
			}
			const sourceMediaAsset = mediaAssets.source;
			const targetMediaAsset = mediaAssets.target;
			const sourceAsset = sourceMediaAsset.asset;
			const targetAsset = targetMediaAsset.asset;

			const ffmpegAvailable = await assertFfmpegAvailable(
				targetNodeId,
				setFfmpegInstallPrompt,
				"音视频智能融合需要本机 FFmpeg。是否现在自动安装？",
			);
			if (!ffmpegAvailable) return;

			const mode = resolveAudioVideoFusionMode(sourceNode.type);
			const pairKey = `${sourceNodeId}:${targetNodeId}`;
			setVideoFusingPairKey(pairKey);
			pushRuntimeNotice(
				mode === "replace"
					? "正在用 Gemini 分析音乐与视频，并自动替换原视频声音..."
					: "正在用 Gemini 分析音频与视频，并自动叠加到原视频声音上...",
				"info",
				`audio-video-fusion-start-${pairKey}`,
			);

			try {
				const [videoBlob, audioBlob] = await fetchLocalMediaAssetBlobs([
					{ asset: targetMediaAsset, errorLabel: "读取目标视频" },
					{
						asset: sourceMediaAsset,
						errorLabel: `读取${sourceNode.type === "music" ? "音乐" : "音频"}`,
					},
				]);
				const [videoInfo, audioAnalysis] = await Promise.all([
					getVideoBlobInfo(videoBlob),
					analyzeAudioBlob(audioBlob),
				]);
				let originalVideoAudioAnalysis: AudioAnalysisSummary | null = null;
				if (mode === "overlay") {
					try {
						originalVideoAudioAnalysis = await analyzeAudioBlob(videoBlob);
					} catch {
						originalVideoAudioAnalysis = null;
					}
				}

				const frames = await extractVideoKeyFramesFromBlob(
					videoBlob,
					createAudioVideoFusionFrameTimes(videoInfo.duration),
				);
				const audioKindLabel = sourceNode.type === "music" ? "音乐" : "音频";
				const contentParts = buildAudioVideoFusionContentParts({
					mode,
					videoTitle: targetNode.title || "视频",
					audioTitle: sourceNode.title || audioKindLabel,
					audioKindLabel,
					videoInfo,
					audioAnalysis,
					originalVideoAudioAnalysis,
					frames,
				});
				const chatResult = await requestKakaChatCompletion(
					{
						baseUrl: kakaApiBaseUrl || DEFAULT_KAKA_API_BASE_URL,
						apiKey: kakaApiKey,
						timeoutMs: 12_000_000,
					},
					{
						model: "gemini-3.1-pro-preview(yunwu)",
						messages: [{ role: "user", content: contentParts }],
					},
				);
				const apiErrorMessage = getKakaApiErrorMessage(chatResult.data.error);
				if (apiErrorMessage) throw new Error(apiErrorMessage);

				const result = (extractChatCompletionText(chatResult.data) ?? "").trim();
				const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/i);
				const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : result;
				let parsedPlan: Partial<AudioVideoFusionPlan> | null = null;
				try {
					parsedPlan = JSON.parse(jsonText) as Partial<AudioVideoFusionPlan>;
				} catch {
					parsedPlan = null;
				}
				const plan = normalizeAudioVideoFusionPlan(
					parsedPlan,
					mode,
					audioAnalysis.duration,
					videoInfo.duration,
				);
				const fused = await requestLocalAudioVideoFusion(
					videoBlob,
					targetAsset,
					audioBlob,
					sourceAsset,
					plan,
				);
				const baseName = getBaseNameWithoutExtension(targetAsset.name || "video");
				const suffix = mode === "replace" ? "music-replaced" : "audio-mixed";
				const file = new File([fused.blob], `${baseName}-${suffix}.mp4`, {
					type: fused.mime || "video/mp4",
				});
				const uploaded = await uploadGeneratedAssetToCloudDrive(file, "video");
				const fusedNodeId = `video-audio-fusion-${Date.now()}`;
				const fusedNode: CanvasNode = {
					...targetNode,
					id: fusedNodeId,
					x: targetNode.x + targetNode.width + 120,
					y: targetNode.y,
					title: mode === "replace" ? "音乐替换视频" : "音频叠加视频",
					composer: targetNode.composer ? cloneComposer(targetNode.composer) : undefined,
					asset: {
						name: file.name,
						url: uploaded.url,
						mime: file.type,
						cloudPath: uploaded.cloudPath,
						providerMetadata: {
							audioVideoFusionPlan: plan,
							audioVideoFusionSource: {
								nodeId: sourceNode.id,
								type: sourceNode.type,
								name: sourceAsset.name,
							},
						},
					},
					style: targetNode.style ? { ...targetNode.style } : undefined,
				};
				pushUndoSnapshot();
				setNodes((current) => [...current, fusedNode]);
				setConnections((current) => [
					...current,
					createConnection(
						{ nodeId: targetNodeId, side: "right" },
						{ nodeId: fusedNodeId, side: "left" },
					),
					createConnection(
						{ nodeId: sourceNodeId, side: "right" },
						{ nodeId: fusedNodeId, side: "left" },
					),
				]);
				setSelectedIds([fusedNodeId]);
				pushRuntimeNotice(
					`${mode === "replace" ? "音乐已替换原视频声音" : "音频已叠加并保留原视频声音"}：${plan.matchReason ?? "已生成新视频节点。"}`,
					"info",
					`audio-video-fusion-done-${pairKey}`,
				);
			} catch (error) {
				console.error("[audio-video-fusion] failed:", error);
				pushRuntimeNotice(
					error instanceof Error ? error.message : "音视频智能融合失败。",
					"warning",
					`audio-video-fusion-failed-${pairKey}`,
				);
			} finally {
				setVideoFusingPairKey((current) => (current === pairKey ? null : current));
			}
		},
		[
			kakaApiBaseUrl,
			kakaApiKey,
			nodeById,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setConnections,
			setFfmpegInstallPrompt,
			setNodes,
			setSelectedIds,
			setVideoFusingPairKey,
			uploadGeneratedAssetToCloudDrive,
		],
	);

	const fuseVideoNodes = useCallback(
		async (sourceNodeId: string, targetNodeId: string) => {
			const sourceNode = nodeById.get(sourceNodeId);
			const targetNode = nodeById.get(targetNodeId);
			if (!sourceNode || !targetNode) {
				pushRuntimeNotice(
					"视频融合需要两个带素材的视频节点。",
					"warning",
					"video-fusion-missing-assets",
				);
				return;
			}
			const mediaAssets = resolveReadableLocalMediaAssetPair({
				sourceAsset: sourceNode?.asset,
				targetAsset: targetNode?.asset,
			});
			if (
				!mediaAssets ||
				sourceNode.type !== "video" ||
				targetNode.type !== "video"
			) {
				pushRuntimeNotice(
					"视频融合需要两个带素材的视频节点。",
					"warning",
					"video-fusion-missing-assets",
				);
				return;
			}
			const sourceMediaAsset = mediaAssets.source;
			const targetMediaAsset = mediaAssets.target;
			const sourceAsset = sourceMediaAsset.asset;
			const targetAsset = targetMediaAsset.asset;

			const ffmpegAvailable = await assertFfmpegAvailable(
				targetNodeId,
				setFfmpegInstallPrompt,
				"视频节点融合需要本机 FFmpeg。是否现在自动安装？",
			);
			if (!ffmpegAvailable) return;

			const pairKey = `${sourceNodeId}:${targetNodeId}`;
			setVideoFusingPairKey(pairKey);
			pushRuntimeNotice(
				"正在用本地 FFmpeg 融合两个视频节点...",
				"info",
				`video-fusion-start-${pairKey}`,
			);

			try {
				let sourceBlob = videoFusionAnalysis?.sourceBlob;
				let targetBlob = videoFusionAnalysis?.targetBlob;
				if (!sourceBlob && !targetBlob) {
					[sourceBlob, targetBlob] = await fetchLocalMediaAssetBlobs([
						{ asset: sourceMediaAsset, errorLabel: "读取拖入视频" },
						{ asset: targetMediaAsset, errorLabel: "读取目标视频" },
					]);
				} else if (!sourceBlob) {
					[sourceBlob] = await fetchLocalMediaAssetBlobs([
						{ asset: sourceMediaAsset, errorLabel: "读取拖入视频" },
					]);
				} else if (!targetBlob) {
					[targetBlob] = await fetchLocalMediaAssetBlobs([
						{ asset: targetMediaAsset, errorLabel: "读取目标视频" },
					]);
				}
				if (!sourceBlob || !targetBlob) {
					throw new Error("视频融合需要两个可读取的视频素材。");
				}
				mediaFusionDebug("[fuseVideoNodes] sourceBlob:", sourceBlob.size, "targetBlob:", targetBlob.size);
				const [sourceDataUrl, targetDataUrl] = await Promise.all([
					blobToDataUrl(sourceBlob),
					blobToDataUrl(targetBlob),
				]);
				const frameMergePayload = buildFrameMergePayload({
					sourceName: sourceAsset.name || "source.mp4",
					sourceDataUrl,
					targetName: targetAsset.name || "target.mp4",
					targetDataUrl,
					resolution: videoFusionAnalysis?.targetResolution || null,
					plan: videoFusionAnalysis?.plan || null,
				});
				mediaFusionDebug("[fuseVideoNodes] base64 lengths:", {
					source: frameMergePayload.videos[0].data.length,
					target: frameMergePayload.videos[1].data.length,
				});
				const body = JSON.stringify(frameMergePayload);
				mediaFusionDebug("[fuseVideoNodes] POST body length:", body.length);
				const response = await fetch("/api/workshop/frame-merge", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
				});
				mediaFusionDebug(
					"[fuseVideoNodes] response status:",
					response.status,
					"content-type:",
					response.headers.get("content-type"),
				);
				if (!response.ok) {
					const message = await response.text().catch(() => "");
					console.error("[fuseVideoNodes] response error:", message);
					throw new Error(message || `本地 FFmpeg 视频融合失败：${response.status}`);
				}
				const blob = await response.blob();
				mediaFusionDebug("[fuseVideoNodes] received blob:", blob.size, "type:", blob.type);
				const file = new File(
					[blob],
					`${getBaseNameWithoutExtension(sourceAsset.name || "video")}-fusion.mp4`,
					{ type: "video/mp4" },
				);
				const uploaded = await uploadGeneratedAssetToCloudDrive(file, "video");
				mediaFusionDebug("[fuseVideoNodes] uploaded url:", uploaded.url, "cloudPath:", uploaded.cloudPath);
				const fusedNodeId = `video-fusion-${Date.now()}`;
				const fusedNode: CanvasNode = {
					...sourceNode,
					id: fusedNodeId,
					x: Math.max(
						sourceNode.x + sourceNode.width,
						targetNode.x + targetNode.width,
					) + 120,
					y: Math.min(sourceNode.y, targetNode.y),
					title: "FFmpeg 融合视频",
					composer: sourceNode.composer ? cloneComposer(sourceNode.composer) : undefined,
					asset: {
						name: file.name,
						url: uploaded.url,
						mime: file.type,
						cloudPath: uploaded.cloudPath,
					},
					style: sourceNode.style ? { ...sourceNode.style } : undefined,
				};
				pushUndoSnapshot();
				setNodes((current) => [...current, fusedNode]);
				setConnections((current) => [
					...current,
					createConnection(
						{ nodeId: targetNodeId, side: "right" },
						{ nodeId: fusedNodeId, side: "left" },
					),
					createConnection(
						{ nodeId: sourceNodeId, side: "right" },
						{ nodeId: fusedNodeId, side: "left" },
					),
				]);
				setSelectedIds([fusedNodeId]);
				pushRuntimeNotice(
					"FFmpeg 视频融合完成，已生成新视频节点。",
					"info",
					`video-fusion-done-${pairKey}`,
				);
			} catch (error) {
				pushRuntimeNotice(
					error instanceof Error ? error.message : "本地 FFmpeg 视频融合失败。",
					"warning",
					`video-fusion-failed-${pairKey}`,
				);
			} finally {
				setVideoFusingPairKey((current) => (current === pairKey ? null : current));
				setVideoFusionPrompt(null);
				setVideoFusionAnalysis(null);
			}
		},
		[
			nodeById,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setConnections,
			setFfmpegInstallPrompt,
			setNodes,
			setSelectedIds,
			setVideoFusingPairKey,
			setVideoFusionAnalysis,
			setVideoFusionPrompt,
			uploadGeneratedAssetToCloudDrive,
			videoFusionAnalysis,
		],
	);

	return { fuseAudioVideoNodes, fuseVideoNodes };
}
