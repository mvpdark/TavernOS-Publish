import { WORKSHOP_ROLE_TABS, type WorkshopRoleTab } from "../appUiConfig";
import type { WorkshopExtractedEntity } from "../workshopExtractionHelpers";

export type WorkshopRoleStageProps = {
	activeTab: WorkshopRoleTab;
	tabLabel: string;
	entities: WorkshopExtractedEntity[];
	isExtracting: boolean;
	onTabChange: (tab: WorkshopRoleTab) => void;
	onPrevious: () => void;
	onNext: () => void;
};

export function WorkshopRoleStage({
	activeTab,
	tabLabel,
	entities,
	isExtracting,
	onTabChange,
	onPrevious,
	onNext,
}: WorkshopRoleStageProps) {
	return (
		<div className="workshop-stage workshop-stage--roles">
			<div className="workshop-role__tabs">
				{WORKSHOP_ROLE_TABS.map((tab) => (
					<button
						type="button"
						key={tab}
						className={activeTab === tab ? "is-active" : ""}
						onClick={() => onTabChange(tab)}
					>
						{tab}
					</button>
				))}
			</div>
			<div className="workshop-role__layout">
				<aside className="workshop-role__list">
					<div className="workshop-role__list-head">
						{activeTab} {entities.length}/{entities.length}
					</div>
					<input placeholder={`搜索${tabLabel}和描述`} />
					{entities.length ? (
						<div className="workshop-role__items">
							{entities.map((entity) => (
								<button
									type="button"
									key={entity.id}
									className="workshop-role__item"
								>
									<strong>{entity.name}</strong>
									<span>{entity.summary || entity.id}</span>
								</button>
							))}
						</div>
					) : (
						<p>{isExtracting ? "正在提取…" : `暂无匹配${tabLabel}`}</p>
					)}
				</aside>
				<section className="workshop-role__canvas">
					{entities.length ? (
						<div className="workshop-role__cards">
							{entities.map((entity) => (
								<article key={entity.id} className="workshop-role__card">
									<span>{entity.id}</span>
									<h3>{entity.name}</h3>
									{entity.summary ? <strong>{entity.summary}</strong> : null}
									{entity.detail ? <p>{entity.detail}</p> : null}
								</article>
							))}
						</div>
					) : (
						<div className="workshop-role__canvas-empty">
							请先在第一步提取角色、场景和物品
						</div>
					)}
				</section>
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
					下一步：分镜生成
				</button>
			</div>
		</div>
	);
}
