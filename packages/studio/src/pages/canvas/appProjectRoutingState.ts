import {
	type AppRoute,
	parseAppRoute,
	resolveProjectRoute,
	routeToView,
} from "./appRouting";
import {
	getCanvasDefaultProjectId,
	getWorkshopDefaultProjectId,
	type ProjectEntry,
} from "./canvasPersistence";
import type { AppView } from "./canvas-types";

export type AppProjectRoutingState = {
	route: AppRoute;
	defaultCanvasProjectId: string;
	defaultWorkshopProjectId: string;
	canvasProjectId: string | null;
	workshopProjectId: string | null;
	currentCanvasProject: ProjectEntry | null;
	currentWorkshopProject: ProjectEntry | null;
	appView: AppView;
};

export type AppProjectNodeCountSyncTarget = {
	projectId: string;
	nodeCount: number;
};

export function resolveAppProjectRoutingState({
	pathname,
	canvasLibrary,
	workshopLibrary,
}: {
	pathname: string;
	canvasLibrary: ProjectEntry[];
	workshopLibrary: ProjectEntry[];
}): AppProjectRoutingState {
	const route = parseAppRoute(pathname);
	const defaultCanvasProjectId = getCanvasDefaultProjectId(canvasLibrary);
	const defaultWorkshopProjectId = getWorkshopDefaultProjectId(workshopLibrary);
	const canvasRouteResolution =
		route.page === "canvas-workspace"
			? resolveProjectRoute(canvasLibrary, route.projectId, defaultCanvasProjectId)
			: null;
	const workshopRouteResolution =
		route.page === "workshop-workspace"
			? resolveProjectRoute(
					workshopLibrary,
					route.projectId,
					defaultWorkshopProjectId,
				)
			: null;

	return {
		route,
		defaultCanvasProjectId,
		defaultWorkshopProjectId,
		canvasProjectId: canvasRouteResolution?.projectId ?? null,
		workshopProjectId: workshopRouteResolution?.projectId ?? null,
		currentCanvasProject: canvasRouteResolution?.project ?? null,
		currentWorkshopProject: workshopRouteResolution?.project ?? null,
		appView: routeToView(route),
	};
}

export function resolveAppProjectNodeCountSyncTarget({
	routingState,
	nodesLength,
}: {
	routingState: Pick<AppProjectRoutingState, "canvasProjectId">;
	nodesLength: number;
}): AppProjectNodeCountSyncTarget | null {
	if (!routingState.canvasProjectId) return null;
	return {
		projectId: routingState.canvasProjectId,
		nodeCount: nodesLength,
	};
}
