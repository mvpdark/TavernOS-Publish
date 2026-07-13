import {
	normalizeAssetRenameResponse,
	normalizeCloudAssetUploadResult,
	type AssetRenameResponse,
	type CloudAssetUploadResult,
} from "./appServerApi";
import { pathLikeExt } from "./appAssetRuntime";
import { getUploadAssetCategory } from "./canvasAssetActions";
import { getReferenceAssetUrl } from "./referenceAssetUtils";
import type { AssetRef, NodeType } from "./canvas-types";

export const ASSET_LIBRARY_SPACE_NAME = "资产";
export const DEFAULT_ASSET_LIBRARY_COLLECTION_NAME = "默认资产集";

function normalizeLibraryText(value: string | null | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

export type ReadableNodeAssetForLibrary<T extends Pick<AssetRef, "url"> = AssetRef> = {
	asset: T & { url: string };
	url: string;
};

export function resolveReadableNodeAssetForLibrary<T extends Pick<AssetRef, "url">>(
	asset: T | null | undefined,
): ReadableNodeAssetForLibrary<T> | null {
	if (!asset) return null;
	const url = getReferenceAssetUrl(asset);
	if (!url) return null;
	return {
		asset: { ...asset, url },
		url,
	};
}

export function requireReadableNodeAssetForLibrary<T extends Pick<AssetRef, "url">>(
	asset: T | null | undefined,
): ReadableNodeAssetForLibrary<T> {
	const readableAsset = resolveReadableNodeAssetForLibrary(asset);
	if (!readableAsset) {
		throw new Error("Asset library source asset URL is empty.");
	}
	return readableAsset;
}

export function resolveAssetLibraryCollectionName(
	canvasProjectTitle?: string,
	workshopProjectTitle?: string,
) {
	return (
		normalizeLibraryText(canvasProjectTitle) ??
		normalizeLibraryText(workshopProjectTitle) ??
		DEFAULT_ASSET_LIBRARY_COLLECTION_NAME
	);
}

export function createNodeAssetLibraryFile(
	readableAsset: ReadableNodeAssetForLibrary<AssetRef>,
	blob: Blob,
) {
	const mime = blob.type || readableAsset.asset.mime || "application/octet-stream";
	const name = normalizeLibraryText(readableAsset.asset.name) ?? "asset.bin";
	return new File([blob], name, { type: mime });
}

export function isAssetSavedToLibrary(asset: Pick<AssetRef, "cloudPath"> | null | undefined) {
	const cloudPath = resolveNodeAssetLibraryCloudPath(asset);
	return Boolean(cloudPath?.startsWith("/115/"));
}

export function resolveNodeAssetLibraryCloudPath(
	asset: Pick<AssetRef, "cloudPath"> | null | undefined,
) {
	const cloudPath = asset?.cloudPath?.trim();
	return cloudPath || undefined;
}

export function getNodeAssetLibraryCategory(
	nodeType: NodeType,
	file: Pick<File, "name" | "type">,
) {
	return getUploadAssetCategory(nodeType, file);
}

export function normalizeNodeAssetLibraryUploadResult(uploaded: CloudAssetUploadResult) {
	return normalizeCloudAssetUploadResult(uploaded, "Asset library upload");
}

export function buildSavedLibraryAsset(
	currentAsset: AssetRef,
	file: Pick<File, "name" | "type">,
	uploaded: CloudAssetUploadResult,
): AssetRef {
	const normalizedUpload = normalizeNodeAssetLibraryUploadResult(uploaded);
	return {
		...currentAsset,
		name: normalizeLibraryText(file.name) ?? normalizeLibraryText(currentAsset.name) ?? "asset.bin",
		mime: normalizeLibraryText(file.type) ?? currentAsset.mime,
		url: normalizedUpload.url,
		cloudPath: normalizedUpload.cloudPath,
		storageUrl: undefined,
		storageKey: undefined,
	};
}

export function buildRenamedNodeAsset(
	currentAsset: AssetRef,
	requestedBaseName: string,
	renamed?: AssetRenameResponse | null,
): AssetRef {
	const normalizedBaseName = normalizeLibraryText(requestedBaseName);
	if (!normalizedBaseName) {
		throw new Error("Asset rename name is empty.");
	}
	if (renamed) {
		const normalizedRename = normalizeAssetRenameResponse(renamed);
		return {
			...currentAsset,
			name: normalizedRename.name,
			cloudPath: normalizedRename.cloudPath,
			url: normalizedRename.url,
		};
	}
	const currentName = normalizeLibraryText(currentAsset.name) ?? currentAsset.name;
	return {
		...currentAsset,
		name: `${normalizedBaseName}${pathLikeExt(currentName)}`,
	};
}
