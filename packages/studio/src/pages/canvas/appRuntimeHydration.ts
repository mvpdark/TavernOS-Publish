import { readStoredAsset as defaultReadStoredAsset } from "./appAssetRuntime";
import {
	cloneWorkspaceConnections,
	sanitizeComposerForAllowedModels,
	type CanvasWorkspaceSnapshot,
	type WorkspaceSnapshotOptions,
} from "./appWorkspaceSnapshot";
import {
	getCloudAssetReadUrl,
	resolveRuntimeAssetIdentity,
} from "./appRuntimeAssetIdentity";
import type { AssetRef, ComposerPreset, ReferenceAsset } from "./canvas-types";

export {
	getCloudAssetReadUrl,
	resolveRuntimeAssetIdentity,
	resolveRuntimeCloudPath,
	resolveRuntimeStorageKey,
	resolveRuntimeStorageUrl,
} from "./appRuntimeAssetIdentity";
export type { RuntimeAssetIdentity } from "./appRuntimeAssetIdentity";

export type RuntimeAssetOptions = {
	readStoredAsset?: (key: string) => Promise<Blob | null>;
	createObjectUrl?: (blob: Blob) => string;
	fetchAsset?: (input: string) => Promise<{ blob: () => Promise<Blob> }>;
};

function getRuntimeAssetOptions(options: RuntimeAssetOptions = {}) {
	return {
		readStoredAsset: options.readStoredAsset ?? defaultReadStoredAsset,
		createObjectUrl: options.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob)),
		fetchAsset: options.fetchAsset ?? ((input: string) => fetch(input)),
	};
}

export function shouldHydrateMediaDataUrl(asset: Pick<ReferenceAsset, "mime">) {
	const mime = asset.mime ?? "";
	return mime.startsWith("video/") || mime.startsWith("audio/");
}

export async function createRuntimeAsset<T extends ReferenceAsset | AssetRef>(
	asset: T,
	options?: RuntimeAssetOptions,
): Promise<T> {
	const runtimeOptions = getRuntimeAssetOptions(options);
	const runtimeIdentity = resolveRuntimeAssetIdentity(asset);
	const { cloudPath, storageKey, storageUrl } = runtimeIdentity;
	if (cloudPath) {
		return {
			...asset,
			url: getCloudAssetReadUrl(cloudPath),
			cloudPath,
			storageUrl: undefined,
			storageKey: undefined,
		};
	}
	if (storageKey) {
		try {
			const storedAsset = await runtimeOptions.readStoredAsset(storageKey);
			if (storedAsset) {
				return {
					...asset,
					storageKey,
					url: runtimeOptions.createObjectUrl(storedAsset),
				};
			}
		} catch {
			// Fall through to older data-url based assets.
		}
	}
	if (!storageUrl) {
		return {
			...asset,
			url: "",
			cloudPath: undefined,
			storageUrl: undefined,
			storageKey,
		};
	}
	if (!storageUrl.startsWith("data:")) {
		return { ...asset, url: storageUrl, cloudPath: undefined, storageUrl, storageKey };
	}
	if (shouldHydrateMediaDataUrl(asset)) {
		try {
			const response = await runtimeOptions.fetchAsset(storageUrl);
			const blob = await response.blob();
			return {
				...asset,
				url: runtimeOptions.createObjectUrl(blob),
				cloudPath: undefined,
				storageUrl,
				storageKey,
			};
		} catch {
			return {
				...asset,
				url: storageUrl,
				cloudPath: undefined,
				storageUrl,
				storageKey,
			};
		}
	}
	return {
		...asset,
		url: storageUrl,
		cloudPath: undefined,
		storageUrl,
		storageKey,
	};
}

export async function hydrateComposer(
	composer: ComposerPreset,
	options?: RuntimeAssetOptions,
): Promise<ComposerPreset> {
	const referenceAssets = composer.referenceAssets
		? await Promise.all(
				composer.referenceAssets.map((asset) =>
					asset ? createRuntimeAsset(asset, options) : null,
				),
			)
		: undefined;
	return {
		...composer,
		referenceAssets,
	};
}

export async function hydrateWorkspaceSnapshot(
	snapshot: CanvasWorkspaceSnapshot,
	workspaceOptions: WorkspaceSnapshotOptions,
	runtimeOptions?: RuntimeAssetOptions,
): Promise<CanvasWorkspaceSnapshot> {
	const nodes = await Promise.all(
		snapshot.nodes.map(async (node) => {
			const composer = node.composer
				? await hydrateComposer(node.composer, runtimeOptions)
				: undefined;
			return {
				...node,
				composer: composer
					? sanitizeComposerForAllowedModels(node.type, composer, workspaceOptions)
					: undefined,
				asset: node.asset ? await createRuntimeAsset(node.asset, runtimeOptions) : undefined,
			};
		}),
	);
	return { nodes, connections: cloneWorkspaceConnections(snapshot.connections) };
}
