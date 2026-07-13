import type { MouseEvent } from "react";

type CanvasLibraryItem = {
	id: string;
	title: string;
	time: string;
	count: string;
	accent: string;
};

type CssVars = Record<string, string | number>;

type LogoMenuProps = {
	logoSrc: string;
	projectName: string;
	canvases: CanvasLibraryItem[];
	isCanvasLibraryOpen: boolean;
	isHiddenSettingsOpen: boolean;
	onPrimaryClick: () => void;
	onOpenHiddenSettings: () => void;
	onCloseCanvasLibrary: () => void;
	onOpenCanvas: (canvasId: string) => void;
	onCreateCanvas: () => void;
	onDeleteCanvas: (canvasId: string) => void;
	onMiddleClick: () => void;
};

export function LogoMenu({
	logoSrc,
	projectName,
	canvases,
	isCanvasLibraryOpen,
	isHiddenSettingsOpen,
	onPrimaryClick,
	onOpenHiddenSettings,
	onCloseCanvasLibrary,
	onOpenCanvas,
	onCreateCanvas,
	onDeleteCanvas,
	onMiddleClick,
}: LogoMenuProps) {
	function handleAuxClick(event: MouseEvent<HTMLButtonElement>) {
		if (event.button !== 1) return;
		event.preventDefault();
		event.stopPropagation();
		onMiddleClick();
	}

	return (
		<>
			<header className="canvas-header">
				<button
					type="button"
					className={`project-logo-button ${isCanvasLibraryOpen || isHiddenSettingsOpen ? "is-open" : ""}`}
					onClick={(event) => {
						event.stopPropagation();
						onPrimaryClick();
					}}
					onContextMenu={(event) => {
						event.preventDefault();
						event.stopPropagation();
						onOpenHiddenSettings();
					}}
					onMouseDown={(event) => {
						if (event.button === 1) {
							event.preventDefault();
						}
					}}
					onAuxClick={handleAuxClick}
					aria-label="打开画布库"
					aria-expanded={isCanvasLibraryOpen || isHiddenSettingsOpen}
				>
					<span
						className="project-logo-shell"
						style={{ "--logo-mask": `url("${logoSrc}")` } as CssVars}
					>
						<img className="project-logo" src={logoSrc} alt={projectName} />
						<span className="project-logo__icon-flow" aria-hidden="true" />
						<span className="project-logo__icon-sheen" aria-hidden="true" />
					</span>
				</button>
			</header>

			{isCanvasLibraryOpen ? (
				<div className="canvas-library-scrim" onPointerDown={onCloseCanvasLibrary}>
					<section
						className="canvas-library"
						onPointerDown={(event) => event.stopPropagation()}
						aria-label="画布库"
					>
						<div className="canvas-library__top">
							<div>
								<span className="canvas-library__eyebrow">Kakashow 画布</span>
								<h2>最近的画布</h2>
							</div>
							<div className="canvas-library__actions">
								<button
									type="button"
									className="canvas-library__action canvas-library__action--primary"
									onClick={onCreateCanvas}
								>
									新建画布
								</button>
								<button
									type="button"
									className="canvas-library__close"
									onClick={onCloseCanvasLibrary}
									aria-label="关闭画布库"
								>
									×
								</button>
							</div>
						</div>
						<div className="canvas-library__grid">
							{canvases.map((canvas, index) => (
								<div key={canvas.id} className="canvas-card-shell">
									<button
										type="button"
										className="canvas-card"
										style={
											{
												"--card-accent": canvas.accent,
												"--card-index": index,
											} as CssVars
										}
										onClick={() => onOpenCanvas(canvas.id)}
									>
										<span className="canvas-card__preview">
											<span className="canvas-card__spark" />
											<span className="canvas-card__node canvas-card__node--one" />
											<span className="canvas-card__node canvas-card__node--two" />
										</span>
										<span className="canvas-card__body">
											<strong>{canvas.title}</strong>
											<small>{canvas.time}</small>
										</span>
										<span className="canvas-card__count">{canvas.count}</span>
									</button>
									<button
										type="button"
										className="canvas-card-delete"
										onClick={() => onDeleteCanvas(canvas.id)}
										aria-label={`删除画布 ${canvas.title}`}
										title={`删除画布 ${canvas.title}`}
									>
										删除
									</button>
								</div>
							))}
						</div>
					</section>
				</div>
			) : null}
		</>
	);
}
