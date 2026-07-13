import type { WorkshopFrameTab } from "../appUiConfig";

export type WorkshopFramesBoardProps = {
	frames: string[];
	activeTab: WorkshopFrameTab;
};

export function WorkshopFramesBoard({
	frames,
	activeTab,
}: WorkshopFramesBoardProps) {
	return (
		<section className="workshop-frames__board">
			<div className="workshop-frames__board-head">
				<div>
					<span className="workshop-frames__eyebrow">主画板</span>
					<h3>当前分镜</h3>
				</div>
				<div className="workshop-frames__board-meta">
					<span>{frames.length} 条</span>
					<span>{activeTab}</span>
				</div>
			</div>
			{frames.length ? (
				<div className="workshop-frames__card-grid">
					{frames.map((frame, index) => (
						<article key={frame} className="workshop-frames__card">
							<span className="workshop-frames__card-index">0{index + 1}</span>
							<strong>{frame}</strong>
							<small>镜头描述、节奏、参考与执行备注会在这里沉淀。</small>
						</article>
					))}
				</div>
			) : (
				<div className="workshop-frames__board-empty">
					<span>等待生成</span>
					<strong>还没有可视化分镜</strong>
					<p>先用左侧按钮生成初稿，右侧模板区会同步记录你正在查看的类型。</p>
				</div>
			)}
		</section>
	);
}
