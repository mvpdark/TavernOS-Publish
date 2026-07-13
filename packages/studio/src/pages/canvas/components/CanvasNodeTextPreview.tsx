export type CanvasNodeTextPreviewProps = {
	hasModel: boolean;
	modelDisplayLabel: string;
	textPreview: string;
};

export function CanvasNodeTextPreview({
	hasModel,
	modelDisplayLabel,
	textPreview,
}: CanvasNodeTextPreviewProps) {
	return (
		<div className="canvas-node__text-preview-wrap">
			{hasModel ? (
				<div className="canvas-node__text-model">{modelDisplayLabel}</div>
			) : null}
			<div className="canvas-node__text-preview">{textPreview}</div>
		</div>
	);
}
