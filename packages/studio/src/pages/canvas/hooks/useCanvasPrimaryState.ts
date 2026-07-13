import { useMemo } from "react";

import { COMPOSER_PRESETS } from "../appComposerPresets";
import { NODE_MODELS } from "../appNodeModelConfig";
import type { KakaUpstreamModelType } from "../kakaApi";
import { buildModelOptionCatalog, getModelDisplayLabel } from "../modelOptions";
import { derivePrimaryComposerState } from "../primaryComposerHelpers";
import {
	derivePrimaryNodeState,
	getPrimaryReferenceAssets,
	getPrimaryVideoRequestReferenceAssets,
	getShotLinkedNodes,
	getShotSourceNode,
	getTextNodeImageGenerationTarget,
	getTextNodePromptPrefix,
} from "../primaryNodeHelpers";
import { createStyleRef, getStyleLabel } from "../styleLibrary";
import type { CanvasNode, ComposerPreset, NodeType, StyleLibraryState } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

export type UseCanvasPrimaryStateConfig = {
	selectedIds: string[];
	nodes: CanvasNode[];
	activeTool: NodeType;
	composerByType: Record<NodeType, ComposerPreset>;
	connections: NodeConnection[];
	styleLibrary: StyleLibraryState;
	upstreamModelOptions: Record<KakaUpstreamModelType, string[]>;
	isLoadingUpstreamModels: boolean;
	didUpstreamModelFetchFailByType: Record<KakaUpstreamModelType, boolean>;
};

export function useCanvasPrimaryState({
	selectedIds,
	nodes,
	activeTool,
	composerByType,
	connections,
	styleLibrary,
	upstreamModelOptions,
	isLoadingUpstreamModels,
	didUpstreamModelFetchFailByType,
}: UseCanvasPrimaryStateConfig) {
	const {
		selectedIdSet,
		nodeById,
		selectedNodes,
		primaryNode,
		primaryType,
		composer,
	} = useMemo(
		() =>
			derivePrimaryNodeState(selectedIds, nodes, activeTool, composerByType),
		[activeTool, composerByType, nodes, selectedIds],
	);
	const promptPrefix = useMemo(
		() => getTextNodePromptPrefix(primaryNode, connections, nodeById),
		[connections, nodeById, primaryNode],
	);
	const primaryReferenceAssets = useMemo(
		() => getPrimaryReferenceAssets(primaryNode, connections, nodeById),
		[connections, nodeById, primaryNode],
	);
	const primaryComposerState = useMemo(
		() =>
			derivePrimaryComposerState({
				primaryType,
				composer,
				primaryReferenceAssets,
				nodeModels: NODE_MODELS,
				upstreamModelOptions,
				isLoadingUpstreamModels,
				didUpstreamModelFetchFail:
					primaryType === "text" ||
					primaryType === "image" ||
					primaryType === "video" ||
					primaryType === "audio" ||
					primaryType === "music"
						? didUpstreamModelFetchFailByType[primaryType]
						: false,
				composerByType: COMPOSER_PRESETS,
			}),
		[
			composer,
			didUpstreamModelFetchFailByType,
			isLoadingUpstreamModels,
			primaryReferenceAssets,
			primaryType,
			upstreamModelOptions,
		],
	);
	const {
		primaryVideoModelCapability,
		primaryImageModelCapability,
		recommendedPrimaryVideoMode,
		effectivePrimaryReferenceAssets,
		canAddPrimaryReferenceAsset,
		primaryModelOptions,
		compatiblePrimaryModel,
	} = primaryComposerState;
	const imageGenerationTargetNode = useMemo(() => {
		const textImageTargetNode = getTextNodeImageGenerationTarget(
			primaryNode,
			connections,
			nodeById,
		);
		if (textImageTargetNode) return textImageTargetNode;
		if (
			!primaryNode ||
			(primaryNode.type !== "image" && primaryNode.type !== "editor") ||
			!primaryNode.asset?.url
		) {
			return primaryNode;
		}
		const downstreamEmptyImageNode = connections
			.map((connection) =>
				connection.from.nodeId === primaryNode.id
					? nodeById.get(connection.to.nodeId)
					: null,
			)
			.find(
				(node): node is CanvasNode =>
					Boolean(
						node &&
							(node.type === "image" || node.type === "editor") &&
							!node.asset?.url,
					),
			);
		return downstreamEmptyImageNode ?? primaryNode;
	}, [connections, nodeById, primaryNode]);
	const requestNode = imageGenerationTargetNode ?? primaryNode;
	const requestType = requestNode?.type ?? primaryType;
	const requestComposer = useMemo(() => {
		const baseComposer =
			requestNode?.composer ?? composerByType[requestType] ?? composer;
		if (
			requestNode &&
			primaryNode?.type === "text" &&
			requestNode.id !== primaryNode.id
		) {
			return { ...baseComposer, prompt: composer.prompt };
		}
		if (
			requestNode &&
			primaryNode &&
			requestNode.id !== primaryNode.id &&
			!baseComposer.prompt?.trim()
		) {
			return { ...baseComposer, prompt: composer.prompt };
		}
		return baseComposer;
	}, [composer, composerByType, primaryNode, requestNode, requestType]);
	const requestReferenceAssets = useMemo(
		() =>
			requestNode?.type === "video"
				? getPrimaryVideoRequestReferenceAssets(requestNode, connections, nodeById)
				: getPrimaryReferenceAssets(requestNode, connections, nodeById),
		[connections, nodeById, requestNode],
	);
	const modelOptionCatalog = useMemo(() => {
		const shouldUseStrictPrimaryModels =
			primaryType === "image" || primaryType === "editor";
		const catalogSourceModels = shouldUseStrictPrimaryModels
			? primaryModelOptions
			: [
					...primaryModelOptions,
					...(NODE_MODELS[primaryType] ?? []),
					composer.model,
					compatiblePrimaryModel,
				];
		return buildModelOptionCatalog(primaryType, catalogSourceModels);
	}, [compatiblePrimaryModel, composer.model, primaryModelOptions, primaryType]);
	const primaryModelDisplayName = useMemo(
		() => getModelDisplayLabel(composer.model).trim(),
		[composer.model],
	);
	const resolvedComposerGatewayLabel = useMemo(() => {
		if (!primaryModelDisplayName) return composer.model;
		return (
			modelOptionCatalog.preferredRawLabelByModel[primaryModelDisplayName] ??
			primaryModelDisplayName
		);
	}, [
		composer.model,
		modelOptionCatalog.preferredRawLabelByModel,
		primaryModelDisplayName,
	]);
	const primaryStyle =
		primaryNode?.style ?? createStyleRef(undefined, "auto", styleLibrary);
	const primaryStyleLabel = useMemo(
		() => getStyleLabel(styleLibrary, primaryNode?.style ?? null),
		[primaryNode?.style, styleLibrary],
	);
	const primaryReferenceCount = useMemo(() => {
		if (!primaryNode) return 0;
		return connections.filter(
			(connection) =>
				connection.from.nodeId === primaryNode.id ||
				connection.to.nodeId === primaryNode.id,
		).length;
	}, [connections, primaryNode]);
	const primaryShotSourceNode = useMemo(
		() => getShotSourceNode(primaryNode, connections, nodeById),
		[connections, nodeById, primaryNode],
	);
	const primaryShotLinked = useMemo(
		() => getShotLinkedNodes(primaryNode, connections, nodeById),
		[connections, nodeById, primaryNode],
	);

	return {
		selectedIdSet,
		nodeById,
		selectedNodes,
		primaryNode,
		primaryType,
		composer,
		promptPrefix,
		primaryReferenceAssets,
		primaryVideoModelCapability,
		primaryImageModelCapability,
		recommendedPrimaryVideoMode,
		effectivePrimaryReferenceAssets,
		canAddPrimaryReferenceAsset,
		primaryModelOptions,
		compatiblePrimaryModel,
		imageGenerationTargetNode,
		requestNode,
		requestType,
		requestComposer,
		requestReferenceAssets,
		modelOptionCatalog,
		primaryModelDisplayName,
		modelOptions: modelOptionCatalog.modelNames,
		resolvedComposerGatewayLabel,
		primaryStyle,
		primaryStyleLabel,
		primaryReferenceCount,
		primaryShotSourceNode,
		primaryShotLinked,
	};
}
