import type { NodeBounds } from "../appDisplayHelpers";
import type { CanvasSelectionBoxState } from "../hooks/useCanvasSelectionBox";

export type CanvasSelectionOverlaysProps = {
	groupBounds: NodeBounds | null;
	selectedNodeCount: number;
	selectionBox: CanvasSelectionBoxState;
	onClearSelection: () => void;
	onCreateAsset: () => void;
};

export function CanvasSelectionOverlays({
	groupBounds,
	selectedNodeCount,
	selectionBox,
	onClearSelection,
	onCreateAsset,
}: CanvasSelectionOverlaysProps) {
	return (
		<>
			{groupBounds && selectedNodeCount > 1 ? (
				<div
					className="selection-group"
					style={{
						transform: `translate(${groupBounds.left - 14}px, ${groupBounds.top - 14}px)`,
						width: groupBounds.width + 28,
						height: groupBounds.height + 28,
					}}
				>
					<div className="selection-group__toolbar">
						<button type="button" onClick={onClearSelection}>
							取消
						</button>
						<button type="button" onClick={onCreateAsset}>
							创建资产
						</button>
					</div>
				</div>
			) : null}

			{selectionBox ? (
				<div
					className="selection-box"
					style={{
						left: selectionBox.left,
						top: selectionBox.top,
						width: selectionBox.width,
						height: selectionBox.height,
					}}
				/>
			) : null}
		</>
	);
}
