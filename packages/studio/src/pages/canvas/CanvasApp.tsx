import "./canvas-styles.css";
import {
	IMAGE_ASPECT_RATIOS,
	IMAGE_RESOLUTIONS,
	clamp,
} from "./appAspectRatioHelpers";
import { withTimeout } from "./appAssetRuntime";
import {
	ZOOM_MAX,
	ZOOM_MIN,
} from "./appCanvasState";
import { buildShotPromptPrefix } from "./appNodeModelConfig";
import {
	COPY,
	THEME_TONES,
	WORKSHOP_DIRECT_EXTRACT_TEMPLATE_FILE,
} from "./appUiConfig";
import {
	deleteCanvasFromServer,
	uploadGeneratedAssetToCloudDrive,
} from "./appServerApi";
import {
	cloneConnections,
	cloneInitialNodes,
	cloneNodes,
	cloneWorkspaceSnapshot,
} from "./appWorkspaceDefaults";
import agentOrb from "./assets/agent-orb.webp";
import kakashowLogo from "./assets/kakashow-logo.webp";
import {
	CanvasZoomHud,
} from "./components/CanvasChrome";
import { CanvasViewChrome } from "./components/CanvasViewChrome";
import { AppRoutePages } from "./components/AppRoutePages";
import { AppShellChrome } from "./components/AppShellChrome";
import { AppGlobalDialogs } from "./components/AppGlobalDialogs";
import { AppRuntimeShell } from "./components/AppRuntimeShell";
import { CanvasSidePanelSlot } from "./components/CanvasSidePanelSlot";
import { CanvasStageShell } from "./components/CanvasStageShell";
import { CanvasSurfaceOverlays } from "./components/CanvasSurfaceOverlays";
import { CanvasWorldLayer } from "./components/CanvasWorldLayer";
import { WorkshopRoutePage } from "./components/WorkshopRoutePage";
import { SettingsRoutePage } from "./components/SettingsRoutePage";
import {
	screenToWorld,
} from "./canvasNodeActions";
import { getUploadAccept } from "./canvasAssetActions";
import { useCanvasConnections } from "./hooks/useCanvasConnections";
import { useCanvasNodeCreation } from "./hooks/useCanvasNodeCreation";
import { useCanvasOverlayControls } from "./hooks/useCanvasOverlayControls";
import { useCanvasPersistence } from "./hooks/useCanvasPersistence";
import { useCanvasProjectHydration } from "./hooks/useCanvasProjectHydration";
import { useCanvasPrimaryState } from "./hooks/useCanvasPrimaryState";
import { useCanvasPrimaryComposerSend } from "./hooks/useCanvasPrimaryComposerSend";
import { useCanvasFloatingUiState } from "./hooks/useCanvasFloatingUiState";
import { useAppProjectRouting } from "./hooks/useAppProjectRouting";
import { useAppStorageEffects } from "./hooks/useAppStorageEffects";
import { useAppCanvasUiEffects } from "./hooks/useAppCanvasUiEffects";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts";
import { useCanvasSelectionBox } from "./hooks/useCanvasSelectionBox";
import { useCanvasPointerInteractions } from "./hooks/useCanvasPointerInteractions";
import { useCanvasImageEditActions } from "./hooks/useCanvasImageEditActions";
import { useCanvasMediaPreviewActions } from "./hooks/useCanvasMediaPreviewActions";
import { useCanvasNodeDragStart } from "./hooks/useCanvasNodeDragStart";
import { useCanvasViewControls } from "./hooks/useCanvasViewControls";
import { useVideoFusionAnalysis } from "./hooks/useVideoFusionAnalysis";
import { useVideoFusionPromptNodes } from "./hooks/useVideoFusionPromptNodes";
import { useCanvasWindowEffects } from "./hooks/useCanvasWindowEffects";
import { useConnectionDraftLine } from "./hooks/useConnectionDraftLine";
import { useConnectionPortHover } from "./hooks/useConnectionPortHover";
import { useFfmpegPanelActions } from "./hooks/useFfmpegPanelActions";
import { useFfmpegGeneratedMediaActions } from "./hooks/useFfmpegGeneratedMediaActions";
import { useVideoExtensionActions } from "./hooks/useVideoExtensionActions";
import { useMediaFusionActions } from "./hooks/useMediaFusionActions";
import { useImageGenerationActions } from "./hooks/useImageGenerationActions";
import { useReversePromptActions } from "./hooks/useReversePromptActions";
import { useNodeAssetManagementActions } from "./hooks/useNodeAssetManagementActions";
import { useUploadedAssetPlacement } from "./hooks/useUploadedAssetPlacement";
import { useCanvasStyleAspectActions } from "./hooks/useCanvasStyleAspectActions";
import {
	useConnectionInteractionHelpers,
} from "./hooks/useConnectionInteractionHelpers";
import { useAppCanvasRefs } from "./hooks/useAppCanvasRefs";
import { useCanvasAssetActions } from "./hooks/useCanvasAssetActions";
import {
	DEFAULT_KAKA_API_BASE_URL,
	useKakaApiModels,
} from "./hooks/useKakaApiModels";
import { useWorkspaceSnapshots } from "./hooks/useWorkspaceSnapshots";
import { useVoiceCatalogActions } from "./hooks/useVoiceCatalogActions";
import { usePrimaryComposerActions } from "./hooks/usePrimaryComposerActions";
import { useAutoVideoComposerSync } from "./hooks/useAutoVideoComposerSync";
import { useVoiceCatalogRefreshEvent } from "./hooks/useVoiceCatalogRefreshEvent";
import { useCanvasViewDerivedState } from "./hooks/useCanvasViewDerivedState";
import { useWorkshopLocalState } from "./hooks/useWorkshopLocalState";
import { useCanvasRuntimeState } from "./hooks/useCanvasRuntimeState";
import { useAppBaseState } from "./hooks/useAppBaseState";
import { useWorkshopRouteController } from "./hooks/useWorkshopRouteController";
import { useCanvasRouteDerivedState } from "./hooks/useCanvasRouteDerivedState";
import { useAppRouteActions } from "./hooks/useAppRouteActions";
import { useAppRuntimeSetup } from "./hooks/useAppRuntimeSetup";

function stopNodeControlPointerDown(event: { stopPropagation: () => void }) {
	event.stopPropagation();
}

export default function App() {
	const {
		initialState,
		miniMaxTokenPlanState,
		runtimeNotices,
		pushRuntimeNotice,
		dismissRuntimeNotice,
	} = useAppRuntimeSetup();
	const {
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
	} = useAppBaseState(initialState);
	const {
		workshopStep,
		setWorkshopStep,
		workshopScript,
		setWorkshopScript,
		workshopDirectExtractTemplateFile,
		setWorkshopDirectExtractTemplateFile,
		workshopTextModel,
		setWorkshopTextModel,
		workshopRoleTab,
		setWorkshopRoleTab,
		workshopFrameTab,
		setWorkshopFrameTab,
		workshopScriptExpanded,
		setWorkshopScriptExpanded,
		workshopExtraction,
		setWorkshopExtraction,
		isWorkshopExtracting,
		setIsWorkshopExtracting,
		workshopFrameCards,
		setWorkshopFrameCards,
	} = useWorkshopLocalState();
	const {
		kakaApiBaseUrl,
		setKakaApiBaseUrl,
		kakaApiKey,
		setKakaApiKey,
		kakaApiTimeoutMs,
		setKakaApiTimeoutMs,
		upstreamModelOptions,
		upstreamModelValueMap,
		didUpstreamModelFetchFailByType,
		isLoadingUpstreamModels,
		kakaApiValidation,
		triggerUpstreamModelRefresh,
	} = useKakaApiModels();
	const {
		videoPreview,
		setVideoPreview,
		imagePreview,
		setImagePreview,
		videoEnhancingNodeId,
		setVideoEnhancingNodeId,
		videoExtendingNodeId,
		setVideoExtendingNodeId,
		videoExtensionModelInfos,
		setVideoExtensionModelInfos,
		videoFusionHoverNodeId,
		setVideoFusionHoverNodeId,
		videoFusionPrompt,
		setVideoFusionPrompt,
		videoFusionAnalysis,
		setVideoFusionAnalysis,
		videoFusingPairKey,
		setVideoFusingPairKey,
		videoExtendMode,
		setVideoExtendMode,
		videoEnhanceSettings,
		setVideoEnhanceSettings,
		imageUpscaleSettings,
		setImageUpscaleSettings,
		imageUpscalingNodeId,
		setImageUpscalingNodeId,
		ffmpegInstallPrompt,
		setFfmpegInstallPrompt,
		ffmpegInstallingNodeId,
		setFfmpegInstallingNodeId,
		isCanvasDropActive,
		setIsCanvasDropActive,
		cropEditingNodeId,
		setCropEditingNodeId,
		redrawEditingNodeId,
		setRedrawEditingNodeId,
		redrawGeneratingNodeId,
		setRedrawGeneratingNodeId,
		perspectiveEditNodeId,
		setPerspectiveEditNodeId,
		perspectiveEditSettings,
		setPerspectiveEditSettings,
		perspectiveGeneratingNodeId,
		setPerspectiveGeneratingNodeId,
		threeDDirectorGeneratingNodeId,
		setThreeDDirectorGeneratingNodeId,
		reversePromptGeneratingNodeId,
		setReversePromptGeneratingNodeId,
		isCanvasFocusAnimating,
		setIsCanvasFocusAnimating,
		liftedDragIds,
		setLiftedDragIds,
	} = useCanvasRuntimeState();
	const {
		isDraggingNodePositionChangeSnapshotTakenRef,
		canvasRef,
		renameInputRef,
		uploadInputRef,
		workshopTextareaRef,
		uploadedUrlsRef,
		canvasDragDepthRef,
		canvasFocusTimerRef,
		initialDevicePixelRatioRef,
		zoomHudTimeoutRef,
		hasMountedZoomRef,
		copiedNodeRef,
		canvasSnapshotsRef,
		previousCanvasProjectIdRef,
		pointerStateRef,
		latestNodesRef,
		latestConnectionsRef,
	} = useAppCanvasRefs({
		nodes,
		connections,
		initialPath: initialState.path,
		initialCanvasProjectId: initialState.canvasProjectId,
	});
	useVideoFusionAnalysis({
		videoFusionPrompt,
		latestNodesRef,
		kakaApiBaseUrl,
		kakaApiKey,
		setVideoFusionAnalysis,
	});
	const {
		workshopTextModelOptions,
		workshopFrameActionKey,
		handleWorkshopUploadToCloud,
		handleWorkshopSaveLocal,
		handleWorkshopDirectExtract,
		handleWorkshopAutoEpisodeBreakdown,
		handleWorkshopAiEpisodeSplit,
		handleWorkshopFrameInfer,
		handleWorkshopFrameValidate,
		handleWorkshopFrameMerge,
		handleWorkshopFrameReferenceRecognition,
		handleWorkshopFrameAdd,
		handleWorkshopFrameImport,
		handleWorkshopFrameClear,
		workshopContextMenu,
		closeWorkshopContextMenu,
		setWorkshopStudioRef,
		handleWorkshopTextareaContextMenu,
		handleWorkshopCopyFromMenu,
		handleWorkshopPasteFromMenu,
		workshopRoleTabLabel,
		currentWorkshopEntities,
	} = useWorkshopRouteController({
		upstreamTextModels: upstreamModelOptions.text,
		defaultKakaApiBaseUrl: DEFAULT_KAKA_API_BASE_URL,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		workshopTextareaRef,
		workshopStep,
		setWorkshopStep,
		workshopScript,
		setWorkshopScript,
		workshopDirectExtractTemplateFile,
		workshopTextModel,
		setWorkshopTextModel,
		workshopRoleTab,
		setWorkshopRoleTab,
		workshopFrameTab,
		workshopFrameCards,
		setWorkshopScriptExpanded,
		workshopExtraction,
		setWorkshopExtraction,
		isWorkshopExtracting,
		setIsWorkshopExtracting,
		setWorkshopFrameCards,
		onNotice: pushRuntimeNotice,
	});

	const {
		canvasProjectId,
		workshopProjectId,
		currentCanvasProject,
		currentWorkshopProject,
		appView,
		navigate,
	} = useAppProjectRouting({
		pathname,
		canvasLibrary,
		workshopLibrary,
		nodesLength: nodes.length,
		setCanvasLibrary,
		setWorkshopLibrary,
		setPathname,
	});
	const appRouteActions = useAppRouteActions(navigate);
	const {
		selectedIdSet,
		nodeById,
		selectedNodes,
		primaryNode,
		primaryType,
		composer,
		primaryVideoModelCapability,
		primaryImageModelCapability,
		recommendedPrimaryVideoMode,
		effectivePrimaryReferenceAssets,
		canAddPrimaryReferenceAsset,
		compatiblePrimaryModel,
		requestNode,
		requestType,
		requestComposer,
		requestReferenceAssets,
		modelOptionCatalog,
		modelOptions,
		resolvedComposerGatewayLabel,
		primaryStyle,
		promptPrefix,
	} = useCanvasPrimaryState({
		selectedIds,
		nodes,
		activeTool,
		composerByType,
		connections,
		styleLibrary,
		upstreamModelOptions,
		isLoadingUpstreamModels,
		didUpstreamModelFetchFailByType,
	});
	const {
		matchingMediaNodes: previewMatchingMediaNodes,
		filterCounts: previewFilterCounts,
		focusMediaIdSet: previewFocusMediaIdSet,
		visibleNodes,
		visibleConnections,
		canvasModeMeta,
		modePrimaryTool,
		primaryCreateLabel,
		isCanvasSidePanelOpen,
		isDirectorMode,
		isPreviewMode,
		showCreationChrome,
	} = useCanvasViewDerivedState({
		appView,
		canvasMode,
		activeTool,
		nodes,
		connections,
		nodeById,
		previewFilter,
		primaryNode,
		agentOpen,
	});
	const {
		resolvedGatewayModel,
		resolvedRequestGatewayModel,
		styleReferenceCounts,
		kakaApiValidationTone,
	} = useCanvasRouteDerivedState({
		nodes,
		primaryType,
		composer,
		requestType,
		requestComposer,
		upstreamModelValueMap,
		resolvedComposerGatewayLabel,
		kakaApiValidation,
	});
	const {
		groupBounds,
		showFloatingComposer,
		showFloatingTextToolbar,
		floatingTextToolbarStyle,
		floatingComposerStyle,
	} = useCanvasFloatingUiState({
		primaryNode,
		primaryType,
		selectedNodes,
		pointerState,
		isDirectorMode,
		isPreviewMode,
		pan,
		zoom,
	});
	const {
		clearNodeLiftTimer,
		clearConnectionCutTimer,
		resetNodeLift,
		dismissOverlays,
		closeVideoPreview,
		scheduleNodeLift,
		scheduleConnectionCutReveal,
	} = useCanvasOverlayControls({
		closeWorkshopContextMenu,
		pointerStateRef,
		setLiftedDragIds,
		setMenuAt,
		setNodeMenuAt,
		setOpenDropdown,
		setIsCanvasLibraryOpen,
		setIsHiddenSettingsOpen,
		setRenamingNodeId,
		setRenameDraft,
		setPendingConnection,
		setMagnetPort,
		setConnectionCut,
		setVideoPreview,
	});
	const { pushUndoSnapshot, undoNodes, redoNodes, resetWorkspaceHistory } =
		useWorkspaceSnapshots({
			nodes,
			connections,
			setNodes,
			setConnections,
			setSelectedIds,
			dismissOverlays,
			cloneNodes,
			cloneConnections,
			cloneWorkspaceSnapshot,
		});
	const {
		generatingNodeIds,
		handlePrimaryComposerSend,
		isPrimaryNodeSending,
	} = useCanvasPrimaryComposerSend({
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		primaryNode,
		requestNode,
		requestType,
		requestComposer,
		primaryComposerPrompt: composer.prompt,
		resolvedGatewayModel,
		resolvedRequestGatewayModel,
		promptPrefix,
		requestReferenceAssets,
		composerByType,
		globalStylePresetId,
		styleLibrary,
		latestNodesRef,
		latestConnectionsRef,
		setNodes,
		setConnections,
		setSelectedIds,
		pushRuntimeNotice,
		pushUndoSnapshot,
		withTimeout,
		uploadGeneratedAssetToCloudDrive,
	});

	const {
		applyGlobalAspectRatio,
		applyGlobalStyle,
		setAudioVoiceMode,
		toggleDropdown,
		updateNodeStyle,
	} = useCanvasStyleAspectActions({
		connections,
		composerByType,
		primaryNode,
		styleLibrary,
		setGlobalAspectRatio,
		setIsGlobalAspectMenuOpen,
		setGlobalStylePresetId,
		setIsGlobalStyleMenuOpen,
		setComposerByType,
		setNodes,
		setOpenDropdown,
		pushRuntimeNotice,
		pushUndoSnapshot,
	});
	const { handleCanvasWheel, getWorldPointFromClient } = useCanvasViewControls({
		canvasRef,
		dismissOverlays,
		pan,
		zoom,
		setPan,
		setZoom,
		screenToWorld,
		clamp,
		zoomMin: ZOOM_MIN,
		zoomMax: ZOOM_MAX,
	});
	const {
		findNearestConnectionPort,
		handleConnectionHoverMove,
		handleConnectionHoverEnter,
		handleConnectionHoverLeave,
		cutConnection,
	} = useConnectionInteractionHelpers({
		canvasRef,
		nodes,
		pan,
		zoom,
		styleLibrary,
		setConnectionCut,
		clearConnectionCutTimer,
		scheduleConnectionCutReveal,
		pushUndoSnapshot,
		setConnections,
		setNodes,
	});

	const { completeConnection } = useCanvasConnections({
		nodes,
		connections,
		styleLibrary,
		imageComposer: composerByType.image,
		pushUndoSnapshot,
		pushRuntimeNotice,
		setConnections,
		setNodes,
	});

	const {
		handleCreateCanvas,
		handleDeleteCanvas,
		handleCreateWorkshop,
		handleDeleteWorkshop,
	} = useCanvasPersistence({
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
	});

	useCanvasWindowEffects({
		openDropdown,
		resetNodeLift,
		setOpenDropdown,
		setPointerState,
	});
	useCanvasProjectHydration({
		canvasProjectId,
		canvasSnapshotsRef,
		previousCanvasProjectIdRef,
		latestNodesRef,
		latestConnectionsRef,
		resetWorkspaceHistory,
		dismissOverlays,
		setHydratedCanvasProjectId,
		setSelectedIds,
		setPan,
		setZoom,
		setNodes,
		setConnections,
	});
	useAppCanvasUiEffects({
		pointerState,
		pointerStateRef,
		resetNodeLift,
		nodes,
		uploadedUrlsRef,
		canvasRef,
		handleCanvasWheel,
		zoom,
		hasMountedZoomRef,
		zoomHudTimeoutRef,
		setShowZoomHud,
		renamingNodeId,
		renameInputRef,
		initialDevicePixelRatioRef,
	});
	useAppStorageEffects({
		language,
		themeTone,
		styleLibrary,
		canvasProjectId,
		canvasProjectTitle: currentCanvasProject?.title,
		hydratedCanvasProjectId,
		pan,
		zoom,
		nodes,
		connections,
		composerByType,
		showHotkeyNotice,
		showConnectionTip,
		miniMaxTokenPlanRawText: miniMaxTokenPlanState.rawText,
		canvasSnapshotsRef,
		setNodes,
		pushRuntimeNotice,
	});
	useAutoVideoComposerSync({
		nodes,
		connections,
		setNodes,
	});
	useAppKeyboardShortcuts({
		appView,
		closeVideoPreview,
		copiedNodeRef,
		dismissOverlays,
		imagePreview,
		latestNodesRef,
		primaryNode,
		pushUndoSnapshot,
		redoNodes,
		selectedIdSet,
		selectedIdsLength: selectedIds.length,
		setAgentOpen,
		setConnections,
		setImagePreview,
		setNodes,
		setPan,
		setSelectedIds,
		setZoom,
		styleLibrary,
		undoNodes,
		videoPreview,
	});
	const selectionBox = useCanvasSelectionBox({
		canvasRef,
		nodes,
		pan,
		pointerState,
		setSelectedIds,
		zoom,
	});
	const { fuseAudioVideoNodes, fuseVideoNodes } = useMediaFusionActions({
		nodeById,
		videoFusionAnalysis,
		kakaApiBaseUrl,
		kakaApiKey,
		setVideoFusingPairKey,
		setVideoFusionPrompt,
		setVideoFusionAnalysis,
		setFfmpegInstallPrompt,
		setNodes,
		setConnections,
		setSelectedIds,
		pushRuntimeNotice,
		pushUndoSnapshot,
		uploadGeneratedAssetToCloudDrive,
	});
	const {
		handleBlankPointerDown,
		handleCanvasPointerMove,
		handleCanvasPointerUp,
		handleCanvasDoubleClick,
		handleNodeClick,
		handleNodeContextMenu,
	} = useCanvasPointerInteractions({
		canvasRef,
		pan,
		zoom,
		pointerState,
		latestNodesRef,
		isDraggingNodePositionChangeSnapshotTakenRef,
		videoFusionHoverNodeId,
		dismissOverlays,
		clearNodeLiftTimer,
		resetNodeLift,
		pushUndoSnapshot,
		fuseAudioVideoNodes,
		screenToWorld,
		setPointerState,
		setPan,
		setNodes,
		setLiftedDragIds,
		setVideoFusionHoverNodeId,
		setVideoFusionPrompt,
		setMenuAt,
		setNodeMenuAt,
		setOpenDropdown,
		setSelectedIds,
	});
	const {
		handleRedrawGenerate,
		handlePerspectiveEditGenerate,
		handleThreeDDirectorGenerate,
	} = useImageGenerationActions({
		latestNodesRef,
		primaryComposer: composer,
		imageComposer: composerByType.image,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		redrawGeneratingNodeId,
		perspectiveGeneratingNodeId,
		threeDDirectorGeneratingNodeId,
		perspectiveEditSettings,
		setRedrawGeneratingNodeId,
		setPerspectiveGeneratingNodeId,
		setThreeDDirectorGeneratingNodeId,
		setRedrawEditingNodeId,
		setPerspectiveEditNodeId,
		setNodes,
		setSelectedIds,
		setActiveTool,
		pushRuntimeNotice,
		pushUndoSnapshot,
	});
	const handleReversePromptGenerate = useReversePromptActions({
		latestNodesRef,
		textComposer: composerByType.text,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		reversePromptGeneratingNodeId,
		setReversePromptGeneratingNodeId,
		setCropEditingNodeId,
		setRedrawEditingNodeId,
		setPerspectiveEditNodeId,
		setNodes,
		setConnections,
		setComposerByType,
		setSelectedIds,
		setActiveTool,
		pushRuntimeNotice,
		pushUndoSnapshot,
	});
	const {
		videoEnhancePanelNodeId,
		videoExtendPanelNodeId,
		imageUpscalePanelNodeId,
		openVideoEnhancePanel,
		openVideoExtendPanel,
		closeVideoEnhancePanel,
		closeVideoExtendPanel,
		closeImageUpscalePanel,
		openFfmpegPanelAfterInstall,
		updateVideoEnhanceSetting,
		updateImageUpscaleSetting,
		openImageUpscalePanel,
	} = useFfmpegPanelActions({
		nodeById,
		primaryNode,
		videoComposer: composerByType.video,
		setFfmpegInstallPrompt,
		setVideoExtensionModelInfos,
		setVideoEnhanceSettings,
		setImageUpscaleSettings,
	});
	const {
		confirmFfmpegInstall,
		upscaleImageAsset,
		enhanceVideoAsset,
	} = useFfmpegGeneratedMediaActions({
		nodeById,
		nodes,
		connections,
		ffmpegInstallPrompt,
		imageUpscaleSettings,
		videoEnhanceSettings,
		setFfmpegInstallPrompt,
		setFfmpegInstallingNodeId,
		setImageUpscalingNodeId,
		setVideoEnhancingNodeId,
		setNodes,
		setConnections,
		setSelectedIds,
		pushRuntimeNotice,
		pushUndoSnapshot,
		closeImageUpscalePanel,
		closeVideoEnhancePanel,
		openFfmpegPanelAfterInstall,
		uploadGeneratedAssetToCloudDrive,
	});
	const {
		startVideoExtension,
		extendGrokVideoAsset,
	} = useVideoExtensionActions({
		nodeById,
		primaryNode,
		videoComposer: composerByType.video,
		videoExtendMode,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		setVideoExtendingNodeId,
		setVideoExtensionModelInfos,
		setNodes,
		setConnections,
		setSelectedIds,
		pushRuntimeNotice,
		pushUndoSnapshot,
		closeVideoExtendPanel,
	});
	const {
		handlePerspectiveEditChange,
		closePerspectiveEdit,
		closeRedrawEdit,
		handleImageToolbarAction,
	} = useCanvasImageEditActions({
		canvasRef,
		canvasFocusTimerRef,
		latestNodesRef,
		imageComposer: composerByType.image,
		dismissOverlays,
		pushUndoSnapshot,
		pushRuntimeNotice,
		handleReversePromptGenerate,
		handleThreeDDirectorGenerate,
		openImageUpscalePanel,
		setIsCanvasFocusAnimating,
		setZoom,
		setPan,
		setPerspectiveEditSettings,
		setPerspectiveEditNodeId,
		setRedrawEditingNodeId,
		setCropEditingNodeId,
		setSelectedIds,
		setNodes,
		setActiveTool,
	});
	const handleNodePointerDown = useCanvasNodeDragStart({
		nodes,
		selectedIdSet,
		isDraggingNodePositionChangeSnapshotTakenRef,
		dismissOverlays,
		scheduleNodeLift,
		setPointerState,
		setSelectedIds,
	});
	const {
		createNode,
		createReferencedNode,
		duplicateNode,
	} = useCanvasNodeCreation({
		canvasRef,
		nodes,
		connections,
		nodeById,
		menuAt,
		pan,
		zoom,
		composerByType,
		globalStylePresetId,
		styleLibrary,
		buildShotPromptPrefix,
		pushUndoSnapshot,
		setNodes,
		setConnections,
		setSelectedIds,
		setActiveTool,
		dismissOverlays,
	});
	const {
		openRenameEditor,
		saveNodeAssetToLibrary,
		submitRenameNodeAsset,
		deleteNode,
		copyNodeToClipboard,
	} = useNodeAssetManagementActions({
		nodeById,
		renamingNodeId,
		renameDraft,
		currentCanvasProjectTitle: currentCanvasProject?.title,
		currentWorkshopProjectTitle: currentWorkshopProject?.title,
		styleLibrary,
		copiedNodeRef,
		setRenamingNodeId,
		setRenameDraft,
		setNodes,
		setConnections,
		setSelectedIds,
		pushRuntimeNotice,
		pushUndoSnapshot,
		dismissOverlays,
	});
	const {
		switchModel,
		updatePrompt,
		updateImageOption,
		updateVideoOption,
		updateTextOption,
		updateAudioOption,
		updateMusicOption,
	} = usePrimaryComposerActions({
		composerByType,
		compatiblePrimaryModel,
		currentComposerModel: composer.model,
		modelOptionCatalog,
		primaryNode,
		primaryType,
		setComposerByType,
		setNodes,
		setOpenDropdown,
		pushRuntimeNotice,
	});
	const { refreshVoiceCatalog } = useVoiceCatalogActions({
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		voiceCatalog,
		setVoiceCatalog,
		setIsVoiceCatalogLoading,
		pushRuntimeNotice,
		updateAudioOption,
	});
	useVoiceCatalogRefreshEvent(refreshVoiceCatalog);
	const { applyUploadedFile } = useUploadedAssetPlacement({
		canvasRef,
		nodes,
		nodeById,
		composerByType,
		canvasProjectId,
		canvasProjectTitle: currentCanvasProject?.title,
		globalStylePresetId,
		styleLibrary,
		pan,
		zoom,
		setNodes,
		setSelectedIds,
		setActiveTool,
		pushRuntimeNotice,
		pushUndoSnapshot,
		dismissOverlays,
	});
	const {
		openUploadPicker,
		handleUploadChange,
		handleCanvasDragOver,
		handleCanvasDragEnter,
		handleCanvasDragLeave,
		handleCanvasDrop,
	} = useCanvasAssetActions({
		uploadInputRef,
		uploadIntent,
		canvasDragDepthRef,
		isCanvasDropActive,
		setUploadIntent,
		setIsCanvasDropActive,
		applyUploadedFile,
		getWorldPointFromClient,
		pushRuntimeNotice,
	});
	const { getPortPoint, handleConnectionPortPointerDown } =
		useConnectionDraftLine({
			canvasRef,
			nodeById,
			zoom,
			getWorldPointFromClient,
			findNearestConnectionPort,
			completeConnection,
			resetNodeLift,
			setPendingConnection,
			setMagnetPort,
			setMenuAt,
			setNodeMenuAt,
			setOpenDropdown,
			setSelectedIds,
			setPointerState,
		});
	const {
		handleConnectionPortPointerMove,
		handleConnectionPortPointerLeave,
	} = useConnectionPortHover({
		pendingConnection,
		zoom,
		setMagnetPort,
	});
	const {
		openVideoPreview,
		updateVideoNodeAspectSize,
		openImagePreview,
	} = useCanvasMediaPreviewActions({
		nodeById,
		setImagePreview,
		setVideoPreview,
		setNodes,
	});
	const { videoFusionSourceNode, videoFusionTargetNode } =
		useVideoFusionPromptNodes({
			videoFusionPrompt,
			nodeById,
		});
	return (
		<AppRuntimeShell
			appView={appView}
			themeTone={themeTone}
			uploadInputRef={uploadInputRef}
			uploadAccept={getUploadAccept(uploadIntent)}
			onUploadChange={handleUploadChange}
		>
			<AppGlobalDialogs
				ffmpegInstallPrompt={ffmpegInstallPrompt}
				ffmpegInstallingNodeId={ffmpegInstallingNodeId}
				onDismissFfmpegInstall={() => setFfmpegInstallPrompt(null)}
				onConfirmFfmpegInstall={() => void confirmFfmpegInstall()}
				videoFusionPrompt={videoFusionPrompt}
				videoFusionSourceNode={videoFusionSourceNode}
				videoFusionTargetNode={videoFusionTargetNode}
				videoFusionAnalysis={videoFusionAnalysis}
				videoFusingPairKey={videoFusingPairKey}
				onCancelVideoFusion={() => setVideoFusionPrompt(null)}
				onFuseVideoNodes={(sourceNodeId: string, targetNodeId: string) =>
					void fuseVideoNodes(sourceNodeId, targetNodeId)
				}
				imagePreview={imagePreview}
				onCloseImagePreview={() => setImagePreview(null)}
				videoPreview={videoPreview}
				onCloseVideoPreview={closeVideoPreview}
			/>

			<AppShellChrome
				appView={appView}
				logoSrc={kakashowLogo}
				projectName={currentCanvasProject?.title ?? "kakashow"}
				canvases={canvasLibrary}
				isCanvasLibraryOpen={isCanvasLibraryOpen}
				isHiddenSettingsOpen={isHiddenSettingsOpen}
				themes={THEME_TONES}
				activeTheme={themeTone}
				onSelectTheme={setThemeTone}
				onToggleCanvasLibrary={() => setIsCanvasLibraryOpen((current) => !current)}
				onCloseCanvasLibrary={() => setIsCanvasLibraryOpen(false)}
				onOpenHiddenSettings={() => setIsHiddenSettingsOpen(true)}
				onCloseHiddenSettings={() => setIsHiddenSettingsOpen(false)}
				onOpenWorkshopBrowser={appRouteActions.openWorkshopBrowser}
				onOpenLanding={appRouteActions.openLanding}
				onOpenCanvas={appRouteActions.openCanvasWorkspace}
				onCreateCanvas={handleCreateCanvas}
				onDeleteCanvas={handleDeleteCanvas}
			/>

			<AppRoutePages
				appView={appView}
				logoSrc={kakashowLogo}
				canvasProjects={canvasLibrary}
				workshopProjects={workshopLibrary}
				onOpenCanvasBrowser={appRouteActions.openCanvasBrowser}
				onOpenWorkshopBrowser={appRouteActions.openWorkshopBrowser}
				onOpenSettings={appRouteActions.openSettings}
				onBackToLanding={appRouteActions.openLanding}
				onCreateCanvas={handleCreateCanvas}
				onOpenCanvas={appRouteActions.openCanvasWorkspace}
				onDeleteCanvas={handleDeleteCanvas}
				onCreateWorkshop={handleCreateWorkshop}
				onOpenWorkshop={appRouteActions.openWorkshopWorkspace}
				onDeleteWorkshop={handleDeleteWorkshop}
			/>

			<WorkshopRoutePage
				isWorkshopView={appView === "workshop"}
				studioRef={setWorkshopStudioRef}
				projectTitle={currentWorkshopProject?.title ?? "新建项目"}
				step={workshopStep}
				onStepChange={setWorkshopStep}
				onBackToProjects={appRouteActions.openWorkshopBrowser}
				onUploadToCloud={handleWorkshopUploadToCloud}
				onSaveLocal={handleWorkshopSaveLocal}
				templateFile={workshopDirectExtractTemplateFile}
				templateValue={WORKSHOP_DIRECT_EXTRACT_TEMPLATE_FILE}
				textModel={workshopTextModel}
				textModelOptions={workshopTextModelOptions}
				script={workshopScript}
				textareaRef={workshopTextareaRef}
				contextMenu={workshopContextMenu}
				isExtracting={isWorkshopExtracting}
				onTemplateFileChange={setWorkshopDirectExtractTemplateFile}
				onTextModelChange={setWorkshopTextModel}
				onScriptChange={setWorkshopScript}
				onTextareaScroll={closeWorkshopContextMenu}
				onTextareaContextMenu={handleWorkshopTextareaContextMenu}
				onCopyFromMenu={() => void handleWorkshopCopyFromMenu()}
				onPasteFromMenu={() => void handleWorkshopPasteFromMenu()}
				onDirectExtract={handleWorkshopDirectExtract}
				onAutoEpisodeBreakdown={handleWorkshopAutoEpisodeBreakdown}
				onAiEpisodeSplit={handleWorkshopAiEpisodeSplit}
				roleTab={workshopRoleTab}
				roleTabLabel={workshopRoleTabLabel}
				roleEntities={currentWorkshopEntities}
				onRoleTabChange={setWorkshopRoleTab}
				frameActionKey={workshopFrameActionKey}
				scriptExpanded={workshopScriptExpanded}
				frameCards={workshopFrameCards}
				frameTab={workshopFrameTab}
				onToggleScript={() =>
					setWorkshopScriptExpanded((current) => !current)
				}
				onFrameInfer={handleWorkshopFrameInfer}
				onFrameValidate={handleWorkshopFrameValidate}
				onFrameMerge={handleWorkshopFrameMerge}
				onFrameReferenceRecognition={handleWorkshopFrameReferenceRecognition}
				onFrameAdd={handleWorkshopFrameAdd}
				onFrameImport={handleWorkshopFrameImport}
				onFrameClear={handleWorkshopFrameClear}
				onFrameTabChange={setWorkshopFrameTab}
			/>

			<SettingsRoutePage
				isSettingsView={appView === "settings"}
				themes={THEME_TONES}
				activeTheme={themeTone}
				onSelectTheme={setThemeTone}
				onBack={appRouteActions.openLanding}
				onOpenCanvasBrowser={appRouteActions.openCanvasBrowser}
				kakaApiValidation={kakaApiValidation}
				kakaApiValidationTone={kakaApiValidationTone}
				triggerUpstreamModelRefresh={triggerUpstreamModelRefresh}
				isLoadingUpstreamModels={isLoadingUpstreamModels}
				kakaApiBaseUrl={kakaApiBaseUrl}
				setKakaApiBaseUrl={setKakaApiBaseUrl}
				kakaApiKey={kakaApiKey}
				setKakaApiKey={setKakaApiKey}
				kakaApiTimeoutMs={kakaApiTimeoutMs}
				setKakaApiTimeoutMs={setKakaApiTimeoutMs}
				miniMaxTokenPlanRawText={miniMaxTokenPlanState.rawText}
				setMiniMaxTokenPlanRawText={miniMaxTokenPlanState.setRawText}
				miniMaxTokenPlanParseError={miniMaxTokenPlanState.parseError}
				miniMaxTokenPlan={miniMaxTokenPlanState.plan}
				miniMaxTokenPlanSummary={miniMaxTokenPlanState.summary}
				styleLibrary={styleLibrary}
				styleReferenceCounts={styleReferenceCounts}
				onChangeStyleLibrary={setStyleLibrary}
			/>

			<CanvasViewChrome
				isCanvasView={appView === "canvas"}
				isPreviewMode={isPreviewMode}
				modeBannerMode={isDirectorMode ? "director" : isPreviewMode ? "preview" : null}
				canvasMode={canvasMode}
				sidePanelOpen={isCanvasSidePanelOpen}
				onSelectMode={(mode) => {
					setCanvasMode(mode);
					if (mode === "director") {
						setActiveTool("shot");
					}
				}}
				previewFilter={previewFilter}
				previewFilterCounts={previewFilterCounts}
				previewMatchingMediaNodeCount={previewMatchingMediaNodes.length}
				onSelectPreviewFilter={setPreviewFilter}
				showCreationChrome={showCreationChrome}
				globalAspectRatio={globalAspectRatio}
				isGlobalAspectMenuOpen={isGlobalAspectMenuOpen}
				styleLibrary={styleLibrary}
				globalStylePresetId={globalStylePresetId}
				isGlobalStyleMenuOpen={isGlobalStyleMenuOpen}
				primaryCreateLabel={primaryCreateLabel}
				groupLabel={COPY.group}
				onToggleAspectMenu={() =>
					setIsGlobalAspectMenuOpen((current) => !current)
				}
				onApplyAspectRatio={applyGlobalAspectRatio}
				onToggleStyleMenu={() =>
					setIsGlobalStyleMenuOpen((current) => !current)
				}
				onApplyStyle={applyGlobalStyle}
				onCreatePrimary={() => createNode(modePrimaryTool)}
				runtimeNotices={runtimeNotices}
				showHotkeyNotice={showHotkeyNotice}
				showConnectionTip={showConnectionTip}
				onDismissRuntimeNotice={dismissRuntimeNotice}
				onDismissHotkeyNotice={() => setShowHotkeyNotice(false)}
				onDismissConnectionTip={() => setShowConnectionTip(false)}
				activeTool={activeTool}
				nodeCount={nodes.length}
				onSelectTool={(type) => {
					setActiveTool(type);
					createNode(type);
				}}
			/>

			<CanvasStageShell
				sidePanelOpen={isCanvasSidePanelOpen}
				canvasRef={canvasRef}
				pointerMode={pointerState.mode}
				isLiftingNode={liftedDragIds.size > 0}
				isDropActive={isCanvasDropActive}
				isFocusAnimating={isCanvasFocusAnimating}
				isCropMode={Boolean(cropEditingNodeId)}
				onBlankPointerDown={handleBlankPointerDown}
				onCanvasPointerMove={handleCanvasPointerMove}
				onCanvasPointerUp={handleCanvasPointerUp}
				onCanvasDragEnter={handleCanvasDragEnter}
				onCanvasDragOver={handleCanvasDragOver}
				onCanvasDragLeave={handleCanvasDragLeave}
				onCanvasDrop={handleCanvasDrop}
				onCanvasDoubleClick={handleCanvasDoubleClick}
			>
					<CanvasWorldLayer
						pan={pan}
						zoom={zoom}
						connectionLayerProps={{
							visibleConnections,
							pendingConnection,
							getPortPoint,
							onConnectionHoverEnter: handleConnectionHoverEnter,
							onConnectionHoverMove: handleConnectionHoverMove,
							onConnectionHoverLeave: handleConnectionHoverLeave,
						}}
						selectionOverlayProps={{
							groupBounds,
							selectedNodeCount: selectedNodes.length,
							selectionBox: null,
							onClearSelection: () => setSelectedIds([]),
							onCreateAsset: () => createNode(activeTool),
						}}
						nodeLayerProps={{
							nodes: visibleNodes,
							connections,
							nodeById,
							isPreviewMode,
							previewFocusMediaIdSet,
							selectedIdSet,
							liftedDragIds,
							videoFusionHoverNodeId,
							generatingNodeIds,
							perspectiveGeneratingNodeId,
							redrawGeneratingNodeId,
							threeDDirectorGeneratingNodeId,
							reversePromptGeneratingNodeId,
							videoEnhancingNodeId,
							videoExtendingNodeId,
							imageUpscalingNodeId,
							ffmpegInstallingNodeId,
							videoFusingPairKey,
							cropEditingNodeId,
							redrawEditingNodeId,
							perspectiveEditNodeId,
							pointerMode: pointerState.mode,
							nodeMenuNodeId: nodeMenuAt?.nodeId ?? null,
							pendingConnection,
							magnetPort,
							imageUpscalePanelNodeId,
							videoEnhancePanelNodeId,
							videoExtendPanelNodeId,
							videoExtensionModelInfos,
							perspectiveEditSettings,
							uploadLabel: COPY.upload,
							openEditorLabel: COPY.openEditor,
							onPointerDown: handleNodePointerDown,
							onClick: handleNodeClick,
							onContextMenu: handleNodeContextMenu,
							onConnectionPortPointerDown: handleConnectionPortPointerDown,
							onConnectionPortPointerMove: handleConnectionPortPointerMove,
							onConnectionPortPointerLeave: handleConnectionPortPointerLeave,
							onOpenUpload: (nodeId, type) => openUploadPicker({ nodeId, type }),
							onAudioVoiceModeChange: setAudioVoiceMode,
							onImageToolbarAction: handleImageToolbarAction,
							onGenerateImageUpscale: (nodeId) => void upscaleImageAsset(nodeId),
							onCloseImageUpscalePanel: closeImageUpscalePanel,
							onImageUpscaleSettingChange: updateImageUpscaleSetting,
							imageUpscaleSettings,
							onRedrawGenerate: handleRedrawGenerate,
							onRedrawClose: closeRedrawEdit,
							onPerspectiveEditChange: handlePerspectiveEditChange,
							onPerspectiveEditGenerate: handlePerspectiveEditGenerate,
							onPerspectiveEditClose: closePerspectiveEdit,
							onOpenImagePreview: openImagePreview,
							onOpenVideoPreview: openVideoPreview,
							onVideoMetadataLoaded: updateVideoNodeAspectSize,
							onOpenVideoEnhancePanel: (nodeId) => void openVideoEnhancePanel(nodeId),
							onExtendGrokVideo: (nodeId) => void extendGrokVideoAsset(nodeId),
							onOpenVideoExtendPanel: (nodeId) => void openVideoExtendPanel(nodeId),
							onGenerateVideoEnhancement: (nodeId) =>
								videoExtendPanelNodeId === nodeId ? void startVideoExtension(nodeId) : void enhanceVideoAsset(nodeId),
							onCloseVideoEnhancePanel: closeVideoEnhancePanel,
							onCloseVideoExtendPanel: closeVideoExtendPanel,
							onVideoEnhanceSettingChange: updateVideoEnhanceSetting,
							onVideoExtendModeChange: (mode) => setVideoExtendMode(mode),
							videoEnhanceSettings,
						videoExtendMode,
						stopNodeControlPointerDown,
					}}
					/>

					<CanvasSurfaceOverlays
						connectionCutProps={{
							connectionCut,
							onClear: () => {
								clearConnectionCutTimer();
								setConnectionCut(null);
							},
							onCut: cutConnection,
						}}
						selectionOverlayProps={{
							groupBounds: null,
							selectedNodeCount: 0,
							selectionBox,
							onClearSelection: () => setSelectedIds([]),
							onCreateAsset: () => createNode(activeTool),
						}}
						addNodeMenuProps={{
							menuAt,
							onCreateNode: createNode,
							onCreateReferencedNode: createReferencedNode,
							onOpenUpload: () => openUploadPicker({}),
						}}
						nodeContextMenuProps={{
							nodeMenuAt,
							hasAsset: Boolean(
								nodeMenuAt ? nodeById.get(nodeMenuAt.nodeId)?.asset : false,
							),
							isRenaming: Boolean(
								nodeMenuAt && renamingNodeId === nodeMenuAt.nodeId,
							),
							renameDraft,
							renameInputRef,
							onCreateAsset: () => createNode(activeTool),
							onSubmitRename: submitRenameNodeAsset,
							onRenameDraftChange: setRenameDraft,
							onCancelRename: dismissOverlays,
							onOpenRenameEditor: openRenameEditor,
							onSaveAssetToLibrary: saveNodeAssetToLibrary,
							onCopyNode: copyNodeToClipboard,
							onDuplicateNode: duplicateNode,
							onDeleteNode: deleteNode,
						}}
						textToolbarProps={{
							visible: showFloatingTextToolbar,
							toolbarStyle: floatingTextToolbarStyle,
						}}
						floatingComposerProps={
							showFloatingComposer && floatingComposerStyle
								? {
										type: primaryType,
										composer,
										panelStyle: floatingComposerStyle,
										selectedNodeId: primaryNode?.id ?? null,
										styleLibrary,
										selectedStyle: primaryStyle,
										imageModelCapability: primaryImageModelCapability,
										promptPrefix,
										referenceAssets: effectivePrimaryReferenceAssets,
										canAddReferenceAsset: canAddPrimaryReferenceAsset,
										videoModelCapability: primaryVideoModelCapability,
										recommendedVideoMode: recommendedPrimaryVideoMode,
										modelOptions,
										imageRatios: IMAGE_ASPECT_RATIOS,
										imageResolutions: IMAGE_RESOLUTIONS,
										openDropdown,
										isSending: isPrimaryNodeSending,
										onChangeStyle: (nodeId, presetId) =>
											updateNodeStyle(nodeId, presetId, "manual"),
										onPromptChange: updatePrompt,
										onToggleDropdown: toggleDropdown,
										onCloseDropdown: () => setOpenDropdown(null),
										onSwitchModel: switchModel,
										onUpdateImageOption: updateImageOption,
										onUpdateTextOption: updateTextOption,
										onUpdateAudioOption: updateAudioOption,
										onUpdateMusicOption: updateMusicOption,
										onUpdateVideoOption: updateVideoOption,
										onUploadReferenceAsset: (nodeId, slotIndex) => {
											openUploadPicker({
												nodeId,
												type: primaryType === "music" ? "music" : "image",
												referenceSlot: slotIndex,
											});
										},
										onSend: handlePrimaryComposerSend,
									}
								: null
						}
					/>
			</CanvasStageShell>

			<CanvasSidePanelSlot
				agentOpen={agentOpen}
				isCanvasView={appView === "canvas"}
				isDirectorMode={canvasMode === "director"}
				helloUser={COPY.helloUser}
				helloTitle={COPY.helloTitle}
				agentOrbSrc={agentOrb}
				onCloseAgent={() => setAgentOpen(false)}
				onOpenAgent={() => setAgentOpen(true)}
				agentComposer={{
					composer: composerByType[activeTool],
					type: activeTool,
					onPromptChange: updatePrompt,
				}}
				inspectorProps={null}
				directorGuideProps={{
					projectTitle: currentCanvasProject?.title ?? COPY.project,
					modeLabel: canvasModeMeta.label,
					onCreateShot: () => createNode("shot"),
					onBackToCanvas: () => setCanvasMode("canvas"),
				}}
			/>

			<CanvasZoomHud
				visible={showZoomHud}
				zoom={zoom}
				zoomMin={ZOOM_MIN}
				zoomMax={ZOOM_MAX}
				onResetZoom={() => setZoom(1)}
			/>
		</AppRuntimeShell>
	);
}
