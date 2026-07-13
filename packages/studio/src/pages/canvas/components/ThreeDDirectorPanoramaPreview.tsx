import { type PointerEvent, useMemo, useRef, useState } from "react";
import {
	getThreeDDirectorViewerMode,
	isThreeDDirectorMetadata,
	type ThreeDDirectorViewerMode,
} from "../appThreeDDirector";

type PanoramaDragState = {
	pointerId: number;
	startX: number;
	startY: number;
	startYaw: number;
	startPitch: number;
	startViewIndex: number;
};

type OrbitView = {
	label: string;
	col: number;
	row: number;
	yaw: number;
};

const ORBIT_VIEWS: OrbitView[] = [
	{ label: "正面", col: 0, row: 0, yaw: 0 },
	{ label: "右前45°", col: 1, row: 0, yaw: 45 },
	{ label: "右侧", col: 2, row: 0, yaw: 90 },
	{ label: "右后45°", col: 3, row: 0, yaw: 135 },
	{ label: "背面", col: 0, row: 1, yaw: 180 },
	{ label: "左后45°", col: 1, row: 1, yaw: 225 },
	{ label: "左侧", col: 2, row: 1, yaw: 270 },
	{ label: "左前45°", col: 3, row: 1, yaw: 315 },
];

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function wrapIndex(index: number, length: number) {
	return ((index % length) + length) % length;
}

export function ThreeDDirectorPanoramaPreview({
	assetUrl,
	assetName,
	providerMetadata,
	className = "",
}: {
	assetUrl: string;
	assetName: string;
	providerMetadata?: unknown;
	className?: string;
}) {
	const dragRef = useRef<PanoramaDragState | null>(null);
	const didDragRef = useRef(false);
	const mode: ThreeDDirectorViewerMode = getThreeDDirectorViewerMode(providerMetadata);
	const isOrbitMode = mode === "character-orbit";
	const stageAspectRatio = isThreeDDirectorMetadata(providerMetadata)
		? providerMetadata.sourceAspectRatio
		: "原图比例";
	const [view, setView] = useState({ yaw: 0, pitch: 0, zoom: 1.18, orbitIndex: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const pitchLimit = Math.max(22, (view.zoom - 1) * 90);
	const orbitView = ORBIT_VIEWS[wrapIndex(view.orbitIndex, ORBIT_VIEWS.length)];

	const orbitBackgroundStyle = useMemo(() => {
		const zoom = view.zoom;
		const tileWidthPercent = 100 / 4;
		const tileHeightPercent = 100 / 2;
		const visibleWidthPercent = tileWidthPercent / zoom;
		const visibleHeightPercent = tileHeightPercent / zoom;
		const maxPanXPercent = Math.max(0, tileWidthPercent - visibleWidthPercent);
		const maxPanYPercent = Math.max(0, tileHeightPercent - visibleHeightPercent);
		const normalizedYaw = (((view.yaw % 180) + 180) % 180) - 90;
		const panXPercent = (normalizedYaw / 90) * (maxPanXPercent / 2);
		const panYPercent = (view.pitch / 45) * (maxPanYPercent / 2);
		const leftPercent =
			orbitView.col * tileWidthPercent +
			(tileWidthPercent - visibleWidthPercent) / 2 +
			panXPercent;
		const topPercent =
			orbitView.row * tileHeightPercent +
			(tileHeightPercent - visibleHeightPercent) / 2 -
			panYPercent;

		return {
			backgroundSize: `${400 * zoom}% ${200 * zoom}%`,
			backgroundPosition: `${clamp(leftPercent, 0, 100 - visibleWidthPercent)}% ${clamp(
				topPercent,
				0,
				100 - visibleHeightPercent,
			)}%`,
		};
	}, [orbitView.col, orbitView.row, view.pitch, view.yaw, view.zoom]);

	const updateZoom = (delta: number) => {
		setView((current) => {
			const zoom = clamp(Number((current.zoom + delta).toFixed(2)), 1, 2.6);
			const nextPitchLimit = Math.max(22, (zoom - 1) * 90);
			return {
				...current,
				zoom,
				pitch: clamp(current.pitch, -nextPitchLimit, nextPitchLimit),
			};
		});
	};

	const updateOrbitIndex = (delta: number) => {
		setView((current) => ({
			...current,
			yaw: 0,
			orbitIndex: wrapIndex(current.orbitIndex + delta, ORBIT_VIEWS.length),
		}));
	};

	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		didDragRef.current = false;
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startYaw: view.yaw,
			startPitch: view.pitch,
			startViewIndex: view.orbitIndex,
		};
		setIsDragging(true);
	};

	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		event.stopPropagation();
		const deltaX = event.clientX - drag.startX;
		const deltaY = event.clientY - drag.startY;
		if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
			didDragRef.current = true;
		}
		if (isOrbitMode) {
			const stepDelta = Math.trunc(deltaX / 56);
			setView((current) => ({
				...current,
				yaw: deltaX % 56,
				pitch: clamp(drag.startPitch - deltaY * 0.45, -pitchLimit, pitchLimit),
				orbitIndex: wrapIndex(drag.startViewIndex + stepDelta, ORBIT_VIEWS.length),
			}));
			return;
		}
		setView((current) => ({
			...current,
			yaw: drag.startYaw + deltaX * 1.4,
			pitch: clamp(drag.startPitch - deltaY * 0.55, -pitchLimit, pitchLimit),
		}));
	};

	const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		event.stopPropagation();
		dragRef.current = null;
		setIsDragging(false);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div
			className={`three-d-director-panorama ${className} ${
				isOrbitMode ? "three-d-director-panorama--orbit" : ""
			} ${isDragging ? "is-dragging" : ""}`}
			data-node-interactive="true"
			role="img"
			aria-label={`${assetName}，按住鼠标左键拖动切换 3D 导演台视角`}
			style={{
				backgroundImage: `url("${assetUrl}")`,
				...(isOrbitMode
					? orbitBackgroundStyle
					: {
							backgroundPosition: `calc(50% + ${view.yaw}px) calc(50% + ${view.pitch}px)`,
							backgroundRepeat: "repeat-x",
							backgroundSize: `auto ${view.zoom * 100}%`,
						}),
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerEnd}
			onPointerCancel={handlePointerEnd}
			onContextMenu={(event) => {
				if (!didDragRef.current) return;
				event.preventDefault();
				event.stopPropagation();
				didDragRef.current = false;
			}}
			onWheel={(event) => {
				event.preventDefault();
				event.stopPropagation();
				updateZoom(event.deltaY > 0 ? -0.08 : 0.08);
			}}
		>
			<img
				src={assetUrl}
				alt=""
				aria-hidden="true"
				draggable={false}
				onDragStart={(event) => event.preventDefault()}
			/>
			<div className="three-d-director-panorama__view-badge" aria-hidden="true">
				<span>{isOrbitMode ? orbitView.label : "3D导演台"}</span>
				<small>{isOrbitMode ? `${orbitView.yaw}°` : stageAspectRatio}</small>
			</div>
			<div className="three-d-director-panorama__hint" aria-hidden="true">
				{isOrbitMode ? "右键左右拖动换角度 · 上下调视线 · 滚轮缩放" : "右键拖动旋转 · 滚轮缩放"}
			</div>
			<div className="three-d-director-panorama__controls" data-node-interactive="true">
				{isOrbitMode ? (
					<button
						type="button"
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation();
							updateOrbitIndex(-1);
						}}
						aria-label="切换到上一个角色视角"
					>
						‹
					</button>
				) : null}
				<button
					type="button"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						updateZoom(-0.16);
					}}
					aria-label="缩小全景预览"
				>
					−
				</button>
				<span>{Math.round(view.zoom * 100)}%</span>
				<button
					type="button"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						updateZoom(0.16);
					}}
					aria-label="放大全景预览"
				>
					+
				</button>
				{isOrbitMode ? (
					<button
						type="button"
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation();
							updateOrbitIndex(1);
						}}
						aria-label="切换到下一个角色视角"
					>
						›
					</button>
				) : null}
				<button
					type="button"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						setView({ yaw: 0, pitch: 0, zoom: 1.18, orbitIndex: 0 });
					}}
					aria-label="重置全景视角"
				>
					↺
				</button>
			</div>
		</div>
	);
}
