import {
	type PointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

function canvasToPngDataUrl(canvas: HTMLCanvasElement) {
	return canvas.toDataURL("image/png");
}

export function RedrawMaskEditor({
	nodeId,
	assetUrl,
	assetName,
	isGenerating,
	onGenerate,
	onClose,
	stopNodeControlPointerDown,
}: {
	nodeId: string;
	assetUrl: string;
	assetName: string;
	isGenerating: boolean;
	onGenerate: (nodeId: string, maskDataUrl: string) => void;
	onClose: () => void;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [brushSize, setBrushSize] = useState(42);
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasMask, setHasMask] = useState(false);
	const [imageSize, setImageSize] = useState({ width: 1024, height: 1024 });

	useEffect(() => {
		const image = new Image();
		image.onload = () => {
			if (image.naturalWidth > 0 && image.naturalHeight > 0) {
				setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
			}
		};
		image.src = assetUrl;
	}, [assetUrl]);

	const drawAt = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;
		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
		const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
		context.fillStyle = "rgba(0, 0, 0, 0.78)";
		context.beginPath();
		context.arc(x, y, brushSize / 2, 0, Math.PI * 2);
		context.fill();
		setHasMask(true);
	}, [brushSize]);

	const clearMask = useCallback(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;
		context.clearRect(0, 0, canvas.width, canvas.height);
		setHasMask(false);
	}, []);

	const exportMask = useCallback(() => {
		const visibleCanvas = canvasRef.current;
		if (!visibleCanvas || !hasMask) return;
		const maskCanvas = document.createElement("canvas");
		maskCanvas.width = visibleCanvas.width;
		maskCanvas.height = visibleCanvas.height;
		const context = maskCanvas.getContext("2d");
		if (!context) return;
		context.fillStyle = "#fff";
		context.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
		context.drawImage(visibleCanvas, 0, 0);
		onGenerate(nodeId, canvasToPngDataUrl(maskCanvas));
	}, [hasMask, nodeId, onGenerate]);

	return (
		<>
			<div
				className="redraw-mask-editor"
				data-node-interactive="true"
				onPointerDown={stopNodeControlPointerDown}
			>
				<img src={assetUrl} alt={assetName} draggable={false} />
				<canvas
					ref={canvasRef}
					width={imageSize.width}
					height={imageSize.height}
					className="redraw-mask-editor__canvas"
					onPointerDown={(event) => {
						event.preventDefault();
						event.stopPropagation();
						event.currentTarget.setPointerCapture(event.pointerId);
						setIsDrawing(true);
						drawAt(event);
					}}
					onPointerMove={(event) => {
						if (isDrawing) drawAt(event);
					}}
					onPointerUp={(event) => {
						setIsDrawing(false);
						if (event.currentTarget.hasPointerCapture(event.pointerId)) {
							event.currentTarget.releasePointerCapture(event.pointerId);
						}
					}}
					onPointerCancel={() => setIsDrawing(false)}
				/>
				<div className="redraw-mask-editor__hint">涂黑要重绘的区域</div>
			</div>
			<div
				className="redraw-mask-panel"
				data-node-interactive="true"
				onPointerDown={stopNodeControlPointerDown}
			>
				<button type="button" className="redraw-mask-panel__cancel" onClick={onClose}>×</button>
				<label className="redraw-mask-panel__slider">
					画笔
					<input
						type="range"
						min="12"
						max="120"
						value={brushSize}
						onChange={(event) => setBrushSize(Number(event.target.value))}
					/>
				</label>
				<button type="button" className="redraw-mask-panel__ghost" onClick={clearMask}>清除</button>
				<button
					type="button"
					className="redraw-mask-panel__primary"
					disabled={!hasMask || isGenerating}
					onClick={exportMask}
				>
					{isGenerating ? "重绘中…" : "用 Ideogram 重绘"}
				</button>
			</div>
		</>
	);
}
