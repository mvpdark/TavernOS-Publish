import type { PointerEvent } from "react";

import type { CanvasNode, NodeType } from "../canvas-types";
import { ThreeDDirectorPanoramaPreview } from "./ThreeDDirectorPanoramaPreview";
import {
	CropEditor,
	type CropBox,
} from "./CanvasCropEditor";
import { RedrawMaskEditor } from "./CanvasRedrawMaskEditor";

export type CanvasNodeImageAssetPreviewProps = {
	node: CanvasNode;
	asset: {
		url: string;
		name: string;
		providerMetadata?: CanvasNode["asset"] extends infer Asset
			? Asset extends { providerMetadata?: infer ProviderMetadata }
				? ProviderMetadata
				: never
			: never;
	};
	showShotSource: boolean;
	shotSourceInlineLabel: string;
	isThreeDDirectorImage: boolean;
	isCropEditing: boolean;
	isRedrawEditing: boolean;
	isRedrawGenerating: boolean;
	openEditorLabel: string;
	onImageToolbarAction: (nodeId: string, actionKey: string, cropBox?: CropBox) => void;
	onOpenUpload: (
		nodeId: string,
		type: Extract<NodeType, "image" | "editor">,
	) => void;
	onRedrawGenerate: (nodeId: string, maskDataUrl: string) => void;
	onRedrawClose: () => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
};

export function CanvasNodeImageAssetPreview({
	node,
	asset,
	showShotSource,
	shotSourceInlineLabel,
	isThreeDDirectorImage,
	isCropEditing,
	isRedrawEditing,
	isRedrawGenerating,
	openEditorLabel,
	onImageToolbarAction,
	onOpenUpload,
	onRedrawGenerate,
	onRedrawClose,
	stopNodeControlPointerDown,
}: CanvasNodeImageAssetPreviewProps) {
	return (
		<div
			className={`canvas-node__asset-preview ${node.type === "image" ? "canvas-node__asset-preview--image" : ""}`}
		>
			{showShotSource && node.type === "image" ? (
				<div className="canvas-node__source-inline">{shotSourceInlineLabel}</div>
			) : null}
			{isThreeDDirectorImage ? (
				<ThreeDDirectorPanoramaPreview
					assetUrl={asset.url}
					assetName={asset.name}
					providerMetadata={asset.providerMetadata}
				/>
			) : (
				<img
					src={asset.url}
					alt={asset.name}
					className="canvas-node__asset-image"
					draggable={false}
					onDragStart={(event) => event.preventDefault()}
				/>
			)}
			{isCropEditing ? (
				<CropEditor
					nodeId={node.id}
					onImageToolbarAction={onImageToolbarAction}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			) : null}
			{isRedrawEditing ? (
				<RedrawMaskEditor
					nodeId={node.id}
					assetUrl={asset.url}
					assetName={asset.name}
					isGenerating={isRedrawGenerating}
					onGenerate={onRedrawGenerate}
					onClose={onRedrawClose}
					stopNodeControlPointerDown={stopNodeControlPointerDown}
				/>
			) : null}
			{node.type === "image" ? (
				<button
					className="asset-replace-btn"
					type="button"
					onPointerDown={stopNodeControlPointerDown}
					onClick={(event) => {
						event.stopPropagation();
						onOpenUpload(node.id, "image");
					}}
				>
					<span>↥</span>
					替换
				</button>
			) : null}
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
