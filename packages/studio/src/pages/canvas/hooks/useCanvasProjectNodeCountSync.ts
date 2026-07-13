import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import { buildCanvasProjectNodeCountSyncPlan } from "../appProjectCreationPlanning";
import type { ProjectEntry } from "../canvasPersistence";

export type UseCanvasProjectNodeCountSyncConfig = {
	canvasProjectId: string | null;
	nodesLength: number;
	setCanvasLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
};

export function useCanvasProjectNodeCountSync({
	canvasProjectId,
	nodesLength,
	setCanvasLibrary,
}: UseCanvasProjectNodeCountSyncConfig) {
	useEffect(() => {
		if (!canvasProjectId) return;
		setCanvasLibrary((current) => {
			const syncPlan = buildCanvasProjectNodeCountSyncPlan({
				projects: current,
				projectId: canvasProjectId,
				nodeCount: nodesLength,
			});
			return syncPlan?.projects ?? current;
		});
	}, [canvasProjectId, nodesLength, setCanvasLibrary]);
}
