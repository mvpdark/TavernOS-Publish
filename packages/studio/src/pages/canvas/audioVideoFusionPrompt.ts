import type { KakaChatMessageContentPart } from "./kakaApi";
import type { AudioVideoFusionMode } from "./mediaFusionPlanning";

type VideoInfoForAudioFusion = {
	duration: number;
	width: number;
	height: number;
};

type AudioAnalysisForPrompt = {
	duration: number;
	sampleRate: number;
	channels: number;
	highEnergyWindows: unknown;
	windows: unknown;
};

type VideoFrameForAudioFusion = {
	time: number;
	dataUrl: string;
};

function formatAudioAnalysis(analysis: AudioAnalysisForPrompt) {
	return JSON.stringify(
		{
			duration: Number(analysis.duration.toFixed(3)),
			sampleRate: analysis.sampleRate,
			channels: analysis.channels,
			highEnergyWindows: analysis.highEnergyWindows,
			windows: analysis.windows,
		},
		null,
		2,
	);
}

export function createAudioVideoFusionFrameTimes(duration: number) {
	return [
		0,
		duration * 0.25,
		duration * 0.5,
		duration * 0.75,
		Math.max(0, duration - 0.1),
	].filter(
		(time, index, list) => Number.isFinite(time) && list.indexOf(time) === index,
	);
}

export function buildAudioVideoFusionContentParts({
	mode,
	videoTitle,
	audioTitle,
	audioKindLabel,
	videoInfo,
	audioAnalysis,
	originalVideoAudioAnalysis,
	frames,
}: {
	mode: AudioVideoFusionMode;
	videoTitle: string;
	audioTitle: string;
	audioKindLabel: string;
	videoInfo: VideoInfoForAudioFusion;
	audioAnalysis: AudioAnalysisForPrompt;
	originalVideoAudioAnalysis: AudioAnalysisForPrompt | null;
	frames: VideoFrameForAudioFusion[];
}) {
	const desiredBehavior =
		mode === "replace"
			? "这是音乐节点：必须选择适合当前视频情绪和节奏的一段音乐，最终替换原视频声音。keepOriginalAudio 必须为 false，mode 必须为 replace。"
			: "这是音频节点：必须选择适合当前视频内容的一段音频，最终叠加到原视频声音轨上，不能替代原视频音乐或原声。keepOriginalAudio 必须为 true，mode 必须为 overlay。";
	const audioFeatureText = formatAudioAnalysis(audioAnalysis);
	const originalVideoAudioText = originalVideoAudioAnalysis
		? formatAudioAnalysis(originalVideoAudioAnalysis)
		: "浏览器未能直接解析视频原声轨；融合时仍会保留原视频声音，请避免选择过强、过满的叠加音频。";
	const requestedDuration = videoInfo.duration.toFixed(3);
	const contentParts: KakaChatMessageContentPart[] = [
		{
			type: "text",
			text: `你是一位影视声音剪辑师。请根据视频关键帧、视频时长和${audioKindLabel}能量分析，自动决定从${audioKindLabel}素材中截取哪一段来匹配视频。
${desiredBehavior}

视频信息：
- 标题：${videoTitle || "视频"}
- 时长：${requestedDuration} 秒
- 分辨率：${videoInfo.width}x${videoInfo.height}

${audioKindLabel}信息：
- 标题：${audioTitle || audioKindLabel}
- 时长：${audioAnalysis.duration.toFixed(3)} 秒
- 采样率：${audioAnalysis.sampleRate}
- 声道：${audioAnalysis.channels}
- 能量窗口 JSON（rms/peak 越高表示越强）：
${audioFeatureText}

${mode === "overlay"
	? `视频原声轨分析（叠加时必须保留，选择音频片段时要避免遮盖原声）：\n${originalVideoAudioText}`
	: "音乐节点会替换原视频声音，因此无需保留视频原声轨。"}

任务：
1. 观察后续给出的关键帧，判断视频叙事节奏、动作强度和情绪氛围。
2. 结合${audioKindLabel}能量窗口，选择一个 audioStartSec，让截取片段最适配视频开头到结尾。
3. audioDurationSec 默认应等于视频时长 ${requestedDuration}；如果素材不足，仍可填视频时长，后端会补静音或截断。
4. ${mode === "replace"
	? "音乐替换原视频声音：audioGain 建议 0.8-1.1，fadeInSec 0.3-1，fadeOutSec 0.5-1.5。"
	: "音频叠加并保留原视频声音：audioGain 建议 0.45-0.95，fadeInSec 0.05-0.3，fadeOutSec 0.1-0.5。"}

只输出 JSON 代码块，不要输出解释文字。字段：
- mode: "${mode}"
- audioStartSec: 数字，范围 0 到 ${Math.max(0, audioAnalysis.duration - 0.1).toFixed(3)}
- audioDurationSec: 数字，建议 ${requestedDuration}
- fadeInSec: 数字
- fadeOutSec: 数字
- audioGain: 数字
- keepOriginalAudio: ${mode === "overlay" ? "true" : "false"}
- confidence: 0 到 1
- matchReason: 一句中文原因
\`\`\`json
{"mode":"${mode}","audioStartSec":0,"audioDurationSec":${requestedDuration},"fadeInSec":${mode === "replace" ? 0.4 : 0.12},"fadeOutSec":${mode === "replace" ? 0.8 : 0.2},"audioGain":${mode === "replace" ? 1 : 0.85},"keepOriginalAudio":${mode === "overlay"},"confidence":0.7,"matchReason":"根据视频节奏和音频能量选择开头片段。"}
\`\`\``,
		},
	];

	for (const [index, frame] of frames.entries()) {
		contentParts.push({
			type: "text",
			text: `视频关键帧 ${index + 1}/${frames.length}，时间戳 ${frame.time.toFixed(3)} 秒：`,
		});
		contentParts.push({ type: "image_url", image_url: { url: frame.dataUrl } });
	}
	return contentParts;
}
