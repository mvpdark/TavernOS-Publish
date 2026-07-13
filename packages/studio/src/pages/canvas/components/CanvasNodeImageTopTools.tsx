import type { PointerEvent } from "react";

import type { ImageToolbarAction } from "../appCanvasNodeViewState";

type CanvasNodeImageTopToolsProps = {
	nodeId: string;
	isPerspectiveEditing: boolean;
	imageToolbarActions: readonly ImageToolbarAction[];
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onImageToolbarAction: (nodeId: string, actionKey: string) => void;
};

export function CanvasNodeImageTopTools({
	nodeId,
	isPerspectiveEditing,
	imageToolbarActions,
	stopNodeControlPointerDown,
	onImageToolbarAction,
}: CanvasNodeImageTopToolsProps) {
	return (
		<div className="image-node-top-tools">
			<div className="image-edit-toolbar image-edit-toolbar--text-only">
				{imageToolbarActions.map((action) => (
					<button
						key={action.key}
						className={`image-edit-toolbar__text-action image-edit-toolbar__text-action--${action.key} ${action.key === "perspective" && isPerspectiveEditing ? "is-active" : ""}`}
						type="button"
						onPointerDown={stopNodeControlPointerDown}
						onClick={(event) => {
							event.stopPropagation();
							onImageToolbarAction(nodeId, action.key);
						}}
					>
						{action.label}
					</button>
				))}
			</div>
		</div>
	);
}
