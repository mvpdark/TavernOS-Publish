export type CanvasNodeHoverAssetNameProps = {
	name: string;
	show: boolean;
	visible: boolean;
};

export function CanvasNodeHoverAssetName({
	name,
	show,
	visible,
}: CanvasNodeHoverAssetNameProps) {
	if (!show) return null;
	return (
		<div
			className={`canvas-node__hover-asset-name ${visible ? "is-visible" : ""}`}
		>
			{name}
		</div>
	);
}
