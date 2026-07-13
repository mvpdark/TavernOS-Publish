import type { AssetRef, NodeType } from "./canvas-types";
import { stripDataUrlPrefix } from "./videoFrameHelpers";

type AssetLike = Pick<AssetRef, "name" | "mime">;

export type AudioVideoFusionMode = "replace" | "overlay";
export type AudioVideoFusionPlan = {
	mode: AudioVideoFusionMode;
	audioStartSec: number;
	audioDurationSec: number;
	fadeInSec: number;
	fadeOutSec: number;
	audioGain: number;
	keepOriginalAudio: boolean;
	confidence?: number;
	matchReason?: string;
};

export type VideoFusionPlan = {
	targetEndSec: number | null;
	sourceStartSec: number | null;
	transitionType: "cut" | "fade";
	transitionDurationSec: number;
	videoAWidth?: number;
	videoAHeight?: number;
	videoAAspectRatio?: number | null;
	videoAAspectLabel?: string;
	videoBWidth?: number;
	videoBHeight?: number;
	videoBAspectRatio?: number | null;
	videoBAspectLabel?: string;
	aspectRatioMatch?: boolean;
	sizingMode?: "exact_scale" | "preserve_scale_blur_background" | "cover_crop";
	matchTargetFrameSec?: number | null;
	matchSourceFrameSec?: number | null;
	confidence?: number;
	matchReason?: string;
	editInstructions?: string;
	sourceMetadata?: unknown;
	professionalPlan?: unknown;
};

export type VideoFusionSourceId = "video_a" | "video_b";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function createVideoTimelineSampleTimes(duration: number, count = 10) {
	if (!Number.isFinite(duration) || duration <= 0) return [0];
	if (duration <= 1) return [0, Math.max(0, duration - 0.05)];
	const last = Math.max(0, duration - 0.08);
	return Array.from({ length: count }, (_, index) => {
		if (index === 0) return 0;
		if (index === count - 1) return last;
		return (duration * index) / (count - 1);
	});
}

export function normalizeFrameTimes(times: number[], duration: number) {
	const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
	return Array.from(
		new Set(
			times
				.filter((time) => Number.isFinite(time))
				.map((time) => Number(Math.max(0, Math.min(time, safeDuration)).toFixed(3))),
		),
	).sort((left, right) => left - right);
}

export function parseFusionSeconds(value: unknown, fallback: number) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	if (!trimmed) return fallback;
	const numeric = Number(trimmed);
	if (Number.isFinite(numeric)) return numeric;
	const match = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
	if (!match) return fallback;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = Number(match[3]);
	const millis = Number((match[4] ?? "0").padEnd(3, "0"));
	return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

export function getRecordValue(value: unknown, key: string): unknown {
	return isRecord(value) ? value[key] : undefined;
}

export function getTimelineItem(planValue: unknown, source: VideoFusionSourceId) {
	const timeline = getRecordValue(planValue, "final_timeline");
	if (!Array.isArray(timeline)) return null;
	const item = timeline.find((entry) => isRecord(entry) && entry.source === source);
	return isRecord(item) ? item : null;
}

export function resolveAudioVideoFusionMode(sourceType: NodeType): AudioVideoFusionMode {
	return sourceType === "music" ? "replace" : "overlay";
}

export function normalizeAudioVideoFusionPlan(
	rawPlan: Partial<AudioVideoFusionPlan> | null,
	mode: AudioVideoFusionMode,
	audioDuration: number,
	videoDuration: number,
): AudioVideoFusionPlan {
	const requestedStart =
		typeof rawPlan?.audioStartSec === "number" && Number.isFinite(rawPlan.audioStartSec)
			? rawPlan.audioStartSec
			: 0;
	const audioStartSec = Math.max(0, Math.min(requestedStart, Math.max(0, audioDuration - 0.1)));
	const requestedDuration =
		typeof rawPlan?.audioDurationSec === "number" && Number.isFinite(rawPlan.audioDurationSec)
			? rawPlan.audioDurationSec
			: videoDuration;
	const audioDurationSec = Math.max(0.2, Math.min(requestedDuration, Math.max(videoDuration, 0.2)));
	const fadeInSec =
		typeof rawPlan?.fadeInSec === "number" && Number.isFinite(rawPlan.fadeInSec)
			? Math.max(0, Math.min(rawPlan.fadeInSec, 2))
			: mode === "replace" ? 0.4 : 0.12;
	const fadeOutSec =
		typeof rawPlan?.fadeOutSec === "number" && Number.isFinite(rawPlan.fadeOutSec)
			? Math.max(0, Math.min(rawPlan.fadeOutSec, 3))
			: mode === "replace" ? 0.8 : 0.2;
	const audioGain =
		typeof rawPlan?.audioGain === "number" && Number.isFinite(rawPlan.audioGain)
			? Math.max(0.05, Math.min(rawPlan.audioGain, 2))
			: mode === "replace" ? 1 : 0.85;
	return {
		mode,
		audioStartSec,
		audioDurationSec,
		fadeInSec,
		fadeOutSec,
		audioGain,
		keepOriginalAudio: mode === "overlay",
		confidence:
			typeof rawPlan?.confidence === "number" && Number.isFinite(rawPlan.confidence)
				? Math.max(0, Math.min(rawPlan.confidence, 1))
				: 0,
		matchReason:
			typeof rawPlan?.matchReason === "string" && rawPlan.matchReason.trim()
				? rawPlan.matchReason.trim()
				: mode === "replace"
					? "使用保守默认：从音乐开头截取并替换原视频声音。"
					: "使用保守默认：从音频开头截取并叠加到原视频声音上。",
	};
}

export function buildLocalAudioVideoFusionPayload({
	videoAsset,
	videoMime,
	videoDataUrl,
	audioAsset,
	audioMime,
	audioDataUrl,
	plan,
}: {
	videoAsset: AssetLike;
	videoMime: string;
	videoDataUrl: string;
	audioAsset: AssetLike;
	audioMime: string;
	audioDataUrl: string;
	plan: AudioVideoFusionPlan;
}) {
	return {
		video: {
			name: videoAsset.name || "video.mp4",
			mime: videoMime || videoAsset.mime || "video/mp4",
			data: stripDataUrlPrefix(videoDataUrl),
		},
		audio: {
			name: audioAsset.name || "audio.mp3",
			mime: audioMime || audioAsset.mime || "audio/mpeg",
			data: stripDataUrlPrefix(audioDataUrl),
		},
		plan,
	};
}

export function buildFrameMergePayload({
	sourceName,
	sourceDataUrl,
	targetName,
	targetDataUrl,
	resolution,
	plan,
}: {
	sourceName: string;
	sourceDataUrl: string;
	targetName: string;
	targetDataUrl: string;
	resolution: { width: number; height: number } | null;
	plan: VideoFusionPlan | null;
}) {
	return {
		videos: [
			{ name: sourceName || "source.mp4", data: stripDataUrlPrefix(sourceDataUrl) },
			{ name: targetName || "target.mp4", data: stripDataUrlPrefix(targetDataUrl) },
		],
		resolution,
		plan,
	};
}
