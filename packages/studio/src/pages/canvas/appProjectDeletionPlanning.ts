import type { AppRoute } from "./appRouting";
import {
	filterProjectsExceptRouteId,
	findProjectByRouteId,
	normalizeRouteProjectId,
} from "./appRouting";
import {
	CANVAS_LIBRARY_SEED,
	WORKSHOP_LIBRARY,
	getCanvasDefaultProjectId,
	normalizeProjectLibraryForState,
	type ProjectEntry,
} from "./canvasPersistence";

type CanvasWorkspaceRoute = Extract<AppRoute, { page: "canvas-workspace" }>;
type WorkshopDeletionRoute = Extract<
	AppRoute,
	{ page: "workshop-workspace" } | { page: "workshop-browser" }
>;

export type CanvasProjectDeletionPlan = {
	targetProject: ProjectEntry | null;
	targetProjectId: string;
	nextProjects: ProjectEntry[];
	fallbackProject: ProjectEntry | null;
	nextRoute: CanvasWorkspaceRoute | null;
};

export type WorkshopProjectDeletionPlan = {
	targetProject: ProjectEntry | null;
	targetProjectId: string;
	nextProjects: ProjectEntry[];
	nextRoute: WorkshopDeletionRoute | null;
};

export function buildCanvasProjectLibraryAfterDeletion(
	projects: ProjectEntry[],
) {
	return normalizeProjectLibraryForState(projects, CANVAS_LIBRARY_SEED);
}

export function buildWorkshopProjectLibraryAfterDeletion(
	projects: ProjectEntry[],
) {
	return normalizeProjectLibraryForState(projects, WORKSHOP_LIBRARY);
}

export function buildCanvasProjectDeletionPlan({
	projects,
	canvasId,
	currentCanvasProjectId,
	createFallbackProject,
}: {
	projects: ProjectEntry[];
	canvasId: string;
	currentCanvasProjectId: string | null;
	createFallbackProject: () => ProjectEntry;
}): CanvasProjectDeletionPlan {
	const requestedProjectId = normalizeRouteProjectId(canvasId);
	const targetProject = findProjectByRouteId(projects, requestedProjectId);
	const targetProjectId = targetProject
		? normalizeRouteProjectId(targetProject.id)
		: "";
	const nextProjectsWithoutFallback = targetProject
		? filterProjectsExceptRouteId(projects, targetProjectId)
		: projects;
	const fallbackProject =
		targetProject && nextProjectsWithoutFallback.length === 0
			? createFallbackProject()
			: null;
	const nextProjects = targetProject
		? buildCanvasProjectLibraryAfterDeletion(
				fallbackProject ? [fallbackProject] : nextProjectsWithoutFallback,
			)
		: projects;
	const shouldNavigate =
		Boolean(targetProject) &&
		normalizeRouteProjectId(currentCanvasProjectId) === targetProjectId;
	const nextProjectId = getCanvasDefaultProjectId(nextProjects);
	return {
		targetProject,
		targetProjectId,
		nextProjects,
		fallbackProject,
		nextRoute: shouldNavigate
			? { page: "canvas-workspace", projectId: nextProjectId }
			: null,
	};
}

export function buildWorkshopProjectDeletionPlan({
	projects,
	workshopId,
	currentWorkshopProjectId,
}: {
	projects: ProjectEntry[];
	workshopId: string;
	currentWorkshopProjectId: string | null;
}): WorkshopProjectDeletionPlan {
	const requestedProjectId = normalizeRouteProjectId(workshopId);
	const targetProject = findProjectByRouteId(projects, requestedProjectId);
	const targetProjectId = targetProject
		? normalizeRouteProjectId(targetProject.id)
		: "";
	const nextProjects = targetProject
		? buildWorkshopProjectLibraryAfterDeletion(
				filterProjectsExceptRouteId(projects, targetProjectId),
			)
		: projects;
	const shouldNavigate =
		Boolean(targetProject) &&
		normalizeRouteProjectId(currentWorkshopProjectId) === targetProjectId;
	const nextProject = nextProjects[0] ?? null;
	return {
		targetProject,
		targetProjectId,
		nextProjects,
		nextRoute: shouldNavigate
			? nextProject
				? { page: "workshop-workspace", projectId: nextProject.id }
				: { page: "workshop-browser" }
			: null,
	};
}
