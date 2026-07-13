import type { ReferenceAsset, ReferenceAssetSlotInputList } from "./canvas-types";

export type ReferenceAssetKind = "image" | "video" | "audio" | "unknown";
export type ReferenceAssetWithUrl<T extends ReferenceAsset = ReferenceAsset> =
	T & { url: string };

const mediaReferenceAssetKinds = ["image", "video", "audio"] as const;

type MediaReferenceAssetKind = typeof mediaReferenceAssetKinds[number];

type ReferenceAssetUrlSummary<
	Kind extends string,
> = {
	all: string[];
	byKind: Record<Kind, string[]>;
	first: Record<Kind, string | undefined>;
	has: Record<Kind, boolean>;
};

const referenceAssetExtensionPatterns: Record<MediaReferenceAssetKind, RegExp> = {
	image: /\.(png|jpg|jpeg|webp|bmp|gif)$/i,
	video: /\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg)$/i,
	audio: /\.(mp3|wav|m4a|aac|ogg|flac)$/i,
};

function getReferenceAssetCleanUrlPath(url: string) {
	return url.trim().toLowerCase().split("#", 1)[0]?.split("?", 1)[0] ?? "";
}

function getReferenceAssetPathCandidates(asset: ReferenceAsset) {
	const url = getReferenceAssetUrl(asset);
	const candidates = [
		getReferenceAssetCleanUrlPath(url),
		asset.name?.trim().toLowerCase() ?? "",
		asset.cloudPath?.trim().toLowerCase() ?? "",
	];
	try {
		const parsedUrl = new URL(url, "http://kaka.local");
		for (const value of parsedUrl.searchParams.values()) {
			candidates.push(value.trim().toLowerCase().split("#", 1)[0] ?? "");
		}
	} catch {
		// URL parsing is best-effort; the raw URL path candidate above still covers simple paths.
	}
	return candidates.filter(Boolean);
}

function createReferenceAssetUrlSummary<Kind extends string>(
	all: string[],
	byKind: Record<Kind, string[]>,
): ReferenceAssetUrlSummary<Kind> {
	const first = Object.fromEntries(
		Object.entries(byKind).map(([kind, urls]) => [kind, (urls as string[])[0]]),
	) as Record<Kind, string | undefined>;
	const has = Object.fromEntries(
		Object.entries(first).map(([kind, url]) => [kind, Boolean(url)]),
	) as Record<Kind, boolean>;
	return { all, byKind, first, has };
}

export function getReferenceAssetUrl(asset: Pick<ReferenceAsset, "url">) {
	return asset.url.trim();
}

export function createReferenceAssetWithUrl<
	T extends ReferenceAsset,
	Overrides extends Partial<ReferenceAsset> = {},
>(
	asset: T,
	overrides: Overrides = {} as Overrides,
): ReferenceAssetWithUrl<T & Overrides> | null {
	const url = getReferenceAssetUrl({ url: overrides.url ?? asset.url });
	if (!url) return null;
	return {
		...asset,
		...overrides,
		url,
	} as ReferenceAssetWithUrl<T & Overrides>;
}

export function inferReferenceAssetKind(asset: ReferenceAsset): ReferenceAssetKind {
	const mime = (asset.mime ?? "").trim().toLowerCase();
	if (mime.startsWith("image/")) return "image";
	if (mime.startsWith("video/")) return "video";
	if (mime.startsWith("audio/")) return "audio";
	const url = getReferenceAssetUrl(asset).toLowerCase();
	if (url.startsWith("data:image/")) return "image";
	if (url.startsWith("data:video/")) return "video";
	if (url.startsWith("data:audio/")) return "audio";
	const pathCandidates = getReferenceAssetPathCandidates(asset);
	if (pathCandidates.some((path) => referenceAssetExtensionPatterns.image.test(path))) return "image";
	if (pathCandidates.some((path) => referenceAssetExtensionPatterns.video.test(path))) return "video";
	if (pathCandidates.some((path) => referenceAssetExtensionPatterns.audio.test(path))) return "audio";
	return "unknown";
}

export function groupReferenceAssetsByKind<T extends ReferenceAsset>(
	assets: readonly T[],
) {
	const groups: Record<ReferenceAssetKind, T[]> = {
		image: [],
		video: [],
		audio: [],
		unknown: [],
	};
	for (const asset of assets) {
		groups[inferReferenceAssetKind(asset)].push(asset);
	}
	return groups;
}

export function hasReferenceAssetUrl<T extends ReferenceAsset>(
	asset: T,
): asset is ReferenceAssetWithUrl<T> {
	return Boolean(getReferenceAssetUrl(asset));
}

export function getReferenceAssetsWithUrls<T extends ReferenceAsset>(
	assets: readonly T[],
): Array<ReferenceAssetWithUrl<T>> {
	return assets
		.map((asset) => createReferenceAssetWithUrl(asset))
		.filter((asset): asset is ReferenceAssetWithUrl<T> => Boolean(asset));
}

export function getReferenceAssetUrls(assets: readonly ReferenceAsset[]) {
	return getReferenceAssetsWithUrls(assets).map((asset) => asset.url);
}

export function getReferenceAssetUrlsFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
) {
	return assets.map((asset) => asset.url);
}

export function getFirstReferenceAssetUrl(assets: readonly ReferenceAsset[]) {
	return getReferenceAssetUrls(assets)[0];
}

export function getFirstReferenceAssetUrlFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
) {
	return getReferenceAssetUrlsFromReadyAssets(assets)[0];
}

export function getFirstReferenceAssetUrlByKindFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
	kind: ReferenceAssetKind,
) {
	return groupReferenceAssetsByKind(assets)
		[kind]
		.map(getReferenceAssetUrl)
		.find(Boolean);
}

export function isReferenceAssetKindOrExtension(
	asset: ReferenceAsset,
	kind: MediaReferenceAssetKind,
) {
	return inferReferenceAssetKind(asset) === kind
		|| getReferenceAssetPathCandidates(asset).some((path) => referenceAssetExtensionPatterns[kind].test(path));
}

export function getReferenceAssetsByKindOrExtensionFromReadyAssets<
	T extends ReferenceAssetWithUrl,
>(
	assets: readonly T[],
	kind: Exclude<ReferenceAssetKind, "unknown">,
) {
	return assets.filter((asset) => isReferenceAssetKindOrExtension(asset, kind));
}

export function getReferenceAssetUrlsByKindOrExtensionFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
	kind: Exclude<ReferenceAssetKind, "unknown">,
) {
	return getReferenceAssetsByKindOrExtensionFromReadyAssets(assets, kind)
		.map((asset) => asset.url);
}

export function getFirstReferenceAssetUrlByKindOrExtensionFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
	kind: Exclude<ReferenceAssetKind, "unknown">,
) {
	return getReferenceAssetUrlsByKindOrExtensionFromReadyAssets(assets, kind)[0];
}

export function getFirstReferenceAssetUrlByKindOrExtension(
	assets: readonly ReferenceAsset[],
	kind: Exclude<ReferenceAssetKind, "unknown">,
) {
	return getFirstReferenceAssetUrlByKindOrExtensionFromReadyAssets(
		getReferenceAssetsWithUrls(assets),
		kind,
	);
}

export function isReferenceAssetSlotFilled<T extends ReferenceAsset>(
	asset: ReferenceAssetSlotInputList<T>[number],
): asset is T {
	return Boolean(asset);
}

export function getFilledReferenceAssets<T extends ReferenceAsset>(
	referenceAssets: ReferenceAssetSlotInputList<T>,
) {
	return referenceAssets.filter(isReferenceAssetSlotFilled);
}

export function countReferenceAssets(
	referenceAssets: ReferenceAssetSlotInputList,
) {
	return getFilledReferenceAssets(referenceAssets).length;
}

export function getUniqueReferenceAssetUrls(assets: readonly ReferenceAsset[]) {
	return Array.from(new Set(getReferenceAssetUrls(assets)));
}

export function getUniqueReferenceAssetUrlsFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
) {
	return Array.from(new Set(getReferenceAssetUrlsFromReadyAssets(assets)));
}

export function groupReferenceAssetUrlsByKind(assets: readonly ReferenceAsset[]) {
	const groups = groupReferenceAssetsByKind(getReferenceAssetsWithUrls(assets));
	return {
		image: groups.image.map((asset) => asset.url),
		video: groups.video.map((asset) => asset.url),
		audio: groups.audio.map((asset) => asset.url),
		unknown: groups.unknown.map((asset) => asset.url),
	};
}

export function groupReferenceAssetUrlsByKindFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
) {
	const groups = groupReferenceAssetsByKind(assets);
	return {
		image: groups.image.map((asset) => asset.url),
		video: groups.video.map((asset) => asset.url),
		audio: groups.audio.map((asset) => asset.url),
		unknown: groups.unknown.map((asset) => asset.url),
	};
}

export function summarizeReferenceAssetUrlsByKind(
	assets: readonly ReferenceAsset[],
) {
	const byKind = groupReferenceAssetUrlsByKind(assets);
	return {
		...createReferenceAssetUrlSummary(
			getReferenceAssetUrls(assets),
			byKind,
		),
	};
}

export function summarizeReferenceAssetUrlsByKindFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
) {
	const byKind = groupReferenceAssetUrlsByKindFromReadyAssets(assets);
	return {
		...createReferenceAssetUrlSummary(
			getReferenceAssetUrlsFromReadyAssets(assets),
			byKind,
		),
	};
}

export function summarizeReferenceAssetUrlsByKindOrExtensionFromReadyAssets(
	assets: readonly ReferenceAssetWithUrl[],
) {
	const byKind = Object.fromEntries(
		mediaReferenceAssetKinds.map((kind) => [
			kind,
			getReferenceAssetUrlsByKindOrExtensionFromReadyAssets(assets, kind),
		]),
	) as Record<MediaReferenceAssetKind, string[]>;
	const mediaUrls = assets
		.filter((asset) =>
			mediaReferenceAssetKinds.some((kind) =>
				isReferenceAssetKindOrExtension(asset, kind),
			),
		)
		.map((asset) => asset.url);
	return createReferenceAssetUrlSummary(
		mediaUrls,
		byKind,
	);
}
