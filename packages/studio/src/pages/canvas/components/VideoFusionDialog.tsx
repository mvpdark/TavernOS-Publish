import type {
	VideoFusionAnalysisState,
	VideoFusionPromptState,
} from "../appCanvasState";
import type { CanvasNode } from "../canvas-types";

export type VideoFusionDialogProps = {
	prompt: VideoFusionPromptState;
	sourceNode: CanvasNode | null | undefined;
	targetNode: CanvasNode | null | undefined;
	analysis: VideoFusionAnalysisState;
	fusingPairKey: string | null;
	onCancel: () => void;
	onFuse: (sourceNodeId: string, targetNodeId: string) => void;
};

export function VideoFusionDialog({
	prompt,
	sourceNode,
	targetNode,
	analysis,
	fusingPairKey,
	onCancel,
	onFuse,
}: VideoFusionDialogProps) {
	if (!prompt || !sourceNode || !targetNode) return null;

	const isFusing = Boolean(fusingPairKey);

	return (
		<div
			className="video-fusion-dialog"
			role="dialog"
			aria-modal="true"
			aria-label="融合视频节点"
		>
			<div className="video-fusion-dialog__orb">FF</div>
			<div className="video-fusion-dialog__body">
				<span>检测到视频叠放</span>
				<strong>用本地 FFmpeg 融合这两个视频？</strong>
				<p>
					{sourceNode.title || "拖动视频"} +{" "}
					{targetNode.title || "被融合视频"}
				</p>
				<small>
					会按拖动视频在前、被融合视频在后的顺序拼接，并在右侧生成新的融合视频节点。
				</small>
				{analysis?.loading ? (
					<div className="video-fusion-dialog__analysis video-fusion-dialog__analysis--loading">
						正在用 Gemini 分析两个视频的衔接画面…
					</div>
				) : analysis?.error ? (
					<div className="video-fusion-dialog__analysis video-fusion-dialog__analysis--error">
						分析失败：{analysis.error}
					</div>
				) : analysis?.result ? (
					<div className="video-fusion-dialog__analysis">
						<strong>Gemini 融合建议</strong>
						<div className="video-fusion-dialog__code-block">
							<pre>{analysis.result}</pre>
						</div>
					</div>
				) : null}
			</div>
			<div className="video-fusion-dialog__actions">
				<button
					type="button"
					className="video-fusion-dialog__secondary"
					disabled={isFusing}
					onClick={onCancel}
				>
					取消
				</button>
				<button
					type="button"
					className="video-fusion-dialog__primary"
					disabled={isFusing || analysis?.loading}
					onClick={() => onFuse(prompt.sourceNodeId, prompt.targetNodeId)}
				>
					{isFusing ? "融合中…" : "开始融合"}
				</button>
			</div>
		</div>
	);
}
