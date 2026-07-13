import { cloneComposer } from "./canvasNodeActions";
import { resolveImageComposerPreset } from "./imageModelCapabilities";
import { countReferenceAssets } from "./referenceAssetUtils";
import type { NodeAsset } from "./appCanvasState";
import type { CanvasNode, ComposerPreset, NodeType } from "./canvas-types";
import {
	getAutoVideoMode,
	resolveVideoComposerPreset,
} from "./videoModelCapabilities";

const REFERENCE_ASSET_NODE_TYPES = new Set<NodeType>([
	"image",
	"video",
	"editor",
	"music",
]);

export function canNodeAcceptReferenceAsset(node: CanvasNode) {
	return REFERENCE_ASSET_NODE_TYPES.has(node.type);
}

export function applyReferenceAssetToNodeComposer(
	node: CanvasNode,
	composerByType: Record<NodeType, ComposerPreset>,
	referenceSlot: number,
	asset: NodeAsset,
): CanvasNode {
	const nextComposer = node.composer
		? cloneComposer(node.composer)
		: cloneComposer(composerByType[node.type]);
	const referenceAssets = [...(nextComposer.referenceAssets ?? [])];
	referenceAssets[referenceSlot] = asset;
	const nextReferenceCount = countReferenceAssets(referenceAssets);

	if (node.type === "video") {
		const videoGenerationMode = getAutoVideoMode(
			nextComposer.model,
			nextReferenceCount,
			nextComposer,
		);
		return {
			...node,
			composer: {
				...nextComposer,
				...resolveVideoComposerPreset(nextComposer.model, {
					...nextComposer,
					videoGenerationMode,
				}),
				referenceAssets,
			},
		};
	}

	if (node.type === "image" || node.type === "editor") {
		return {
			...node,
			composer: {
				...nextComposer,
				...resolveImageComposerPreset(
					nextComposer.model,
					nextComposer,
					nextReferenceCount,
				),
				referenceAssets,
			},
		};
	}

	return {
		...node,
		composer: {
			...nextComposer,
			referenceAssets,
		},
	};
}
