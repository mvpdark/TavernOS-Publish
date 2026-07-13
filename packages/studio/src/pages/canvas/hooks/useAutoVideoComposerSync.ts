import { useEffect, type Dispatch, type SetStateAction } from "react";

import { syncAutoVideoComposerSettings } from "../appVideoAutoSync";
import type { CanvasNode } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

type UseAutoVideoComposerSyncArgs = {
	nodes: CanvasNode[];
	connections: NodeConnection[];
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
};

export function useAutoVideoComposerSync({
	nodes,
	connections,
	setNodes,
}: UseAutoVideoComposerSyncArgs) {
	useEffect(() => {
		const { nodes: nextNodes, changed } = syncAutoVideoComposerSettings(
			nodes,
			connections,
		);
		if (changed) setNodes(nextNodes);
	}, [connections, nodes, setNodes]);
}
