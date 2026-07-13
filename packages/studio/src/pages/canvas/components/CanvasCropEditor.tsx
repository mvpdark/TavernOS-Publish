import {
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";

export type CropBox = { left: number; top: number; width: number; height: number };

type CropAspectRatio =
	| "free"
	| "original"
	| "1:1"
	| "16:9"
	| "9:16"
	| "4:3"
	| "3:4"
	| "21:9";

type CropDragState = {
	mode: "move" | "resize";
	handle?: string;
	startX: number;
	startY: number;
	startBox: CropBox;
};

const DEFAULT_CROP_BOX: CropBox = { left: 12, top: 14, width: 76, height: 68 };
const MIN_CROP_SIZE = 16;
const CROP_ASPECT_RATIO_OPTIONS: Array<{ key: CropAspectRatio; label: string; value: number | null }> = [
	{ key: "free", label: "自由", value: null },
	{ key: "original", label: "原图比例", value: null },
	{ key: "1:1", label: "1:1", value: 1 },
	{ key: "16:9", label: "16:9", value: 16 / 9 },
	{ key: "9:16", label: "9:16", value: 9 / 16 },
	{ key: "4:3", label: "4:3", value: 4 / 3 },
	{ key: "3:4", label: "3:4", value: 3 / 4 },
	{ key: "21:9", label: "21:9", value: 21 / 9 },
];

function clampPercent(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function resizeCropBox(
	startBox: CropBox,
	handle: string,
	deltaXPercent: number,
	deltaYPercent: number,
): CropBox {
	let { left, top, width, height } = startBox;
	if (handle.includes("l")) {
		const nextLeft = clampPercent(left + deltaXPercent, 0, left + width - MIN_CROP_SIZE);
		width += left - nextLeft;
		left = nextLeft;
	}
	if (handle.includes("r")) {
		width = clampPercent(width + deltaXPercent, MIN_CROP_SIZE, 100 - left);
	}
	if (handle.includes("t")) {
		const nextTop = clampPercent(top + deltaYPercent, 0, top + height - MIN_CROP_SIZE);
		height += top - nextTop;
		top = nextTop;
	}
	if (handle.includes("b")) {
		height = clampPercent(height + deltaYPercent, MIN_CROP_SIZE, 100 - top);
	}
	return { left, top, width, height };
}

function getCropAspectValue(aspectRatio: CropAspectRatio, containerRect?: DOMRect) {
	if (aspectRatio === "original" && containerRect && containerRect.height > 0) {
		return containerRect.width / containerRect.height;
	}
	return CROP_ASPECT_RATIO_OPTIONS.find((option) => option.key === aspectRatio)?.value ?? null;
}

function constrainCropBoxToAspectRatio(
	box: CropBox,
	targetAspect: number,
	containerAspect: number,
): CropBox {
	const centerX = box.left + box.width / 2;
	const centerY = box.top + box.height / 2;
	let width = box.width;
	let height = (width * containerAspect) / targetAspect;
	if (height > box.height) {
		height = box.height;
		width = (height * targetAspect) / containerAspect;
	}
	width = clampPercent(width, MIN_CROP_SIZE, 100);
	height = clampPercent(height, MIN_CROP_SIZE, 100);
	let left = centerX - width / 2;
	let top = centerY - height / 2;
	left = clampPercent(left, 0, 100 - width);
	top = clampPercent(top, 0, 100 - height);
	return { left, top, width, height };
}

function getMaxCropBoxForAspectRatio(
	targetAspect: number,
	containerAspect: number,
): CropBox {
	let width = 100;
	let height = (width * containerAspect) / targetAspect;
	if (height > 100) {
		height = 100;
		width = (height * targetAspect) / containerAspect;
	}
	width = clampPercent(width, MIN_CROP_SIZE, 100);
	height = clampPercent(height, MIN_CROP_SIZE, 100);
	return {
		left: (100 - width) / 2,
		top: (100 - height) / 2,
		width,
		height,
	};
}

function getCropBoxForAspectRatio(
	currentBox: CropBox,
	aspectRatio: CropAspectRatio,
	containerRect?: DOMRect,
	mode: "max" | "current" = "current",
) {
	const targetAspect = getCropAspectValue(aspectRatio, containerRect);
	if (!targetAspect || !containerRect || containerRect.width <= 0 || containerRect.height <= 0) {
		return currentBox;
	}
	if (mode === "max") {
		return getMaxCropBoxForAspectRatio(
			targetAspect,
			containerRect.width / containerRect.height,
		);
	}
	return constrainCropBoxToAspectRatio(
		currentBox,
		targetAspect,
		containerRect.width / containerRect.height,
	);
}

export function CropEditor({
	nodeId,
	onImageToolbarAction,
	stopNodeControlPointerDown,
}: {
	nodeId: string;
	onImageToolbarAction: (nodeId: string, actionKey: string, cropBox?: CropBox) => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
	const editorRef = useRef<HTMLDivElement | null>(null);
	const [cropBox, setCropBox] = useState<CropBox>(DEFAULT_CROP_BOX);
	const [dragState, setDragState] = useState<CropDragState | null>(null);
	const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>("free");
	const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);

	useEffect(() => {
		if (!dragState) return;
		const handlePointerMove = (event: globalThis.PointerEvent) => {
			const rect = editorRef.current?.getBoundingClientRect();
			if (!rect || rect.width <= 0 || rect.height <= 0) return;
			const deltaXPercent = ((event.clientX - dragState.startX) / rect.width) * 100;
			const deltaYPercent = ((event.clientY - dragState.startY) / rect.height) * 100;
			setCropBox(() => {
				if (dragState.mode === "move") {
					return {
						...dragState.startBox,
						left: clampPercent(
							dragState.startBox.left + deltaXPercent,
							0,
							100 - dragState.startBox.width,
						),
						top: clampPercent(
							dragState.startBox.top + deltaYPercent,
							0,
							100 - dragState.startBox.height,
						),
					};
				}
				const resizedBox = resizeCropBox(
					dragState.startBox,
					dragState.handle ?? "br",
					deltaXPercent,
					deltaYPercent,
				);
				return getCropBoxForAspectRatio(resizedBox, aspectRatio, rect);
			});
		};
		const handlePointerUp = () => setDragState(null);
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp, { once: true });
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [aspectRatio, dragState]);

	const beginCropDrag = (
		event: PointerEvent<HTMLElement>,
		mode: CropDragState["mode"],
		handle?: string,
	) => {
		event.preventDefault();
		event.stopPropagation();
		stopNodeControlPointerDown(event);
		setDragState({
			mode,
			handle,
			startX: event.clientX,
			startY: event.clientY,
			startBox: cropBox,
		});
	};

	const shadeStyle = {
		["--crop-left" as string]: `${cropBox.left}%`,
		["--crop-top" as string]: `${cropBox.top}%`,
		["--crop-right" as string]: `${100 - cropBox.left - cropBox.width}%`,
		["--crop-bottom" as string]: `${100 - cropBox.top - cropBox.height}%`,
	};

	const applyAspectRatio = (nextAspectRatio: CropAspectRatio) => {
		setAspectRatio(nextAspectRatio);
		setIsAspectMenuOpen(false);
		setCropBox((currentBox) =>
			getCropBoxForAspectRatio(
				currentBox,
				nextAspectRatio,
				editorRef.current?.getBoundingClientRect(),
				"max",
			),
		);
	};

	return (
		<>
			<div
				ref={editorRef}
				data-node-interactive="true"
				className="image-crop-editor is-view-locked"
				onPointerDown={stopNodeControlPointerDown}
				style={shadeStyle}
			>
				<div className="image-crop-editor__shade image-crop-editor__shade--top" />
				<div className="image-crop-editor__shade image-crop-editor__shade--left" />
				<div className="image-crop-editor__shade image-crop-editor__shade--right" />
				<div className="image-crop-editor__shade image-crop-editor__shade--bottom" />
				<div
					className="image-crop-editor__box"
					style={{
						left: `${cropBox.left}%`,
						top: `${cropBox.top}%`,
						width: `${cropBox.width}%`,
						height: `${cropBox.height}%`,
					}}
					onPointerDown={(event) => beginCropDrag(event, "move")}
				>
					{["tl", "tm", "tr", "ml", "mr", "bl", "bm", "br"].map((handle) => (
						<span
							key={handle}
							className={`image-crop-editor__handle image-crop-editor__handle--${handle}`}
							onPointerDown={(event) => beginCropDrag(event, "resize", handle)}
						/>
					))}
				</div>
			</div>
			<div
				className="crop-extension-panel"
				data-node-interactive="true"
				onPointerDown={stopNodeControlPointerDown}
			>
				<div className="crop-extension-panel__actions">
					<button
						type="button"
						className="crop-extension-panel__cancel"
						onClick={(event) => {
							event.stopPropagation();
							onImageToolbarAction(nodeId, "crop-cancel");
						}}
						aria-label="取消裁剪"
					>
						×
					</button>
					<button
						type="button"
						className="crop-extension-panel__ghost"
						onClick={(event) => {
							event.stopPropagation();
							setIsAspectMenuOpen((current) => !current);
						}}
						aria-expanded={isAspectMenuOpen}
					>
						▧ 宽高比 · {aspectRatio === "free" ? "自由" : aspectRatio}
					</button>
					{isAspectMenuOpen ? (
						<div className="crop-extension-panel__ratio-menu" role="menu" aria-label="选择裁剪宽高比">
							{CROP_ASPECT_RATIO_OPTIONS.filter((option) => option.key !== "free").map((option) => (
								<button
									key={option.key}
									type="button"
									className={aspectRatio === option.key ? "is-active" : ""}
									onClick={(event) => {
										event.stopPropagation();
										applyAspectRatio(option.key);
									}}
								>
									{option.label}
								</button>
							))}
						</div>
					) : null}
					<button
						type="button"
						className="crop-extension-panel__primary"
						onClick={(event) => {
							event.stopPropagation();
							onImageToolbarAction(nodeId, "crop-confirm", cropBox);
						}}
					>
						✓ 确认裁剪
					</button>
				</div>
			</div>
		</>
	);
}
