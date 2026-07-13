import type { ProjectEntry } from "./canvasPersistence";

export type ProjectPersistenceNotice = {
	message: string;
	tone: "info";
	dedupeKey: string;
};

export function buildCanvasProjectCreatedNotice(
	project: Pick<ProjectEntry, "id" | "title">,
): ProjectPersistenceNotice {
	return {
		message: `已新建画布「${project.title}」。`,
		tone: "info",
		dedupeKey: `canvas-created-${project.id}`,
	};
}

export function buildCanvasProjectDeletedNotice({
	targetProjectId,
	canvasId,
}: {
	targetProjectId: string;
	canvasId: string;
}): ProjectPersistenceNotice {
	return {
		message: "画布已删除。",
		tone: "info",
		dedupeKey: `canvas-deleted-${targetProjectId || canvasId}`,
	};
}

export function buildWorkshopProjectCreatedNotice(
	project: Pick<ProjectEntry, "id" | "title">,
): ProjectPersistenceNotice {
	return {
		message: `已新建工坊「${project.title}」。`,
		tone: "info",
		dedupeKey: `workshop-created-${project.id}`,
	};
}

export function buildWorkshopProjectDeletedNotice({
	targetProject,
	targetProjectId,
	workshopId,
}: {
	targetProject: Pick<ProjectEntry, "title"> | null;
	targetProjectId: string;
	workshopId: string;
}): ProjectPersistenceNotice {
	return {
		message: targetProject
			? `工坊「${targetProject.title}」已删除。`
			: "工坊已删除。",
		tone: "info",
		dedupeKey: `workshop-deleted-${targetProjectId || workshopId}`,
	};
}
