import { Suspense, lazy } from "react";
import type { CanvasAddNodeMenuProps } from "./CanvasAddNodeMenu";
import { CanvasAddNodeMenu } from "./CanvasAddNodeMenu";
import type { CanvasConnectionCutButtonProps } from "./CanvasConnectionCutButton";
import { CanvasConnectionCutButton } from "./CanvasConnectionCutButton";
import type { CanvasNodeContextMenuProps } from "./CanvasNodeContextMenu";
import { CanvasNodeContextMenu } from "./CanvasNodeContextMenu";
import type { CanvasSelectionOverlaysProps } from "./CanvasSelectionOverlays";
import { CanvasSelectionOverlays } from "./CanvasSelectionOverlays";
import type { FloatingComposerPanelProps } from "./FloatingComposerPanel";
import { FloatingTextToolbar } from "./FloatingTextToolbar";
import type { FloatingTextToolbarProps } from "./FloatingTextToolbar";

const FloatingComposerPanel = lazy(() =>
	import("./FloatingComposerPanel").then((module) => ({
		default: module.FloatingComposerPanel,
	})),
);

type CanvasSurfaceOverlaysProps = {
	connectionCutProps: CanvasConnectionCutButtonProps;
	selectionOverlayProps: CanvasSelectionOverlaysProps;
	addNodeMenuProps: CanvasAddNodeMenuProps;
	nodeContextMenuProps: CanvasNodeContextMenuProps;
	textToolbarProps: FloatingTextToolbarProps;
	floatingComposerProps: FloatingComposerPanelProps | null;
};

export function CanvasSurfaceOverlays({
	connectionCutProps,
	selectionOverlayProps,
	addNodeMenuProps,
	nodeContextMenuProps,
	textToolbarProps,
	floatingComposerProps,
}: CanvasSurfaceOverlaysProps) {
	return (
		<>
			<CanvasConnectionCutButton {...connectionCutProps} />
			<CanvasSelectionOverlays {...selectionOverlayProps} />
			<CanvasAddNodeMenu {...addNodeMenuProps} />
			<CanvasNodeContextMenu {...nodeContextMenuProps} />
			<FloatingTextToolbar {...textToolbarProps} />
			{floatingComposerProps ? (
				<Suspense fallback={null}>
					<FloatingComposerPanel {...floatingComposerProps} />
				</Suspense>
			) : null}
		</>
	);
}
