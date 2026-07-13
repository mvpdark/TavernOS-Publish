import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
	buildCanvasProjectDeletionPlan,
	buildWorkshopProjectDeletionPlan,
} from "../appProjectDeletionPlanning";
import {
	buildCanvasProjectLibraryAfterCreation,
	buildCanvasProjectDeletionPersistenceUpdate,
	buildCanvasProjectCreationPlan,
	buildWorkshopProjectLibraryAfterCreation,
	buildWorkshopProjectCreationPlan,
	persistCanvasProjectCreationPersistenceUpdate,
	persistCanvasProjectDeletionPersistenceUpdate,
	readCanvasStoragePair,
} from "../appProjectCreationPlanning";
import {
	buildCanvasProjectCreatedNotice,
	buildCanvasProjectDeletedNotice,
	buildWorkshopProjectCreatedNotice,
	buildWorkshopProjectDeletedNotice,
} from "../appProjectPersistenceNotices";
import type { CanvasWorkspaceSnapshot } from "../appWorkspaceDefaults";
import { createCanvasProjectEntry, type ProjectEntry } from "../canvasPersistence";
import type { CanvasNode } from "../canvas-types";
import type { RuntimeNotice } from "./useRuntimeNotices";

type CanvasPersistenceRoute =
	| { page: "canvas-workspace"; projectId: string }
	| { page: "workshop-workspace"; projectId: string }
	| { page: "workshop-browser" };

type UseCanvasPersistenceArgs = {
	canvasLibrary: ProjectEntry[];
	workshopLibrary: ProjectEntry[];
	canvasProjectId: string | null;
	workshopProjectId: string | null;
	canvasSnapshotsRef: { current: Record<string, CanvasWorkspaceSnapshot> };
	cloneInitialNodes: () => CanvasNode[];
	deleteCanvasFromServer: (canvasProjectId: string) => Promise<void>;
	dismissOverlays: () => void;
	navigate: (route: CanvasPersistenceRoute) => void;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	setCanvasLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setWorkshopLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setIsCanvasLibraryOpen: Dispatch<SetStateAction<boolean>>;
	setIsHiddenSettingsOpen: Dispatch<SetStateAction<boolean>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export function useCanvasPersistence({
	canvasLibrary,
	workshopLibrary,
	canvasProjectId,
	workshopProjectId,
	canvasSnapshotsRef,
	cloneInitialNodes,
	deleteCanvasFromServer,
	dismissOverlays,
	navigate,
	pushRuntimeNotice,
	setCanvasLibrary,
	setWorkshopLibrary,
	setIsCanvasLibraryOpen,
	setIsHiddenSettingsOpen,
	setSelectedIds,
}: UseCanvasPersistenceArgs) {
	const handleCreateCanvas = useCallback(() => {
		const snapshot = { nodes: cloneInitialNodes(), connections: [] };
		const { workspaceStorage, viewportStorage } = readCanvasStoragePair();
		const creationPlan = buildCanvasProjectCreationPlan({
			projectIndex: canvasLibrary.length,
			snapshot,
			workspaceStorage,
			viewportStorage,
			snapshotCache: canvasSnapshotsRef.current,
			projects: canvasLibrary,
		});
		const { project } = creationPlan;
		setCanvasLibrary((current) =>
			buildCanvasProjectLibraryAfterCreation(current, project),
		);
		canvasSnapshotsRef.current = creationPlan.persistenceUpdate.snapshotCache;
		persistCanvasProjectCreationPersistenceUpdate(
			creationPlan.persistenceUpdate,
		);
		setIsCanvasLibraryOpen(false);
		setIsHiddenSettingsOpen(false);
		const notice = buildCanvasProjectCreatedNotice(project);
		pushRuntimeNotice(notice.message, notice.tone, notice.dedupeKey);
		navigate(creationPlan.nextRoute);
	}, [
		canvasLibrary.length,
		canvasSnapshotsRef,
		cloneInitialNodes,
		navigate,
		pushRuntimeNotice,
		setCanvasLibrary,
		setIsCanvasLibraryOpen,
		setIsHiddenSettingsOpen,
	]);

	const handleDeleteCanvas = useCallback(
		(canvasId: string) => {
			const deletionPlan = buildCanvasProjectDeletionPlan({
				projects: canvasLibrary,
				canvasId,
				currentCanvasProjectId: canvasProjectId,
				createFallbackProject: () =>
					createCanvasProjectEntry(0, cloneInitialNodes().length),
			});
			const { targetProjectId, nextProjects, fallbackProject, nextRoute } =
				deletionPlan;
			setCanvasLibrary(nextProjects);
			const fallbackSnapshot = fallbackProject
				? { nodes: cloneInitialNodes(), connections: [] }
				: null;
			const { workspaceStorage, viewportStorage } = readCanvasStoragePair();
			const persistenceUpdate = buildCanvasProjectDeletionPersistenceUpdate({
				snapshotCache: canvasSnapshotsRef.current,
				workspaceStorage,
				viewportStorage,
				deletedProjectId: targetProjectId,
				fallbackProjectId: fallbackProject?.id,
				fallbackSnapshot,
			});
			canvasSnapshotsRef.current = persistenceUpdate.snapshotCache;
			persistCanvasProjectDeletionPersistenceUpdate(persistenceUpdate);
			if (targetProjectId) {
				void deleteCanvasFromServer(targetProjectId).catch((error) => {
					console.warn("Canvas server delete failed.", error);
				});
			}
			if (nextRoute) {
				setSelectedIds([]);
				dismissOverlays();
				navigate(nextRoute);
			}
			setIsCanvasLibraryOpen(false);
			const notice = buildCanvasProjectDeletedNotice({
				targetProjectId,
				canvasId,
			});
			pushRuntimeNotice(notice.message, notice.tone, notice.dedupeKey);
		},
		[
			canvasLibrary,
			canvasProjectId,
			canvasSnapshotsRef,
			cloneInitialNodes,
			deleteCanvasFromServer,
			dismissOverlays,
			navigate,
			pushRuntimeNotice,
			setCanvasLibrary,
			setIsCanvasLibraryOpen,
			setSelectedIds,
		],
	);

	const handleCreateWorkshop = useCallback(() => {
		const creationPlan = buildWorkshopProjectCreationPlan({
			projectIndex: workshopLibrary.length,
			projects: workshopLibrary,
		});
		const { project } = creationPlan;
		setWorkshopLibrary((current) =>
			buildWorkshopProjectLibraryAfterCreation(current, project),
		);
		setIsCanvasLibraryOpen(false);
		setIsHiddenSettingsOpen(false);
		const notice = buildWorkshopProjectCreatedNotice(project);
		pushRuntimeNotice(notice.message, notice.tone, notice.dedupeKey);
		navigate(creationPlan.nextRoute);
	}, [
		navigate,
		pushRuntimeNotice,
		setIsCanvasLibraryOpen,
		setIsHiddenSettingsOpen,
		setWorkshopLibrary,
		workshopLibrary.length,
	]);

	const handleDeleteWorkshop = useCallback(
		(workshopId: string) => {
			const deletionPlan = buildWorkshopProjectDeletionPlan({
				projects: workshopLibrary,
				workshopId,
				currentWorkshopProjectId: workshopProjectId,
			});
			const { targetProject, targetProjectId, nextProjects, nextRoute } =
				deletionPlan;
			setWorkshopLibrary(nextProjects);
			if (nextRoute) {
				navigate(nextRoute);
			}
			const notice = buildWorkshopProjectDeletedNotice({
				targetProject,
				targetProjectId,
				workshopId,
			});
			pushRuntimeNotice(notice.message, notice.tone, notice.dedupeKey);
		},
		[
			navigate,
			pushRuntimeNotice,
			setWorkshopLibrary,
			workshopLibrary,
			workshopProjectId,
		],
	);

	return {
		handleCreateCanvas,
		handleDeleteCanvas,
		handleCreateWorkshop,
		handleDeleteWorkshop,
	};
}
