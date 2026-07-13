import { cloneComposer } from "./canvasNodeActions";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";
import {
	resolveImageComposerPreset,
} from "./imageModelCapabilities";
import {
	getModelDisplayLabel,
	resolveModelLabel,
} from "./modelOptions";
import {
	getCloudAssetReadUrl,
	resolveRuntimeAssetIdentity,
} from "./appRuntimeAssetIdentity";
import type { AssetRef, CanvasNode, ComposerPreset, NodeType, ReferenceAsset } from "./canvas-types";
import {
	resolveVideoComposerPreset,
} from "./videoModelCapabilities";

export type CanvasWorkspaceSnapshot = {
	nodes: CanvasNode[];
	connections: NodeConnection[];
};

export type WorkspaceSnapshotOptions = {
	composerPresets: Record<NodeType, ComposerPreset>;
	nodeModels: Record<NodeType, string[]>;
	getVideoModelCredits: (model: string) => string;
};

export function serializeAsset<T extends ReferenceAsset | AssetRef>(asset: T): T {
	const { cloudPath, storageKey, storageUrl } = resolveRuntimeAssetIdentity(asset);
	const serializedAsset = {
		...asset,
		url: cloudPath
			? getCloudAssetReadUrl(cloudPath)
			: storageKey
				? ""
				: (storageUrl ?? ""),
		storageUrl: cloudPath || storageKey ? undefined : storageUrl,
	};
	if (cloudPath || "cloudPath" in asset) {
		serializedAsset.cloudPath = cloudPath;
	}
	if (storageKey || "storageKey" in asset) {
		serializedAsset.storageKey = cloudPath ? undefined : storageKey;
	}
	return serializedAsset;
}

export function serializeComposer(composer: ComposerPreset): ComposerPreset {
	return {
		...composer,
		referenceAssets: composer.referenceAssets?.map((asset) =>
			asset ? serializeAsset(asset) : null,
		),
	};
}

export function sanitizeComposerForAllowedModels(
	type: NodeType,
	composer: ComposerPreset,
	options: WorkspaceSnapshotOptions,
): ComposerPreset {
	const { composerPresets, nodeModels, getVideoModelCredits } = options;
	const baseComposer = cloneComposer(composer);
	if (type === "image" || type === "editor") {
		const fallbackModel = composerPresets[type].model;
		const resolvedModel = resolveModelLabel(type, baseComposer.model);
		const resolvedDisplayName = getModelDisplayLabel(resolvedModel ?? baseComposer.model).trim();
		const isKnownModel = nodeModels[type].some(
			(modelOption) => getModelDisplayLabel(modelOption).trim() === resolvedDisplayName,
		);
		const model = isKnownModel ? (resolvedModel ?? baseComposer.model) : fallbackModel;
		const nextComposer = {
			...composerPresets[type],
			...baseComposer,
			model,
			credits: composerPresets[type].credits,
			meta: composerPresets[type].meta,
		};
		return {
			...nextComposer,
			...resolveImageComposerPreset(
				model,
				nextComposer,
				nextComposer.referenceAssets?.filter(Boolean).length ?? 0,
			),
		};
	}
	if (type === "video") {
		const fallbackModel = composerPresets.video.model;
		const resolvedModel = resolveModelLabel(type, baseComposer.model);
		const resolvedDisplayName = getModelDisplayLabel(resolvedModel ?? baseComposer.model).trim();
		const isKnownModel = nodeModels.video.some(
			(modelOption) => getModelDisplayLabel(modelOption).trim() === resolvedDisplayName,
		);
		const model = isKnownModel ? (resolvedModel ?? baseComposer.model) : fallbackModel;
		const nextComposer = {
			...composerPresets.video,
			...baseComposer,
			model,
			credits: getVideoModelCredits(model),
			meta: composerPresets.video.meta,
		};
		return {
			...nextComposer,
			...resolveVideoComposerPreset(model, nextComposer),
		};
	}
	return {
		...composerPresets[type],
		...baseComposer,
		model: "",
		credits: "",
		meta: composerPresets[type].meta,
	};
}

export function cloneWorkspaceNodes(
	snapshot: CanvasNode[],
	options: WorkspaceSnapshotOptions,
) {
	return snapshot.map((node) => ({
		...node,
		composer: node.composer
			? sanitizeComposerForAllowedModels(node.type, node.composer, options)
			: undefined,
		asset: node.asset ? { ...node.asset } : undefined,
		style: node.style ? { ...node.style } : undefined,
	}));
}

export function cloneWorkspaceConnections(snapshot: NodeConnection[]) {
	return snapshot.map((connection) => ({
		...connection,
		from: { ...connection.from },
		to: { ...connection.to },
	}));
}

export function cloneInitialWorkspaceNodes(
	initialNodes: CanvasNode[],
	options: WorkspaceSnapshotOptions,
) {
	return cloneWorkspaceNodes(initialNodes, options);
}

export function cloneWorkspaceSnapshot(
	snapshot: CanvasWorkspaceSnapshot,
	options: WorkspaceSnapshotOptions,
): CanvasWorkspaceSnapshot {
	return {
		nodes: cloneWorkspaceNodes(snapshot.nodes, options),
		connections: cloneWorkspaceConnections(snapshot.connections),
	};
}

export function serializeWorkspaceSnapshot(
	snapshot: CanvasWorkspaceSnapshot,
	options: WorkspaceSnapshotOptions,
): CanvasWorkspaceSnapshot {
	return {
		nodes: snapshot.nodes.map((node) => {
			const composer = node.composer
				? sanitizeComposerForAllowedModels(node.type, node.composer, options)
				: undefined;
			return {
				...node,
				composer: composer ? serializeComposer(composer) : undefined,
				asset: node.asset ? serializeAsset(node.asset) : undefined,
			};
		}),
		connections: cloneWorkspaceConnections(snapshot.connections),
	};
}
