import { useEffect, type Dispatch, type SetStateAction } from "react";
import {
	SIMPLE_VIDEO_FUSION_MODE,
	type VideoFusionAnalysisState,
	type VideoFusionPromptState,
} from "../appCanvasState";
import { fetchLocalMediaAssetBlobs, resolveReadableLocalMediaAssetPair } from "../appLocalMediaActions";
import {
	getAspectRatioLabel,
	getAspectRatioValue,
} from "../appAspectRatioHelpers";
import { requestLocalVideoProbe } from "../appServerApi";
import {
	type KakaApiConfig,
	type KakaChatMessageContentPart,
	requestKakaChatCompletion,
} from "../kakaApi";
import {
	createVideoTimelineSampleTimes,
	getRecordValue,
	getTimelineItem,
	normalizeFrameTimes,
	parseFusionSeconds,
	type VideoFusionPlan,
} from "../mediaFusionPlanning";
import type { CanvasNode } from "../canvas-types";
import {
	extractVideoKeyFramesFromBlob,
	getVideoBlobInfo,
} from "../videoFrameHelpers";
import { DEFAULT_KAKA_API_BASE_URL } from "./useKakaApiModels";

type VideoInfo = Awaited<ReturnType<typeof getVideoBlobInfo>>;
type VideoFrame = Awaited<ReturnType<typeof extractVideoKeyFramesFromBlob>>[number];

type UseVideoFusionAnalysisArgs = {
	videoFusionPrompt: VideoFusionPromptState;
	latestNodesRef: { current: CanvasNode[] };
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	setVideoFusionAnalysis: Dispatch<SetStateAction<VideoFusionAnalysisState>>;
};

function videoFusionDebug(...args: unknown[]) {
	if (
		import.meta.env.DEV &&
		typeof window !== "undefined" &&
		window.localStorage.getItem("kakashow:debug-video-fusion") === "1"
	) {
		console.debug(...args);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function formatUnknownError(error: unknown, fallback: string) {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === "string" && error.trim()) return error.trim();
	return fallback;
}

function formatApiError(error: unknown, fallback: string) {
	if (typeof error === "string" && error.trim()) return error.trim();
	if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
		return error.message.trim();
	}
	return fallback;
}

function appendFrameGroup(
	contentParts: KakaChatMessageContentPart[],
	title: string,
	description: string,
	frames: VideoFrame[],
) {
	contentParts.push({
		type: "text",
		text: `${title}：${description}\n时间戳：${frames
			.map((frame) => `${frame.time.toFixed(3)}s`)
			.join("，")}`,
	});
	for (const [index, frame] of frames.entries()) {
		contentParts.push({
			type: "text",
			text: `${title} #${index + 1}，t=${frame.time.toFixed(3)}s`,
		});
		contentParts.push({ type: "image_url", image_url: { url: frame.dataUrl } });
	}
}

function buildVideoFusionPromptContent({
	videoAName,
	videoBName,
	videoAFfprobe,
	videoBFfprobe,
	videoAInfo,
	videoBInfo,
	videoAAspectRatio,
	videoBAspectRatio,
	videoAAspectLabel,
	videoBAspectLabel,
	aspectRatioMatch,
	videoAOverviewFrames,
	videoBOverviewFrames,
	videoASeamFrames,
	videoBSeamFrames,
}: {
	videoAName: string;
	videoBName: string;
	videoAFfprobe: unknown;
	videoBFfprobe: unknown;
	videoAInfo: VideoInfo;
	videoBInfo: VideoInfo;
	videoAAspectRatio: number | null;
	videoBAspectRatio: number | null;
	videoAAspectLabel: string;
	videoBAspectLabel: string;
	aspectRatioMatch: boolean;
	videoAOverviewFrames: VideoFrame[];
	videoBOverviewFrames: VideoFrame[];
	videoASeamFrames: VideoFrame[];
	videoBSeamFrames: VideoFrame[];
}) {
	const contentParts: KakaChatMessageContentPart[] = [
		{
			type: "text",
			text: `你是一位专业电影剪辑师和视效合成师。视频A是用户拖动过来的前段视频，必须放在前面；视频B是被覆盖/目标视频，必须放在后面。请先理解两段视频的完整内容、节奏、运动方向、构图、景别、色彩和光线，再结合接缝附近的密集抽样帧，输出可以直接交给本地 FFmpeg 执行的剪辑计划。

视频A：
- 文件名：${videoAName}
- 分辨率：${videoAInfo.width}x${videoAInfo.height}
- 比例：${videoAAspectLabel}
- 宽高比：${videoAAspectRatio ?? "unknown"}
- 时长：${videoAInfo.duration.toFixed(3)}s
- ffprobe：${JSON.stringify(videoAFfprobe, null, 2)}

视频B：
- 文件名：${videoBName}
- 分辨率：${videoBInfo.width}x${videoBInfo.height}
- 比例：${videoBAspectLabel}
- 宽高比：${videoBAspectRatio ?? "unknown"}
- 时长：${videoBInfo.duration.toFixed(3)}s
- ffprobe：${JSON.stringify(videoBFfprobe, null, 2)}

两段元数据比例是否一致：${aspectRatioMatch ? "是" : "否"}

判断规则：
1. targetEndSec 是视频A应保留到的结束秒数，范围 0 到 ${videoAInfo.duration.toFixed(3)}，必须精确到毫秒。
2. sourceStartSec 是视频B应从哪一秒开始，范围 0 到 ${videoBInfo.duration.toFixed(3)}，必须精确到毫秒。
3. 如果视频B开头有重复、静止、黑帧、等待或预热帧，sourceStartSec 必须跳到第一个有效动作点。
4. 如果硬切会突兀，请使用 fade；fade 的 transitionDurationSec 建议 0.25 到 0.8，最多 1.2。
5. 如果比例不一致，sizingMode 必须优先使用 "preserve_scale_blur_background"，避免强行拉伸或主体被放大裁切。
6. 请优先保留视频A原始分辨率和比例作为输出目标，不要机械改成 9:16。

只输出一个 JSON 代码块，不要输出解释文字，不要输出 FFmpeg 命令。JSON 顶层必须包含：
project、source_metadata、source_analysis、selected_segments、final_timeline、cover_frame_suggestions、ffmpeg_plan、professional_notes、warnings，
并且为了前端兼容还必须包含：
targetEndSec、sourceStartSec、transitionType、transitionDurationSec、videoAWidth、videoAHeight、videoAAspectRatio、videoAAspectLabel、videoBWidth、videoBHeight、videoBAspectRatio、videoBAspectLabel、aspectRatioMatch、sizingMode、matchTargetFrameSec、matchSourceFrameSec、confidence、matchReason、editInstructions。

参考格式：
\`\`\`json
{
  "project": {
    "target_platform": "canvas_video_fusion",
    "target_aspect_ratio": "${videoAAspectLabel}",
    "target_resolution": "${videoAInfo.width}x${videoAInfo.height}",
    "target_fps": 30,
    "style": "自然衔接"
  },
  "targetEndSec": ${videoAInfo.duration.toFixed(3)},
  "sourceStartSec": 0,
  "transitionType": "cut",
  "transitionDurationSec": 0,
  "videoAWidth": ${videoAInfo.width},
  "videoAHeight": ${videoAInfo.height},
  "videoAAspectRatio": ${videoAAspectRatio ?? "null"},
  "videoAAspectLabel": "${videoAAspectLabel}",
  "videoBWidth": ${videoBInfo.width},
  "videoBHeight": ${videoBInfo.height},
  "videoBAspectRatio": ${videoBAspectRatio ?? "null"},
  "videoBAspectLabel": "${videoBAspectLabel}",
  "aspectRatioMatch": ${aspectRatioMatch},
  "sizingMode": "${aspectRatioMatch ? "exact_scale" : "preserve_scale_blur_background"}",
  "matchTargetFrameSec": ${videoAInfo.duration.toFixed(3)},
  "matchSourceFrameSec": 0,
  "confidence": 0.8,
  "matchReason": "根据全片节奏和接缝运动轨迹选择自然入点。",
  "editInstructions": "保留A到动作结束点，B从有效动作开始处进入。"
}
\`\`\``,
		},
	];

	appendFrameGroup(
		contentParts,
		"视频A全片抽样帧",
		"用于理解前段完整内容、节奏和结尾语境，按时间从早到晚排列。",
		videoAOverviewFrames,
	);
	appendFrameGroup(
		contentParts,
		"视频B全片抽样帧",
		"用于理解后段完整内容、节奏和开头语境，按时间从早到晚排列。",
		videoBOverviewFrames,
	);
	appendFrameGroup(
		contentParts,
		"视频A结尾密集运动轨迹帧",
		"用于判断前段尾部运动方向、速度、姿态变化、镜头运动和出点 targetEndSec。",
		videoASeamFrames,
	);
	appendFrameGroup(
		contentParts,
		"视频B开头密集运动轨迹帧",
		"用于判断后段开头是否能承接视频A，以及应跳过多少重复/预热帧得到 sourceStartSec。",
		videoBSeamFrames,
	);

	return contentParts;
}

function createDefaultVideoFusionPlan({
	videoAInfo,
	videoBInfo,
	videoAAspectRatio,
	videoBAspectRatio,
	videoAAspectLabel,
	videoBAspectLabel,
	aspectRatioMatch,
}: {
	videoAInfo: VideoInfo;
	videoBInfo: VideoInfo;
	videoAAspectRatio: number | null;
	videoBAspectRatio: number | null;
	videoAAspectLabel: string;
	videoBAspectLabel: string;
	aspectRatioMatch: boolean;
}): VideoFusionPlan {
	return {
		targetEndSec: videoAInfo.duration,
		sourceStartSec: Math.min(0.25, Math.max(0, videoBInfo.duration - 0.1)),
		transitionType: "cut",
		transitionDurationSec: 0,
		videoAWidth: videoAInfo.width,
		videoAHeight: videoAInfo.height,
		videoAAspectRatio,
		videoAAspectLabel,
		videoBWidth: videoBInfo.width,
		videoBHeight: videoBInfo.height,
		videoBAspectRatio,
		videoBAspectLabel,
		aspectRatioMatch,
		sizingMode: aspectRatioMatch ? "exact_scale" : "preserve_scale_blur_background",
		matchTargetFrameSec: videoAInfo.duration,
		matchSourceFrameSec: 0,
		confidence: 0,
		matchReason: "Gemini 未返回可解析的逐帧匹配计划，使用保守默认剪辑点。",
		editInstructions: "保留视频A到结尾，视频B从开头附近进入。",
	};
}

function parseGeminiVideoFusionPlan({
	result,
	videoAInfo,
	videoBInfo,
	videoAAspectRatio,
	videoBAspectRatio,
	videoAAspectLabel,
	videoBAspectLabel,
	aspectRatioMatch,
}: {
	result: string;
	videoAInfo: VideoInfo;
	videoBInfo: VideoInfo;
	videoAAspectRatio: number | null;
	videoBAspectRatio: number | null;
	videoAAspectLabel: string;
	videoBAspectLabel: string;
	aspectRatioMatch: boolean;
}) {
	const codeBlockMatch = result.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
	const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : result.trim();
	let parsedPlan: Record<string, unknown>;
	try {
		const parsed = JSON.parse(jsonText) as unknown;
		if (!isRecord(parsed)) throw new Error("not an object");
		parsedPlan = parsed;
	} catch {
		throw new Error(
			`Gemini 没有返回可执行的 JSON 剪辑计划：${result.slice(0, 300)}`,
		);
	}

	const videoATimeline = getTimelineItem(parsedPlan, "video_a");
	const videoBTimeline = getTimelineItem(parsedPlan, "video_b");
	const videoAEndFromTimeline = parseFusionSeconds(videoATimeline?.end, videoAInfo.duration);
	const videoBStartFromTimeline = parseFusionSeconds(videoBTimeline?.start, 0);
	const targetEndSec = Math.max(
		0,
		Math.min(
			parseFusionSeconds(getRecordValue(parsedPlan, "targetEndSec"), videoAEndFromTimeline),
			videoAInfo.duration,
		),
	);
	const sourceStartSec = Math.max(
		0,
		Math.min(
			parseFusionSeconds(getRecordValue(parsedPlan, "sourceStartSec"), videoBStartFromTimeline),
			videoBInfo.duration,
		),
	);
	const videoAVisualEdit = getRecordValue(videoATimeline, "visual_edit");
	const videoBVisualEdit = getRecordValue(videoBTimeline, "visual_edit");
	const timelineTransition =
		getRecordValue(videoAVisualEdit, "transition_out") ??
		getRecordValue(videoBVisualEdit, "transition_in");
	const timelineTransitionText =
		typeof timelineTransition === "string" ? timelineTransition.toLowerCase() : "";
	let transitionType: VideoFusionPlan["transitionType"] =
		parsedPlan.transitionType === "fade" ||
		timelineTransitionText.includes("fade") ||
		timelineTransitionText.includes("dissolve")
			? "fade"
			: "cut";
	const requestedTransitionDuration =
		typeof parsedPlan.transitionDurationSec === "number" &&
		Number.isFinite(parsedPlan.transitionDurationSec)
			? parsedPlan.transitionDurationSec
			: Math.max(
					parseFusionSeconds(
						getRecordValue(getRecordValue(videoATimeline, "audio_edit"), "fade_out_seconds"),
						0,
					),
					parseFusionSeconds(
						getRecordValue(getRecordValue(videoBTimeline, "audio_edit"), "fade_in_seconds"),
						0,
					),
				);
	const maxTransitionDuration = Math.min(
		1.2,
		Math.max(0, targetEndSec - 0.1),
		Math.max(0, videoBInfo.duration - sourceStartSec - 0.1),
	);
	let transitionDurationSec =
		transitionType === "fade" && maxTransitionDuration >= 0.15
			? Math.max(0.15, Math.min(requestedTransitionDuration || 0.35, maxTransitionDuration))
			: 0;
	if (transitionDurationSec <= 0) {
		transitionType = "cut";
		transitionDurationSec = 0;
	}

	const parsedAspectRatioMatch =
		typeof parsedPlan.aspectRatioMatch === "boolean"
			? parsedPlan.aspectRatioMatch
			: aspectRatioMatch;
	const videoBRecommendedFraming = getRecordValue(
		getRecordValue(getRecordValue(parsedPlan, "source_metadata"), "video_b"),
		"recommended_framing",
	);
	const metadataSizingMode =
		videoBRecommendedFraming === "pad_blur_background"
			? "preserve_scale_blur_background"
			: videoBRecommendedFraming === "center_crop" ||
				  videoBRecommendedFraming === "smart_crop"
				? "cover_crop"
				: undefined;
	const parsedSizingMode =
		parsedPlan.sizingMode === "exact_scale" ||
		parsedPlan.sizingMode === "cover_crop" ||
		parsedPlan.sizingMode === "preserve_scale_blur_background"
			? parsedPlan.sizingMode
			: metadataSizingMode ?? (parsedAspectRatioMatch ? "exact_scale" : "preserve_scale_blur_background");
	const sizingMode =
		parsedAspectRatioMatch === false || parsedSizingMode === "preserve_scale_blur_background"
			? "preserve_scale_blur_background"
			: parsedSizingMode;
	const matchTargetFrameSec =
		typeof parsedPlan.matchTargetFrameSec === "number" &&
		Number.isFinite(parsedPlan.matchTargetFrameSec)
			? Math.max(0, Math.min(parsedPlan.matchTargetFrameSec, videoAInfo.duration))
			: targetEndSec;
	const matchSourceFrameSec =
		typeof parsedPlan.matchSourceFrameSec === "number" &&
		Number.isFinite(parsedPlan.matchSourceFrameSec)
			? Math.max(0, Math.min(parsedPlan.matchSourceFrameSec, Math.min(2, videoBInfo.duration)))
			: 0;
	const confidence =
		typeof parsedPlan.confidence === "number" && Number.isFinite(parsedPlan.confidence)
			? Math.max(0, Math.min(parsedPlan.confidence, 1))
			: 0;
	const matchReason =
		typeof parsedPlan.matchReason === "string" && parsedPlan.matchReason.trim()
			? parsedPlan.matchReason.trim()
			: Array.isArray(parsedPlan.professional_notes) &&
				  typeof parsedPlan.professional_notes[0] === "string"
				? parsedPlan.professional_notes[0]
				: "Gemini 未提供匹配原因。";
	const editInstructions =
		typeof parsedPlan.editInstructions === "string" && parsedPlan.editInstructions.trim()
			? parsedPlan.editInstructions.trim()
			: transitionType === "fade"
				? "使用短交叉淡化弱化两段画面差异，让后段从有效动作点自然进入。"
				: "在动作连续点硬切，并跳过后段开头重复或预热帧。";

	const plan: VideoFusionPlan = {
		targetEndSec,
		sourceStartSec,
		transitionType,
		transitionDurationSec,
		videoAWidth: videoAInfo.width,
		videoAHeight: videoAInfo.height,
		videoAAspectRatio,
		videoAAspectLabel,
		videoBWidth: videoBInfo.width,
		videoBHeight: videoBInfo.height,
		videoBAspectRatio,
		videoBAspectLabel,
		aspectRatioMatch: parsedAspectRatioMatch,
		sizingMode,
		matchTargetFrameSec,
		matchSourceFrameSec,
		confidence,
		matchReason,
		editInstructions,
		sourceMetadata: parsedPlan.source_metadata,
		professionalPlan: parsedPlan,
	};

	return {
		result: `\`\`\`json\n${JSON.stringify(parsedPlan, null, 2)}\n\`\`\``,
		plan,
	};
}

export function useVideoFusionAnalysis({
	videoFusionPrompt,
	latestNodesRef,
	kakaApiBaseUrl,
	kakaApiKey,
	setVideoFusionAnalysis,
}: UseVideoFusionAnalysisArgs) {
	useEffect(() => {
		if (!videoFusionPrompt) {
			setVideoFusionAnalysis(null);
			return;
		}

		const sourceNode = latestNodesRef.current.find(
			(node) => node.id === videoFusionPrompt.sourceNodeId,
		);
		const targetNode = latestNodesRef.current.find(
			(node) => node.id === videoFusionPrompt.targetNodeId,
		);
		const mediaAssets = resolveReadableLocalMediaAssetPair({
			sourceAsset: sourceNode?.asset,
			targetAsset: targetNode?.asset,
		});
		if (!mediaAssets) {
			setVideoFusionAnalysis({
				loading: false,
				result: null,
				error: "无法读取视频素材链接。",
				sourceBlob: null,
				targetBlob: null,
				targetResolution: null,
				plan: null,
			});
			return;
		}
		const sourceMediaAsset = mediaAssets.source;
		const targetMediaAsset = mediaAssets.target;
		const sourceAsset = sourceMediaAsset.asset;
		const targetAsset = targetMediaAsset.asset;

		let cancelled = false;
		setVideoFusionAnalysis({
			loading: true,
			result: null,
			error: null,
			sourceBlob: null,
			targetBlob: null,
			targetResolution: null,
			plan: null,
		});

		void (async () => {
			try {
				videoFusionDebug("[video-fusion] Fetching video blobs...");
				const [sourceBlob, targetBlob] = await fetchLocalMediaAssetBlobs([
					{ asset: sourceMediaAsset, errorLabel: "读取拖入视频" },
					{ asset: targetMediaAsset, errorLabel: "读取目标视频" },
				]);
				videoFusionDebug("[video-fusion] Blobs fetched:", {
					sourceSize: sourceBlob.size,
					targetSize: targetBlob.size,
				});
				if (cancelled) return;

				videoFusionDebug("[video-fusion] Probing videos with ffprobe...");
				const [videoAFfprobe, videoBFfprobe] = await Promise.all([
					requestLocalVideoProbe(sourceBlob).catch((error) => ({
						error: formatUnknownError(error, "ffprobe failed"),
					})),
					requestLocalVideoProbe(targetBlob).catch((error) => ({
						error: formatUnknownError(error, "ffprobe failed"),
					})),
				]);

				videoFusionDebug("[video-fusion] Reading video metadata...");
				const [videoAInfo, videoBInfo] = await Promise.all([
					getVideoBlobInfo(sourceBlob),
					getVideoBlobInfo(targetBlob),
				]);
				const videoAAspectRatio = getAspectRatioValue(videoAInfo.width, videoAInfo.height);
				const videoBAspectRatio = getAspectRatioValue(videoBInfo.width, videoBInfo.height);
				const videoAAspectLabel = getAspectRatioLabel(videoAInfo.width, videoAInfo.height);
				const videoBAspectLabel = getAspectRatioLabel(videoBInfo.width, videoBInfo.height);
				const aspectRatioMatch =
					videoAAspectRatio !== null && videoBAspectRatio !== null
						? Math.abs(videoAAspectRatio - videoBAspectRatio) <= 0.01
						: false;
				videoFusionDebug("[video-fusion] Video info:", {
					videoA: { ...videoAInfo, aspectRatio: videoAAspectRatio, aspectLabel: videoAAspectLabel },
					videoB: { ...videoBInfo, aspectRatio: videoBAspectRatio, aspectLabel: videoBAspectLabel },
					aspectRatioMatch,
				});
				if (cancelled) return;

				if (SIMPLE_VIDEO_FUSION_MODE) {
					const result =
						`简单拼接模式：视频A完整播放后直接接视频B完整播放。\n` +
						`视频A：${videoAInfo.width}x${videoAInfo.height}，${videoAAspectLabel}\n` +
						`视频B：${videoBInfo.width}x${videoBInfo.height}，${videoBAspectLabel}`;
					setVideoFusionAnalysis({
						loading: false,
						result,
						error: null,
						sourceBlob,
						targetBlob,
						targetResolution: null,
						plan: null,
					});
					return;
				}

				videoFusionDebug("[video-fusion] Extracting storyboard and seam frames...");
				const videoAOverviewTimes = normalizeFrameTimes(
					createVideoTimelineSampleTimes(videoAInfo.duration, 10),
					videoAInfo.duration,
				);
				const videoBOverviewTimes = normalizeFrameTimes(
					createVideoTimelineSampleTimes(videoBInfo.duration, 10),
					videoBInfo.duration,
				);
				const videoASeamTimes = normalizeFrameTimes(
					Array.from({ length: 81 }, (_, index) =>
						Math.max(0, videoAInfo.duration - 2 + index * 0.025),
					),
					videoAInfo.duration,
				);
				const videoBSeamTimes = normalizeFrameTimes(
					Array.from({ length: 201 }, (_, index) => index * 0.01),
					videoBInfo.duration,
				);
				const [
					videoAOverviewFrames,
					videoBOverviewFrames,
					videoASeamFrames,
					videoBSeamFrames,
				] = await Promise.all([
					extractVideoKeyFramesFromBlob(sourceBlob, videoAOverviewTimes),
					extractVideoKeyFramesFromBlob(targetBlob, videoBOverviewTimes),
					extractVideoKeyFramesFromBlob(sourceBlob, videoASeamTimes),
					extractVideoKeyFramesFromBlob(targetBlob, videoBSeamTimes),
				]);
				videoFusionDebug("[video-fusion] Frames extracted:", {
					videoAOverviewFrames: videoAOverviewFrames.length,
					videoBOverviewFrames: videoBOverviewFrames.length,
					videoASeamFrames: videoASeamFrames.length,
					videoBSeamFrames: videoBSeamFrames.length,
				});
				if (cancelled) return;

				const contentParts = buildVideoFusionPromptContent({
					videoAName: sourceAsset.name || "video_a.mp4",
					videoBName: targetAsset.name || "video_b.mp4",
					videoAFfprobe,
					videoBFfprobe,
					videoAInfo,
					videoBInfo,
					videoAAspectRatio,
					videoBAspectRatio,
					videoAAspectLabel,
					videoBAspectLabel,
					aspectRatioMatch,
					videoAOverviewFrames,
					videoBOverviewFrames,
					videoASeamFrames,
					videoBSeamFrames,
				});
				const config: KakaApiConfig = {
					baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
					apiKey: kakaApiKey.trim(),
					timeoutMs: 12_000_000,
				};
				videoFusionDebug("[video-fusion] Sending frame sequences to Gemini...", {
					contentParts: contentParts.length,
				});
				const chatResult = await requestKakaChatCompletion(config, {
					model: "gemini-3.1-pro-preview(yunwu)",
					messages: [{ role: "user", content: contentParts }],
				});
				videoFusionDebug("[video-fusion] Gemini response:", chatResult);
				const apiError: unknown = chatResult.data.error;
				if (apiError) {
					throw new Error(formatApiError(apiError, "Gemini API 返回错误。"));
				}
				const rawContent = chatResult.data.choices?.[0]?.message?.content;
				const geminiResult =
					typeof rawContent === "string" && rawContent.trim()
						? rawContent.trim()
						: "Gemini 未返回分析结果。";
				const fallbackPlan = createDefaultVideoFusionPlan({
					videoAInfo,
					videoBInfo,
					videoAAspectRatio,
					videoBAspectRatio,
					videoAAspectLabel,
					videoBAspectLabel,
					aspectRatioMatch,
				});
				const { result, plan } =
					geminiResult === "Gemini 未返回分析结果。"
						? { result: geminiResult, plan: fallbackPlan }
						: parseGeminiVideoFusionPlan({
								result: geminiResult,
								videoAInfo,
								videoBInfo,
								videoAAspectRatio,
								videoBAspectRatio,
								videoAAspectLabel,
								videoBAspectLabel,
								aspectRatioMatch,
							});
				videoFusionDebug("[video-fusion] Parsed Gemini fusion plan:", plan);
				if (!cancelled) {
					setVideoFusionAnalysis({
						loading: false,
						result,
						error: null,
						sourceBlob,
						targetBlob,
						targetResolution: { width: videoAInfo.width, height: videoAInfo.height },
						plan,
					});
				}
			} catch (error) {
				console.error("[video-fusion] Gemini analysis failed:", error);
				if (!cancelled) {
					setVideoFusionAnalysis({
						loading: false,
						result: null,
						error: formatUnknownError(error, "视频分析失败。"),
						sourceBlob: null,
						targetBlob: null,
						targetResolution: null,
						plan: null,
					});
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		kakaApiBaseUrl,
		kakaApiKey,
		latestNodesRef,
		setVideoFusionAnalysis,
		videoFusionPrompt,
	]);
}
