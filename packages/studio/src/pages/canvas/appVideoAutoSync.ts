import { getVideoModelCredits } from "./appVideoModelHelpers";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";
import { countVideoReferenceAssets } from "./primaryNodeHelpers";
import type { CanvasNode } from "./canvas-types";
import {
	getAutoVideoMode,
	getAutoVideoModel,
	getVideoModelCapability,
	resolveVideoComposerPreset,
} from "./videoModelCapabilities";

export function syncAutoVideoComposerSettings(
	nodes: CanvasNode[],
	connections: NodeConnection[],
) {
	const currentNodeById = new Map(nodes.map((node) => [node.id, node]));
	let changed = false;
	const nextNodes = nodes.map((node) => {
		if (node.type !== "video" || !node.composer) return node;
		const referenceCount = countVideoReferenceAssets(
			node,
			currentNodeById,
			connections,
		);
		const nextModel = getAutoVideoModel(node.composer.model, referenceCount);
		const currentVideoMode = node.composer.videoGenerationMode;
		const nextMode =
			referenceCount === 0 &&
			currentVideoMode &&
			getVideoModelCapability(nextModel, node.composer).modes.some(
				(mode) => mode.id === currentVideoMode,
			)
				? currentVideoMode
				: getAutoVideoMode(nextModel, referenceCount);
		const nextSettings = resolveVideoComposerPreset(nextModel, {
			videoGenerationMode: nextMode,
			videoTier: node.composer.videoTier,
			videoQuality: node.composer.videoQuality,
			videoVersion: node.composer.videoVersion,
			videoFeature: node.composer.videoFeature,
			aspectRatio: node.composer.aspectRatio,
			resolution: node.composer.resolution,
			duration: node.composer.duration,
			seed: node.composer.seed,
		});
		const nextCredits = getVideoModelCredits(nextModel);
		if (
			node.composer.model === nextModel &&
			node.composer.videoGenerationMode === nextSettings.videoGenerationMode &&
			node.composer.videoTier === nextSettings.videoTier &&
			node.composer.videoQuality === nextSettings.videoQuality &&
			node.composer.videoVersion === nextSettings.videoVersion &&
			node.composer.videoFeature === nextSettings.videoFeature &&
			node.composer.aspectRatio === nextSettings.aspectRatio &&
			node.composer.resolution === nextSettings.resolution &&
			node.composer.duration === nextSettings.duration &&
			node.composer.seed === nextSettings.seed &&
			node.composer.credits === nextCredits
		) {
			return node;
		}
		changed = true;
		return {
			...node,
			composer: {
				...node.composer,
				model: nextModel,
				credits: nextCredits,
				...nextSettings,
			},
		};
	});
	return { nodes: nextNodes, changed };
}
