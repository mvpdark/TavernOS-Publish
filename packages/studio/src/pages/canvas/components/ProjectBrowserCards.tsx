import type { CSSProperties } from "react";
import type { ProjectEntry } from "../canvasPersistence";

const CREATE_PROJECT_ACCENT =
	"linear-gradient(135deg, #89a7ff, #ff8db8, #77ffd8)";

type ProjectCardStyle = CSSProperties & {
	"--card-accent": string;
	"--card-index": number;
};

function getProjectCardStyle(accent: string, index: number): ProjectCardStyle {
	return {
		"--card-accent": accent,
		"--card-index": index,
	};
}

function joinClassNames(...classNames: Array<string | undefined>) {
	return classNames.filter(Boolean).join(" ");
}

export type CreateProjectBrowserCardProps = {
	eyebrow: string;
	title: string;
	description: string;
	countLabel: string;
	previewClassName?: string;
	onCreate: () => void;
};

export function CreateProjectBrowserCard({
	eyebrow,
	title,
	description,
	countLabel,
	previewClassName,
	onCreate,
}: CreateProjectBrowserCardProps) {
	return (
		<div className="project-browser-card-shell project-browser-card-shell--create">
			<button
				type="button"
				className="project-browser-card project-browser-card--create"
				style={getProjectCardStyle(CREATE_PROJECT_ACCENT, 0)}
				onClick={onCreate}
			>
				<span
					className={joinClassNames(
						"project-browser-card__preview project-browser-card__preview--create",
						previewClassName,
					)}
				>
					<span className="project-browser-card__create-plus">+</span>
				</span>
				<span className="project-browser-card__meta">
					<span className="project-browser-card__eyebrow">{eyebrow}</span>
					<strong>{title}</strong>
					<small>{description}</small>
				</span>
				<span className="project-browser-card__count">{countLabel}</span>
			</button>
		</div>
	);
}

export type ProjectBrowserCardProps = {
	project: ProjectEntry;
	index: number;
	deleteLabelPrefix: string;
	previewClassName?: string;
	onOpen: (projectId: string) => void;
	onDelete: (projectId: string) => void;
};

export function ProjectBrowserCard({
	project,
	index,
	deleteLabelPrefix,
	previewClassName,
	onOpen,
	onDelete,
}: ProjectBrowserCardProps) {
	const deleteLabel = `${deleteLabelPrefix} ${project.title}`;

	return (
		<div className="project-browser-card-shell">
			<button
				type="button"
				className="project-browser-card"
				style={getProjectCardStyle(project.accent, index + 1)}
				onClick={() => onOpen(project.id)}
			>
				<span
					className={joinClassNames(
						"project-browser-card__preview",
						previewClassName,
					)}
				/>
				<span className="project-browser-card__meta">
					<span className="project-browser-card__eyebrow">{project.time}</span>
					<strong>{project.title}</strong>
					<small>{project.blurb}</small>
				</span>
				<span className="project-browser-card__count">{project.count}</span>
			</button>
			<button
				type="button"
				className="project-browser-card-delete"
				onClick={() => onDelete(project.id)}
				aria-label={deleteLabel}
				title={deleteLabel}
			>
				×
			</button>
		</div>
	);
}
