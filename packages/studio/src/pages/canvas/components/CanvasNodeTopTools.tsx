import type { PointerEvent } from "react";

import type { ImageToolbarAction } from "../appCanvasNodeViewState";
import type { CanvasNode } from "../canvas-types";
import { CanvasNodeAudioTopTools } from "./CanvasNodeAudioTopTools";
import { CanvasNodeImageTopTools } from "./CanvasNodeImageTopTools";
import {
	CanvasNodeUploadPill,
	type UploadableNodeType,
} from "./CanvasNodeUploadPill";
import { CanvasNodeVideoTopTools } from "./CanvasNodeVideoTopTools";

export type CanvasNodeTopToolsProps = {
	node: CanvasNode;
	show: boolean;
	isImageAsset: boolean;
	isPerspectiveEditing: boolean;
	imageToolbarActions: readonly ImageToolbarAction[];
	uploadLabel: string;
	isVideoEnhanceButtonActive: boolean;
	isVideoEnhanceButtonDisabled: boolean;
	isVideoExtendButtonActive: boolean;
	isVideoExtendButtonDisabled: boolean;
	videoEnhanceButtonLabel: string;
	videoExtendButtonLabel: string;
	showGrokExtendButton: boolean;
	grokExtendButtonLabel: string;
	grokExtendButtonDisabled: boolean;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onImageToolbarAction: (nodeId: string, actionKey: string) => void;
	onAudioVoiceModeChange?: (nodeId: string, mode: "clone" | "design") => void;
	onOpenUpload: (
		nodeId: string,
		type: UploadableNodeType,
	) => void;
	onOpenVideoEnhancePanel: (nodeId: string) => void;
	onOpenVideoExtendPanel: (nodeId: string) => void;
	onExtendGrokVideo: (nodeId: string) => void;
};

export function CanvasNodeTopTools({
	node,
	show,
	isImageAsset,
	isPerspectiveEditing,
	imageToolbarActions,
	uploadLabel,
	isVideoEnhanceButtonActive,
	isVideoEnhanceButtonDisabled,
	isVideoExtendButtonActive,
	isVideoExtendButtonDisabled,
	videoEnhanceButtonLabel,
	videoExtendButtonLabel,
	showGrokExtendButton,
	grokExtendButtonLabel,
	grokExtendButtonDisabled,
	stopNodeControlPointerDown,
	onImageToolbarAction,
	onAudioVoiceModeChange,
	onOpenUpload,
	onOpenVideoEnhancePanel,
	onOpenVideoExtendPanel,
	onExtendGrokVideo,
}: CanvasNodeTopToolsProps) {
	if (!show) return null;
	return (
		<div className={`node-extension node-extension--top node-extension--${node.type}`}>
			{isImageAsset ? (
				<CanvasNodeImageTopTools
					nodeId={node.id}
					isPerspectiveEditing={isPerspectiveEditing}
					imageToolbarActions={imageToolbarActions}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
					onImageToolbarAction={onImageToolbarAction}
				/>
			) : node.type === "text" || node.type === "shot" ? null : node.type === "audio" ? (
				<CanvasNodeAudioTopTools
					nodeId={node.id}
					voiceMode={node.composer?.audioVoiceMode}
					uploadLabel={uploadLabel}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
					onAudioVoiceModeChange={onAudioVoiceModeChange}
					onOpenAudioUpload={(nodeId) => onOpenUpload(nodeId, "audio")}
				/>
			) : node.type === "video" ? (
				<CanvasNodeVideoTopTools
					nodeId={node.id}
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
					onOpenVideoEnhancePanel={onOpenVideoEnhancePanel}
					onOpenVideoUpload={(nodeId) => onOpenUpload(nodeId, "video")}
					onOpenVideoExtendPanel={onOpenVideoExtendPanel}
					onExtendGrokVideo={onExtendGrokVideo}
				/>
			) : (
				<CanvasNodeUploadPill
					nodeId={node.id}
					nodeType={node.type as UploadableNodeType}
					uploadLabel={uploadLabel}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
					onOpenUpload={onOpenUpload}
				/>
			)}
		</div>
	);
}
