import { useCallback, type Dispatch, type SetStateAction } from "react";

import { getAspectRatioLabel } from "../appAspectRatioHelpers";
import { getBaseNameWithoutExtension, withTimeout } from "../appAssetRuntime";
import type { NodeAsset } from "../appCanvasState";
import { persistGeneratedAsset } from "../appGeneratedAssetActions";
import { fetchLocalMediaAssetBlob, resolveReadableLocalMediaAsset } from "../appLocalMediaActions";
import {
	extractFirstAssetUrl,
	extractProviderTaskId,
	isGrokVideoAsset,
	unwrapKakaAlignedResponse,
} from "../appResponseParsing";
import { uploadGeneratedAssetToCloudDrive } from "../appServerApi";
import {
	getWan22ImageSize,
	isWan22ModelChoice,
	resolveVideoExtensionModelInfo,
	resolveVideoExtensionRequestModel,
	withVideoExtensionModelInfo,
	type VideoExtensionModelInfo,
} from "../appVideoModelHelpers";
import { cloneComposer } from "../canvasNodeActions";
import { createConnection } from "../canvasConnectionActions";
import { isLocalKakaApiBaseUrl, requestKakaChatCompletion, requestKakaVideoGeneration } from "../kakaApi";
import { getModelDisplayLabel } from "../modelOptions";
import type { CanvasNode, ComposerPreset } from "../canvas-types";
import {
	createExtensionStoryboardTimes,
	createExtensionTailTrajectoryTimes,
	extractVideoFrameForWorkflow,
	extractVideoKeyFramesFromBlob,
	getVideoBlobInfo,
	readBlobAsDataUrl,
} from "../videoFrameHelpers";
import {
	buildVideoExtensionGeminiContent,
	buildVideoExtensionPrompt,
	parseVideoExtensionGeminiResponse,
	resolveVideoExtensionTrimStart,
} from "../videoExtensionPlanning";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import { DEFAULT_KAKA_API_BASE_URL } from "./useKakaApiModels";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UseVideoExtensionActionsArgs = {
	nodeById: Map<string, CanvasNode>;
	primaryNode: CanvasNode | null;
	videoComposer: ComposerPreset;
	videoExtendMode: "half" | "full";
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	setVideoExtendingNodeId: Dispatch<SetStateAction<string | null>>;
	setVideoExtensionModelInfos: Dispatch<
		SetStateAction<Record<string, VideoExtensionModelInfo>>
	>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	pushUndoSnapshot: () => void;
	closeVideoExtendPanel: () => void;
};

async function normalizeFrameForModel(blob: Blob) {
	return readBlobAsDataUrl(blob);
}

function getSupportedGrokAspectRatio(aspectRatio?: string) {
	return ["2:3", "3:2", "1:1"].includes(aspectRatio ?? "") ? aspectRatio : "3:2";
}

function getSupportedGrokSize(resolution?: string) {
	return (resolution ?? "720P").toLowerCase() === "1080p" ? "1080P" : "720P";
}

export function useVideoExtensionActions({
	nodeById,
	videoComposer,
	videoExtendMode,
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	setVideoExtendingNodeId,
	setVideoExtensionModelInfos,
	setNodes,
	setConnections,
	setSelectedIds,
	pushRuntimeNotice,
	pushUndoSnapshot,
	closeVideoExtendPanel,
}: UseVideoExtensionActionsArgs) {
	const createExtendedNode = useCallback(
		(
			sourceNode: CanvasNode,
			asset: NodeAsset,
			isFull: boolean,
			providerContext: Partial<NodeAsset>,
		) => {
			const nodeId = crypto.randomUUID();
			const extendedNode: CanvasNode = {
				...sourceNode,
				id: nodeId,
				x: sourceNode.x + sourceNode.width + 120,
				y: sourceNode.y,
				title: `${sourceNode.title || "视频"} · ${isFull ? "全扩展" : "半扩展"}`,
				composer: sourceNode.composer ? cloneComposer(sourceNode.composer) : undefined,
				asset: {
					name: asset.name ?? `${sourceNode.asset?.name ?? "video"}-extend.mp4`,
					url: asset.url,
					mime: "video/mp4",
					cloudPath: asset.cloudPath,
					...providerContext,
				},
				style: sourceNode.style ? { ...sourceNode.style } : undefined,
			};
			pushUndoSnapshot();
			setNodes((current) => [...current, extendedNode]);
			setConnections((current) => [
				...current,
				createConnection(
					{ nodeId: sourceNode.id, side: "right" },
					{ nodeId, side: "left" },
				),
			]);
			setSelectedIds([nodeId]);
		},
		[pushUndoSnapshot, setConnections, setNodes, setSelectedIds],
	);

	const startVideoExtension = useCallback(
		async (nodeId: string) => {
			const node = nodeById.get(nodeId);
			const asset = node?.asset;
			if (!node || node.type !== "video" || !asset) return;
			const readableAsset = resolveReadableLocalMediaAsset(asset);
			if (!readableAsset) return;
			const isFull = videoExtendMode === "full";
			const fallbackVideoComposer = videoComposer;
			const extensionModelInfo = resolveVideoExtensionModelInfo(
				node.composer,
				asset,
				fallbackVideoComposer,
			);
			if (extensionModelInfo) {
				setVideoExtensionModelInfos((current) =>
					withVideoExtensionModelInfo(current, nodeId, extensionModelInfo),
				);
			}
			setVideoExtendingNodeId(nodeId);
			pushRuntimeNotice("正在按原视频尺寸/比例提取最后一帧...", "info", `extend-frame-${nodeId}`);
			try {
				const sourceFrame = await withTimeout(
					extractVideoFrameForWorkflow(readableAsset.asset, "last", { fileSuffix: "最后一帧" }),
					30000,
					"提取最后一帧超时，请确认视频文件可读取，或重新上传后再试。",
				);
				const originalFrameDataUrl = await normalizeFrameForModel(sourceFrame.blob);
				const sourceFrameAspectRatio = getAspectRatioLabel(sourceFrame.width, sourceFrame.height);
				const sourceVideoBlob = await fetchLocalMediaAssetBlob(readableAsset, "视频素材");
				const sourceVideoInfo = await getVideoBlobInfo(sourceVideoBlob).catch(() => null);
				const storyboardTimes = createExtensionStoryboardTimes(sourceVideoInfo?.duration ?? 0);
				const tailTrajectoryTimes = createExtensionTailTrajectoryTimes(sourceVideoInfo?.duration ?? 0, 3, 0.25);
				const [storyboardFrames, tailTrajectoryFrames] = await Promise.all([
					extractVideoKeyFramesFromBlob(sourceVideoBlob, storyboardTimes).catch((error) => {
						console.warn("Failed to extract extension storyboard frames; falling back to last frame only.", error);
						return [] as Array<{ time: number; dataUrl: string }>;
					}),
					extractVideoKeyFramesFromBlob(sourceVideoBlob, tailTrajectoryTimes).catch((error) => {
						console.warn("Failed to extract extension tail trajectory frames; falling back to last frame only.", error);
						return [] as Array<{ time: number; dataUrl: string }>;
					}),
				]);

				pushRuntimeNotice("正在用 Gemini 分析全程关键帧、末尾运动轨迹和尾帧，并推导后续动作...", "info", `extend-gemini-${nodeId}`);
				const config = {
					baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
					apiKey: kakaApiKey.trim(),
					timeoutMs: kakaApiTimeoutMs,
				};
				const geminiContent = buildVideoExtensionGeminiContent({
					sourceVideoDurationSec: sourceVideoInfo?.duration ?? null,
					sourceFrameWidth: sourceFrame.width,
					sourceFrameHeight: sourceFrame.height,
					sourceFrameAspectRatio,
					storyboardFrames,
					tailTrajectoryFrames,
					originalFrameDataUrl,
				});
				const chatResult = await requestKakaChatCompletion(config, {
					model: "gemini-3.1-pro-preview(yunwu)",
					messages: [{
						role: "user",
						content: geminiContent,
					}],
				});
				const { geminiText, extensionEditPlan } =
					parseVideoExtensionGeminiResponse(
						chatResult.data.choices?.[0]?.message?.content,
					);

				const extendPrompt = buildVideoExtensionPrompt({
					geminiText,
					sourceFrameAspectRatio,
					sourceFrameWidth: sourceFrame.width,
					sourceFrameHeight: sourceFrame.height,
				});
				const composerModel =
					extensionModelInfo?.resolvedModel ?? resolveVideoExtensionRequestModel(node.composer, asset, fallbackVideoComposer);
				if (!composerModel) throw new Error("当前视频节点没有可用于扩展的模型记录，请先在节点上选择视频模型。");
				pushRuntimeNotice(
					`扩展模型决议：${extensionModelInfo?.resolvedModelLabel ?? getModelDisplayLabel(composerModel)}，${extensionModelInfo?.source ?? "按默认优先级选择"}。`,
					"info",
					`extend-model-${nodeId}`,
				);
				pushRuntimeNotice(`正在调用 ${getModelDisplayLabel(composerModel)} 图生视频...`, "info", `extend-gen-${nodeId}`);
				const wan22ImageSize = isWan22ModelChoice(composerModel)
					? getWan22ImageSize(sourceFrameAspectRatio)
					: undefined;
				const genRequestOptions = {
					aspect_ratio: sourceFrameAspectRatio !== "unknown" ? sourceFrameAspectRatio : node.composer?.aspectRatio ?? "16:9",
					resolution: node.composer?.resolution ?? "1K",
					image_size: wan22ImageSize,
					size: wan22ImageSize,
					image: originalFrameDataUrl,
					image_url: originalFrameDataUrl,
					video_generation_mode: "firstFrame" as const,
					images: [originalFrameDataUrl],
					reference_images: [originalFrameDataUrl],
				};
				const videoGenRes = await requestKakaVideoGeneration(config, {
					model: composerModel,
					prompt: extendPrompt,
					image_url: originalFrameDataUrl,
					duration: node.composer?.duration ? parseInt(node.composer.duration, 10) : undefined,
					options: genRequestOptions,
				});
				const genData = unwrapKakaAlignedResponse(videoGenRes.data);
				const genUrl = extractFirstAssetUrl(genData);
				if (!genUrl) throw new Error("扩展视频生成完成但未返回可用 URL");
				const genTaskId = extractProviderTaskId(genData);
				const genAssetContext: Partial<NodeAsset> = {
					providerModel: composerModel,
					providerMetadata: genData,
					...(genTaskId ? { providerTaskId: genTaskId } : {}),
				};

				if (isFull) {
					pushRuntimeNotice("正在用 FFmpeg 拼接原片与扩展视频...", "info", `extend-concat-${nodeId}`);
					pushRuntimeNotice(
						`拼接参数：${sourceFrame.width}x${sourceFrame.height} / ${sourceFrameAspectRatio} / extend_url=${new URL(genUrl, window.location.origin).href}`,
						"info",
						`extend-concat-request-${nodeId}`,
					);
					const trimStartFromPlan = resolveVideoExtensionTrimStart(extensionEditPlan);
					const concatParams = new URLSearchParams({
						extend_url: genUrl,
						target_width: String(sourceFrame.width),
						target_height: String(sourceFrame.height),
						trim_start_sec: String(trimStartFromPlan),
					});
					const concatRes = await fetch(`/api/video/concat?${concatParams.toString()}`, {
						method: "POST",
						headers: { "Content-Type": sourceVideoBlob.type || "video/mp4" },
						body: sourceVideoBlob,
					});
					if (!concatRes.ok) throw new Error("视频拼接失败");
					const concatBlob = await concatRes.blob();
					const baseName = getBaseNameWithoutExtension(asset.name || "video");
					const file = new File([concatBlob], `${baseName}-extend-full.mp4`, { type: "video/mp4" });
					const uploaded = await uploadGeneratedAssetToCloudDrive(file, "video");
					createExtendedNode(node, { ...uploaded, name: file.name, url: uploaded.url, mime: "video/mp4" }, true, genAssetContext);
				} else {
					const baseName = getBaseNameWithoutExtension(asset.name || "video");
					let nextAsset: NodeAsset = {
						name: `${baseName}-extend-half.mp4`,
						url: genUrl,
						mime: "video/mp4",
						...genAssetContext,
					};
					try {
						nextAsset = {
							...await persistGeneratedAsset(
								genUrl,
								{ assetName: nextAsset.name, assetMime: nextAsset.mime },
								"video",
							),
							...genAssetContext,
						};
					} catch (error) {
						console.warn("半扩展视频同步到 CloudDrive 失败。", error);
						pushRuntimeNotice(
							"视频扩展结果同步到 CloudDrive 失败，当前先保留原始结果链接。",
							"warning",
							`extend-upload-failed-${nodeId}`,
						);
					}
					createExtendedNode(node, nextAsset, false, genAssetContext);
				}
				pushRuntimeNotice(`视频扩展完成（${isFull ? "全扩展，已拼接" : "半扩展，仅新视频"}）。`, "info", `extend-done-${nodeId}`);
				closeVideoExtendPanel();
			} catch (error) {
				pushRuntimeNotice(error instanceof Error ? error.message : "视频扩展失败。", "warning", `extend-failed-${nodeId}`);
			} finally {
				setVideoExtendingNodeId((current) => (current === nodeId ? null : current));
			}
		},
		[
			closeVideoExtendPanel,
			createExtendedNode,
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			nodeById,
			pushRuntimeNotice,
			setVideoExtendingNodeId,
			setVideoExtensionModelInfos,
			videoComposer,
			videoExtendMode,
		],
	);

	const extendGrokVideoAsset = useCallback(
		async (nodeId: string) => {
			const node = nodeById.get(nodeId);
			const asset = node?.asset;
			if (!node || node.type !== "video" || !asset) return;
			if (!isGrokVideoAsset(asset)) {
				pushRuntimeNotice("只有带上游 task_id 的 Grok 视频才能继续扩展。", "warning", `grok-extend-unavailable-${nodeId}`);
				return;
			}
			const taskId = asset.providerTaskId?.trim();
			if (!taskId) {
				pushRuntimeNotice("当前 Grok 视频缺少上游 task_id，无法继续扩展。", "warning", `grok-extend-missing-task-${nodeId}`);
				return;
			}
			const config = {
				baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
				apiKey: kakaApiKey.trim(),
				timeoutMs: kakaApiTimeoutMs,
			};
			if (!config.apiKey && !isLocalKakaApiBaseUrl(config.baseUrl)) {
				pushRuntimeNotice("请先在设置页填写后台生成的 sk-kaka API 令牌。", "warning", "grok-extend-missing-key");
				return;
			}
			const aspectRatio = getSupportedGrokAspectRatio(node.composer?.aspectRatio);
			const size = getSupportedGrokSize(node.composer?.resolution);
			const prompt =
				(node.composer?.prompt ?? "").trim() ||
				"Continue this video naturally with consistent motion and style.";
			const providerModel = "grok-videos(yunwu)";
			setVideoExtendingNodeId(nodeId);
			pushRuntimeNotice("正在使用原始上游 task_id 调用 Grok 扩展视频...", "info", `grok-extend-start-${nodeId}`);
			try {
				const response = await requestKakaVideoGeneration(config, {
					model: providerModel,
					prompt,
					options: {
						grok_video_extend_route: true,
						task_id: taskId,
						start_time: 3,
						aspect_ratio: aspectRatio,
						size,
						upscale: false,
						create_task_metadata: asset.providerMetadata,
					},
				});
				const genData = unwrapKakaAlignedResponse(response.data);
				const genUrl = extractFirstAssetUrl(genData);
				if (!genUrl) throw new Error("Grok 扩展完成，但没有返回可用的视频 URL。");
				const providerTaskId = extractProviderTaskId(genData) ?? taskId;
				let nextAsset: NodeAsset = {
					name: `${getBaseNameWithoutExtension(asset.name || "grok-video")}-grok-extend.mp4`,
					url: genUrl,
					mime: "video/mp4",
					provider: "grok",
					providerModel,
					providerTaskId,
					providerMetadata: genData,
				};
				try {
					nextAsset = {
						...await persistGeneratedAsset(
							genUrl,
							{ assetName: nextAsset.name, assetMime: nextAsset.mime },
							"video",
						),
						provider: "grok",
						providerModel,
						providerTaskId,
						providerMetadata: genData,
					};
				} catch (error) {
					console.warn("Grok 扩展视频同步到 CloudDrive 失败。", error);
					pushRuntimeNotice(
						"Grok 扩展结果同步到 CloudDrive 失败，当前先保留原始结果链接。",
						"warning",
						`grok-extend-upload-failed-${nodeId}`,
					);
				}
				createExtendedNode(node, nextAsset, false, {
					provider: "grok",
					providerModel,
					providerTaskId,
					providerMetadata: genData,
				});
				pushRuntimeNotice("Grok 视频扩展完成，已在当前视频后生成新节点。", "info", `grok-extend-done-${nodeId}`);
			} catch (error) {
				pushRuntimeNotice(error instanceof Error ? error.message : "Grok 视频扩展失败。", "warning", `grok-extend-failed-${nodeId}`);
			} finally {
				setVideoExtendingNodeId((current) => (current === nodeId ? null : current));
			}
		},
		[
			createExtendedNode,
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			nodeById,
			pushRuntimeNotice,
			setVideoExtendingNodeId,
		],
	);

	return {
		startVideoExtension,
		extendGrokVideoAsset,
	};
}
