export type WorkshopStepId = 1 | 2 | 3 | 4;

const WORKSHOP_STEPS: Array<{ id: WorkshopStepId; label: string }> = [
	{ id: 1, label: "输入剧本" },
	{ id: 2, label: "分镜分析" },
	{ id: 3, label: "角色与场景" },
	{ id: 4, label: "分镜生成" },
];

export type WorkshopStudioTopbarProps = {
	projectTitle: string;
	onBackToProjects: () => void;
	onUploadToCloud: () => void;
	onSaveLocal: () => void;
};

export function WorkshopStudioTopbar({
	projectTitle,
	onBackToProjects,
	onUploadToCloud,
	onSaveLocal,
}: WorkshopStudioTopbarProps) {
	return (
		<header className="workshop-studio__topbar">
			<div className="workshop-studio__project">
				<button
					type="button"
					className="workshop-studio__ghost"
					onClick={onBackToProjects}
				>
					项目
				</button>
				<strong>{projectTitle} 2026/4/20 00:46:54</strong>
				<span>当前编辑：本地项目尚未上传云端</span>
			</div>
			<div className="workshop-studio__actions">
				<button
					type="button"
					className="workshop-studio__btn workshop-studio__btn--outline"
					onClick={onUploadToCloud}
				>
					上传到云端
				</button>
				<button
					type="button"
					className="workshop-studio__btn workshop-studio__btn--success"
					onClick={onSaveLocal}
				>
					保存到本地
				</button>
				<span className="workshop-studio__token">4446 终稿</span>
			</div>
		</header>
	);
}

export type WorkshopStepperProps = {
	activeStep: WorkshopStepId;
	onStepChange: (step: WorkshopStepId) => void;
};

export function WorkshopStepper({
	activeStep,
	onStepChange,
}: WorkshopStepperProps) {
	return (
		<div className="workshop-studio__stepper">
			{WORKSHOP_STEPS.map((step) => {
				const done = activeStep > step.id;
				const active = activeStep === step.id;
				return (
					<button
						type="button"
						key={step.id}
						className={`workshop-step ${done ? "is-done" : ""} ${
							active ? "is-active" : ""
						}`}
						onClick={() => onStepChange(step.id)}
					>
						<span className="workshop-step__index">
							{done ? "?" : step.id}
						</span>
						<span className="workshop-step__label">{step.label}</span>
					</button>
				);
			})}
		</div>
	);
}
