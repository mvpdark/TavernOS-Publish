import { Suspense, lazy } from "react";
import { getNodeCopy } from "../canvasNodeActions";
import type { MagnetPortState, PointerState } from "../appCanvasState";
import type { NodeConnection, NodePort } from "../hooks/useConnectionInteractionHelpers";
import {
	getShotLinkedNodes,
	getShotSourceNode,
} from "../primaryNodeHelpers";
import type { VideoExtensionModelInfo } from "../appVideoModelHelpers";
import type { CanvasNode } from "../canvas-types";
import type { CanvasNodeViewProps } from "./CanvasNodeView";

const CanvasNodeView = lazy(() =>
	import("./CanvasNodeView").then((module) => ({
		default: module.CanvasNodeView,
	})),
);

type CanvasNodeLayerBaseProps = Pick<
	CanvasNodeViewProps,
	| "perspectiveEditSettings"
	| "uploadLabel"
	| "openEditorLabel"
	| "onPointerDown"
	| "onClick"
	| "onContextMenu"
	| "onConnectionPortPointerDown"
	| "onConnectionPortPointerMove"
	| "onConnectionPortPointerLeave"
	| "onOpenUpload"
	| "onAudioVoiceModeChange"
	| "onImageToolbarAction"
	| "onGenerateImageUpscale"
	| "onCloseImageUpscalePanel"
	| "onImageUpscaleSettingChange"
	| "imageUpscaleSettings"
	| "onRedrawGenerate"
	| "onRedrawClose"
	| "onPerspectiveEditChange"
	| "onPerspectiveEditGenerate"
	| "onPerspectiveEditClose"
	| "onOpenImagePreview"
	| "onOpenVideoPreview"
	| "onVideoMetadataLoaded"
	| "onOpenVideoEnhancePanel"
	| "onExtendGrokVideo"
	| "onOpenVideoExtendPanel"
	| "onGenerateVideoEnhancement"
	| "onCloseVideoEnhancePanel"
	| "onCloseVideoExtendPanel"
	| "onVideoEnhanceSettingChange"
	| "onVideoExtendModeChange"
	| "videoEnhanceSettings"
	| "videoExtendMode"
	| "stopNodeControlPointerDown"
>;

export type CanvasNodeLayerProps = CanvasNodeLayerBaseProps & {
	nodes: CanvasNode[];
	connections: NodeConnection[];
	nodeById: Map<string, CanvasNode>;
	isPreviewMode: boolean;
	previewFocusMediaIdSet: Set<string>;
	selectedIdSet: Set<string>;
	liftedDragIds: Set<string>;
	videoFusionHoverNodeId: string | null;
	generatingNodeIds: Set<string>;
	perspectiveGeneratingNodeId: string | null;
	redrawGeneratingNodeId: string | null;
	threeDDirectorGeneratingNodeId: string | null;
	reversePromptGeneratingNodeId: string | null;
	videoEnhancingNodeId: string | null;
	videoExtendingNodeId: string | null;
	imageUpscalingNodeId: string | null;
	ffmpegInstallingNodeId: string | null;
	videoFusingPairKey: string | null;
	cropEditingNodeId: string | null;
	redrawEditingNodeId: string | null;
	perspectiveEditNodeId: string | null;
	pointerMode: PointerState["mode"];
	nodeMenuNodeId: string | null;
	pendingConnection: (NodePort & { pointerX: number; pointerY: number }) | null;
	magnetPort: MagnetPortState;
	imageUpscalePanelNodeId: string | null;
	videoEnhancePanelNodeId: string | null;
	videoExtendPanelNodeId: string | null;
	videoExtensionModelInfos: Record<string, VideoExtensionModelInfo | undefined>;
};

export function CanvasNodeLayer({
	nodes,
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
	pointerMode,
	nodeMenuNodeId,
	pendingConnection,
	magnetPort,
	imageUpscalePanelNodeId,
	videoEnhancePanelNodeId,
	videoExtendPanelNodeId,
	videoExtensionModelInfos,
	perspectiveEditSettings,
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
	stopNodeControlPointerDown,
}: CanvasNodeLayerProps) {
	return (
		<Suspense fallback={null}>
			{nodes.map((node) => {
				const shotSourceNode = getShotSourceNode(node, connections, nodeById);
				const shotLinked = getShotLinkedNodes(node, connections, nodeById);
				const previewRole = isPreviewMode
					? previewFocusMediaIdSet.has(node.id)
						? node.asset
							? "result-filled"
							: "result-empty"
						: "structure"
					: undefined;
				return (
					<CanvasNodeView
						key={node.id}
						node={node}
						content={getNodeCopy(node.type)}
						shotSourceTitle={shotSourceNode?.title ?? null}
						shotLinkedCharacterCount={shotLinked.characters.length}
						shotLinkedSceneCount={shotLinked.scenes.length}
						shotLinkedCharacterTitles={shotLinked.characters.map((node) => node.title)}
						shotLinkedSceneTitles={shotLinked.scenes.map((node) => node.title)}
						previewRole={previewRole}
						isSelected={selectedIdSet.has(node.id)}
						isLifted={liftedDragIds.has(node.id)}
						isFusionTarget={videoFusionHoverNodeId === node.id}
						isGenerating={
							generatingNodeIds.has(node.id) ||
							perspectiveGeneratingNodeId === node.id ||
							redrawGeneratingNodeId === node.id ||
							threeDDirectorGeneratingNodeId === node.id ||
							reversePromptGeneratingNodeId === node.id ||
							videoEnhancingNodeId === node.id ||
							videoExtendingNodeId === node.id ||
							imageUpscalingNodeId === node.id ||
							ffmpegInstallingNodeId === node.id ||
							Boolean(videoFusingPairKey?.includes(node.id))
						}
						isCropEditing={cropEditingNodeId === node.id}
						isRedrawEditing={redrawEditingNodeId === node.id}
						isPerspectiveEditing={perspectiveEditNodeId === node.id}
						perspectiveEditSettings={perspectiveEditSettings}
						isRedrawGenerating={redrawGeneratingNodeId === node.id}
						isPerspectiveGenerating={perspectiveGeneratingNodeId === node.id}
						showExtensions={
							selectedIdSet.has(node.id) &&
							pointerMode !== "dragging-nodes" &&
							nodeMenuNodeId !== node.id
						}
						showConnectionPorts={Boolean(pendingConnection)}
						pendingConnectionSide={
							pendingConnection?.nodeId === node.id
								? pendingConnection.side
								: null
						}
						magnetPort={magnetPort?.nodeId === node.id ? magnetPort : null}
						uploadLabel={uploadLabel}
						openEditorLabel={openEditorLabel}
						onPointerDown={onPointerDown}
						onClick={onClick}
						onContextMenu={onContextMenu}
						onConnectionPortPointerDown={onConnectionPortPointerDown}
						onConnectionPortPointerMove={onConnectionPortPointerMove}
						onConnectionPortPointerLeave={onConnectionPortPointerLeave}
						onOpenUpload={onOpenUpload}
						onAudioVoiceModeChange={onAudioVoiceModeChange}
						onImageToolbarAction={onImageToolbarAction}
						onGenerateImageUpscale={onGenerateImageUpscale}
						onCloseImageUpscalePanel={onCloseImageUpscalePanel}
						onImageUpscaleSettingChange={onImageUpscaleSettingChange}
						imageUpscaleSettings={imageUpscaleSettings}
						isImageUpscalePanelOpen={imageUpscalePanelNodeId === node.id}
						isImageUpscaling={imageUpscalingNodeId === node.id}
						onRedrawGenerate={onRedrawGenerate}
						onRedrawClose={onRedrawClose}
						onPerspectiveEditChange={onPerspectiveEditChange}
						onPerspectiveEditGenerate={onPerspectiveEditGenerate}
						onPerspectiveEditClose={onPerspectiveEditClose}
						onOpenImagePreview={onOpenImagePreview}
						onOpenVideoPreview={onOpenVideoPreview}
						onVideoMetadataLoaded={onVideoMetadataLoaded}
						onOpenVideoEnhancePanel={onOpenVideoEnhancePanel}
						onExtendGrokVideo={onExtendGrokVideo}
						onOpenVideoExtendPanel={onOpenVideoExtendPanel}
						onGenerateVideoEnhancement={onGenerateVideoEnhancement}
						onCloseVideoEnhancePanel={onCloseVideoEnhancePanel}
						onCloseVideoExtendPanel={onCloseVideoExtendPanel}
						onVideoEnhanceSettingChange={onVideoEnhanceSettingChange}
						onVideoExtendModeChange={onVideoExtendModeChange}
						videoEnhanceSettings={videoEnhanceSettings}
						videoExtendMode={videoExtendMode}
						videoExtensionModelInfo={videoExtensionModelInfos[node.id]}
						isVideoEnhancePanelOpen={videoEnhancePanelNodeId === node.id}
						isVideoExtendPanelOpen={videoExtendPanelNodeId === node.id}
						isVideoEnhancing={
							videoEnhancingNodeId === node.id ||
							ffmpegInstallingNodeId === node.id
						}
						isVideoExtending={videoExtendingNodeId === node.id}
						stopNodeControlPointerDown={stopNodeControlPointerDown}
						/>
				);
			})}
		</Suspense>
	);
}
