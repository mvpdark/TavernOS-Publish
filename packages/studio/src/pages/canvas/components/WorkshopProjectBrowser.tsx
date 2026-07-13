import type { ProjectEntry } from "../canvasPersistence";
import {
	CreateProjectBrowserCard,
	ProjectBrowserCard,
} from "./ProjectBrowserCards";
import { ProjectBrowserPage } from "./ProjectBrowserPage";

export type WorkshopProjectBrowserProps = {
	projects: ProjectEntry[];
	onBack: () => void;
	onCreateWorkshop: () => void;
	onOpenWorkshop: (projectId: string) => void;
	onDeleteWorkshop: (projectId: string) => void;
};

export function WorkshopProjectBrowser({
	projects,
	onBack,
	onCreateWorkshop,
	onOpenWorkshop,
	onDeleteWorkshop,
}: WorkshopProjectBrowserProps) {
	return (
		<ProjectBrowserPage
			eyebrow="/workshop"
			title="选择工坊项目"
			description="工坊也是独立页面。先选择具体项目，再进入对应的模型实验、素材整理或模板工作流。"
			actionSlot={
				<button
					type="button"
					className="workshop-page__back"
					onClick={onBack}
				>
					返回导航
				</button>
			}
		>
			<CreateProjectBrowserCard
				eyebrow="/new workshop"
				title="新建工坊"
				description="从空白工坊开始，继续整理模型、素材和模板流程。"
				countLabel="立即开始"
				previewClassName="project-browser-card__preview--workshop"
				onCreate={onCreateWorkshop}
			/>
			{projects.map((project, index) => (
				<ProjectBrowserCard
					key={project.id}
					project={project}
					index={index}
					deleteLabelPrefix="删除工坊"
					previewClassName="project-browser-card__preview--workshop"
					onOpen={onOpenWorkshop}
					onDelete={onDeleteWorkshop}
				/>
			))}
		</ProjectBrowserPage>
	);
}
