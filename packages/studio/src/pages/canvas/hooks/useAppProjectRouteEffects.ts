import type { Dispatch, SetStateAction } from "react";

import {
	resolveAppProjectNodeCountSyncTarget,
	type AppProjectRoutingState,
} from "../appProjectRoutingState";
import type { ProjectEntry } from "../canvasPersistence";
import { useCanvasProjectNodeCountSync } from "./useCanvasProjectNodeCountSync";
import { useProjectLibraryStorageEffects } from "./useProjectLibraryStorageEffects";
import { useProjectRouteNormalization } from "./useProjectRouteNormalization";

export type UseAppProjectRouteEffectsConfig = {
	routingState: AppProjectRoutingState;
	pathname: string;
	canvasLibrary: ProjectEntry[];
	workshopLibrary: ProjectEntry[];
	nodesLength: number;
	setCanvasLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setWorkshopLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setPathname: Dispatch<SetStateAction<string>>;
};

export function useAppProjectRouteEffects({
	routingState,
	pathname,
	canvasLibrary,
	workshopLibrary,
	nodesLength,
	setCanvasLibrary,
	setWorkshopLibrary,
	setPathname,
}: UseAppProjectRouteEffectsConfig) {
	const { route, canvasProjectId, workshopProjectId } = routingState;
	const nodeCountSyncTarget = resolveAppProjectNodeCountSyncTarget({
		routingState,
		nodesLength,
	});

	useProjectLibraryStorageEffects({
		canvasLibrary,
		workshopLibrary,
		setCanvasLibrary,
		setWorkshopLibrary,
	});
	useCanvasProjectNodeCountSync({
		canvasProjectId: nodeCountSyncTarget?.projectId ?? null,
		nodesLength: nodeCountSyncTarget?.nodeCount ?? nodesLength,
		setCanvasLibrary,
	});

	useProjectRouteNormalization({
		route,
		pathname,
		canvasProjectId,
		workshopProjectId,
		setPathname,
	});
}
