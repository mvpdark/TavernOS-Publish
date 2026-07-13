import { useMemo, useState } from "react";

import type { AppInitialState } from "../appInitialState";
import type { PreviewFilter } from "../appPreviewHelpers";
import {
	type AddNodeMenuState,
	type MagnetPortState,
	type PointerState,
	type UploadIntent,
} from "../appCanvasState";
import { createInitialComposerByType } from "../appInitialComposer";
import type { CanvasMode } from "../appUiConfig";
import type { VoiceCatalogItem } from "../appVoiceCatalog";
import { cloneConnections, cloneNodes } from "../appWorkspaceDefaults";
import type { ProjectEntry } from "../canvasPersistence";
import type {
	ConnectionCutState,
	NodeConnection,
	NodePort,
} from "./useConnectionInteractionHelpers";
import type {
	CanvasNode,
	NodeType,
	OpenDropdown,
	StyleLibraryState,
	ThemeTone,
} from "../canvas-types";

type NodeMenuState = {
	x: number;
	y: number;
	nodeId: string;
} | null;

export function createInitialAppBaseState(initialState: AppInitialState) {
	const styleLibrary = initialState.styleLibrary;

	return {
		pathname: initialState.path,
		canvasLibrary: initialState.canvasLibrary,
		workshopLibrary: initialState.workshopLibrary,
		nodes: cloneNodes(initialState.nodes),
		connections: cloneConnections(initialState.connections),
		pendingConnection: null as
			| (NodePort & { pointerX: number; pointerY: number })
			| null,
		magnetPort: null as MagnetPortState,
		connectionCut: null as ConnectionCutState,
		selectedIds: [] as string[],
		activeTool: "text" as NodeType,
		composerByType: createInitialComposerByType(initialState.modelPrefs),
		voiceCatalog: (initialState.voiceCatalog.voices ?? []).filter(
			(voice): voice is VoiceCatalogItem =>
				Boolean(voice?.voiceId?.trim() && voice?.displayName?.trim()),
		),
		isVoiceCatalogLoading: false,
		styleLibrary,
		pan: {
			x: initialState.viewport?.x ?? 0,
			y: initialState.viewport?.y ?? 0,
		},
		zoom: initialState.viewport?.zoom ?? 1,
		showZoomHud: false,
		pointerState: { mode: "idle" } as PointerState,
		menuAt: null as AddNodeMenuState | null,
		nodeMenuAt: null as NodeMenuState,
		renamingNodeId: null as string | null,
		renameDraft: "",
		openDropdown: null as OpenDropdown,
		uploadIntent: null as UploadIntent,
		isCanvasLibraryOpen: false,
		isHiddenSettingsOpen: false,
		themeTone: initialState.themeTone,
		agentOpen: false,
		canvasMode: "canvas" as CanvasMode,
		previewFilter: "all" as PreviewFilter,
		globalAspectRatio: "1:1",
		isGlobalAspectMenuOpen: false,
		globalStylePresetId: styleLibrary.presets[0]?.id ?? "",
		isGlobalStyleMenuOpen: false,
		language: initialState.language,
		showHotkeyNotice: !initialState.notices.hotkey_update?.dismissed,
		showConnectionTip:
			!initialState.tips.state?.tips?.["dockbar-workflow-panel-tip"]
				?.dismissCount,
		hydratedCanvasProjectId: null as string | null,
	};
}

export function useAppBaseState(initialState: AppInitialState) {
	const initialBaseState = useMemo(
		() => createInitialAppBaseState(initialState),
		[initialState],
	);
	const [pathname, setPathname] = useState(initialBaseState.pathname);
	const [canvasLibrary, setCanvasLibrary] = useState<ProjectEntry[]>(
		() => initialBaseState.canvasLibrary,
	);
	const [workshopLibrary, setWorkshopLibrary] = useState<ProjectEntry[]>(
		() => initialBaseState.workshopLibrary,
	);
	const [nodes, setNodes] = useState<CanvasNode[]>(
		() => initialBaseState.nodes,
	);
	const [connections, setConnections] = useState<NodeConnection[]>(
		() => initialBaseState.connections,
	);
	const [pendingConnection, setPendingConnection] = useState<
		(NodePort & { pointerX: number; pointerY: number }) | null
	>(initialBaseState.pendingConnection);
	const [magnetPort, setMagnetPort] = useState<MagnetPortState>(
		initialBaseState.magnetPort,
	);
	const [connectionCut, setConnectionCut] = useState<ConnectionCutState>(
		initialBaseState.connectionCut,
	);
	const [selectedIds, setSelectedIds] = useState<string[]>(
		() => initialBaseState.selectedIds,
	);
	const [activeTool, setActiveTool] = useState<NodeType>(
		initialBaseState.activeTool,
	);
	const [composerByType, setComposerByType] = useState(
		() => initialBaseState.composerByType,
	);
	const [voiceCatalog, setVoiceCatalog] = useState<VoiceCatalogItem[]>(
		() => initialBaseState.voiceCatalog,
	);
	const [isVoiceCatalogLoading, setIsVoiceCatalogLoading] = useState(
		initialBaseState.isVoiceCatalogLoading,
	);
	const [styleLibrary, setStyleLibrary] = useState<StyleLibraryState>(
		initialBaseState.styleLibrary,
	);
	const [pan, setPan] = useState(() => initialBaseState.pan);
	const [zoom, setZoom] = useState(initialBaseState.zoom);
	const [showZoomHud, setShowZoomHud] = useState(
		initialBaseState.showZoomHud,
	);
	const [pointerState, setPointerState] = useState<PointerState>(
		initialBaseState.pointerState,
	);
	const [menuAt, setMenuAt] = useState<AddNodeMenuState | null>(
		initialBaseState.menuAt,
	);
	const [nodeMenuAt, setNodeMenuAt] = useState<NodeMenuState>(
		initialBaseState.nodeMenuAt,
	);
	const [renamingNodeId, setRenamingNodeId] = useState<string | null>(
		initialBaseState.renamingNodeId,
	);
	const [renameDraft, setRenameDraft] = useState(
		initialBaseState.renameDraft,
	);
	const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(
		initialBaseState.openDropdown,
	);
	const [uploadIntent, setUploadIntent] = useState<UploadIntent>(
		initialBaseState.uploadIntent,
	);
	const [isCanvasLibraryOpen, setIsCanvasLibraryOpen] = useState(
		initialBaseState.isCanvasLibraryOpen,
	);
	const [isHiddenSettingsOpen, setIsHiddenSettingsOpen] = useState(
		initialBaseState.isHiddenSettingsOpen,
	);
	const [themeTone, setThemeTone] = useState<ThemeTone>(
		initialBaseState.themeTone,
	);
	const [agentOpen, setAgentOpen] = useState(initialBaseState.agentOpen);
	const [canvasMode, setCanvasMode] = useState<CanvasMode>(
		initialBaseState.canvasMode,
	);
	const [previewFilter, setPreviewFilter] = useState<PreviewFilter>(
		initialBaseState.previewFilter,
	);
	const [globalAspectRatio, setGlobalAspectRatio] = useState(
		initialBaseState.globalAspectRatio,
	);
	const [isGlobalAspectMenuOpen, setIsGlobalAspectMenuOpen] = useState(
		initialBaseState.isGlobalAspectMenuOpen,
	);
	const [globalStylePresetId, setGlobalStylePresetId] = useState(
		initialBaseState.globalStylePresetId,
	);
	const [isGlobalStyleMenuOpen, setIsGlobalStyleMenuOpen] = useState(
		initialBaseState.isGlobalStyleMenuOpen,
	);
	const [language] = useState(initialBaseState.language);
	const [showHotkeyNotice, setShowHotkeyNotice] = useState(
		initialBaseState.showHotkeyNotice,
	);
	const [showConnectionTip, setShowConnectionTip] = useState(
		initialBaseState.showConnectionTip,
	);
	const [hydratedCanvasProjectId, setHydratedCanvasProjectId] = useState<
		string | null
	>(initialBaseState.hydratedCanvasProjectId);

	return {
		pathname,
		setPathname,
		canvasLibrary,
		setCanvasLibrary,
		workshopLibrary,
		setWorkshopLibrary,
		nodes,
		setNodes,
		connections,
		setConnections,
		pendingConnection,
		setPendingConnection,
		magnetPort,
		setMagnetPort,
		connectionCut,
		setConnectionCut,
		selectedIds,
		setSelectedIds,
		activeTool,
		setActiveTool,
		composerByType,
		setComposerByType,
		voiceCatalog,
		setVoiceCatalog,
		isVoiceCatalogLoading,
		setIsVoiceCatalogLoading,
		styleLibrary,
		setStyleLibrary,
		pan,
		setPan,
		zoom,
		setZoom,
		showZoomHud,
		setShowZoomHud,
		pointerState,
		setPointerState,
		menuAt,
		setMenuAt,
		nodeMenuAt,
		setNodeMenuAt,
		renamingNodeId,
		setRenamingNodeId,
		renameDraft,
		setRenameDraft,
		openDropdown,
		setOpenDropdown,
		uploadIntent,
		setUploadIntent,
		isCanvasLibraryOpen,
		setIsCanvasLibraryOpen,
		isHiddenSettingsOpen,
		setIsHiddenSettingsOpen,
		themeTone,
		setThemeTone,
		agentOpen,
		setAgentOpen,
		canvasMode,
		setCanvasMode,
		previewFilter,
		setPreviewFilter,
		globalAspectRatio,
		setGlobalAspectRatio,
		isGlobalAspectMenuOpen,
		setIsGlobalAspectMenuOpen,
		globalStylePresetId,
		setGlobalStylePresetId,
		isGlobalStyleMenuOpen,
		setIsGlobalStyleMenuOpen,
		language,
		showHotkeyNotice,
		setShowHotkeyNotice,
		showConnectionTip,
		setShowConnectionTip,
		hydratedCanvasProjectId,
		setHydratedCanvasProjectId,
	};
}
