export type CanvasModeGuidePanelProps = {
	projectTitle: string;
	modeLabel: string;
	onCreateShot: () => void;
	onBackToCanvas: () => void;
};

export function CanvasModeGuidePanel({
	projectTitle,
	modeLabel,
	onCreateShot,
	onBackToCanvas,
}: CanvasModeGuidePanelProps) {
	return (
		<aside className="inspector-panel inspector-panel--guide" aria-label="导演模式引导">
			<div className="inspector-panel__chrome">
				<span className="canvas-library__eyebrow">{modeLabel} / 引导</span>
				<div className="inspector-panel__project">{projectTitle}</div>
			</div>
			<div className="inspector-panel__content">
				<div className="inspector-panel__hero">
					<div className="inspector-panel__hero-copy">
						<span className="inspector-panel__type">导演工作流</span>
						<h2>先搭镜头，再接生成</h2>
						<p>
							先创建一个镜头节点，用它组织景别、构图和运镜意图；后面再把图片、视频和角色素材挂到镜头链路上。
						</p>
					</div>
				</div>

				<section className="inspector-panel__section">
					<div className="inspector-panel__section-head">
						<h3>推荐步骤</h3>
					</div>
					<div className="inspector-panel__steps">
						<div className="inspector-panel__step">
							<strong>01</strong>
							<span>创建镜头节点，写清景别、构图和机位意图。</span>
						</div>
						<div className="inspector-panel__step">
							<strong>02</strong>
							<span>把场景、角色或参考图通过连线接进镜头节点。</span>
						</div>
						<div className="inspector-panel__step">
							<strong>03</strong>
							<span>再从镜头节点驱动图片或视频生成链路。</span>
						</div>
					</div>
				</section>

				<section className="inspector-panel__section">
					<div className="inspector-panel__section-head">
						<h3>快速开始</h3>
					</div>
					<div className="inspector-panel__actions">
						<button type="button" className="inspector-panel__action inspector-panel__action--primary" onClick={onCreateShot}>
							新增镜头
						</button>
						<button type="button" className="inspector-panel__action" onClick={onBackToCanvas}>
							回到画布
						</button>
					</div>
				</section>
			</div>
		</aside>
	);
}
