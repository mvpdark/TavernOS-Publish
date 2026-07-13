import { COMPOSER_PRESETS, INITIAL_NODES } from "./appComposerPresets";
import { NODE_MODELS } from "./appNodeModelConfig";
import {
	hydrateWorkspaceSnapshot as hydrateWorkspaceSnapshotWithOptions,
} from "./appRuntimeHydration";
import { getVideoModelCredits } from "./appVideoModelHelpers";
import {
	cloneInitialWorkspaceNodes,
	cloneWorkspaceConnections,
	cloneWorkspaceNodes,
	cloneWorkspaceSnapshot as cloneWorkspaceSnapshotWithOptions,
	serializeWorkspaceSnapshot as serializeWorkspaceSnapshotWithOptions,
	type CanvasWorkspaceSnapshot,
	type WorkspaceSnapshotOptions,
} from "./appWorkspaceSnapshot";
import type { CanvasNode } from "./canvas-types";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";

export type { CanvasWorkspaceSnapshot };

export const WORKSPACE_SNAPSHOT_OPTIONS: WorkspaceSnapshotOptions = {
	composerPresets: COMPOSER_PRESETS,
	nodeModels: NODE_MODELS,
	getVideoModelCredits,
};

export function cloneNodes(snapshot: CanvasNode[]) {
	return cloneWorkspaceNodes(snapshot, WORKSPACE_SNAPSHOT_OPTIONS);
}

export function cloneConnections(snapshot: NodeConnection[]) {
	return cloneWorkspaceConnections(snapshot);
}

export function cloneInitialNodes() {
	return cloneInitialWorkspaceNodes(INITIAL_NODES, WORKSPACE_SNAPSHOT_OPTIONS);
}

export function cloneWorkspaceSnapshot(
	snapshot: CanvasWorkspaceSnapshot,
): CanvasWorkspaceSnapshot {
	return cloneWorkspaceSnapshotWithOptions(snapshot, WORKSPACE_SNAPSHOT_OPTIONS);
}

export function serializeWorkspaceSnapshot(
	snapshot: CanvasWorkspaceSnapshot,
): CanvasWorkspaceSnapshot {
	return serializeWorkspaceSnapshotWithOptions(snapshot, WORKSPACE_SNAPSHOT_OPTIONS);
}

export function hydrateWorkspaceSnapshot(
	snapshot: CanvasWorkspaceSnapshot,
): Promise<CanvasWorkspaceSnapshot> {
	return hydrateWorkspaceSnapshotWithOptions(snapshot, WORKSPACE_SNAPSHOT_OPTIONS);
}
