import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect } from "react";

import type {
	TapModelPrefsStorage,
	TapNoticesStorage,
	TapTutorialTipsStorage,
} from "../appLegacyStorageMigration";
import { buildPersistedModelPrefs } from "../appModelPrefsPersistence";
import {
	commitCanvasWorkspaceStorageEffect,
	persistCanvasViewportStorageEffect,
} from "../appCanvasStorageEffectPlanning";
import { saveCanvasToServer } from "../appServerApi";
import {
	buildHotkeyNoticeStorage,
	buildMiniMaxTokenPlanStorage,
	buildWorkflowPanelTipStorage,
} from "../appUiPersistence";
import type { CanvasWorkspaceSnapshot } from "../appWorkspaceDefaults";
import {
	STORAGE_KEYS,
	persistStorageJson,
	readStorageJson,
} from "../canvasPersistence";
import { createStyleRef } from "../styleLibrary";
import type {
	CanvasNode,
	ComposerPreset,
	NodeType,
	StyleLibraryState,
	ThemeTone,
} from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";

export type UseAppStorageEffectsConfig = {
	language: string;
	themeTone: ThemeTone;
	styleLibrary: StyleLibraryState;
	canvasProjectId: string | null;
	canvasProjectTitle?: string;
	hydratedCanvasProjectId: string | null;
	pan: { x: number; y: number };
	zoom: number;
	nodes: CanvasNode[];
	connections: NodeConnection[];
	composerByType: Record<NodeType, ComposerPreset>;
	showHotkeyNotice: boolean;
	showConnectionTip: boolean;
	miniMaxTokenPlanRawText: string;
	canvasSnapshotsRef: MutableRefObject<Record<string, CanvasWorkspaceSnapshot>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	pushRuntimeNotice: (message: string, tone?: "info" | "warning", id?: string) => void;
};

export function useAppStorageEffects({
	language,
	themeTone,
	styleLibrary,
	canvasProjectId,
	canvasProjectTitle,
	hydratedCanvasProjectId,
	pan,
	zoom,
	nodes,
	connections,
	composerByType,
	showHotkeyNotice,
	showConnectionTip,
	miniMaxTokenPlanRawText,
	canvasSnapshotsRef,
	setNodes,
	pushRuntimeNotice,
}: UseAppStorageEffectsConfig) {
	useEffect(() => {
		document.documentElement.lang = language;
		window.localStorage.setItem(STORAGE_KEYS.language, language);
	}, [language]);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEYS.theme, themeTone);
	}, [themeTone]);

	useEffect(() => {
		persistStorageJson(STORAGE_KEYS.styles, styleLibrary);
	}, [styleLibrary]);

	useEffect(() => {
		setNodes((current) => {
			let changed = false;
			const nextNodes = current.map((node) => {
				if (node.style) return node;
				changed = true;
				return {
					...node,
					style: createStyleRef(undefined, "auto", styleLibrary),
				};
			});
			return changed ? nextNodes : current;
		});
	}, [setNodes, styleLibrary]);

	useEffect(() => {
		persistCanvasViewportStorageEffect({
			projectId: canvasProjectId,
			viewport: { x: pan.x, y: pan.y, zoom },
		});
	}, [canvasProjectId, pan.x, pan.y, zoom]);

	useEffect(() => {
		const storageCommit = commitCanvasWorkspaceStorageEffect({
			snapshotCache: canvasSnapshotsRef.current,
			projectId: canvasProjectId,
			hydratedProjectId: hydratedCanvasProjectId,
			projectTitle: canvasProjectTitle,
			nodes,
			connections,
		});
		if (!storageCommit) return;
		canvasSnapshotsRef.current = storageCommit.snapshotCache;
		const { projectId, projectTitle, snapshot } = storageCommit.serverSaveRequest;
		saveCanvasToServer(
			projectId,
			projectTitle,
			snapshot,
		).catch((error) => {
			console.warn("Canvas server save failed.", error);
			pushRuntimeNotice(
				"画布未能同步到服务端，当前更改可能仅保存在本地浏览器。",
				"warning",
				"canvas-save-failed",
			);
		});
	}, [
		canvasProjectId,
		canvasProjectTitle,
		canvasSnapshotsRef,
		connections,
		hydratedCanvasProjectId,
		nodes,
		pushRuntimeNotice,
	]);

	useEffect(() => {
		const modelPrefs = readStorageJson<TapModelPrefsStorage>(
			STORAGE_KEYS.modelPrefs,
			{},
		);
		persistStorageJson(
			STORAGE_KEYS.modelPrefs,
			buildPersistedModelPrefs(modelPrefs, composerByType),
		);
	}, [composerByType]);

	useEffect(() => {
		const notices = readStorageJson<TapNoticesStorage>(
			STORAGE_KEYS.notices,
			{},
		);
		persistStorageJson(
			STORAGE_KEYS.notices,
			buildHotkeyNoticeStorage(notices, showHotkeyNotice),
		);
	}, [showHotkeyNotice]);

	useEffect(() => {
		const tips = readStorageJson<TapTutorialTipsStorage>(STORAGE_KEYS.tips, {
			state: { tips: {} },
			version: 0,
		});
		persistStorageJson(
			STORAGE_KEYS.tips,
			buildWorkflowPanelTipStorage(tips, showConnectionTip),
		);
	}, [showConnectionTip]);

	useEffect(() => {
		persistStorageJson(
			STORAGE_KEYS.minimaxTokenPlan,
			buildMiniMaxTokenPlanStorage(miniMaxTokenPlanRawText),
		);
	}, [miniMaxTokenPlanRawText]);
}
