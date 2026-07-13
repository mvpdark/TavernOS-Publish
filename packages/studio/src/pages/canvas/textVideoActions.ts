import type { KakaChatMessageContentPart } from "./kakaApi";

export type ConnectedVideoInfo = {
	width: number;
	height: number;
	duration: number;
} | null;

export type ConnectedVideoFrame = {
	dataUrl: string;
	time?: number;
};

export function createConnectedVideoFrameTimes(duration: number) {
	if (!Number.isFinite(duration) || duration <= 0) return [0];
	return Array.from(
		new Set([
			0,
			Number((duration * 0.5).toFixed(3)),
			Number(Math.max(0, duration - 0.12).toFixed(3)),
		]),
	).sort((left, right) => left - right);
}

export function buildConnectedVideoContentParts({
	prompt,
	assetName,
	videoInfo,
	frames,
}: {
	prompt: string;
	assetName?: string;
	videoInfo: ConnectedVideoInfo;
	frames: ConnectedVideoFrame[];
}): KakaChatMessageContentPart[] {
	const contentParts: KakaChatMessageContentPart[] = [
		{
			type: "text",
			text: `${prompt}

【已连接视频素材】文件名：${assetName || "video.mp4"}
时长：${videoInfo?.duration ? `${videoInfo.duration.toFixed(3)} 秒` : "unknown"}
分辨率：${videoInfo ? `${videoInfo.width}x${videoInfo.height}` : "unknown"}

我已经把该视频的关键帧随本消息一起提供给你。请基于这些视频画面回答，不要再要求用户“把视频发给我”。如果用户要求截图或抽帧，应说明系统会自动交给 FFmpeg 处理。`,
		},
	];

	frames.forEach((frame) => {
		contentParts.push({
			type: "image_url",
			image_url: { url: frame.dataUrl },
		});
	});

	return contentParts;
}
