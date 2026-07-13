import { useMemo } from "react";

import type { VideoFusionPromptState } from "../appCanvasState";
import type { CanvasNode } from "../canvas-types";

export type UseVideoFusionPromptNodesConfig = {
	videoFusionPrompt: VideoFusionPromptState;
	nodeById: Map<string, CanvasNode>;
};

export function useVideoFusionPromptNodes({
	videoFusionPrompt,
	nodeById,
}: UseVideoFusionPromptNodesConfig) {
	return useMemo(() => {
		if (!videoFusionPrompt) {
			return {
				videoFusionSourceNode: null,
				videoFusionTargetNode: null,
			};
		}
		return {
			videoFusionSourceNode:
				nodeById.get(videoFusionPrompt.sourceNodeId) ?? null,
			videoFusionTargetNode:
				nodeById.get(videoFusionPrompt.targetNodeId) ?? null,
		};
	}, [nodeById, videoFusionPrompt]);
}
