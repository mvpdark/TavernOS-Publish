import type { PointerEvent } from "react";

import type { NodeType } from "../canvas-types";

export type UploadableNodeType = Extract<
	NodeType,
	"image" | "video" | "audio" | "music" | "editor"
>;

type CanvasNodeUploadPillProps = {
	nodeId: string;
	nodeType: UploadableNodeType;
	uploadLabel: string;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onOpenUpload: (nodeId: string, type: UploadableNodeType) => void;
};

export function CanvasNodeUploadPill({
	nodeId,
	nodeType,
	uploadLabel,
	stopNodeControlPointerDown,
	onOpenUpload,
}: CanvasNodeUploadPillProps) {
	return (
		<button
			className="upload-pill"
			type="button"
			onPointerDown={stopNodeControlPointerDown}
			onClick={(event) => {
				event.stopPropagation();
				onOpenUpload(nodeId, nodeType);
			}}
		>
			{uploadLabel}
		</button>
	);
}
