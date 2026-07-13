import {
	type PointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { VideoExtensionModelInfo } from "../appVideoModelHelpers";
import type { CanvasNode, NodeType } from "../canvas-types";
import {
	buildCanvasNodeViewState,
	buildCanvasNodeVideoToolbarState,
} from "../appCanvasNodeViewState";
import {
	buildCanvasNodeAssetPreviewState,
} from "../appMediaPreviewState";
import {
	type CropBox,
} from "./CanvasCropEditor";
import {
	type PerspectiveEditSettings,
} from "./CanvasPerspectiveEditPanel";
import { CanvasNodeConnectionPorts } from "./CanvasNodeConnectionPorts";
import { attachCanvasNodeInteractionBridge } from "./CanvasNodeInteractionBridge";
import { CanvasNodeHoverAssetName } from "./CanvasNodeHoverAssetName";
import { CanvasNodeImageAssetPreview } from "./CanvasNodeImageAssetPreview";
import { CanvasNodeMediaFallbackPreview } from "./CanvasNodeMediaFallbackPreview";
import { CanvasNodeOverlayPanels } from "./CanvasNodeOverlayPanels";
import { CanvasNodeStructuredPreview } from "./CanvasNodeStructuredPreview";
import { CanvasNodeTextPreview } from "./CanvasNodeTextPreview";
import { CanvasNodeTopTools } from "./CanvasNodeTopTools";
import type { CanvasNodePointerDownEvent } from "../hooks/useCanvasNodeDragStart";
import type {
	CanvasNodeClickEvent,
	CanvasNodeContextMenuEvent,
} from "../hooks/useCanvasPointerInteractions";

export type NodeContent = {
	label: string;
	placeholder: string;
	innerIcon: string | null;
};

export type NodePortSide = "left" | "right";
export type { CropBox } from "./CanvasCropEditor";
export type {
	PerspectiveEditPreset,
	PerspectiveEditSettings,
} from "./CanvasPerspectiveEditPanel";
export type VideoEnhanceSettings = { fps: string; scale: string; accelerator: "cpu" | "amd" };
export type ImageUpscaleSettings = { scale: string };
export type CanvasNodeViewProps = {
	node: CanvasNode;
	content: NodeContent;
	shotSourceTitle?: string | null;
	shotLinkedCharacterCount?: number;
	shotLinkedSceneCount?: number;
	shotLinkedCharacterTitles?: string[];
	shotLinkedSceneTitles?: string[];
	previewRole?: "result-filled" | "result-empty" | "structure";
	isSelected: boolean;
	isLifted: boolean;
	isFusionTarget: boolean;
	isGenerating: boolean;
	isCropEditing: boolean;
	isRedrawEditing: boolean;
	isPerspectiveEditing: boolean;
	perspectiveEditSettings: PerspectiveEditSettings;
	isRedrawGenerating: boolean;
	isPerspectiveGenerating: boolean;
	showExtensions: boolean;
	showConnectionPorts: boolean;
	pendingConnectionSide: NodePortSide | null;
	magnetPort: { side: NodePortSide; x: number; y: number } | null;
	uploadLabel: string;
	openEditorLabel: string;
	onPointerDown: (event: CanvasNodePointerDownEvent, id: string) => void;
	onClick: (event: CanvasNodeClickEvent, id: string) => void;
	onContextMenu: (event: CanvasNodeContextMenuEvent, id: string) => void;
	onConnectionPortPointerDown: (
		event: PointerEvent<HTMLButtonElement>,
		nodeId: string,
		side: NodePortSide,
	) => void;
	onConnectionPortPointerMove: (
		event: PointerEvent<HTMLButtonElement>,
		nodeId: string,
		side: NodePortSide,
	) => void;
	onConnectionPortPointerLeave: (nodeId: string, side: NodePortSide) => void;
	onOpenUpload: (
		nodeId: string,
		type: Extract<NodeType, "image" | "video" | "audio" | "music" | "editor">,
	) => void;
	onAudioVoiceModeChange?: (nodeId: string, mode: "clone" | "design") => void;
	onImageToolbarAction: (nodeId: string, actionKey: string, cropBox?: CropBox) => void;
	onGenerateImageUpscale: (nodeId: string) => void;
	onCloseImageUpscalePanel: () => void;
	onImageUpscaleSettingChange: (key: keyof ImageUpscaleSettings, value: string) => void;
	imageUpscaleSettings: ImageUpscaleSettings;
	isImageUpscalePanelOpen: boolean;
	isImageUpscaling: boolean;
	onRedrawGenerate: (nodeId: string, maskDataUrl: string) => void;
	onRedrawClose: () => void;
	onPerspectiveEditChange: (nextPartial: Partial<PerspectiveEditSettings>) => void;
	onPerspectiveEditGenerate: (nodeId: string) => void;
	onPerspectiveEditClose: () => void;
	onOpenImagePreview: (nodeId: string) => void;
	onOpenVideoPreview: (nodeId: string) => void;
	onVideoMetadataLoaded: (nodeId: string, width: number, height: number) => void;
	onOpenVideoEnhancePanel: (nodeId: string) => void;
	onExtendGrokVideo: (nodeId: string) => void;
	onOpenVideoExtendPanel: (nodeId: string) => void;
	onGenerateVideoEnhancement: (nodeId: string) => void;
	onCloseVideoEnhancePanel: () => void;
	onCloseVideoExtendPanel: () => void;
	onVideoEnhanceSettingChange: (key: keyof VideoEnhanceSettings, value: string) => void;
	onVideoExtendModeChange: (mode: "full" | "half") => void;
	videoEnhanceSettings: VideoEnhanceSettings;
	videoExtendMode: "full" | "half";
	videoExtensionModelInfo?: VideoExtensionModelInfo;
	isVideoEnhancePanelOpen: boolean;
	isVideoExtendPanelOpen: boolean;
	isVideoEnhancing: boolean;
	isVideoExtending: boolean;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
};

export function CanvasNodeView({
	node,
	content,
	shotSourceTitle,
	shotLinkedCharacterCount = 0,
	shotLinkedSceneCount = 0,
	shotLinkedCharacterTitles = [],
	shotLinkedSceneTitles = [],
	previewRole,
	isSelected,
	isLifted,
	isFusionTarget,
	isGenerating,
	isCropEditing,
	isRedrawEditing,
	isPerspectiveEditing,
	perspectiveEditSettings,
	isRedrawGenerating,
	isPerspectiveGenerating,
	showExtensions,
	showConnectionPorts,
	pendingConnectionSide,
	magnetPort,
	uploadLabel,
	openEditorLabel,
	onPointerDown,
	onClick,
	onContextMenu,
	onConnectionPortPointerDown,
	onConnectionPortPointerMove,
	onConnectionPortPointerLeave,
	onOpenUpload,
	onAudioVoiceModeChange,
	onImageToolbarAction,
	onGenerateImageUpscale,
	onCloseImageUpscalePanel,
	onImageUpscaleSettingChange,
	imageUpscaleSettings,
	isImageUpscalePanelOpen,
	isImageUpscaling,
	onRedrawGenerate,
	onRedrawClose,
	onPerspectiveEditChange,
	onPerspectiveEditGenerate,
	onPerspectiveEditClose,
	onOpenImagePreview,
	onOpenVideoPreview,
	onVideoMetadataLoaded,
	onOpenVideoEnhancePanel,
	onExtendGrokVideo,
	onOpenVideoExtendPanel,
	onGenerateVideoEnhancement,
	onCloseVideoEnhancePanel,
	onCloseVideoExtendPanel,
	onVideoEnhanceSettingChange,
	onVideoExtendModeChange,
	videoEnhanceSettings,
	videoExtendMode,
	videoExtensionModelInfo,
	isVideoEnhancePanelOpen,
	isVideoExtendPanelOpen,
	isVideoEnhancing,
	isVideoExtending,
	stopNodeControlPointerDown,
}: CanvasNodeViewProps) {
	const hoverNameTimerRef = useRef<number | null>(null);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	const nodeTypeRef = useRef<NodeType>(node.type);
	const nodeAssetUrlRef = useRef<string | null>(null);
	const onOpenImagePreviewRef = useRef(onOpenImagePreview);
	const [showHoverAssetName, setShowHoverAssetName] = useState(false);
	const {
		inlineAsset,
		assetDisplayName,
		isImageAsset,
		isVideoAsset,
		isAudioAsset,
		hasFullBleedAsset,
		shouldShowAssetName,
		isThreeDDirectorImage,
	} = buildCanvasNodeAssetPreviewState(node);
	const {
		titleLabel,
		textPreview,
		modelDisplayLabel,
		showShotSource,
		shotSourceBadgeLabel,
		shotSourceInlineLabel,
		showGrokExtendButton,
		imageToolbarActions,
		shotCharacterSummary,
		shotSceneSummary,
		shotMetaLabels,
		showStructuredPreview,
		structuredPreviewChipLabel,
		showStructuredPreviewLinks,
		showStructuredPreviewMeta,
	} = buildCanvasNodeViewState(node, {
		shotSourceTitle,
		shotLinkedCharacterCount,
		shotLinkedSceneCount,
		shotLinkedCharacterTitles,
		shotLinkedSceneTitles,
	});
	const {
		isVideoEnhanceButtonActive,
		isVideoEnhanceButtonDisabled,
		isVideoExtendButtonActive,
		isVideoExtendButtonDisabled,
		videoEnhanceButtonLabel,
		videoExtendButtonLabel,
		grokExtendButtonLabel,
		grokExtendButtonDisabled,
	} = buildCanvasNodeVideoToolbarState({
		hasInlineVideoAsset: Boolean(inlineAsset && node.type === "video"),
		isVideoEnhancePanelOpen,
		isVideoEnhancing,
		isVideoExtendPanelOpen,
		isVideoExtending,
	});
	nodeTypeRef.current = node.type;
	nodeAssetUrlRef.current = inlineAsset?.url ?? null;
	onOpenImagePreviewRef.current = onOpenImagePreview;
	const extensionModelInfo = node.type === "video" ? videoExtensionModelInfo : undefined;
	const showPorts = showExtensions || showConnectionPorts;

	const handleMouseEnter = useCallback(() => {
		if (!inlineAsset?.name) return;
		if (hoverNameTimerRef.current !== null) {
			window.clearTimeout(hoverNameTimerRef.current);
		}
		hoverNameTimerRef.current = window.setTimeout(() => {
			setShowHoverAssetName(true);
			hoverNameTimerRef.current = null;
		}, 300);
	}, [inlineAsset?.name]);

	const handleMouseLeave = useCallback(() => {
		if (hoverNameTimerRef.current !== null) {
			window.clearTimeout(hoverNameTimerRef.current);
			hoverNameTimerRef.current = null;
		}
		setShowHoverAssetName(false);
	}, []);

	useEffect(
		() => () => {
			if (hoverNameTimerRef.current !== null) {
				window.clearTimeout(hoverNameTimerRef.current);
			}
		},
		[],
	);

	useEffect(() => {
		const nodeElement = nodeRef.current;
		if (!nodeElement) return;

		return attachCanvasNodeInteractionBridge({
			nodeElement,
			nodeId: node.id,
			nodeTypeRef,
			nodeAssetUrlRef,
			onPointerDown,
			onClick,
			onContextMenu,
			onOpenImagePreviewRef,
			onMouseEnter: handleMouseEnter,
			onMouseLeave: handleMouseLeave,
		});
	}, [
		handleMouseEnter,
		handleMouseLeave,
		node.id,
		onClick,
		onContextMenu,
		onPointerDown,
	]);

	return (
		<div
			ref={nodeRef}
			className={`canvas-node canvas-node--${node.type} ${isSelected ? "is-selected" : ""} ${
				isLifted ? "is-lifted" : ""
			} ${isFusionTarget ? "is-fusion-target" : ""} ${
				isGenerating ? "is-generating-media" : ""} ${
				isCropEditing ? "is-crop-editing" : ""
			} ${
				isRedrawEditing ? "is-redraw-editing" : ""
			} ${
				isPerspectiveEditing ? "is-perspective-editing" : ""
			} ${
				isImageAsset ? "has-image-asset" : ""} ${
				previewRole ? `canvas-node--preview-${previewRole}` : ""
			}`}
			style={{
				width: node.width,
				height: node.height,
				transform: `translate(${node.x}px, ${node.y}px) translateY(var(--node-lift-y, 0px)) scale(var(--node-lift-scale, 1))`,
			}}
		>
			<CanvasNodeConnectionPorts
				nodeId={node.id}
				showPorts={showPorts}
				pendingConnectionSide={pendingConnectionSide}
				magnetPort={magnetPort}
				onConnectionPortPointerDown={onConnectionPortPointerDown}
				onConnectionPortPointerMove={onConnectionPortPointerMove}
				onConnectionPortPointerLeave={onConnectionPortPointerLeave}
			/>

			<div className="canvas-node__title">
				<span>{titleLabel}</span>
			</div>

			{showShotSource ? (
				<div className="canvas-node__source-badge">{shotSourceBadgeLabel}</div>
			) : null}

			<CanvasNodeTopTools
				node={node}
				show={showExtensions}
				isImageAsset={isImageAsset}
				isPerspectiveEditing={isPerspectiveEditing}
				imageToolbarActions={imageToolbarActions}
				uploadLabel={uploadLabel}
				isVideoEnhanceButtonActive={isVideoEnhanceButtonActive}
				isVideoEnhanceButtonDisabled={isVideoEnhanceButtonDisabled}
				isVideoExtendButtonActive={isVideoExtendButtonActive}
				isVideoExtendButtonDisabled={isVideoExtendButtonDisabled}
				videoEnhanceButtonLabel={videoEnhanceButtonLabel}
				videoExtendButtonLabel={videoExtendButtonLabel}
				showGrokExtendButton={showGrokExtendButton}
				grokExtendButtonLabel={grokExtendButtonLabel}
				grokExtendButtonDisabled={grokExtendButtonDisabled}
				stopNodeControlPointerDown={stopNodeControlPointerDown}
				onImageToolbarAction={onImageToolbarAction}
				onAudioVoiceModeChange={onAudioVoiceModeChange}
				onOpenUpload={onOpenUpload}
				onOpenVideoEnhancePanel={onOpenVideoEnhancePanel}
				onOpenVideoExtendPanel={onOpenVideoExtendPanel}
				onExtendGrokVideo={onExtendGrokVideo}
			/>

			<div
				className={`canvas-node__body ${hasFullBleedAsset ? "canvas-node__body--full-bleed" : ""}`}
			>
				{node.type === "text" ? (
					<CanvasNodeTextPreview
						hasModel={Boolean(node.composer?.model)}
						modelDisplayLabel={modelDisplayLabel}
						textPreview={textPreview}
					/>
				) : showStructuredPreview ? (
					<CanvasNodeStructuredPreview
						chipLabel={structuredPreviewChipLabel}
						showLinks={showStructuredPreviewLinks}
						characterSummary={shotCharacterSummary}
						sceneSummary={shotSceneSummary}
						showMeta={showStructuredPreviewMeta}
						metaLabels={shotMetaLabels}
						hasModel={Boolean(node.composer?.model)}
						modelDisplayLabel={modelDisplayLabel}
						textPreview={textPreview}
					/>
				) : content.placeholder ? (
					<span className="canvas-node__placeholder">
						{content.placeholder}
					</span>
				) : inlineAsset && (node.type === "image" || node.type === "editor") ? (
					<CanvasNodeImageAssetPreview
						node={node}
						asset={inlineAsset}
						showShotSource={showShotSource}
						shotSourceInlineLabel={shotSourceInlineLabel}
						isThreeDDirectorImage={isThreeDDirectorImage}
						isCropEditing={isCropEditing}
						isRedrawEditing={isRedrawEditing}
						isRedrawGenerating={isRedrawGenerating}
						openEditorLabel={openEditorLabel}
						onImageToolbarAction={onImageToolbarAction}
						onOpenUpload={onOpenUpload}
						onRedrawGenerate={onRedrawGenerate}
						onRedrawClose={onRedrawClose}
						stopNodeControlPointerDown={stopNodeControlPointerDown}
					/>
				) : (
					<CanvasNodeMediaFallbackPreview
						node={node}
						isVideoAsset={isVideoAsset}
						isAudioAsset={isAudioAsset}
						inlineAsset={inlineAsset}
						showShotSource={showShotSource}
						shotSourceInlineLabel={shotSourceInlineLabel}
						innerIcon={content.innerIcon}
						assetDisplayName={assetDisplayName}
						openEditorLabel={openEditorLabel}
						onOpenUpload={onOpenUpload}
						onOpenVideoPreview={onOpenVideoPreview}
						onVideoMetadataLoaded={onVideoMetadataLoaded}
						stopNodeControlPointerDown={stopNodeControlPointerDown}
					/>
				)}
			</div>

		<CanvasNodeOverlayPanels
				nodeId={node.id}
				nodeType={node.type}
				isImageUpscalePanelOpen={isImageUpscalePanelOpen}
				imageUpscaleSettings={imageUpscaleSettings}
				isImageUpscaling={isImageUpscaling}
				onImageUpscaleSettingChange={onImageUpscaleSettingChange}
				onGenerateImageUpscale={onGenerateImageUpscale}
				onCloseImageUpscalePanel={onCloseImageUpscalePanel}
				isPerspectiveEditing={isPerspectiveEditing}
				perspectiveEditSettings={perspectiveEditSettings}
				isPerspectiveGenerating={isPerspectiveGenerating}
				onPerspectiveEditChange={onPerspectiveEditChange}
				onPerspectiveEditGenerate={onPerspectiveEditGenerate}
				onPerspectiveEditClose={onPerspectiveEditClose}
				isVideoEnhancePanelOpen={isVideoEnhancePanelOpen}
				isVideoExtendPanelOpen={isVideoExtendPanelOpen}
				videoEnhanceSettings={videoEnhanceSettings}
				isVideoEnhancing={isVideoEnhancing}
				isVideoExtending={isVideoExtending}
				extensionModelInfo={extensionModelInfo}
				videoExtendMode={videoExtendMode}
				onVideoEnhanceSettingChange={onVideoEnhanceSettingChange}
				onGenerateVideoEnhancement={onGenerateVideoEnhancement}
				onCloseVideoEnhancePanel={onCloseVideoEnhancePanel}
				onCloseVideoExtendPanel={onCloseVideoExtendPanel}
				onVideoExtendModeChange={onVideoExtendModeChange}
				stopNodeControlPointerDown={stopNodeControlPointerDown}
			/>

			<CanvasNodeHoverAssetName
				name={assetDisplayName}
				show={shouldShowAssetName}
				visible={showHoverAssetName || isSelected}
			/>
		</div>
	);
}

