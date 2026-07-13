import type { KakaApiConfig } from "./kakaApi";
import { isLocalKakaApiBaseUrl, isYunwuKakaApiBaseUrl } from "./kakaApi";
import { isIdeogramModel } from "./ideogramRouting";
import {
	getMidjourneyActionLabel,
	isMidjourneyTaskAction,
	normalizeMidjourneyAction,
	type MidjourneyActionId,
} from "./midjourneyActions";
import type { ReferenceAssetWithUrl } from "./referenceAssetUtils";
import { getModelDisplayLabel, getSelectedModelPlatformEmoji } from "./modelOptions";
import type { ComposerPreset, NodeType, ReferenceAsset } from "./canvas-types";
import { getImageModelCapability } from "./imageModelCapabilities";

export type KakaSendNoticeTone = "info" | "warning";

export type KakaApiTaskInfo = {
	taskId?: string;
	status?: string;
	message?: string;
};

export type KakaSendRouteContext = {
	modelDisplayLabel: string;
	modelKey: string;
	isMidjourneyRequest: boolean;
	isIdeogramRequest: boolean;
	midjourneyAction: MidjourneyActionId;
	midjourneyTaskSource: ReferenceAsset | null;
	midjourneyTaskId?: string;
	nextPrompt: string;
	audioVoiceMode: NonNullable<ComposerPreset["audioVoiceMode"]>;
	isAudioVoiceUtility: boolean;
};

export type KakaSendReferenceAsset = ReferenceAssetWithUrl;

export type KakaSendNotice = {
	message: string;
	tone: KakaSendNoticeTone;
	dedupeKey: string;
};

function isPanelToken(value: string) {
	return value.trim().startsWith("sk-kaka-");
}

export function extractTaskInfo(value: unknown): KakaApiTaskInfo | null {
	if (!value || typeof value !== "object") return null;
	if (Array.isArray(value)) {
		for (const item of value) {
			const nested = extractTaskInfo(item);
			if (nested) return nested;
		}
		return null;
	}

	const record = value as Record<string, unknown>;
	const taskIdValue = record.task_id ?? record.taskId ?? record.taskIdStr ?? record.job_id ?? record.id;
	const statusValue = record.status ?? record.state ?? record.task_status ?? record.progress_status;
	const messageValue = record.message ?? record.error ?? record.failReason ?? record.fail_reason;
	const taskInfo: KakaApiTaskInfo = {};
	if (typeof taskIdValue === "string" && taskIdValue.trim()) taskInfo.taskId = taskIdValue.trim();
	if (typeof taskIdValue === "number") taskInfo.taskId = String(taskIdValue);
	if (typeof statusValue === "string" && statusValue.trim()) taskInfo.status = statusValue.trim();
	if (typeof messageValue === "string" && messageValue.trim()) taskInfo.message = messageValue.trim();
	if (taskInfo.taskId || taskInfo.status || taskInfo.message) return taskInfo;

	for (const key of ["data", "result", "raw", "task"] as const) {
		const nested = extractTaskInfo(record[key]);
		if (nested) return nested;
	}
	return null;
}

function hasMidjourneyAssetContext(asset?: ReferenceAsset | null) {
	if (!asset) return false;
	const providerModel = String(asset.providerModel || "").toLowerCase();
	const isMidjourneyAsset =
		asset.provider === "midjourney" ||
		providerModel.startsWith("mj_") ||
		providerModel.includes("midjourney");
	return isMidjourneyAsset && Boolean(asset.providerTaskId || asset.providerMetadata);
}

export function getMidjourneyTaskIdFromAsset(asset?: ReferenceAsset | null) {
	return asset?.providerTaskId ?? extractTaskInfo(asset?.providerMetadata)?.taskId;
}

export function resolveMidjourneyTaskSource({
	sourceAsset,
	referenceAssets,
}: {
	sourceAsset: ReferenceAsset | null;
	referenceAssets: readonly ReferenceAsset[];
}) {
	if (hasMidjourneyAssetContext(sourceAsset)) return sourceAsset;
	return referenceAssets.find((asset) => hasMidjourneyAssetContext(asset)) ?? null;
}

export function resolveKakaSendRouteContext({
	nodeType,
	model,
	prompt,
	promptPrefix,
	composer,
	referenceAssets,
	sourceAsset,
}: {
	nodeType: NodeType;
	model: string;
	prompt: string;
	promptPrefix: string;
	composer: ComposerPreset;
	referenceAssets: KakaSendReferenceAsset[];
	sourceAsset: ReferenceAsset | null;
}): KakaSendRouteContext {
	const modelDisplayLabel = getModelDisplayLabel(model).trim();
	const modelPlatformEmoji = getSelectedModelPlatformEmoji(model).trim();
	const modelKey = modelPlatformEmoji
		? `${modelDisplayLabel} ${modelPlatformEmoji}`
		: modelDisplayLabel;
	const isMidjourneyRequest =
		modelDisplayLabel.startsWith("Midjourney") ||
		getModelDisplayLabel(composer.model).trim().startsWith("Midjourney");
	const isIdeogramRequest = isIdeogramModel(model) || isIdeogramModel(composer.model);
	const midjourneyDisplayLabel = modelDisplayLabel.startsWith("Midjourney")
		? modelDisplayLabel
		: getModelDisplayLabel(composer.model).trim();
	let midjourneyAction = normalizeMidjourneyAction(composer.midjourneyAction);
	if (midjourneyAction === "imagine") {
		if (midjourneyDisplayLabel === "Midjourney 混图") midjourneyAction = "blend";
		if (midjourneyDisplayLabel === "Midjourney 反推") midjourneyAction = "describe";
	}
	const midjourneyTaskSource = resolveMidjourneyTaskSource({
		sourceAsset,
		referenceAssets,
	});
	const midjourneyTaskId = getMidjourneyTaskIdFromAsset(midjourneyTaskSource);
	const rawNextPrompt =
		(nodeType === "text" && promptPrefix ? `${promptPrefix}${prompt}` : prompt).trim();
	const nextPrompt =
		rawNextPrompt ||
		(isMidjourneyRequest && midjourneyAction !== "imagine"
			? getMidjourneyActionLabel(midjourneyAction)
			: "");
	const audioVoiceMode = composer.audioVoiceMode ?? "tts";

	return {
		modelDisplayLabel,
		modelKey,
		isMidjourneyRequest,
		isIdeogramRequest,
		midjourneyAction,
		midjourneyTaskSource,
		midjourneyTaskId,
		nextPrompt,
		audioVoiceMode,
		isAudioVoiceUtility: nodeType === "audio" && audioVoiceMode !== "tts",
	};
}

export function getKakaSendPreflightNotice({
	nodeType,
	model,
	referenceAssets,
	routeContext,
}: {
	nodeType: NodeType;
	model: string;
	referenceAssets: KakaSendReferenceAsset[];
	routeContext: KakaSendRouteContext;
}): KakaSendNotice | null {
	if (!routeContext.nextPrompt && !routeContext.isAudioVoiceUtility) {
		return {
			message: "请先填写提示词再发送 kaka-api 请求。",
			tone: "warning",
			dedupeKey: "kaka-api-empty-prompt",
		};
	}
	if (
		nodeType === "video" &&
		routeContext.modelKey.startsWith("Grok Imagine Video") &&
		referenceAssets.length === 0
	) {
		return {
			message: "Grok Imagine Video 需要至少一张参考图。",
			tone: "warning",
			dedupeKey: "kaka-api-video-missing-reference",
		};
	}
	if (
		(nodeType === "image" || nodeType === "editor") &&
		routeContext.isIdeogramRequest &&
		getModelDisplayLabel(model).trim() !== "Ideogram 3.0" &&
		referenceAssets.length === 0
	) {
		return {
			message: "Ideogram 编辑、重绘、扩图、重构或融合模式需要先连接参考图。",
			tone: "warning",
			dedupeKey: "kaka-api-ideogram-missing-reference",
		};
	}
	if (
		(nodeType === "image" || nodeType === "editor") &&
		!routeContext.isMidjourneyRequest &&
		referenceAssets.length > 0
	) {
		const capability = getImageModelCapability(model);
		if (capability.maxReferenceImages <= 0) {
			return {
				message: `当前模型不支持图片输入，请移除参考图或更换支持图生图的模型。`,
				tone: "warning",
				dedupeKey: "kaka-api-model-no-image-input",
			};
		}
	}
	if (
		(nodeType === "image" || nodeType === "editor") &&
		routeContext.isMidjourneyRequest &&
		routeContext.midjourneyAction === "describe" &&
		referenceAssets.length === 0
	) {
		return {
			message: "Midjourney 反推需要先连接一张参考图。",
			tone: "warning",
			dedupeKey: "kaka-api-mj-describe-missing-reference",
		};
	}
	if (
		(nodeType === "image" || nodeType === "editor") &&
		routeContext.isMidjourneyRequest &&
		routeContext.midjourneyAction === "blend" &&
		referenceAssets.length < 2
	) {
		return {
			message: "Midjourney 混图至少需要两张参考图。",
			tone: "warning",
			dedupeKey: "kaka-api-mj-blend-missing-reference",
		};
	}
	if (
		(nodeType === "image" || nodeType === "editor") &&
		routeContext.isMidjourneyRequest &&
		isMidjourneyTaskAction(routeContext.midjourneyAction) &&
		!routeContext.midjourneyTaskId
	) {
		return {
			message: `Midjourney ${getMidjourneyActionLabel(routeContext.midjourneyAction)} 需要先选择一张已生成的 MJ 图片。`,
			tone: "warning",
			dedupeKey: "kaka-api-mj-task-action-missing-context",
		};
	}
	return null;
}

export function getKakaApiConfigPreflightNotice(config: KakaApiConfig): KakaSendNotice | null {
	const useLocalProxy = isLocalKakaApiBaseUrl(config.baseUrl);
	const useYunwuDirectKey = isYunwuKakaApiBaseUrl(config.baseUrl);
	if (!config.apiKey && !useLocalProxy) {
		return {
			message: "请先在设置中填写 sk-kaka API 令牌。",
			tone: "warning",
			dedupeKey: "kaka-api-missing-key",
		};
	}
	if (config.apiKey && !isPanelToken(config.apiKey) && !useLocalProxy && !useYunwuDirectKey) {
		return {
			message: "这里只接受 sk-kaka API 令牌，不接受旧 Gateway Key。",
			tone: "warning",
			dedupeKey: "kaka-api-invalid-token-format",
		};
	}
	return null;
}
