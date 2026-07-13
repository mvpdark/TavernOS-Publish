import { inferReferenceAssetKind } from "./referenceAssetUtils";
import type { ReferenceAsset } from "./canvas-types";

export {
	countReferenceAssets,
	createReferenceAssetWithUrl,
	getFilledReferenceAssets,
	getFirstReferenceAssetUrlByKindFromReadyAssets,
	getFirstReferenceAssetUrlByKindOrExtensionFromReadyAssets,
	getFirstReferenceAssetUrlByKindOrExtension,
	getFirstReferenceAssetUrl,
	getFirstReferenceAssetUrlFromReadyAssets,
	getReferenceAssetsWithUrls,
	getReferenceAssetUrls,
	getReferenceAssetUrlsByKindOrExtensionFromReadyAssets,
	getReferenceAssetUrl,
	getUniqueReferenceAssetUrls,
	isReferenceAssetKindOrExtension,
	groupReferenceAssetUrlsByKind,
	groupReferenceAssetsByKind,
	hasReferenceAssetUrl,
	inferReferenceAssetKind,
	isReferenceAssetSlotFilled,
	summarizeReferenceAssetUrlsByKind,
	summarizeReferenceAssetUrlsByKindOrExtensionFromReadyAssets,
	summarizeReferenceAssetUrlsByKindFromReadyAssets,
} from "./referenceAssetUtils";
export type {
	ReferenceAssetKind,
	ReferenceAssetWithUrl,
} from "./referenceAssetUtils";

export function isPublicHttpUrl(value: string) {
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
		if (host.startsWith("192.168.") || host.startsWith("10.")) return false;
		const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
		return !private172;
	} catch {
		return false;
	}
}

function blobToDataUrl(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("无法读取 base64 数据"));
		reader.onerror = () => reject(reader.error ?? new Error("无法读取 base64 数据"));
		reader.readAsDataURL(blob);
	});
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("无法生成 PNG 图片"));
			}
		}, "image/png");
	});
}

export function parseAspectRatio(value?: string) {
	const match = value?.trim().match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
	if (!match) return null;
	const width = Number.parseFloat(match[1]);
	const height = Number.parseFloat(match[2]);
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return null;
	}
	return width / height;
}

async function normalizeBlobToPngDataUrl(blob: Blob, maxSide = 1536, targetAspectRatio?: string) {
	const bitmap = await createImageBitmap(blob);
	try {
		const targetRatio = parseAspectRatio(targetAspectRatio);
		const width = targetRatio
			? Math.max(1, Math.round(targetRatio >= 1 ? maxSide : maxSide * targetRatio))
			: Math.max(1, Math.round(bitmap.width * Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))));
		const height = targetRatio
			? Math.max(1, Math.round(targetRatio >= 1 ? maxSide / targetRatio : maxSide))
			: Math.max(1, Math.round(bitmap.height * Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("无法创建图片处理画布");
		if (targetRatio) {
			context.fillStyle = "#000";
			context.fillRect(0, 0, width, height);
			const scale = Math.max(width / bitmap.width, height / bitmap.height);
			const drawWidth = Math.round(bitmap.width * scale);
			const drawHeight = Math.round(bitmap.height * scale);
			context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
		} else {
			context.drawImage(bitmap, 0, 0, width, height);
		}
		return blobToDataUrl(await canvasToPngBlob(canvas));
	} finally {
		bitmap.close();
	}
}

export async function resolvePortableImageInput(asset: ReferenceAsset, targetAspectRatio?: string) {
	const image = asset.url.trim();
	if (isPublicHttpUrl(image)) return image;
	if (image.startsWith("data:image/")) return image;
	const response = await fetch(image);
	if (!response.ok) {
		throw new Error(`读取参考图 ${asset.name || "image"} 失败：${response.status}`);
	}
	const blob = await response.blob();
	if (!blob.type.toLowerCase().startsWith("image/")) {
		try {
			const bitmap = await createImageBitmap(blob);
			bitmap.close();
		} catch {
			throw new Error(`参考图 ${asset.name || "image"} 不是可用图片`);
		}
	}
	return normalizeBlobToPngDataUrl(blob, 1536, targetAspectRatio);
}

export async function normalizeImageReferenceAssetsForRequest<T extends ReferenceAsset>(
	assets: readonly T[],
	targetAspectRatio?: string,
) {
	return Promise.all(
		assets.map(async (asset) =>
			inferReferenceAssetKind(asset) === "image"
				? {
					...asset,
					url: await resolvePortableImageInput(asset, targetAspectRatio),
				}
				: asset,
		),
	);
}
