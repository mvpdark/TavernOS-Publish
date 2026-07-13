import {
	type PointerEvent,
	useRef,
} from "react";

export type PerspectiveEditPreset =
	| "custom"
	| "three-quarter"
	| "left"
	| "right"
	| "top"
	| "low"
	| "close";

export type PerspectiveEditSettings = {
	preset: PerspectiveEditPreset;
	yaw: number;
	pitch: number;
	roll: number;
	zoom: number;
	lens: number;
};

type PerspectiveDragState = {
	pointerId: number;
	startX: number;
	startY: number;
	startYaw: number;
	startPitch: number;
};

function clampPercent(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function PerspectiveEditPanel({
	nodeId,
	settings,
	isGenerating,
	onChange,
	onGenerate,
	onClose,
	stopNodeControlPointerDown,
}: {
	nodeId: string;
	settings: PerspectiveEditSettings;
	isGenerating: boolean;
	onChange: (nextPartial: Partial<PerspectiveEditSettings>) => void;
	onGenerate: (nodeId: string) => void;
	onClose: () => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
	const angleDragRef = useRef<PerspectiveDragState | null>(null);
	const sliderRows: Array<{
		key: keyof Pick<PerspectiveEditSettings, "yaw" | "pitch" | "zoom">;
		label: string;
		min: number;
		max: number;
		step: number;
		unit: string;
	}> = [
		{ key: "yaw", label: "旋转", min: -180, max: 180, step: 1, unit: "°" },
		{ key: "pitch", label: "倾斜", min: -180, max: 180, step: 1, unit: "°" },
		{ key: "zoom", label: "缩放", min: -30, max: 30, step: 1, unit: "" },
	];
	const isWideAngle = settings.lens <= 24;
	const previewScale = clampPercent(1 + settings.zoom / 100, 0.7, 1.3);
	const cubeTransform = `scale(${previewScale}) rotateX(${settings.pitch * -0.42 - 12}deg) rotateY(${settings.yaw * 0.5 - 28}deg) rotateZ(${settings.roll * 0.4}deg)`;
	const resetSettings = () => onChange({ preset: "custom", yaw: 0, pitch: 0, roll: 0, zoom: 0, lens: 35 });
	const updateSliderValue = (
		key: keyof Pick<PerspectiveEditSettings, "yaw" | "pitch" | "zoom">,
		value: string,
	) => {
		onChange({ preset: "custom", [key]: Number(value) });
	};
	const handleAngleDragStart = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		angleDragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startYaw: settings.yaw,
			startPitch: settings.pitch,
		};
	};
	const handleAngleDragMove = (event: PointerEvent<HTMLDivElement>) => {
		const drag = angleDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		event.stopPropagation();
		onChange({
			preset: "custom",
			yaw: clampPercent(Math.round(drag.startYaw + (event.clientX - drag.startX) * 0.9), -180, 180),
			pitch: clampPercent(Math.round(drag.startPitch - (event.clientY - drag.startY) * 0.9), -180, 180),
		});
	};
	const handleAngleDragEnd = (event: PointerEvent<HTMLDivElement>) => {
		const drag = angleDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.stopPropagation();
		angleDragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div
			className="perspective-editor"
			onPointerDown={stopNodeControlPointerDown}
		>
			<div className="perspective-editor__header">
				<strong>拖拽方块调整角度</strong>
				<button type="button" onClick={onClose} aria-label="关闭视角调节">
					×
				</button>
			</div>

			<div className="perspective-editor__body">
				<div className="perspective-editor__preview-shell">
					<div
						className="perspective-editor__preview"
						role="presentation"
						onPointerDown={handleAngleDragStart}
						onPointerMove={handleAngleDragMove}
						onPointerUp={handleAngleDragEnd}
						onPointerCancel={handleAngleDragEnd}
					>
						<div className="perspective-editor__cube-shadow" />
						<div className="perspective-editor__cube" style={{ transform: cubeTransform }}>
							<div className="perspective-editor__cube-face perspective-editor__cube-face--front">
								<span>▧</span>
							</div>
							<div className="perspective-editor__cube-face perspective-editor__cube-face--back" />
							<div className="perspective-editor__cube-face perspective-editor__cube-face--right" />
							<div className="perspective-editor__cube-face perspective-editor__cube-face--left" />
							<div className="perspective-editor__cube-face perspective-editor__cube-face--top" />
							<div className="perspective-editor__cube-face perspective-editor__cube-face--bottom" />
						</div>
					</div>
					<button
						type="button"
						className="perspective-editor__reset"
						onClick={(event) => {
							event.stopPropagation();
							resetSettings();
						}}
					>
						↻ 重置
					</button>
				</div>

				<div className="perspective-editor__controls">
					<div className="perspective-editor__sliders">
						{sliderRows.map((row) => (
							<label key={row.key} className="perspective-editor__slider-row">
								<span>{row.label}</span>
								<input
									type="range"
									min={row.min}
									max={row.max}
									step={row.step}
									value={settings[row.key]}
									style={{ ["--slider-progress" as string]: `${((settings[row.key] - row.min) / (row.max - row.min)) * 100}%` }}
									onInput={(event) => updateSliderValue(row.key, event.currentTarget.value)}
									onChange={(event) => updateSliderValue(row.key, event.currentTarget.value)}
								/>
								<em>{settings[row.key]}{row.unit}</em>
							</label>
						))}
					</div>

					<div className="perspective-editor__toggle-row">
						<span>广角镜头</span>
						<button
							type="button"
							className={`perspective-editor__switch ${isWideAngle ? "is-active" : ""}`}
							aria-pressed={isWideAngle}
							onClick={() => onChange({ preset: "custom", lens: isWideAngle ? 35 : 20 })}
						>
							<span />
						</button>
					</div>

					<div className="perspective-editor__actions">
						<button
							type="button"
							className="perspective-editor__primary"
							disabled={isGenerating}
							onClick={() => onGenerate(nodeId)}
							aria-label="确认修改视角"
						>
							{isGenerating ? "生成中…" : <span className="perspective-editor__confirm-icon">↑</span>}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
