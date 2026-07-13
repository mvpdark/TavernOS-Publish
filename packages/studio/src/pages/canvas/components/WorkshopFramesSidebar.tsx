export type WorkshopFramesSidebarProps = {
	actionKey: string | null;
	script: string;
	scriptExpanded: boolean;
	frameCount: number;
	onClear: () => void;
	onToggleScript: () => void;
	onInfer: () => void;
	onValidate: () => void;
	onMerge: () => void;
	onReferenceRecognition: () => void;
	onAdd: () => void;
	onImport: () => void;
};

function activeClass(actionKey: string | null, expected: string) {
	return actionKey === expected ? "is-flashed" : "";
}

export function WorkshopFramesSidebar({
	actionKey,
	script,
	scriptExpanded,
	frameCount,
	onClear,
	onToggleScript,
	onInfer,
	onValidate,
	onMerge,
	onReferenceRecognition,
	onAdd,
	onImport,
}: WorkshopFramesSidebarProps) {
	return (
		<aside className="workshop-frames__left">
			<div className="workshop-frames__toolbar">
				<div className="workshop-frames__toolbar-copy">
					<span className="workshop-frames__eyebrow">Step 4 · 分镜生成</span>
					<h2>把脚本变成可执行的镜头板</h2>
					<p>先看脚本，再推理分镜、验证和合并，最后把参考素材补齐。</p>
				</div>
				<button
					type="button"
					className={`workshop-frames__clear ${activeClass(actionKey, "frame-clear")}`}
					onClick={onClear}
				>
					清空
				</button>
			</div>

			<div className="workshop-frames__script-shell">
				<button
					type="button"
					className="workshop-frames__script-toggle"
					onClick={onToggleScript}
				>
					<span>剧本（默认来自上一步）</span>
					<strong>{scriptExpanded ? "收起" : "展开"}</strong>
				</button>
				{scriptExpanded ? (
					<pre className="workshop-frames__script-text">
						{script.trim() || "暂无剧本内容，返回上一步补充后再继续。"}
					</pre>
				) : null}
			</div>

			<div className="workshop-frames__button-group workshop-frames__button-group--primary">
				<button
					type="button"
					className={activeClass(actionKey, "frame-infer")}
					onClick={onInfer}
				>
					推理分镜
				</button>
				<button
					type="button"
					className={activeClass(actionKey, "frame-validate")}
					onClick={onValidate}
				>
					二次验证推理
				</button>
				<button
					type="button"
					className={activeClass(actionKey, "frame-merge")}
					onClick={onMerge}
				>
					合并分镜
				</button>
			</div>

			<div className="workshop-frames__button-group workshop-frames__button-group--secondary">
				<button
					type="button"
					className={activeClass(actionKey, "frame-reference-recognition")}
					onClick={onReferenceRecognition}
				>
					批量参考二次识别
				</button>
				<button
					type="button"
					className={activeClass(actionKey, "frame-add")}
					onClick={onAdd}
				>
					添加
				</button>
				<button
					type="button"
					className={activeClass(actionKey, "frame-import")}
					onClick={onImport}
				>
					导入
				</button>
			</div>

			<div className="workshop-frames__empty-card">
				<span>空状态</span>
				<strong>
					{frameCount
						? `${frameCount} 条分镜已准备`
						: "还没有分镜，先从剧本推理开始。"}
				</strong>
				<p>
					{frameCount
						? "继续验证、合并或补充参考素材，完善镜头顺序。"
						: "点击上方按钮会立刻生成可见的分镜草稿反馈。"}
				</p>
			</div>
		</aside>
	);
}
