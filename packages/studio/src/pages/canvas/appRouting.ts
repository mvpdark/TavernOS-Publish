import type { AppView } from "./canvas-types";
import type { ProjectEntry } from "./canvasPersistence";

export type AppRoute =
	| { page: "landing" }
	| { page: "canvas-browser" }
	| { page: "canvas-workspace"; projectId: string }
	| { page: "workshop-browser" }
	| { page: "workshop-workspace"; projectId: string }
	| { page: "settings" };

function decodeRouteSegment(segment: string) {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

export function normalizeRouteProjectId(value: unknown) {
	return typeof value === "string"
		? decodeRouteSegment(value).trim().toLowerCase()
		: "";
}

export function areRouteProjectIdsEqual(left: unknown, right: unknown) {
	const normalizedLeft = normalizeRouteProjectId(left);
	const normalizedRight = normalizeRouteProjectId(right);
	return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
}

export function parseAppRoute(pathname: string): AppRoute {
	const segments = pathname
		.split("/")
		.map((segment) => decodeRouteSegment(segment).trim().toLowerCase())
		.filter(Boolean);
	const [section, projectId] = segments;
	if (!section) return { page: "landing" };
	if (section === "canvas") {
		return projectId
			? { page: "canvas-workspace", projectId }
			: { page: "canvas-browser" };
	}
	if (section === "workshop") {
		return projectId
			? { page: "workshop-workspace", projectId }
			: { page: "workshop-browser" };
	}
	if (section === "settings") return { page: "settings" };
	return { page: "landing" };
}

export function routeToPath(route: AppRoute) {
	if (route.page === "landing") return "/";
	if (route.page === "canvas-browser") return "/canvas";
	if (route.page === "canvas-workspace") {
		const projectId = normalizeRouteProjectId(route.projectId);
		return projectId ? `/canvas/${encodeURIComponent(projectId)}` : "/canvas";
	}
	if (route.page === "workshop-browser") return "/workshop";
	if (route.page === "workshop-workspace") {
		const projectId = normalizeRouteProjectId(route.projectId);
		return projectId ? `/workshop/${encodeURIComponent(projectId)}` : "/workshop";
	}
	return "/settings";
}

export function resolveProjectId(
	projects: ProjectEntry[],
	projectId: string,
	fallbackId: string,
) {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (
		normalizedProjectId &&
		projects.some(
			(project) => normalizeRouteProjectId(project.id) === normalizedProjectId,
		)
	) {
		return normalizedProjectId;
	}
	return normalizeRouteProjectId(fallbackId);
}

export type ProjectRouteResolution = {
	projectId: string | null;
	project: ProjectEntry | null;
	isFallback: boolean;
};

export type ProjectRouteNormalizationPlan = {
	nextPath: string;
};

export function findProjectByRouteId(projects: ProjectEntry[], projectId: string) {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (!normalizedProjectId) return null;
	return (
		projects.find(
			(project) => normalizeRouteProjectId(project.id) === normalizedProjectId,
		) ?? null
	);
}

export function filterProjectsExceptRouteId(
	projects: ProjectEntry[],
	projectId: string,
) {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (!normalizedProjectId) return projects;
	return projects.filter(
		(project) => normalizeRouteProjectId(project.id) !== normalizedProjectId,
	);
}

export function appendProjectIfMissing(
	projects: ProjectEntry[],
	project: ProjectEntry,
) {
	return findProjectByRouteId(projects, project.id)
		? projects
		: [...projects, project];
}

export function upsertProjectByRouteId(
	projects: ProjectEntry[],
	project: ProjectEntry,
	routeId = project.id,
) {
	const normalizedProjectId = normalizeRouteProjectId(project.id);
	const normalizedRouteId = normalizeRouteProjectId(routeId) || normalizedProjectId;
	if (!normalizedProjectId || !normalizedRouteId) return projects;
	const nextProject =
		project.id === normalizedProjectId
			? project
			: { ...project, id: normalizedProjectId };
	let changed = false;
	let matched = false;
	const nextProjects = projects.map((currentProject) => {
		if (normalizeRouteProjectId(currentProject.id) !== normalizedRouteId) {
			return currentProject;
		}
		matched = true;
		if (currentProject === nextProject) return currentProject;
		changed = true;
		return nextProject;
	});
	if (matched) return changed ? nextProjects : projects;
	return [...projects, nextProject];
}

export function updateProjectByRouteId(
	projects: ProjectEntry[],
	projectId: string,
	update: (project: ProjectEntry) => ProjectEntry,
) {
	const project = findProjectByRouteId(projects, projectId);
	if (!project) return projects;
	const nextProject = update(project);
	if (nextProject === project) return projects;
	return upsertProjectByRouteId(projects, nextProject, projectId);
}

export function findRouteRecordEntry<T>(
	record: Record<string, T> | null | undefined,
	projectId: string,
): [string, T] | null {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (!record || !normalizedProjectId) return null;
	return (
		Object.entries(record).find(
			([key]) => normalizeRouteProjectId(key) === normalizedProjectId,
		) ?? null
	);
}

export function getRouteRecordValue<T>(
	record: Record<string, T> | null | undefined,
	projectId: string,
): T | undefined {
	return findRouteRecordEntry(record, projectId)?.[1];
}

export function omitRouteRecordKey<T>(
	record: Record<string, T> | null | undefined,
	projectId: string,
) {
	const nextRecord = { ...(record ?? {}) };
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (!normalizedProjectId) return nextRecord;
	for (const key of Object.keys(nextRecord)) {
		if (normalizeRouteProjectId(key) === normalizedProjectId) {
			delete nextRecord[key];
		}
	}
	return nextRecord;
}

export function resolveProjectRoute(
	projects: ProjectEntry[],
	projectId: string,
	fallbackId: string,
): ProjectRouteResolution {
	const requestedProject = findProjectByRouteId(projects, projectId);
	if (requestedProject) {
		return {
			projectId: normalizeRouteProjectId(requestedProject.id),
			project: requestedProject,
			isFallback: false,
		};
	}

	const fallbackProject =
		findProjectByRouteId(projects, fallbackId) ?? projects[0] ?? null;
	return {
		projectId: fallbackProject
			? normalizeRouteProjectId(fallbackProject.id)
			: null,
		project: fallbackProject,
		isFallback: true,
	};
}

export function buildProjectRouteNormalizationPlan({
	route,
	pathname,
	canvasProjectId,
	workshopProjectId,
}: {
	route: AppRoute;
	pathname: string;
	canvasProjectId?: string | null;
	workshopProjectId?: string | null;
}): ProjectRouteNormalizationPlan | null {
	let nextPath: string | null = null;
	if (route.page === "canvas-workspace" && canvasProjectId) {
		nextPath = routeToPath({
			page: "canvas-workspace",
			projectId: canvasProjectId,
		});
	}
	if (route.page === "workshop-workspace") {
		nextPath = workshopProjectId
			? routeToPath({
					page: "workshop-workspace",
					projectId: workshopProjectId,
				})
			: "/workshop";
	}
	if (!nextPath || pathname === nextPath) return null;
	return { nextPath };
}

export function routeToView(route: AppRoute): AppView {
	if (route.page === "landing") return "landing";
	if (route.page === "canvas-browser") return "canvas-browser";
	if (route.page === "canvas-workspace") return "canvas";
	if (route.page === "workshop-browser") return "workshop-browser";
	if (route.page === "workshop-workspace") return "workshop";
	return "settings";
}
