import {
	isAudioFile,
	isImageFile,
	isMp3LikeAudioFile,
	isVideoFile,
} from "./canvasAssetActions";
import type { PortSide } from "./hooks/useConnectionInteractionHelpers";
import type { CanvasNode, NodeType } from "./canvas-types";

export type UploadableNodeType = Extract<
	NodeType,
	"image" | "video" | "audio" | "music" | "editor"
>;

export function readAudioDuration(file: File) {
	return new Promise<number | null>((resolve) => {
		const audio = document.createElement("audio");
		const objectUrl = URL.createObjectURL(file);
		const cleanup = () => {
			audio.removeAttribute("src");
			audio.load();
			URL.revokeObjectURL(objectUrl);
		};
		audio.preload = "metadata";
		audio.onloadedmetadata = () => {
			const duration = Number.isFinite(audio.duration) ? audio.duration : null;
			cleanup();
			resolve(duration);
		};
		audio.onerror = () => {
			cleanup();
			resolve(null);
		};
		audio.src = objectUrl;
	});
}

export function getImageNodeSize(naturalWidth: number, naturalHeight: number) {
	const aspect =
		naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1;
	let width = aspect >= 1 ? 360 : 360 * aspect;
	let height = aspect >= 1 ? 360 / aspect : 360;
	if (Math.min(width, height) < 190) {
		const scale = 190 / Math.min(width, height);
		width *= scale;
		height *= scale;
	}
	if (width > 460) {
		const scale = 460 / width;
		width *= scale;
		height *= scale;
	}
	if (height > 520) {
		const scale = 520 / height;
		width *= scale;
		height *= scale;
	}
	return { width: Math.round(width), height: Math.round(height) };
}

export function measureImageIntrinsicSize(url: string) {
	return new Promise<{ width: number; height: number } | null>((resolve) => {
		const image = new Image();
		image.onload = () => {
			const width = image.naturalWidth;
			const height = image.naturalHeight;
			resolve(width > 0 && height > 0 ? { width, height } : null);
		};
		image.onerror = () => resolve(null);
		image.src = url;
	});
}

export function getConnectionPath(
	start: { x: number; y: number },
	end: { x: number; y: number },
	fromSide: PortSide,
	toSide: PortSide,
) {
	const bend = Math.max(82, Math.abs(end.x - start.x) * 0.42);
	const c1x = fromSide === "right" ? start.x + bend : start.x - bend;
	const c2x = toSide === "left" ? end.x - bend : end.x + bend;
	return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
}

export function measureImageFile(url: string) {
	return new Promise<{ width: number; height: number } | null>((resolve) => {
		const image = new Image();
		image.onload = () =>
			resolve(getImageNodeSize(image.naturalWidth, image.naturalHeight));
		image.onerror = () => resolve(null);
		image.src = url;
	});
}

export function resolveUploadNodeTypeFromFile(
	file: Pick<File, "name" | "type">,
	fallback: UploadableNodeType = "image",
) {
	if (fallback === "music" && isAudioFile(file))
		return "music";
	if (fallback === "editor" && isImageFile(file))
		return "editor";
	if (isImageFile(file))
		return "image";
	if (isVideoFile(file))
		return "video";
	if (isAudioFile(file))
		return "audio";
	return fallback;
}

export async function resolveUploadNodeType(
	file: File,
	fallback: UploadableNodeType = "image",
	durationReader: (file: File) => Promise<number | null> = readAudioDuration,
): Promise<UploadableNodeType> {
	const parsedType = resolveUploadNodeTypeFromFile(file, fallback);
	if (
		(parsedType === "audio" || parsedType === "music") &&
		isMp3LikeAudioFile(file)
	) {
		const duration = await durationReader(file);
		if (typeof duration === "number") {
			return duration > 60 ? "music" : "audio";
		}
	}
	return parsedType;
}

export function getGeneratedAssetCategory(type: NodeType) {
	if (type === "video") return "video" as const;
	if (type === "music") return "music" as const;
	if (type === "audio") return "audio" as const;
	return "image" as const;
}

export function getNodeOverlapArea(a: CanvasNode, b: CanvasNode) {
	const left = Math.max(a.x, b.x);
	const top = Math.max(a.y, b.y);
	const right = Math.min(a.x + a.width, b.x + b.width);
	const bottom = Math.min(a.y + a.height, b.y + b.height);
	return Math.max(0, right - left) * Math.max(0, bottom - top);
}
