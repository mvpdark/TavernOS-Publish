import type {
	ChangeEvent,
	DragEvent,
	RefObject,
	MutableRefObject,
	Dispatch,
	SetStateAction,
} from "react";
import {
	getUploadAccept,
	isAudioFile,
	isImageFile,
	isVideoFile,
} from "../canvasAssetActions";
import type { UploadIntent } from "../appCanvasState";
import type { RuntimeNotice } from "./useRuntimeNotices";

type Point = { x: number; y: number };

type UseCanvasAssetActionsArgs = {
	uploadInputRef: RefObject<HTMLInputElement | null>;
	uploadIntent: UploadIntent;
	canvasDragDepthRef: MutableRefObject<number>;
	isCanvasDropActive: boolean;
	setUploadIntent: Dispatch<SetStateAction<UploadIntent>>;
	setIsCanvasDropActive: Dispatch<SetStateAction<boolean>>;
	applyUploadedFile: (file: File, intent: Exclude<UploadIntent, null>) => Promise<void>;
	getWorldPointFromClient: (clientX: number, clientY: number) => Point | null;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
};

function getSupportedDroppedFiles(fileList: FileList) {
	return Array.from(fileList).filter((file) =>
		isImageFile(file) || isVideoFile(file) || isAudioFile(file),
	);
}

export function useCanvasAssetActions({
	uploadInputRef,
	uploadIntent,
	canvasDragDepthRef,
	isCanvasDropActive,
	setUploadIntent,
	setIsCanvasDropActive,
	applyUploadedFile,
	getWorldPointFromClient,
	pushRuntimeNotice,
}: UseCanvasAssetActionsArgs) {
	function openUploadPicker(intent: UploadIntent) {
		if (!intent || !uploadInputRef.current) return;
		uploadInputRef.current.accept = getUploadAccept(intent);
		setUploadIntent(intent);
		uploadInputRef.current.value = "";
		uploadInputRef.current.click();
	}

	function notifyFileApplyFailed(
		error: unknown,
		logMessage: string,
		userMessage: string,
		dedupeKey: string,
	) {
		console.error(logMessage, error);
		pushRuntimeNotice(userMessage, "warning", dedupeKey);
	}

	function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file || !uploadIntent) return;
		void applyUploadedFile(file, uploadIntent).catch((error) => {
			notifyFileApplyFailed(
				error,
				"Failed to apply uploaded file.",
				"文件处理失败，请重试一次。",
				"apply-upload-failed",
			);
		});
		setUploadIntent(null);
	}

	function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
		if (!event.dataTransfer.types.includes("Files")) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		if (!isCanvasDropActive) {
			setIsCanvasDropActive(true);
		}
	}

	function handleCanvasDragEnter(event: DragEvent<HTMLDivElement>) {
		if (!event.dataTransfer.types.includes("Files")) return;
		event.preventDefault();
		canvasDragDepthRef.current += 1;
		setIsCanvasDropActive(true);
	}

	function handleCanvasDragLeave(event: DragEvent<HTMLDivElement>) {
		if (!event.dataTransfer.types.includes("Files")) return;
		event.preventDefault();
		canvasDragDepthRef.current = Math.max(0, canvasDragDepthRef.current - 1);
		if (canvasDragDepthRef.current === 0) {
			setIsCanvasDropActive(false);
		}
	}

	function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
		if (!event.dataTransfer.files.length) return;
		event.preventDefault();
		event.stopPropagation();
		canvasDragDepthRef.current = 0;
		setIsCanvasDropActive(false);
		const files = getSupportedDroppedFiles(event.dataTransfer.files);
		if (!files.length) return;
		const basePoint = getWorldPointFromClient(event.clientX, event.clientY);
		files.forEach((file, index) => {
			void applyUploadedFile(file, {
				worldX: (basePoint?.x ?? 0) + index * 42,
				worldY: (basePoint?.y ?? 0) + index * 30,
			}).catch((error) => {
				notifyFileApplyFailed(
					error,
					"Failed to apply dropped file.",
					"拖拽文件处理失败，请重试一次。",
					"apply-drop-upload-failed",
				);
			});
		});
	}

	return {
		openUploadPicker,
		handleUploadChange,
		handleCanvasDragOver,
		handleCanvasDragEnter,
		handleCanvasDragLeave,
		handleCanvasDrop,
	};
}
