import { getReferenceAssetUrl } from "./referenceAssetUtils";
import type { ReferenceAsset } from "./canvas-types";

type RuntimeAssetIdentityInput =
	| Partial<Pick<ReferenceAsset, "cloudPath" | "storageKey" | "storageUrl" | "url">>
	| null
	| undefined;

export type RuntimeAssetIdentity = {
	cloudPath?: string;
	storageKey?: string;
	storageUrl?: string;
};

function normalizeOptionalRuntimeField(value: string | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

export function getCloudAssetReadUrl(cloudPath: string) {
	return `/api/assets/read?path=${encodeURIComponent(cloudPath)}`;
}

export function resolveRuntimeCloudPath(
	asset: Pick<ReferenceAsset, "cloudPath"> | null | undefined,
) {
	return normalizeOptionalRuntimeField(asset?.cloudPath);
}

export function resolveRuntimeStorageKey(
	asset: Pick<ReferenceAsset, "storageKey"> | null | undefined,
) {
	return normalizeOptionalRuntimeField(asset?.storageKey);
}

export function resolveRuntimeStorageUrl(
	asset: Partial<Pick<ReferenceAsset, "storageUrl" | "url">> | null | undefined,
) {
	if (!asset) return undefined;
	const storageUrl = asset.storageUrl ? getReferenceAssetUrl({ url: asset.storageUrl }) : "";
	const assetUrl =
		typeof asset.url === "string" ? getReferenceAssetUrl({ url: asset.url }) : "";
	return storageUrl || assetUrl || undefined;
}

export function resolveRuntimeAssetIdentity(
	asset: RuntimeAssetIdentityInput,
): RuntimeAssetIdentity {
	return {
		cloudPath: resolveRuntimeCloudPath(asset),
		storageKey: resolveRuntimeStorageKey(asset),
		storageUrl: asset ? resolveRuntimeStorageUrl(asset) : undefined,
	};
}
