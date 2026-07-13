import { getVideoNodeSize, type CanvasNodeSize } from "./canvasNodeSizing";
import type { AssetRef } from "./canvas-types";

export type VideoFrameMode = "first" | "middle" | "last";
export type VideoKeyFrame = { time: number; dataUrl: string };
export type VideoFrameExtractionResult = {
	blob: Blob;
	file: File;
	dataUrl: string;
	size: CanvasNodeSize | null;
	width: number;
	height: number;
};

type VideoAsset = Pick<AssetRef, "name" | "url" | "mime">;

function pathLikeExt(name: string) {
	const match = /(\.[^.]+)$/.exec(name);
	return match?.[1] ?? "";
}

function getBaseNameWithoutExtension(name: string) {
	const extension = pathLikeExt(name);
	return extension ? name.slice(0, -extension.length) : name;
}

export function readBlobAsDataUrl(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("图片转 base64 失败。"));
		reader.onerror = () =>
			reject(reader.error ?? new Error("图片转 base64 失败。"));
		reader.readAsDataURL(blob);
	});
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
	return new Promise<Blob>((resolve, reject) => {
		const timer = window.setTimeout(() => {
			reject(new Error("图片转换超时。"));
		}, 8000);
		canvas.toBlob((blob) => {
			window.clearTimeout(timer);
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("图片转换失败。"));
			}
		}, type);
	});
}

export function blobToDataUrl(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(new Error("无法读取媒体数据。"));
		reader.readAsDataURL(blob);
	});
}

export function stripDataUrlPrefix(dataUrl: string) {
	return dataUrl.replace(/^data:.*?;base64,/, "");
}

export async function getVideoBlobInfo(
	blob: Blob,
): Promise<{ width: number; height: number; duration: number }> {
	const video = document.createElement("video");
	const objectUrl = URL.createObjectURL(blob);
	video.src = objectUrl;
	video.preload = "metadata";
	return new Promise((resolve, reject) => {
		video.onloadedmetadata = () => {
			resolve({
				width: video.videoWidth,
				height: video.videoHeight,
				duration: Number.isFinite(video.duration) ? video.duration : 0,
			});
			URL.revokeObjectURL(objectUrl);
		};
		video.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("无法读取视频信息。"));
		};
	});
}

export async function extractVideoKeyFramesFromBlob(
	blob: Blob,
	times: number[],
): Promise<VideoKeyFrame[]> {
	const video = document.createElement("video");
	const objectUrl = URL.createObjectURL(blob);
	video.src = objectUrl;
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	try {
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => resolve();
			video.onerror = () => reject(new Error("无法加载视频。"));
		});
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas 不支持视频帧提取。");
		canvas.width = video.videoWidth || 1280;
		canvas.height = video.videoHeight || 720;
		const frames: VideoKeyFrame[] = [];
		for (const time of times) {
			const clampedTime = Math.max(0, Math.min(time, video.duration || 0));
			await new Promise<void>((resolve, reject) => {
				video.onseeked = () => resolve();
				video.onerror = () => reject(new Error("视频帧定位失败。"));
				video.currentTime = clampedTime;
			});
			context.drawImage(video, 0, 0, canvas.width, canvas.height);
			frames.push({
				time: clampedTime,
				dataUrl: canvas.toDataURL("image/jpeg", 0.82),
			});
		}
		return frames;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

export function createExtensionStoryboardTimes(duration: number) {
	if (!Number.isFinite(duration) || duration <= 0) return [0];
	const last = Math.max(0, duration - 0.12);
	return Array.from(
		new Set(
			[
				0,
				duration * 0.18,
				duration * 0.36,
				duration * 0.54,
				duration * 0.72,
				duration * 0.9,
				last,
			].map((time) => Number(Math.max(0, Math.min(time, last)).toFixed(3))),
		),
	).sort((a, b) => a - b);
}

export function createExtensionTailTrajectoryTimes(
	duration: number,
	seconds = 3,
	interval = 0.25,
) {
	if (!Number.isFinite(duration) || duration <= 0) return [0];
	const last = Math.max(0, duration - 0.08);
	const start = Math.max(0, last - seconds);
	const count = Math.max(2, Math.floor((last - start) / interval) + 1);
	const times = Array.from({ length: count }, (_, index) => start + index * interval);
	times.push(last);
	return Array.from(
		new Set(
			times.map((time) =>
				Number(Math.max(0, Math.min(time, last)).toFixed(3)),
			),
		),
	).sort((a, b) => a - b);
}

export function isVideoScreenshotPrompt(prompt: string) {
	return /截图|截屏|截帧|截一帧|截取|抓帧|抽帧|取帧|提取.*帧|导出.*帧|最后一帧|尾帧|末帧|首帧|第一帧|screenshot|screen\s*shot|capture\s+(?:a\s+)?frame|frame\s*grab|last\s+frame|first\s+frame/i.test(
		prompt,
	);
}

export function resolveScreenshotFrameMode(prompt: string): VideoFrameMode {
	if (/首帧|第一帧|开头|开始|起始|first|start|beginning/i.test(prompt)) {
		return "first";
	}
	if (/中间|中段|中部|middle|center/i.test(prompt)) {
		return "middle";
	}
	if (/最后|尾帧|末帧|结尾|last|end/i.test(prompt)) {
		return "last";
	}
	return "last";
}

async function extractVideoFrameBlobFromVideoSource(
	source: string,
	mode: VideoFrameMode,
	revokeSourceUrl = false,
): Promise<{ blob: Blob; width: number; height: number }> {
	const video = document.createElement("video");
	video.crossOrigin = "anonymous";
	video.src = source;
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	try {
		await new Promise<void>((resolve, reject) => {
			const timer = window.setTimeout(
				() => reject(new Error("读取视频信息超时。")),
				8000,
			);
			video.onloadedmetadata = () => {
				window.clearTimeout(timer);
				resolve();
			};
			video.onerror = () => {
				window.clearTimeout(timer);
				reject(new Error("无法加载视频。"));
			};
		});
		const duration = Number.isFinite(video.duration) ? video.duration : 0;
		const targetTime =
			mode === "first"
				? 0
				: mode === "middle"
					? Math.max(0, duration / 2)
					: Math.max(0, duration - 0.1);
		const clampedTime = Math.max(0, Math.min(targetTime, duration || targetTime));
		if (clampedTime <= 0.001) {
			await new Promise<void>((resolve, reject) => {
				if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
					resolve();
					return;
				}
				const timer = window.setTimeout(
					() => reject(new Error("首帧读取超时。")),
					8000,
				);
				video.onloadeddata = () => {
					window.clearTimeout(timer);
					resolve();
				};
				video.onerror = () => {
					window.clearTimeout(timer);
					reject(new Error("首帧读取失败。"));
				};
			});
		} else {
			await new Promise<void>((resolve, reject) => {
				const timer = window.setTimeout(
					() => reject(new Error("视频帧定位超时。")),
					10000,
				);
				video.onseeked = () => {
					window.clearTimeout(timer);
					resolve();
				};
				video.onerror = () => {
					window.clearTimeout(timer);
					reject(new Error("视频帧定位失败。"));
				};
				video.currentTime = clampedTime;
			});
		}
		await new Promise<void>((resolve) => {
			const requestFrame = video.requestVideoFrameCallback?.bind(video);
			const timer = window.setTimeout(() => resolve(), 1200);
			if (requestFrame) {
				requestFrame(() => {
					window.clearTimeout(timer);
					resolve();
				});
			} else {
				window.requestAnimationFrame(() => {
					window.clearTimeout(timer);
					resolve();
				});
			}
		});
		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth || 1280;
		canvas.height = video.videoHeight || 720;
		const context = canvas.getContext("2d", {
			alpha: false,
			colorSpace: "srgb",
		} as CanvasRenderingContext2DSettings);
		if (!context) throw new Error("Canvas 不支持视频帧提取。");
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		return {
			blob: await canvasToBlob(canvas, "image/png"),
			width: canvas.width,
			height: canvas.height,
		};
	} finally {
		if (revokeSourceUrl) URL.revokeObjectURL(source);
	}
}

async function measureImageBlob(blob: Blob): Promise<CanvasNodeSize | null> {
	if (!("createImageBitmap" in window)) return null;
	const bitmap = await createImageBitmap(blob);
	try {
		return getVideoNodeSize(bitmap.width, bitmap.height);
	} finally {
		bitmap.close();
	}
}

export async function extractVideoFrameForWorkflow(
	asset: VideoAsset,
	mode: VideoFrameMode = "last",
	options: { fileSuffix?: string } = {},
): Promise<VideoFrameExtractionResult> {
	if (!asset.url) throw new Error("视频节点没有可用素材链接。");
	let frameBlob: Blob;
	let frameWidth = 0;
	let frameHeight = 0;
	let frameSize: CanvasNodeSize | null = null;

	try {
		const browserFrame = await extractVideoFrameBlobFromVideoSource(
			asset.url,
			mode,
		);
		frameBlob = browserFrame.blob;
		frameWidth = browserFrame.width;
		frameHeight = browserFrame.height;
		frameSize = getVideoNodeSize(browserFrame.width, browserFrame.height);
	} catch (browserError) {
		console.warn(
			"Browser frame capture failed, falling back to local FFmpeg screenshot.",
			browserError,
		);
		const videoResponse = await fetch(asset.url);
		if (!videoResponse.ok) {
			throw new Error(`无法读取视频素材：${videoResponse.status}`);
		}
		const videoBlob = await videoResponse.blob();
		const frameResponse = await fetch(
			`/api/video/last-frame?position=${encodeURIComponent(mode)}`,
			{
				method: "POST",
				headers: {
					"Content-Type": videoBlob.type || asset.mime || "video/mp4",
				},
				body: videoBlob,
			},
		);
		if (!frameResponse.ok) {
			const message = await frameResponse.text().catch(() => "");
			throw new Error(message || `截图失败：${frameResponse.status}`);
		}
		frameBlob = await frameResponse.blob();
		if ("createImageBitmap" in window) {
			try {
				const bitmap = await createImageBitmap(frameBlob);
				try {
					frameWidth = bitmap.width;
					frameHeight = bitmap.height;
					frameSize = getVideoNodeSize(bitmap.width, bitmap.height);
				} finally {
					bitmap.close();
				}
			} catch {
				frameSize = await measureImageBlob(frameBlob).catch(() => null);
			}
		}
	}

	const baseName = getBaseNameWithoutExtension(asset.name || "video");
	const suffix = options.fileSuffix ?? "截图";
	const file = new File([frameBlob], `${baseName}-${suffix}.png`, {
		type: "image/png",
	});
	return {
		blob: frameBlob,
		file,
		dataUrl: await readBlobAsDataUrl(frameBlob),
		size: frameSize,
		width: frameWidth,
		height: frameHeight,
	};
}

export async function extractScreenshotFromVideoAsset(
	asset: VideoAsset,
	prompt: string,
): Promise<{ file: File; size: CanvasNodeSize | null }> {
	const mode = resolveScreenshotFrameMode(prompt);
	const frame = await extractVideoFrameForWorkflow(asset, mode, {
		fileSuffix: "截图",
	});
	return { file: frame.file, size: frame.size };
}
