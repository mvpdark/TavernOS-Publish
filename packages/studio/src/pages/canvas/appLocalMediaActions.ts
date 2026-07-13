import { buildLocalAudioVideoFusionPayload, type AudioVideoFusionPlan } from "./mediaFusionPlanning";
import { readResponseErrorMessage, requestBlob } from "./appHttpClient";
import { getReferenceAssetUrl } from "./referenceAssetUtils";
import type { ImageUpscaleSettings, VideoEnhanceSettings } from "./components/CanvasNodeView";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";
import type { AssetRef, CanvasNode } from "./canvas-types";
import { blobToDataUrl } from "./videoFrameHelpers";

export type VideoEnhanceResponse = { blob: Blob; mime: string; accelerator: string };
export type ImageUpscaleResponse = { blob: Blob; mime: string };
export type ReadableLocalMediaAsset<T extends Pick<AssetRef, "url"> = AssetRef> = {
	asset: T & { url: string };
	url: string;
};
export type ReadableLocalMediaAssetPair<
	TSource extends Pick<AssetRef, "url"> = AssetRef,
	TTarget extends Pick<AssetRef, "url"> = AssetRef,
> = {
	source: ReadableLocalMediaAsset<TSource>;
	target: ReadableLocalMediaAsset<TTarget>;
};
type LocalMediaAssetBlobSource =
	| Pick<AssetRef, "url">
	| ReadableLocalMediaAsset<Pick<AssetRef, "url">>;
type LocalMediaAssetRequestSource =
	| AssetRef
	| ReadableLocalMediaAsset<AssetRef>;
export type AudioAnalysisSummary = {
	duration: number;
	sampleRate: number;
	channels: number;
	windows: Array<{ start: number; end: number; rms: number; peak: number }>;
	highEnergyWindows: Array<{ start: number; end: number; rms: number; peak: number }>;
};

function isProbablyChineseLabel(label: string) {
	return /[\u3400-\u9fff]/.test(label);
}

function formatEmptyLocalMediaAssetUrlMessage(errorLabel: string) {
	return isProbablyChineseLabel(errorLabel)
		? `${errorLabel}地址为空。`
		: `${errorLabel} asset URL is empty.`;
}

export function resolveLocalMediaAssetUrl(asset: Pick<AssetRef, "url"> | null | undefined) {
	if (!asset) return undefined;
	return getReferenceAssetUrl(asset) || undefined;
}

export function resolveReadableLocalMediaAsset<T extends Pick<AssetRef, "url">>(
	asset: T | null | undefined,
): ReadableLocalMediaAsset<T> | null {
	const url = resolveLocalMediaAssetUrl(asset);
	if (!asset || !url) return null;
	return { asset: { ...asset, url }, url };
}

export function requireReadableLocalMediaAsset<T extends Pick<AssetRef, "url">>(
	asset: T | null | undefined,
	errorLabel: string,
): ReadableLocalMediaAsset<T> {
	const readableAsset = resolveReadableLocalMediaAsset(asset);
	if (!readableAsset) throw new Error(formatEmptyLocalMediaAssetUrlMessage(errorLabel));
	return readableAsset;
}

export function resolveReadableLocalMediaAssetPair<
	TSource extends Pick<AssetRef, "url">,
	TTarget extends Pick<AssetRef, "url">,
>({
	sourceAsset,
	targetAsset,
}: {
	sourceAsset: TSource | null | undefined;
	targetAsset: TTarget | null | undefined;
}): ReadableLocalMediaAssetPair<TSource, TTarget> | null {
	const source = resolveReadableLocalMediaAsset(sourceAsset);
	const target = resolveReadableLocalMediaAsset(targetAsset);
	if (!source || !target) return null;
	return { source, target };
}

export function isReadableLocalMediaAsset(
	asset: LocalMediaAssetBlobSource | null | undefined,
): asset is ReadableLocalMediaAsset<Pick<AssetRef, "url">> {
	if (
		!asset ||
		typeof asset !== "object" ||
		!("asset" in asset) ||
		!("url" in asset)
	) {
		return false;
	}
	const normalizedUrl = typeof asset.url === "string"
		? resolveLocalMediaAssetUrl({ url: asset.url })
		: undefined;
	const innerAsset = asset.asset;
	const normalizedAssetUrl =
		innerAsset &&
		typeof innerAsset === "object" &&
		"url" in innerAsset &&
		typeof innerAsset.url === "string"
			? resolveLocalMediaAssetUrl(innerAsset)
			: undefined;
	return Boolean(
		normalizedUrl &&
			normalizedAssetUrl &&
			normalizedUrl === normalizedAssetUrl,
	);
}

function isReadableLocalMediaAssetShape(
	asset: LocalMediaAssetBlobSource | null | undefined,
) {
	return Boolean(
		asset &&
			typeof asset === "object" &&
			"asset" in asset &&
			"url" in asset &&
			typeof asset.url === "string",
	);
}

function resolveLocalMediaAssetRequestSource(
	asset: LocalMediaAssetRequestSource | null | undefined,
	errorLabel: string,
): ReadableLocalMediaAsset<AssetRef> {
	const readableAsset = isReadableLocalMediaAssetShape(asset)
		? isReadableLocalMediaAsset(asset)
			? asset as ReadableLocalMediaAsset<AssetRef>
			: null
		: requireReadableLocalMediaAsset(asset as AssetRef | null | undefined, errorLabel);
	if (!readableAsset) throw new Error(formatEmptyLocalMediaAssetUrlMessage(errorLabel));
	return readableAsset;
}

export function requireLocalMediaAssetUrl(
	asset: Pick<AssetRef, "url"> | null | undefined,
	errorLabel: string,
) {
	const url = resolveLocalMediaAssetUrl(asset);
	if (!url) throw new Error(formatEmptyLocalMediaAssetUrlMessage(errorLabel));
	return url;
}

function appendLocalMediaUrlParam(params: URLSearchParams, key: string, url: string) {
	const normalizedUrl = resolveLocalMediaAssetUrl({ url });
	if (normalizedUrl) params.append(key, normalizedUrl);
}

export async function fetchLocalMediaAssetBlob(
	asset: LocalMediaAssetBlobSource | null | undefined,
	errorLabel: string,
) {
	const url = isReadableLocalMediaAssetShape(asset)
		? requireLocalMediaAssetUrl(
				isReadableLocalMediaAsset(asset) ? asset.asset : null,
				errorLabel,
			)
		: requireLocalMediaAssetUrl(asset, errorLabel);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`无法读取${errorLabel}：${response.status}`);
	}
	return response.blob();
}

export async function fetchLocalMediaAssetBlobs(
	assets: readonly {
		asset: LocalMediaAssetBlobSource | null | undefined;
		errorLabel: string;
	}[],
) {
	return Promise.all(
		assets.map(({ asset, errorLabel }) =>
			fetchLocalMediaAssetBlob(asset, errorLabel),
		),
	);
}

export async function requestLocalVideoEnhancement(
	asset: LocalMediaAssetRequestSource,
	settings: VideoEnhanceSettings,
	audioUrls: string[] = [],
): Promise<VideoEnhanceResponse> {
	const sourceMediaAsset = resolveLocalMediaAssetRequestSource(asset, "视频素材");
	const sourceAsset = sourceMediaAsset.asset;
	const sourceBlob = await fetchLocalMediaAssetBlob(sourceMediaAsset, "视频素材");
	const params = new URLSearchParams({
		fps: settings.fps,
		scale: settings.scale,
		accelerator: settings.accelerator,
	});
	for (const audioUrl of audioUrls) {
		appendLocalMediaUrlParam(params, "audio_url", audioUrl);
	}
	const { blob, response } = await requestBlob(
		`/api/video/enhance?${params.toString()}`,
		{
			method: "POST",
			headers: {
				"Content-Type": sourceBlob.type || sourceAsset.mime || "video/mp4",
			},
			body: sourceBlob,
		},
		"本机 FFmpeg 增强失败",
	);
	return {
		blob,
		mime: response.headers.get("content-type") || "video/mp4",
		accelerator: response.headers.get("x-kaka-video-accelerator") || "cpu",
	};
}

export async function analyzeAudioBlob(blob: Blob): Promise<AudioAnalysisSummary> {
	const audioContext = new AudioContext();
	try {
		const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
		const duration = Number.isFinite(buffer.duration) ? buffer.duration : 0;
		const windowCount = Math.max(8, Math.min(64, Math.ceil(Math.max(duration, 1) / 0.5)));
		const samplesPerWindow = Math.max(1, Math.floor(buffer.length / windowCount));
		const windows: AudioAnalysisSummary["windows"] = [];
		for (let windowIndex = 0; windowIndex < windowCount; windowIndex++) {
			const startSample = windowIndex * samplesPerWindow;
			const endSample = windowIndex === windowCount - 1
				? buffer.length
				: Math.min(buffer.length, startSample + samplesPerWindow);
			let sumSquares = 0;
			let peak = 0;
			let sampleCount = 0;
			for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
				const data = buffer.getChannelData(channel);
				for (let sample = startSample; sample < endSample; sample++) {
					const value = Math.abs(data[sample] ?? 0);
					sumSquares += value * value;
					peak = Math.max(peak, value);
					sampleCount++;
				}
			}
			const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
			windows.push({
				start: Number((startSample / buffer.sampleRate).toFixed(3)),
				end: Number((endSample / buffer.sampleRate).toFixed(3)),
				rms: Number(rms.toFixed(4)),
				peak: Number(peak.toFixed(4)),
			});
		}
		const highEnergyWindows = [...windows]
			.sort((left, right) => right.rms - left.rms)
			.slice(0, 8)
			.sort((left, right) => left.start - right.start);
		return {
			duration,
			sampleRate: buffer.sampleRate,
			channels: buffer.numberOfChannels,
			windows,
			highEnergyWindows,
		};
	} finally {
		await audioContext.close().catch(() => undefined);
	}
}

export async function requestLocalAudioVideoFusion(
	videoBlob: Blob,
	videoAsset: AssetRef,
	audioBlob: Blob,
	audioAsset: AssetRef,
	plan: AudioVideoFusionPlan,
): Promise<VideoEnhanceResponse> {
	const [videoDataUrl, audioDataUrl] = await Promise.all([
		blobToDataUrl(videoBlob),
		blobToDataUrl(audioBlob),
	]);
	const response = await fetch("/api/video/audio-fusion", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(buildLocalAudioVideoFusionPayload({
			videoAsset,
			videoMime: videoBlob.type || videoAsset.mime || "video/mp4",
			videoDataUrl,
			audioAsset,
			audioMime: audioBlob.type || audioAsset.mime || "audio/mpeg",
			audioDataUrl,
			plan,
		})),
	});
	if (!response.ok) {
		const message = await readResponseErrorMessage(response);
		throw new Error(message || `本机 FFmpeg 音视频融合失败：${response.status}`);
	}
	return {
		blob: await response.blob(),
		mime: response.headers.get("content-type") || "video/mp4",
		accelerator: "cpu",
	};
}

export function getConnectedAudioUrls(
	videoNodeId: string,
	connections: NodeConnection[],
	nodes: CanvasNode[],
): string[] {
	const connectedIds = new Set<string>();
	for (const conn of connections) {
		if (conn.to.nodeId === videoNodeId) connectedIds.add(conn.from.nodeId);
	}
	const nodeMap = new Map(nodes.map((node) => [node.id, node]));
	const urls: string[] = [];
	for (const id of connectedIds) {
		const node = nodeMap.get(id);
		if (!node) continue;
		if (node.type === "audio" || node.type === "music") {
			const url = resolveLocalMediaAssetUrl(node.asset);
			if (url) urls.push(url);
		}
	}
	return urls;
}

export async function requestLocalImageUpscale(
	asset: LocalMediaAssetRequestSource,
	settings: ImageUpscaleSettings,
): Promise<ImageUpscaleResponse> {
	const sourceMediaAsset = resolveLocalMediaAssetRequestSource(asset, "图片素材");
	const sourceAsset = sourceMediaAsset.asset;
	const sourceBlob = await fetchLocalMediaAssetBlob(sourceMediaAsset, "图片素材");
	const params = new URLSearchParams({ scale: settings.scale });
	const { blob, response } = await requestBlob(
		`/api/image/upscale?${params.toString()}`,
		{
			method: "POST",
			headers: {
				"Content-Type": sourceBlob.type || sourceAsset.mime || "image/png",
			},
			body: sourceBlob,
		},
		"本机 FFmpeg 图片放大失败",
	);
	return {
		blob,
		mime: response.headers.get("content-type") || "image/png",
	};
}
