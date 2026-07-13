export type CanvasNodeStructuredPreviewProps = {
	chipLabel: string;
	showLinks: boolean;
	characterSummary: string;
	sceneSummary: string;
	showMeta: boolean;
	metaLabels: readonly string[];
	hasModel: boolean;
	modelDisplayLabel: string;
	textPreview: string;
};

export function CanvasNodeStructuredPreview({
	chipLabel,
	showLinks,
	characterSummary,
	sceneSummary,
	showMeta,
	metaLabels,
	hasModel,
	modelDisplayLabel,
	textPreview,
}: CanvasNodeStructuredPreviewProps) {
	return (
		<div className="canvas-node__shot-preview-wrap">
			<div className="canvas-node__shot-chip">{chipLabel}</div>
			{showLinks ? (
				<div className="canvas-node__shot-link-summary">
					<span>{characterSummary}</span>
					<span>{sceneSummary}</span>
				</div>
			) : null}
			{showMeta ? (
				<div className="canvas-node__shot-meta-row">
					{metaLabels.map((label) => (
						<span key={label} className="canvas-node__shot-meta">
							{label}
						</span>
					))}
				</div>
			) : null}
			{hasModel ? (
				<div className="canvas-node__text-model">{modelDisplayLabel}</div>
			) : null}
			<div className="canvas-node__shot-preview">{textPreview}</div>
		</div>
	);
}
