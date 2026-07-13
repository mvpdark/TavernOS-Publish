import type { CanvasWorkspaceStorage } from "./appCanvasState";
import type { TapViewportStorage } from "./appLegacyStorageMigration";
import {
	buildCanvasViewportAutosavePlan,
	buildCanvasWorkspaceAutosavePlan,
	persistCanvasViewportStorage,
	persistCanvasWorkspaceStorage,
	readCanvasViewportStorage,
	readCanvasWorkspaceStorage,
	type CanvasViewport,
} from "./appProjectCreationPlanning";
import type { CanvasWorkspaceSnapshot } from "./appWorkspaceDefaults";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";
import type { CanvasNode } from "./canvas-types";

export type CanvasViewportStorageEffectPlan = {
	storageValue: TapViewportStorage;
};

export type CanvasWorkspaceStorageEffectPlan = {
	storageValue: CanvasWorkspaceStorage;
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	serverProjectId: string;
	serverProjectTitle: string;
	persistableSnapshot: CanvasWorkspaceSnapshot;
};

export type CanvasWorkspaceServerSaveRequest = {
	projectId: string;
	projectTitle: string;
	snapshot: CanvasWorkspaceSnapshot;
};

export type CanvasWorkspaceStorageEffectCommit = {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	serverSaveRequest: CanvasWorkspaceServerSaveRequest;
};

export function buildCanvasViewportStorageEffectPlan({
	viewportStorage,
	projectId,
	viewport,
}: {
	viewportStorage: TapViewportStorage;
	projectId: string | null | undefined;
	viewport: CanvasViewport;
}): CanvasViewportStorageEffectPlan | null {
	const viewportPlan = buildCanvasViewportAutosavePlan({
		viewportStorage,
		projectId,
		viewport,
	});
	if (!viewportPlan) return null;
	return {
		storageValue: viewportPlan.viewportStorage,
	};
}

export function persistCanvasViewportStorageEffect({
	projectId,
	viewport,
}: {
	projectId: string | null | undefined;
	viewport: CanvasViewport;
}): CanvasViewportStorageEffectPlan | null {
	return persistCanvasViewportStorageEffectPlan(
		buildCanvasViewportStorageEffectPlan({
			viewportStorage: readCanvasViewportStorage(),
			projectId,
			viewport,
		}),
	);
}

export function buildCanvasWorkspaceStorageEffectPlan({
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
}): CanvasWorkspaceStorageEffectPlan | null {
	const savePlan = buildCanvasWorkspaceAutosavePlan({
		snapshotCache,
		workspaceStorage,
		projectId,
		hydratedProjectId,
		projectTitle,
		nodes,
		connections,
	});
	if (!savePlan) return null;
	return {
		storageValue: savePlan.persistenceUpdate.workspaceStorage,
		snapshotCache: savePlan.persistenceUpdate.snapshotCache,
		serverProjectId: savePlan.serverProjectId,
		serverProjectTitle: savePlan.serverProjectTitle,
		persistableSnapshot: savePlan.persistableSnapshot,
	};
}

export function persistCanvasWorkspaceStorageEffect({
	snapshotCache,
	projectId,
	hydratedProjectId,
	projectTitle,
	nodes,
	connections,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	projectId: string | null;
	hydratedProjectId: string | null;
	projectTitle?: string;
	nodes: CanvasNode[];
	connections: NodeConnection[];
}): CanvasWorkspaceStorageEffectPlan | null {
	return persistCanvasWorkspaceStorageEffectPlan(
		buildCanvasWorkspaceStorageEffectPlan({
			snapshotCache,
			workspaceStorage: readCanvasWorkspaceStorage(),
			projectId,
			hydratedProjectId,
			projectTitle,
			nodes,
			connections,
		}),
	);
}

export function commitCanvasWorkspaceStorageEffect({
	snapshotCache,
	projectId,
	hydratedProjectId,
	projectTitle,
	nodes,
	connections,
}: {
	snapshotCache: Record<string, CanvasWorkspaceSnapshot>;
	projectId: string | null;
	hydratedProjectId: string | null;
	projectTitle?: string;
	nodes: CanvasNode[];
	connections: NodeConnection[];
}): CanvasWorkspaceStorageEffectCommit | null {
	return commitCanvasWorkspaceStorageEffectPlan(
		buildCanvasWorkspaceStorageEffectPlan({
			snapshotCache,
			workspaceStorage: readCanvasWorkspaceStorage(),
			projectId,
			hydratedProjectId,
			projectTitle,
			nodes,
			connections,
		}),
	);
}

function persistCanvasStorageEffectPlan<TStorage, TPlan extends { storageValue: TStorage }>(
	storagePlan: TPlan | null,
	persistStorageValue: (storageValue: TStorage) => void,
): TPlan | null {
	if (!storagePlan) return null;
	persistStorageValue(storagePlan.storageValue);
	return storagePlan;
}

export function persistCanvasViewportStorageEffectPlan(
	storagePlan: CanvasViewportStorageEffectPlan | null,
): CanvasViewportStorageEffectPlan | null {
	return persistCanvasStorageEffectPlan(
		storagePlan,
		persistCanvasViewportStorage,
	);
}

export function persistCanvasWorkspaceStorageEffectPlan(
	storagePlan: CanvasWorkspaceStorageEffectPlan | null,
): CanvasWorkspaceStorageEffectPlan | null {
	return persistCanvasStorageEffectPlan(
		storagePlan,
		persistCanvasWorkspaceStorage,
	);
}

export function getCanvasWorkspaceServerSaveRequest(
	storagePlan: CanvasWorkspaceStorageEffectPlan,
): CanvasWorkspaceServerSaveRequest {
	return {
		projectId: storagePlan.serverProjectId,
		projectTitle: storagePlan.serverProjectTitle,
		snapshot: storagePlan.persistableSnapshot,
	};
}

export function commitCanvasWorkspaceStorageEffectPlan(
	storagePlan: CanvasWorkspaceStorageEffectPlan | null,
): CanvasWorkspaceStorageEffectCommit | null {
	const persistedPlan = persistCanvasWorkspaceStorageEffectPlan(storagePlan);
	if (!persistedPlan) return null;
	return {
		snapshotCache: persistedPlan.snapshotCache,
		serverSaveRequest: getCanvasWorkspaceServerSaveRequest(persistedPlan),
	};
}
