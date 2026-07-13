export type WorkshopAnalysisStageProps = {
	textModel: string;
	textModelOptions: string[];
	onTextModelChange: (value: string) => void;
	onAiEpisodeSplit: () => void;
	onPrevious: () => void;
	onNext: () => void;
};

export function WorkshopAnalysisStage({
	textModel,
	textModelOptions,
	onTextModelChange,
	onAiEpisodeSplit,
	onPrevious,
	onNext,
}: WorkshopAnalysisStageProps) {
	return (
		<div className="workshop-stage workshop-stage--analysis">
			<div className="workshop-analysis__panel">
				<h3>分集规则与制作编排</h3>
				<p>
					AI 将自动分集并提取每集角色、场景和物品。点击“进入本集制作”后可继续精修角色并生成分镜。
				</p>
				<div className="workshop-analysis__toolbar">
					<span className="workshop-chip">助手</span>
					<select
						value={textModel}
						onChange={(event) => onTextModelChange(event.target.value)}
					>
						{textModelOptions.map((model) => (
							<option key={model} value={model}>
								{model}
							</option>
						))}
					</select>
					<select>
						<option>真人写实</option>
					</select>
					<select>
						<option>饱满度最高</option>
					</select>
					<button
						type="button"
						className="workshop-studio__btn"
						onClick={onAiEpisodeSplit}
					>
						AI 智能分集
					</button>
				</div>
			</div>
			<div className="workshop-analysis__empty">
				还没有分集规划。点击“AI 智能分集”快速起稿，或先“新增分集”手动制作。
			</div>
			<div className="workshop-stage__footer">
				<button
					type="button"
					className="workshop-studio__ghost"
					onClick={onPrevious}
				>
					← 上一步
				</button>
				<button type="button" className="workshop-studio__btn" onClick={onNext}>
					下一步：角色与场景
				</button>
			</div>
		</div>
	);
}
