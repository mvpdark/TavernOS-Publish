import type { CanvasWorkspaceStorage } from "./appCanvasState";
import type { TapViewportStorage } from "./appLegacyStorageMigration";
import {
	areRouteProjectIdsEqual,
	findProjectByRouteId,
	getRouteRecordValue,
	normalizeRouteProjectId,
	omitRouteRecordKey,
	upsertProjectByRouteId,
	updateProjectByRouteId,
	type AppRoute,
} from "./appRouting";
import {
	cloneWorkspaceSnapshot,
	serializeWorkspaceSnapshot,
	type CanvasWorkspaceSnapshot,
} from "./appWorkspaceDefaults";
import {
	CANVAS_LIBRARY_SEED,
	LEGACY_CANVAS_ID,
	STORAGE_KEYS,
	WORKSHOP_LIBRARY,
	createCanvasProjectEntry,
	createWorkshopProjectEntry,
	formatProjectCount,
	normalizeProjectLibraryForState,
	persistStorageJson,
	readStorageJson,
	type ProjectEntry,
} from "./canvasPersistence";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";
import type { CanvasNode } from "./canvas-types";

type CanvasCreationRoute = Extract<AppRoute, { page: "canvas-workspace" }>;
type WorkshopCreationRoute = Extract<AppRoute, { page: "workshop-workspace" }>;

export type CanvasViewport = { x: number; y: number; zoom: number };
const INITIAL_CANVAS_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };
const DEFAULT_CANVAS_WORKSPACE_STORAGE: CanvasWorkspaceStorage = {
	workspaces: {},
	version: 1,
};
const DEFAULT_CANVAS_VIEWPORT_STORAGE: TapViewportStorage = {
	state: { viewports: {} },
	version: 0,
};

export function getDefaultCanvasWorkspaceStorage(): CanvasWorkspaceStorage {
	return {
		workspaces: {},
		version: DEFAULT_CANVAS_WORKSPACE_STORAGE.version,
	};
}

export function getDefaultCanvasViewportStorage(): TapViewportStorage {
	return {
		state: { viewports: {} },
		version: DEFAULT_CANVAS_VIEWPORT_STORAGE.version,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeStorageVersion(value: unknown, fallback: number) {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isCanvasWorkspaceSnapshot(
	value: unknown,
): value is CanvasWorkspaceSnapshot {
	if (!isRecord(value)) return false;
	if (!Array.isArray(value.nodes)) return false;
	return value.connections === undefined || Array.isArray(value.connections);
}

function normalizeCanvasWorkspaceRecord(value: unknown) {
	if (!isRecord(value)) return {};
	const workspaces: CanvasWorkspaceStorage["workspaces"] = {};
	for (const [projectId, snapshot] of Object.entries(value)) {
		const normalizedProjectId = normalizeRouteProjectId(projectId);
		if (
			!normalizedProjectId ||
			workspaces[normalizedProjectId] ||
			!isCanvasWorkspaceSnapshot(snapshot)
		) {
			continue;
		}
		workspaces[normalizedProjectId] = {
			nodes: snapshot.nodes,
			connections: snapshot.connections ?? [],
		};
	}
	return workspaces;
}

function normalizeCanvasViewport(value: unknown): CanvasViewport | null {
	if (!isRecord(value)) return null;
	const { x, y, zoom } = value;
	if (
		typeof x !== "number" ||
		typeof y !== "number" ||
		typeof zoom !== "number" ||
		!Number.isFinite(x) ||
		!Number.isFinite(y) ||
		!Number.isFinite(zoom)
	) {
		return null;
	}
	return { x, y, zoom };
}

function normalizeCanvasViewportRecord(value: unknown) {
	if (!isRecord(value)) return {};
	const viewports: NonNullable<
		NonNullable<TapViewportStorage["state"]>["viewports"]
	> = {};
	for (const [projectId, viewport] of Object.entries(value)) {
		const normalizedProjectId = normalizeRouteProjectId(projectId);
		const normalizedViewport = normalizeCanvasViewport(viewport);
		if (!normalizedProjectId || viewports[normalizedProjectId] || !normalizedViewport) {
			continue;
		}
		viewports[normalizedProjectId] = normalizedViewport;
	}
	return viewports;
}

export function normalizeCanvasWorkspaceStorage(
	value: unknown,
): CanvasWorkspaceStorage {
	if (!isRecord(value)) return getDefaultCanvasWorkspaceStorage();
	return {
		workspaces: normalizeCanvasWorkspaceRecord(value.workspaces),
		version: normalizeStorageVersion(
			value.version,
			DEFAULT_CANVAS_WORKSPACE_STORAGE.version ?? 1,
		),
	};
}

export function normalizeCanvasViewportStorage(
	value: unknown,
): TapViewportStorage {
	if (!isRecord(value)) return getDefaultCanvasViewportStorage();
	const state = isRecord(value.state) ? value.state : {};
	return {
		state: {
			viewports: normalizeCanvasViewportRecord(state.viewports),
		},
		version: normalizeStorageVersion(
			value.version,
			DEFAULT_CANVAS_VIEWPORT_STORAGE.version ?? 0,
		),
	};
}

export function readCanvasWorkspaceStorage() {
	return normalizeCanvasWorkspaceStorage(
		readStorageJson<unknown>(
			STORAGE_KEYS.workspaces,
			getDefaultCanvasWorkspaceStorage(),
		),
	);
}

export function readCanvasViewportStorage() {
	return normalizeCanvasViewportStorage(
		readStorageJson<unknown>(
			STORAGE_KEYS.viewport,
			getDefaultCanvasViewportStorage(),
		),
	);
}

export type CanvasStoragePair = {
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
};

export function readCanvasStoragePair(): CanvasStoragePair {
	return {
		workspaceStorage: readCanvasWorkspaceStorage(),
		viewportStorage: readCanvasViewportStorage(),
	};
}

export function persistCanvasWorkspaceStorage(
	workspaceStorage: CanvasWorkspaceStorage,
) {
	persistStorageJson(
		STORAGE_KEYS.workspaces,
		normalizeCanvasWorkspaceStorage(workspaceStorage),
	);
}

export function persistCanvasViewportStorage(
	viewportStorage: TapViewportStorage,
) {
	persistStorageJson(
		STORAGE_KEYS.viewport,
		normalizeCanvasViewportStorage(viewportStorage),
	);
}

export function persistCanvasStoragePair({
	workspaceStorage,
	viewportStorage,
}: CanvasStoragePair) {
	persistCanvasWorkspaceStorage(workspaceStorage);
	persistCanvasViewportStorage(viewportStorage);
}

export function persistCanvasProjectCreationPersistenceUpdate(
	persistenceUpdate: CanvasProjectCreationPersistenceUpdate,
) {
	persistCanvasStoragePair(persistenceUpdate);
}

export function persistCanvasProjectDeletionPersistenceUpdate(
	persistenceUpdate: CanvasProjectDeletionPersistenceUpdate,
) {
	persistCanvasStoragePair(persistenceUpdate);
}

export function createUniqueProjectRouteId(
	projects: ProjectEntry[],
	preferredId: string,
	reservedProjectIds: Iterable<string> = [],
) {
	const normalizedPreferredId = normalizeRouteProjectId(preferredId);
	if (!normalizedPreferredId) return "";
	const reservedRouteIds = new Set(
		Array.from(reservedProjectIds, (projectId) =>
			normalizeRouteProjectId(projectId),
		).filter(Boolean),
	);
	const isProjectIdAvailable = (projectId: string) =>
		!findProjectByRouteId(projects, projectId) && !reservedRouteIds.has(projectId);
	if (isProjectIdAvailable(normalizedPreferredId)) {
		return normalizedPreferredId;
	}
	let suffix = 2;
	let candidate = `${normalizedPreferredId}-${suffix}`;
	while (!isProjectIdAvailable(candidate)) {
		suffix += 1;
		candidate = `${normalizedPreferredId}-${suffix}`;
	}
	return candidate;
}

function withUniqueProjectId(
	project: ProjectEntry,
	projects: ProjectEntry[],
	reservedProjectIds: Iterable<string> = [],
) {
	const projectId = createUniqueProjectRouteId(
		projects,
		project.id,
		reservedProjectIds,
	);
	return projectId && projectId !== project.id
		? { ...project, id: projectId }
		: project;
}

export type CanvasProjectCreationPlan = {
	project: ProjectEntry;
	snapshot: CanvasWorkspaceSnapshot;
	persistenceUpdate: CanvasProjectCreationPersistenceUpdate;
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
	nextRoute: CanvasCreationRoute;
};

export type WorkshopProjectCreationPlan = {
	project: ProjectEntry;
	nextRoute: WorkshopCreationRoute;
};

export type CanvasWorkspacePersistenceUpdate = {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
};

export type CanvasProjectDeletionPersistenceUpdate = {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
};

export type CanvasProjectCreationPersistenceUpdate = {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
};

export type CanvasWorkspaceSavePlan = {
	workspaceSnapshot: CanvasWorkspaceSnapshot;
	persistableSnapshot: CanvasWorkspaceSnapshot;
	persistenceUpdate: CanvasWorkspacePersistenceUpdate;
	serverProjectId: string;
	serverProjectTitle: string;
};

export type CanvasWorkspaceAutosavePlan = CanvasWorkspaceSavePlan;

export type CanvasViewportAutosavePlan = {
	viewportStorage: TapViewportStorage;
};

export type CanvasProjectNodeCountSyncPlan = {
	projectId: string;
	projects: ProjectEntry[];
};

export function resolveCanvasWorkspaceServerIdentity({
	projectId,
	projectTitle,
}: {
	projectId: string | null | undefined;
	projectTitle?: string;
}) {
	const normalizedProjectId = normalizeRouteProjectId(projectId) || "canvas";
	const normalizedProjectTitle = projectTitle?.trim() || normalizedProjectId;
	return {
		projectId: normalizedProjectId,
		projectTitle: normalizedProjectTitle,
	};
}

export function resolveCanvasWorkspaceSnapshotForHydration({
	snapshotCache,
	serverSnapshot,
	workspaceStorage,
	projectId,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	serverSnapshot?: CanvasWorkspaceSnapshot | null;
	workspaceStorage: CanvasWorkspaceStorage;
	projectId: string;
}): CanvasWorkspaceSnapshot | null {
	return (
		getRouteRecordValue(snapshotCache, projectId) ??
		serverSnapshot ??
		getRouteRecordValue(workspaceStorage.workspaces, projectId) ??
		null
	);
}

export function resolveCanvasViewportForProject(args: {
	viewportStorage: TapViewportStorage;
	projectId: string | null | undefined;
	legacyProjectId?: string | null;
	fallbackViewport: CanvasViewport;
}): CanvasViewport;
export function resolveCanvasViewportForProject(args: {
	viewportStorage: TapViewportStorage;
	projectId: string | null | undefined;
	legacyProjectId?: string | null;
	fallbackViewport?: undefined;
}): CanvasViewport | undefined;
export function resolveCanvasViewportForProject({
	viewportStorage,
	projectId,
	legacyProjectId = LEGACY_CANVAS_ID,
	fallbackViewport,
}: {
	viewportStorage: TapViewportStorage;
	projectId: string | null | undefined;
	legacyProjectId?: string | null;
	fallbackViewport?: CanvasViewport;
}): CanvasViewport | undefined {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	return (
		(normalizedProjectId
			? getRouteRecordValue(viewportStorage.state?.viewports, normalizedProjectId)
			: undefined) ??
		(legacyProjectId
			? viewportStorage.state?.viewports?.[legacyProjectId]
			: undefined) ??
		fallbackViewport
	);
}

export function buildProjectLibraryAfterCreation(
	projects: ProjectEntry[],
	project: ProjectEntry,
	fallbackLibrary?: ProjectEntry[],
) {
	const nextProjects = upsertProjectByRouteId(projects, project);
	return fallbackLibrary
		? normalizeProjectLibraryForState(nextProjects, fallbackLibrary)
		: nextProjects;
}

export function buildCanvasProjectLibraryAfterCreation(
	projects: ProjectEntry[],
	project: ProjectEntry,
) {
	return buildProjectLibraryAfterCreation(projects, project, CANVAS_LIBRARY_SEED);
}

export function buildWorkshopProjectLibraryAfterCreation(
	projects: ProjectEntry[],
	project: ProjectEntry,
) {
	return buildProjectLibraryAfterCreation(projects, project, WORKSHOP_LIBRARY);
}

export function buildCanvasProjectLibraryAfterNodeCountChange({
	projects,
	projectId,
	nodeCount,
}: {
	projects: ProjectEntry[];
	projectId: string | null | undefined;
	nodeCount: number;
}) {
	return (
		buildCanvasProjectNodeCountSyncPlan({
			projects,
			projectId,
			nodeCount,
		})?.projects ?? projects
	);
}

export function buildCanvasProjectNodeCountSyncPlan({
	projects,
	projectId,
	nodeCount,
}: {
	projects: ProjectEntry[];
	projectId: string | null | undefined;
	nodeCount: number;
}): CanvasProjectNodeCountSyncPlan | null {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (!normalizedProjectId) return null;
	const nextProjects = updateProjectByRouteId(projects, projectId ?? "", (project) => {
		const nextCount = formatProjectCount(nodeCount, project.count);
		const nextProjectId = normalizeRouteProjectId(project.id);
		return project.count !== nextCount || project.id !== nextProjectId
			? { ...project, id: nextProjectId, count: nextCount }
			: project;
	});
	const normalizedProjects =
		nextProjects === projects
			? projects
			: normalizeProjectLibraryForState(nextProjects, CANVAS_LIBRARY_SEED);
	if (normalizedProjects === projects) return null;
	return {
		projectId: normalizedProjectId,
		projects: normalizedProjects,
	};
}

export function buildCanvasWorkspaceStorageWithSnapshot({
	workspaceStorage,
	projectId,
	snapshot,
}: {
	workspaceStorage: CanvasWorkspaceStorage;
	projectId: string;
	snapshot: CanvasWorkspaceSnapshot;
}): CanvasWorkspaceStorage {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	const workspaces = normalizedProjectId
		? omitRouteRecordKey(workspaceStorage.workspaces, normalizedProjectId)
		: { ...(workspaceStorage.workspaces ?? {}) };
	if (normalizedProjectId) {
		workspaces[normalizedProjectId] = snapshot;
	}
	return {
		...workspaceStorage,
		workspaces,
		version: workspaceStorage.version ?? 1,
	};
}

export function buildCanvasViewportStorageWithViewport({
	viewportStorage,
	projectId,
	viewport = INITIAL_CANVAS_VIEWPORT,
}: {
	viewportStorage: TapViewportStorage;
	projectId: string;
	viewport?: CanvasViewport;
}): TapViewportStorage {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	const viewports = normalizedProjectId
		? omitRouteRecordKey(viewportStorage.state?.viewports, normalizedProjectId)
		: { ...(viewportStorage.state?.viewports ?? {}) };
	if (normalizedProjectId) {
		viewports[normalizedProjectId] = viewport;
	}
	return {
		...viewportStorage,
		state: {
			...viewportStorage.state,
			viewports,
		},
		version: viewportStorage.version ?? 0,
	};
}

export function buildCanvasViewportAutosavePlan({
	viewportStorage,
	projectId,
	viewport,
}: {
	viewportStorage: TapViewportStorage;
	projectId: string | null | undefined;
	viewport: CanvasViewport;
}): CanvasViewportAutosavePlan | null {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	if (!normalizedProjectId) return null;
	return {
		viewportStorage: buildCanvasViewportStorageWithViewport({
			viewportStorage,
			projectId: normalizedProjectId,
			viewport,
		}),
	};
}

export function buildCanvasWorkspaceStorageAfterDeletion({
	workspaceStorage,
	deletedProjectId,
	fallbackProjectId,
	fallbackSnapshot,
}: {
	workspaceStorage: CanvasWorkspaceStorage;
	deletedProjectId: string;
	fallbackProjectId?: string | null;
	fallbackSnapshot?: CanvasWorkspaceSnapshot | null;
}): CanvasWorkspaceStorage {
	const workspaces = deletedProjectId
		? omitRouteRecordKey(workspaceStorage.workspaces, deletedProjectId)
		: { ...(workspaceStorage.workspaces ?? {}) };
	const normalizedFallbackProjectId = normalizeRouteProjectId(fallbackProjectId);
	if (normalizedFallbackProjectId && fallbackSnapshot) {
		workspaces[normalizedFallbackProjectId] = fallbackSnapshot;
	}
	return {
		...workspaceStorage,
		workspaces,
		version: workspaceStorage.version ?? 1,
	};
}

export function buildCanvasViewportStorageAfterDeletion({
	viewportStorage,
	deletedProjectId,
	fallbackProjectId,
	fallbackViewport = INITIAL_CANVAS_VIEWPORT,
}: {
	viewportStorage: TapViewportStorage;
	deletedProjectId: string;
	fallbackProjectId?: string | null;
	fallbackViewport?: CanvasViewport;
}): TapViewportStorage {
	const viewports = deletedProjectId
		? omitRouteRecordKey(viewportStorage.state?.viewports, deletedProjectId)
		: { ...(viewportStorage.state?.viewports ?? {}) };
	const normalizedFallbackProjectId = normalizeRouteProjectId(fallbackProjectId);
	if (normalizedFallbackProjectId) {
		viewports[normalizedFallbackProjectId] = fallbackViewport;
	}
	return {
		...viewportStorage,
		state: {
			...viewportStorage.state,
			viewports,
		},
		version: viewportStorage.version ?? 0,
	};
}

export function buildCanvasSnapshotCacheWithSnapshot({
	snapshotCache,
	projectId,
	snapshot,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	projectId: string;
	snapshot: CanvasWorkspaceSnapshot;
}): Record<string, CanvasWorkspaceSnapshot> {
	const normalizedProjectId = normalizeRouteProjectId(projectId);
	const snapshots = normalizedProjectId
		? omitRouteRecordKey(snapshotCache, normalizedProjectId)
		: { ...snapshotCache };
	if (normalizedProjectId) {
		snapshots[normalizedProjectId] = snapshot;
	}
	return snapshots;
}

export function buildCanvasSnapshotCacheWithClonedSnapshot({
	snapshotCache,
	projectId,
	snapshot,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	projectId: string;
	snapshot: CanvasWorkspaceSnapshot;
}): Record<string, CanvasWorkspaceSnapshot> {
	return buildCanvasSnapshotCacheWithSnapshot({
		snapshotCache,
		projectId,
		snapshot: cloneWorkspaceSnapshot(snapshot),
	});
}

export function buildCanvasSnapshotCacheForLiveWorkspace({
	snapshotCache,
	projectId,
	nodes,
	connections,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	projectId: string;
	nodes: CanvasNode[];
	connections: NodeConnection[];
}): Record<string, CanvasWorkspaceSnapshot> {
	return buildCanvasSnapshotCacheWithClonedSnapshot({
		snapshotCache,
		projectId,
		snapshot: { nodes, connections },
	});
}

export function buildCanvasWorkspacePersistenceUpdate({
	snapshotCache,
	workspaceStorage,
	projectId,
	workspaceSnapshot,
	persistableSnapshot = workspaceSnapshot,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	projectId: string;
	workspaceSnapshot: CanvasWorkspaceSnapshot;
	persistableSnapshot?: CanvasWorkspaceSnapshot;
}): CanvasWorkspacePersistenceUpdate {
	return {
		snapshotCache: buildCanvasSnapshotCacheWithSnapshot({
			snapshotCache,
			projectId,
			snapshot: workspaceSnapshot,
		}),
		workspaceStorage: buildCanvasWorkspaceStorageWithSnapshot({
			workspaceStorage,
			projectId,
			snapshot: persistableSnapshot,
		}),
	};
}

export function buildCanvasWorkspaceSavePlan({
	snapshotCache,
	workspaceStorage,
	projectId,
	projectTitle,
	nodes,
	connections,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	projectId: string;
	projectTitle?: string;
	nodes: CanvasNode[];
	connections: NodeConnection[];
}): CanvasWorkspaceSavePlan {
	const serverIdentity = resolveCanvasWorkspaceServerIdentity({
		projectId,
		projectTitle,
	});
	const workspaceSnapshot = cloneWorkspaceSnapshot({ nodes, connections });
	const persistableSnapshot = serializeWorkspaceSnapshot(workspaceSnapshot);
	return {
		workspaceSnapshot,
		persistableSnapshot,
		persistenceUpdate: buildCanvasWorkspacePersistenceUpdate({
			snapshotCache,
			workspaceStorage,
			projectId,
			workspaceSnapshot,
			persistableSnapshot,
		}),
		serverProjectId: serverIdentity.projectId,
		serverProjectTitle: serverIdentity.projectTitle,
	};
}

export function buildCanvasWorkspaceAutosavePlan({
	snapshotCache,
	workspaceStorage,
	projectId,
	hydratedProjectId,
	projectTitle,
	nodes,
	connections,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	projectId: string | null;
	hydratedProjectId: string | null;
	projectTitle?: string;
	nodes: CanvasNode[];
	connections: NodeConnection[];
}): CanvasWorkspaceAutosavePlan | null {
	if (!projectId) return null;
	if (!areRouteProjectIdsEqual(hydratedProjectId, projectId)) return null;
	return buildCanvasWorkspaceSavePlan({
		snapshotCache,
		workspaceStorage,
		projectId,
		projectTitle,
		nodes,
		connections,
	});
}

export function buildCanvasSnapshotCacheAfterDeletion({
	snapshotCache,
	deletedProjectId,
	fallbackProjectId,
	fallbackSnapshot,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	deletedProjectId: string;
	fallbackProjectId?: string | null;
	fallbackSnapshot?: CanvasWorkspaceSnapshot | null;
}): Record<string, CanvasWorkspaceSnapshot> {
	const snapshots = deletedProjectId
		? omitRouteRecordKey(snapshotCache, deletedProjectId)
		: { ...snapshotCache };
	const normalizedFallbackProjectId = normalizeRouteProjectId(fallbackProjectId);
	if (normalizedFallbackProjectId && fallbackSnapshot) {
		snapshots[normalizedFallbackProjectId] = fallbackSnapshot;
	}
	return snapshots;
}

export function buildCanvasProjectDeletionPersistenceUpdate({
	snapshotCache,
	workspaceStorage,
	viewportStorage,
	deletedProjectId,
	fallbackProjectId,
	fallbackSnapshot,
	fallbackViewport,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
	deletedProjectId: string;
	fallbackProjectId?: string | null;
	fallbackSnapshot?: CanvasWorkspaceSnapshot | null;
	fallbackViewport?: CanvasViewport;
}): CanvasProjectDeletionPersistenceUpdate {
	return {
		snapshotCache: buildCanvasSnapshotCacheAfterDeletion({
			snapshotCache,
			deletedProjectId,
			fallbackProjectId,
			fallbackSnapshot,
		}),
		workspaceStorage: buildCanvasWorkspaceStorageAfterDeletion({
			workspaceStorage,
			deletedProjectId,
			fallbackProjectId,
			fallbackSnapshot,
		}),
		viewportStorage: buildCanvasViewportStorageAfterDeletion({
			viewportStorage,
			deletedProjectId,
			fallbackProjectId,
			fallbackViewport,
		}),
	};
}

export function buildCanvasProjectCreationPersistenceUpdate({
	snapshotCache,
	workspaceStorage,
	viewportStorage,
	projectId,
	snapshot,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
	projectId: string;
	snapshot: CanvasWorkspaceSnapshot;
}): CanvasProjectCreationPersistenceUpdate {
	return {
		snapshotCache: buildCanvasSnapshotCacheWithSnapshot({
			snapshotCache,
			projectId,
			snapshot,
		}),
		workspaceStorage: buildCanvasWorkspaceStorageWithSnapshot({
			workspaceStorage,
			projectId,
			snapshot,
		}),
		viewportStorage: buildCanvasViewportStorageWithViewport({
			viewportStorage,
			projectId,
		}),
	};
}

export function buildCanvasProjectCreationPlan({
	projectIndex,
	snapshot,
	workspaceStorage,
	viewportStorage,
	snapshotCache = {},
	projects = [],
	date,
}: {
	projectIndex: number;
	snapshot: CanvasWorkspaceSnapshot;
	workspaceStorage: CanvasWorkspaceStorage;
	viewportStorage: TapViewportStorage;
	snapshotCache?: Record<string, CanvasWorkspaceSnapshot>;
	projects?: ProjectEntry[];
	date?: Date;
}): CanvasProjectCreationPlan {
	const reservedProjectIds = [
		...Object.keys(workspaceStorage.workspaces ?? {}),
		...Object.keys(viewportStorage.state?.viewports ?? {}),
	];
	const project = withUniqueProjectId(
		createCanvasProjectEntry(projectIndex, snapshot.nodes.length, date),
		projects,
		reservedProjectIds,
	);
	const persistenceUpdate = buildCanvasProjectCreationPersistenceUpdate({
		snapshotCache,
		workspaceStorage,
		viewportStorage,
		projectId: project.id,
		snapshot,
	});
	return {
		project,
		snapshot,
		persistenceUpdate,
		workspaceStorage: persistenceUpdate.workspaceStorage,
		viewportStorage: persistenceUpdate.viewportStorage,
		nextRoute: { page: "canvas-workspace", projectId: project.id },
	};
}

export function buildWorkshopProjectCreationPlan({
	projectIndex,
	projects = [],
	date,
}: {
	projectIndex: number;
	projects?: ProjectEntry[];
	date?: Date;
}): WorkshopProjectCreationPlan {
	const project = withUniqueProjectId(
		createWorkshopProjectEntry(projectIndex, date),
		projects,
	);
	return {
		project,
		nextRoute: { page: "workshop-workspace", projectId: project.id },
	};
}
