import {
	extractTaskInfo,
	type KakaApiTaskInfo,
	type KakaSendNoticeTone,
} from "./kakaSendRouting";
import type { NodeType } from "./canvas-types";

export type KakaGeneratedAssetResolution =
	| {
		kind: "asset";
		assetUrl: string;
		taskInfo: KakaApiTaskInfo | null;
		unwrappedData: unknown;
	}
	| {
		kind: "task";
		notice: {
			message: string;
			tone: KakaSendNoticeTone;
			dedupeKey: string;
		};
		taskInfo: KakaApiTaskInfo;
		unwrappedData: unknown;
	};

export function unwrapAlignedResponseData(payload: unknown) {
	if (typeof payload !== "object" || payload === null) return payload;
	const record = payload as Record<string, unknown>;
	if (record.success === false) {
		const errorValue = record.error;
		if (typeof errorValue === "string" && errorValue.trim()) {
			throw new Error(errorValue.trim());
		}
		if (
			typeof errorValue === "object" &&
			errorValue !== null &&
			typeof (errorValue as { message?: unknown }).message === "string"
		) {
			throw new Error(String((errorValue as { message?: unknown }).message));
		}
		if (typeof record.message === "string" && record.message.trim()) {
			throw new Error(record.message.trim());
		}
		throw new Error("kaka-api 请求失败");
	}
	return "data" in record ? record.data : record;
}

export function extractFirstUrl(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string" && value.trim()) return value.trim();
	if (Array.isArray(value)) {
		for (const item of value) {
			const nested = extractFirstUrl(item);
			if (nested) return nested;
		}
		return null;
	}
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	for (const key of ["image_url", "video_url", "audio_url", "url", "uri", "src"]) {
		const direct = record[key];
		if (typeof direct === "string" && direct.trim()) return direct.trim();
	}
	for (const key of ["urls", "images", "videos", "audios", "data", "result"] as const) {
		const nested = extractFirstUrl(record[key]);
		if (nested) return nested;
	}
	return null;
}

export function inferAssetMime(type: NodeType) {
	if (type === "image" || type === "editor") return "image/png";
	if (type === "video") return "video/mp4";
	if (type === "audio" || type === "music") return "audio/mpeg";
	return undefined;
}

export function inferAssetName(type: NodeType, model: string) {
	if (type === "shot") return `${model}-shot`;
	if (type === "image" || type === "editor") return `${model}-image`;
	if (type === "video") return `${model}-video`;
	if (type === "audio") return `${model}-audio`;
	if (type === "music") return `${model}-music`;
	return `${model}-result`;
}

export function resolveGeneratedAssetResponse(alignedResponse: unknown): KakaGeneratedAssetResolution {
	const unwrappedData = unwrapAlignedResponseData(alignedResponse);
	const assetUrl = extractFirstUrl(unwrappedData);
	const taskInfo =
		extractTaskInfo(unwrappedData) ?? extractTaskInfo(alignedResponse);
	if (assetUrl) {
		return {
			kind: "asset",
			assetUrl,
			taskInfo,
			unwrappedData,
		};
	}
	if (taskInfo) {
		const taskLabel = taskInfo.taskId ? `任务 ${taskInfo.taskId}` : "任务";
		const statusLabel = taskInfo.status ? `，状态：${taskInfo.status}` : "";
		const messageLabel = taskInfo.message ? `，信息：${taskInfo.message}` : "";
		const tone =
			taskInfo.status && /fail|error|timeout|cancel/i.test(taskInfo.status)
				? "warning"
				: "info";
		return {
			kind: "task",
			notice: {
				message: `kaka-api 已创建${taskLabel}${statusLabel}${messageLabel}，但暂时没有返回可用 URL。`,
				tone,
				dedupeKey: "kaka-api-task-without-url",
			},
			taskInfo,
			unwrappedData,
		};
	}
	throw new Error("kaka-api 返回成功，但没有找到可用的资源 URL。");
}

export function extractVoiceId(value: unknown): string | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const direct = record.voice_id ?? record.voiceId;
	if (typeof direct === "string" && direct.trim()) return direct.trim();
	for (const key of ["raw", "data", "result", "metadata"]) {
		const found = extractVoiceId(record[key]);
		if (found) return found;
	}
	return null;
}
