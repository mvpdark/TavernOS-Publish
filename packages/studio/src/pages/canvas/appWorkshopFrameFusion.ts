import { extractVideoUrlsFromWorkshopFrames } from "./appResponseParsing";
import {
	requestLocalFfmpegStatus,
	uploadGeneratedAssetToCloudDrive,
} from "./appServerApi";

export function getWorkshopFrameFusionVideoUrls(frames: string[]) {
	const videoUrls = extractVideoUrlsFromWorkshopFrames(frames);
	if (videoUrls.length < 2) {
		throw new Error(
			"本地 FFmpeg 融合至少需要 2 条分镜视频链接。请先在分镜卡片中放入视频 URL。",
		);
	}
	return videoUrls;
}

export async function fuseWorkshopFramesWithLocalFfmpeg(frames: string[]) {
	const videoUrls = getWorkshopFrameFusionVideoUrls(frames);
	const status = await requestLocalFfmpegStatus();
	if (!status.available) {
		throw new Error("本机 FFmpeg 不可用，请先安装 FFmpeg 后再融合分镜视频。");
	}
	const response = await fetch("/api/workshop/frame-merge", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ videos: videoUrls }),
	});
	if (!response.ok) {
		const message = await response.text().catch(() => "");
		throw new Error(message || `本地 FFmpeg 融合失败：${response.status}`);
	}
	const blob = await response.blob();
	const file = new File([blob], `workshop-ffmpeg-fusion-${Date.now()}.mp4`, {
		type: "video/mp4",
	});
	const uploaded = await uploadGeneratedAssetToCloudDrive(file, "video");
	return [`FFmpeg 融合视频 · ${uploaded.url}`];
}
