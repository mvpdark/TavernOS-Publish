import type { MiniMaxTokenPlan, MiniMaxTokenPlanSummary } from "../minimaxTokenPlan";

type MiniMaxTokenPlanPanelProps = {
	rawText: string;
	setRawText: (value: string) => void;
	parseError: string | null;
	hasPlan: boolean;
	plan: MiniMaxTokenPlan | null;
	summary: MiniMaxTokenPlanSummary;
};

export function MiniMaxTokenPlanPanel({
	rawText,
	setRawText,
	parseError,
	hasPlan,
	plan,
	summary,
}: MiniMaxTokenPlanPanelProps) {
	return (
		<form
			className="settings-page__integration"
			autoComplete="off"
			onSubmit={(event) => event.preventDefault()}
		>
			<span className="canvas-library__eyebrow">MiniMax 配额计划</span>
			<p>
				把后端返回的 MiniMax 配额摘要 JSON 粘贴到这里。节点展示会优先读取
				<code>remaining_usage_counts</code>，没有命中时再回退到 5 小时 / 本周剩余。
			</p>
			<div className="settings-page__integration-status">
				<strong>{parseError ? "JSON 无效" : hasPlan ? "已载入" : "等待粘贴"}</strong>
				<span>
					{parseError
						? parseError
						: hasPlan
							? "节点中的 MiniMax 模型现在会优先显示真实剩余次数。"
							: "可粘贴包含 remaining_usage_counts / rolling_5h_* / weekly_* 的 JSON。"}
				</span>
			</div>
			{hasPlan && !parseError ? (
				<div className="minimax-plan-summary">
					<div className="minimax-plan-summary__grid">
						<div className="minimax-plan-summary__card">
							<span>5 小时配额</span>
							<strong>{summary.rolling5hLabel ?? "—"}</strong>
						</div>
						<div className="minimax-plan-summary__card">
							<span>本周配额</span>
							<strong>{summary.weeklyLabel ?? "—"}</strong>
						</div>
						<div className="minimax-plan-summary__card">
							<span>单模型次数</span>
							<strong>{summary.modelCount}</strong>
						</div>
					</div>
					<div className="minimax-plan-summary__list">
						<span className="workshop-frames__field-label">已识别模型剩余次数</span>
						{summary.topModelEntries.length ? (
							<div className="minimax-plan-summary__chips">
								{summary.topModelEntries.map((entry) => (
									<div key={entry.key} className="minimax-plan-summary__chip">
										<span>{entry.key}</span>
										<strong>{entry.remaining}</strong>
									</div>
								))}
							</div>
						) : (
							<div className="minimax-plan-summary__empty">
								当前配额摘要中没有 <code>remaining_usage_counts</code>。
							</div>
						)}
					</div>
					{!plan?.remaining_usage_counts && !summary.rolling5hLabel && !summary.weeklyLabel ? (
						<div className="minimax-plan-summary__empty">
							当前 JSON 已解析，但没有命中可展示的 MiniMax 配额字段。
						</div>
					) : null}
				</div>
			) : null}
			<div className="workshop-frames__field">
				<span className="workshop-frames__field-label">配额 JSON</span>
				<textarea
					className="settings-page__integration-textarea"
					value={rawText}
					placeholder={`{\n  "rolling_5h_remaining": 12,\n  "rolling_5h_total": 20,\n  "weekly_remaining": 80,\n  "weekly_total": 120,\n  "remaining_usage_counts": {\n    "speech-2.8-hd(minimax)": 7\n  }\n}`}
					onChange={(event) => setRawText(event.target.value)}
				/>
			</div>
		</form>
	);
}
