import type { NodeType } from "./canvas-types";

export const ALL_UPLOAD_ACCEPT = "image/*,video/*,audio/*";
export const IMAGE_UPLOAD_ACCEPT =
	"image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg";
export const VIDEO_UPLOAD_ACCEPT =
	"video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mp4,.mov,.webm,.mkv,.avi,.m4v";
export const AUDIO_UPLOAD_ACCEPT =
	"audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/flac,audio/ogg,.mp3,.wav,.m4a,.aac,.flac,.ogg";

const IMAGE_FILE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"];
const VIDEO_FILE_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "avi", "m4v"];
const AUDIO_FILE_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "flac", "ogg"];
const MP3_LIKE_AUDIO_EXTENSIONS = ["mp3", "m4a", "aac"];

type UploadIntentLike = {
	type?: Extract<NodeType, "image" | "video" | "audio" | "music" | "editor">;
} | null | undefined;

export function getUploadAccept(intent?: UploadIntentLike) {
	if (!intent?.type) return ALL_UPLOAD_ACCEPT;
	if (intent.type === "image" || intent.type === "editor")
		return IMAGE_UPLOAD_ACCEPT;
	if (intent.type === "video") return VIDEO_UPLOAD_ACCEPT;
	if (intent.type === "audio" || intent.type === "music")
		return AUDIO_UPLOAD_ACCEPT;
	return ALL_UPLOAD_ACCEPT;
}

export function getFileExtension(fileName: string) {
	const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
	return match?.[1] ?? "";
}

export function isFileCompatibleWithUploadIntent(
	file: Pick<File, "name" | "type">,
	intent: Exclude<UploadIntentLike, null | undefined>,
) {
	if (!intent.type) return true;
	const mime = file.type.toLowerCase();
	const extension = getFileExtension(file.name);
	if (intent.type === "image" || intent.type === "editor") {
		return (
			mime.startsWith("image/") ||
			IMAGE_FILE_EXTENSIONS.includes(extension)
		);
	}
	if (intent.type === "video") {
		return (
			mime.startsWith("video/") ||
			VIDEO_FILE_EXTENSIONS.includes(extension)
		);
	}
	if (intent.type === "audio" || intent.type === "music") {
		return (
			mime.startsWith("audio/") ||
			AUDIO_FILE_EXTENSIONS.includes(extension)
		);
	}
	return true;
}

export function isImageFile(file: Pick<File, "name" | "type">) {
	return (
		file.type.toLowerCase().startsWith("image/") ||
		IMAGE_FILE_EXTENSIONS.includes(getFileExtension(file.name))
	);
}

export function isVideoFile(file: Pick<File, "name" | "type">) {
	return (
		file.type.toLowerCase().startsWith("video/") ||
		VIDEO_FILE_EXTENSIONS.includes(getFileExtension(file.name))
	);
}

export function isAudioFile(file: Pick<File, "name" | "type">) {
	return (
		file.type.toLowerCase().startsWith("audio/") ||
		AUDIO_FILE_EXTENSIONS.includes(getFileExtension(file.name))
	);
}

export function isMp3LikeAudioFile(file: Pick<File, "name" | "type">) {
	const mime = file.type.toLowerCase();
	const extension = getFileExtension(file.name);
	return (
		mime === "audio/mpeg" ||
		mime === "audio/mp4" ||
		mime === "audio/aac" ||
		MP3_LIKE_AUDIO_EXTENSIONS.includes(extension)
	);
}

export function getExtensionForMime(mime: string) {
	const normalizedMime = mime.toLowerCase();
	if (normalizedMime === "image/jpeg") return "jpg";
	if (normalizedMime === "image/png") return "png";
	if (normalizedMime === "image/webp") return "webp";
	if (normalizedMime === "image/gif") return "gif";
	if (normalizedMime === "image/bmp") return "bmp";
	if (normalizedMime === "image/svg+xml") return "svg";
	if (normalizedMime === "video/mp4") return "mp4";
	if (normalizedMime === "video/webm") return "webm";
	if (normalizedMime === "video/quicktime") return "mov";
	if (normalizedMime === "video/x-matroska") return "mkv";
	if (normalizedMime === "audio/mpeg") return "mp3";
	if (normalizedMime === "audio/wav" || normalizedMime === "audio/x-wav") return "wav";
	if (normalizedMime === "audio/mp4") return "m4a";
	if (normalizedMime === "audio/aac") return "aac";
	if (normalizedMime === "audio/flac") return "flac";
	if (normalizedMime === "audio/ogg") return "ogg";
	return "";
}

export function ensureFileExtension(name: string, mime: string) {
	if (getFileExtension(name)) return name;
	const extension = getExtensionForMime(mime);
	return extension ? `${name}.${extension}` : name;
}

export function getAssetCategory(type: NodeType) {
	if (type === "video") return "视频";
	if (type === "audio") return "音频";
	if (type === "music") return "音乐";
	return "图片";
}

export function getImageAssetSubcategory(file: Pick<File, "name" | "type">) {
	const text = `${file.name} ${file.type}`.toLowerCase();
	if (
		/(person|people|portrait|face|human|character|avatar|role|人物|人像|肖像|角色|头像)/.test(
			text,
		)
	)
		return "人物";
	if (
		/(scene|background|landscape|interior|exterior|street|city|room|building|environment|场景|背景|风景|街道|城市|房间|建筑|环境)/.test(
			text,
		)
	)
		return "场景";
	if (
		/(object|item|prop|product|tool|weapon|clothes|car|vehicle|物品|道具|产品|工具|武器|衣服|服装|车辆)/.test(
			text,
		)
	)
		return "物品";
	return "未分类";
}

export function getUploadAssetCategory(type: NodeType, file: Pick<File, "name" | "type">) {
	const category = getAssetCategory(type);
	if (type === "image") return `${category}/${getImageAssetSubcategory(file)}`;
	return category;
}
