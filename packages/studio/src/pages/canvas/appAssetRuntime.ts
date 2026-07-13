import type { AssetRef } from "./canvas-types";
import { getReferenceAssetUrl } from "./referenceAssetUtils";
import { canvasToBlob, readBlobAsDataUrl } from "./videoFrameHelpers";

const ASSET_DB_NAME = "kakashow-canvas-assets";
const ASSET_STORE_NAME = "assets";

function openAssetDatabase() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		if (typeof window === "undefined" || !("indexedDB" in window)) {
			reject(new Error("IndexedDB is not available"));
			return;
		}
		const request = window.indexedDB.open(ASSET_DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
				db.createObjectStore(ASSET_STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("Failed to open IndexedDB"));
	});
}

export async function writeStoredAsset(key: string, blob: Blob) {
	const db = await openAssetDatabase();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(ASSET_STORE_NAME, "readwrite");
			const store = transaction.objectStore(ASSET_STORE_NAME);
			const request = store.put(blob, key);
			request.onsuccess = () => resolve();
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to write asset"));
		});
	} finally {
		db.close();
	}
}

export async function readStoredAsset(key: string) {
	const db = await openAssetDatabase();
	try {
		return await new Promise<Blob | null>((resolve, reject) => {
			const transaction = db.transaction(ASSET_STORE_NAME, "readonly");
			const store = transaction.objectStore(ASSET_STORE_NAME);
			const request = store.get(key);
			request.onsuccess = () =>
				resolve(request.result instanceof Blob ? request.result : null);
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to read asset"));
		});
	} finally {
		db.close();
	}
}

export function createStoredAssetKey(file: File) {
	const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "-").slice(-80);
	return `asset-${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
}

export function pathLikeExt(name: string) {
	const match = /(\.[^.]+)$/.exec(name);
	return match?.[1] ?? "";
}

export function getBaseNameWithoutExtension(name: string) {
	const extension = pathLikeExt(name);
	return extension ? name.slice(0, -extension.length) : name;
}

export function readFileAsDataUrl(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("Failed to read file"));
		reader.onerror = () =>
			reject(reader.error ?? new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
		promise.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				window.clearTimeout(timer);
				reject(error);
			},
		);
	});
}

export async function normalizeBlobToPngDataUrl(blob: Blob, maxSide = 1536) {
	const bitmap = await createImageBitmap(blob);
	try {
		const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("无法创建图片转换画布。");
		context.drawImage(bitmap, 0, 0, width, height);
		return readBlobAsDataUrl(await canvasToBlob(canvas, "image/png"));
	} finally {
		bitmap.close();
	}
}

export function isPublicHttpUrl(value: string) {
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
		if (host.startsWith("192.168.") || host.startsWith("10.")) return false;
		return !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
	} catch {
		return false;
	}
}

export function resolveAssetRuntimeUrl(asset: Pick<AssetRef, "url"> | null | undefined) {
	if (!asset) return undefined;
	return getReferenceAssetUrl(asset) || undefined;
}

export function requireAssetRuntimeUrl(
	asset: Pick<AssetRef, "url"> | null | undefined,
	errorLabel: string,
) {
	const url = resolveAssetRuntimeUrl(asset);
	if (!url) throw new Error(`${errorLabel}地址为空。`);
	return url;
}

export async function resolvePortableImageAssetInput(asset: AssetRef) {
	const image = requireAssetRuntimeUrl(asset, `参考图「${asset.name || "image"}」`);
	if (isPublicHttpUrl(image)) return image;
	const response = await fetch(image);
	if (!response.ok) {
		throw new Error(`无法读取参考图「${asset.name || "image"}」：${response.status}`);
	}
	const blob = await response.blob();
	if (!blob.type.toLowerCase().startsWith("image/")) {
		throw new Error(`参考图「${asset.name || "image"}」不是可用图片。`);
	}
	return normalizeBlobToPngDataUrl(blob);
}

export async function resolveClassifierImageAssetInput(asset: AssetRef, maxSide: number) {
	const image = requireAssetRuntimeUrl(asset, `识图参考图「${asset.name || "image"}」`);
	try {
		const response = await fetch(image);
		if (!response.ok) {
			throw new Error(`无法读取识图参考图：${response.status}`);
		}
		const blob = await response.blob();
		if (!blob.type.toLowerCase().startsWith("image/")) {
			throw new Error(`识图参考图「${asset.name || "image"}」不是可用图片。`);
		}
		return normalizeBlobToPngDataUrl(blob, maxSide);
	} catch (error) {
		if (isPublicHttpUrl(image)) return image;
		throw error;
	}
}

export function toSafeCloudCollectionId(value: string) {
	const normalized = String(value || "").trim();
	return (
		(normalized || "asset")
			.replace(/[^a-z0-9._-]+/gi, "-")
			.slice(0, 96) || "asset"
	);
}
