import {
	migrateLegacyStorage,
	type MiniMaxTokenPlanStorage,
	type TapModelPrefsStorage,
	type TapNoticesStorage,
	type TapTutorialTipsStorage,
} from "./appLegacyStorageMigration";
import {
	getRouteRecordValue,
} from "./appRouting";
import type { VoiceCatalogStorage } from "./appVoiceCatalog";
import {
	cloneConnections,
	cloneInitialNodes,
	cloneNodes,
} from "./appWorkspaceDefaults";
import {
	readCanvasViewportStorage,
	readCanvasWorkspaceStorage,
	resolveCanvasViewportForProject,
} from "./appProjectCreationPlanning";
import {
	STORAGE_KEYS,
	getCanvasDefaultProjectId,
	readCanvasLibrary,
	readStorageJson,
	readStorageString,
	readWorkshopLibrary,
	type ProjectEntry,
} from "./canvasPersistence";
import {
	DEFAULT_STYLE_LIBRARY,
	normalizeStyleLibrary,
} from "./styleLibrary";
import type { CanvasNode, StyleLibraryState, ThemeTone } from "./canvas-types";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";

export type AppInitialState = {
	path: string;
	canvasLibrary: ProjectEntry[];
	workshopLibrary: ProjectEntry[];
	canvasProjectId: string;
	viewport: { x: number; y: number; zoom: number } | undefined;
	modelPrefs: TapModelPrefsStorage;
	styleLibrary: StyleLibraryState;
	language: string;
	notices: TapNoticesStorage;
	tips: TapTutorialTipsStorage;
	miniMaxTokenPlan: MiniMaxTokenPlanStorage;
	voiceCatalog: VoiceCatalogStorage;
	nodes: CanvasNode[];
	connections: NodeConnection[];
	themeTone: ThemeTone;
};

const THEME_TONES: ThemeTone[] = ["emerald", "indigo", "black", "cycle"];

function readInitialThemeTone(): ThemeTone {
	const stored = readStorageString(STORAGE_KEYS.theme, "emerald");
	return THEME_TONES.includes(stored as ThemeTone)
		? (stored as ThemeTone)
		: "emerald";
}

export function readAppInitialState(): AppInitialState {
	migrateLegacyStorage();
	// TavernOS uses HashRouter, so window.location.pathname is always "/".
	// Force the initial route to canvas-workspace since the canvas module
	// is now an embedded page within TavernOS, not a standalone app.
	const canvasLibrary = readCanvasLibrary();
	const workshopLibrary = readWorkshopLibrary();
	const canvasProjectId = getCanvasDefaultProjectId(canvasLibrary);
	const viewportStorage = readCanvasViewportStorage();
	const workspaceStorage = readCanvasWorkspaceStorage();
	const viewport = resolveCanvasViewportForProject({
		viewportStorage,
		projectId: canvasProjectId,
	});
	const modelPrefs = readStorageJson<TapModelPrefsStorage>(
		STORAGE_KEYS.modelPrefs,
		{},
	);
	const styleLibrary = normalizeStyleLibrary(
		readStorageJson<StyleLibraryState>(
			STORAGE_KEYS.styles,
			DEFAULT_STYLE_LIBRARY,
		),
	);
	const language = readStorageString(STORAGE_KEYS.language, "zh-CN");
	const notices = readStorageJson<TapNoticesStorage>(STORAGE_KEYS.notices, {});
	const tips = readStorageJson<TapTutorialTipsStorage>(STORAGE_KEYS.tips, {
		state: { tips: {} },
		version: 0,
	});
	const miniMaxTokenPlan = readStorageJson<MiniMaxTokenPlanStorage>(
		STORAGE_KEYS.minimaxTokenPlan,
		{},
	);
	const voiceCatalog = readStorageJson<VoiceCatalogStorage>(
		STORAGE_KEYS.voiceCatalog,
		{},
	);
	const workspaceSnapshot = getRouteRecordValue(
		workspaceStorage.workspaces,
		canvasProjectId,
	);

	return {
		path: `/canvas/${encodeURIComponent(canvasProjectId)}`,
		canvasLibrary,
		workshopLibrary,
		canvasProjectId,
		viewport,
		modelPrefs,
		styleLibrary,
		language,
		notices,
		tips,
		miniMaxTokenPlan,
		voiceCatalog,
		nodes: cloneNodes(workspaceSnapshot?.nodes ?? cloneInitialNodes()),
		connections: cloneConnections(workspaceSnapshot?.connections ?? []),
		themeTone: readInitialThemeTone(),
	};
}
