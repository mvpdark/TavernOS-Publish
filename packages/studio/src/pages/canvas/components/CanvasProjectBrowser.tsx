import type { ProjectEntry } from "../canvasPersistence";
import {
	CreateProjectBrowserCard,
	ProjectBrowserCard,
} from "./ProjectBrowserCards";
import { ProjectBrowserPage } from "./ProjectBrowserPage";

export type CanvasProjectBrowserProps = {
	projects: ProjectEntry[];
	onBack: () => void;
	onCreateCanvas: () => void;
	onOpenCanvas: (projectId: string) => void;
	onDeleteCanvas: (projectId: string) => void;
};

export function CanvasProjectBrowser({
	projects,
	onBack,
	onCreateCanvas,
	onOpenCanvas,
	onDeleteCanvas,
}: CanvasProjectBrowserProps) {
	return (
		<ProjectBrowserPage
			eyebrow="/canvas"
			title="选择画布项目"
			description="先进入画布项目列表，再决定打开哪一个具体项目。后面每个项目都可以有自己的视角和工作状态。"
			actionSlot={
				<div className="project-browser-page__actions">
					<button
						type="button"
						className="workshop-page__back"
						onClick={onBack}
					>
						返回导航
					</button>
				</div>
			}
		>
			<CreateProjectBrowserCard
				eyebrow="/new canvas"
				title="新建画布"
				description="从空白卡片开始，立即创建一个新的画布项目。"
				countLabel="立即开始"
				onCreate={onCreateCanvas}
			/>
			{projects.map((project, index) => (
				<ProjectBrowserCard
					key={project.id}
					project={project}
					index={index}
					deleteLabelPrefix="删除画布"
					onOpen={onOpenCanvas}
					onDelete={onDeleteCanvas}
				/>
			))}
		</ProjectBrowserPage>
	);
}
