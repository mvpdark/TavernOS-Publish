import type { PointerEvent } from "react";

import type { CanvasNode } from "../canvas-types";
import {
	AudioAssetPreview,
	VideoAssetPreview,
} from "./CanvasAssetPreviews";

export type CanvasNodeMediaFallbackPreviewProps = {
	node: CanvasNode;
	isVideoAsset: boolean;
	isAudioAsset: boolean;
	inlineAsset: { url: string } | null;
	showShotSource: boolean;
	shotSourceInlineLabel: string;
	innerIcon: string | null;
	assetDisplayName: string;
	openEditorLabel: string;
	onOpenUpload: (nodeId: string, type: "editor") => void;
	onOpenVideoPreview: (nodeId: string) => void;
	onVideoMetadataLoaded: (nodeId: string, width: number, height: number) => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
};

export function CanvasNodeMediaFallbackPreview({
	node,
	isVideoAsset,
	isAudioAsset,
	inlineAsset,
	showShotSource,
	shotSourceInlineLabel,
	innerIcon,
	assetDisplayName,
	openEditorLabel,
	onOpenUpload,
	onOpenVideoPreview,
	onVideoMetadataLoaded,
	stopNodeControlPointerDown,
}: CanvasNodeMediaFallbackPreviewProps) {
	if (isVideoAsset && inlineAsset) {
		return (
			<div className="canvas-node__asset-preview-wrap-secondary">
				{showShotSource ? (
					<div className="canvas-node__source-inline">{shotSourceInlineLabel}</div>
				) : null}
				<VideoAssetPreview
					assetUrl={inlineAsset.url}
					nodeId={node.id}
					onOpenVideoPreview={onOpenVideoPreview}
					onVideoMetadataLoaded={onVideoMetadataLoaded}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			</div>
		);
	}
	if (isAudioAsset && inlineAsset) {
		return (
			<AudioAssetPreview
				assetUrl={inlineAsset.url}
				isMusic={node.type === "music"}
				stopNodeControlPointerDown={stopNodeControlPointerDown}
			/>
		);
	}
	if (node.asset) {
		return (
			<div className="canvas-node__icon-wrap">
				{showShotSource ? (
					<div className="canvas-node__source-inline">{shotSourceInlineLabel}</div>
				) : null}
				<span className="canvas-node__icon">{innerIcon}</span>
				<div className="canvas-node__asset-name">{assetDisplayName}</div>
			</div>
		);
	}
	return (
		<div className="canvas-node__icon-wrap">
			{showShotSource ? (
				<div className="canvas-node__source-inline">{shotSourceInlineLabel}</div>
			) : null}
			<span className="canvas-node__icon">{innerIcon}</span>
			{node.type === "editor" ? (
				<button
					className="editor-open-btn"
					type="button"
					onPointerDown={stopNodeControlPointerDown}
					onClick={(event) => {
						event.stopPropagation();
						onOpenUpload(node.id, "editor");
					}}
				>
					{openEditorLabel}
				</button>
			) : null}
		</div>
	);
}
