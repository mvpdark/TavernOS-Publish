import { useCallback, useState } from "react";

import {
	type KakaAlignedResponse,
	type KakaApiConfig,
} from "../kakaApi";
import {
	resolveKakaApiSendPreflight,
} from "../kakaApiSendPreflight";
import {
	requestAudioLikeGeneration,
	requestMusicLikeGeneration,
} from "../kakaAudioMusicRequests";
import { requestImageLikeGeneration } from "../kakaImageRequests";
import { requestTextLikeCompletion } from "../kakaTextRequests";
import { requestVideoLikeGeneration } from "../kakaVideoRequests";
import {
	type KakaSendNoticeTone,
	type KakaSendRouteContext,
} from "../kakaSendRouting";
import {
	inferAssetMime,
	inferAssetName,
	resolveGeneratedAssetResponse,
} from "../kakaSendResponse";
import type { ReferenceAssetWithUrl } from "../referenceAssetUtils";
import type { ComposerPreset, NodeType, ReferenceAsset } from "../canvas-types";

export type KakaApiSendNoticeTone = KakaSendNoticeTone;

export type KakaApiSendSuccessPayload = {
	text?: string;
	assetUrl?: string;
	assetMime?: string;
	assetName?: string;
	provider?: string;
	providerModel?: string;
	taskId?: string;
	taskStatus?: string;
	taskMessage?: string;
	metadata?: unknown;
};

type UseKakaApiSendParams = {
	baseUrl: string;
	defaultBaseUrl: string;
	apiKey: string;
	timeoutMs: number;
	nodeType: NodeType;
	model: string;
	prompt: string;
	promptPrefix: string;
	composer: ComposerPreset;
	referenceAssets?: ReferenceAsset[];
	sourceAsset?: ReferenceAsset | null;
	onNotice: (
		message: string,
		tone?: KakaApiSendNoticeTone,
		dedupeKey?: string,
	) => void;
	onSuccess?: (payload: KakaApiSendSuccessPayload) => void;
	requestScopeId?: string | null;
	onRequestStart?: (requestScopeId: string) => void;
	onRequestSettled?: (requestScopeId: string) => void;
};

type GeneratedAssetRequestResult = {
	alignedResponse: KakaAlignedResponse;
	sentModel: string;
	isGrokVideoRequest: boolean;
	voiceNotice?: {
		message: string;
		dedupeKey: string;
	};
};

const TEXT_LIKE_NODE_TYPES = new Set<NodeType>([
	"text",
	"shot",
	"character",
	"scene",
]);

function isTextLikeNodeType(nodeType: NodeType) {
	return TEXT_LIKE_NODE_TYPES.has(nodeType);
}

async function requestGeneratedAsset({
	config,
	nodeType,
	model,
	composer,
	referenceAssets,
	sourceAsset,
	routeContext,
	nextPrompt,
}: {
	config: KakaApiConfig;
	nodeType: NodeType;
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
	sourceAsset: ReferenceAsset | null;
	routeContext: KakaSendRouteContext;
	nextPrompt: string;
}): Promise<GeneratedAssetRequestResult> {
	if (nodeType === "image" || nodeType === "editor") {
		const result = await requestImageLikeGeneration({
			config,
			model,
			composer,
			referenceAssets,
			routeContext,
		});
		return { ...result, isGrokVideoRequest: false };
	}
	if (nodeType === "video") {
		return requestVideoLikeGeneration({
			config,
			model,
			composer,
			referenceAssets,
			nextPrompt,
		});
	}
	if (nodeType === "music") {
		const result = await requestMusicLikeGeneration({
			config,
			model,
			composer,
			referenceAssets,
			nextPrompt,
		});
		return { ...result, isGrokVideoRequest: false };
	}
	const result = await requestAudioLikeGeneration({
		config,
		model,
		composer,
		referenceAssets,
		sourceAsset,
		routeContext,
	});
	return { ...result, isGrokVideoRequest: false };
}

export function useKakaApiSend({
	baseUrl,
	defaultBaseUrl,
	apiKey,
	timeoutMs,
	nodeType,
	model,
	prompt,
	promptPrefix,
	composer,
	referenceAssets = [],
	sourceAsset = null,
	onNotice,
	onSuccess,
	requestScopeId = null,
	onRequestStart,
	onRequestSettled,
}: UseKakaApiSendParams) {
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const isSending = pendingRequestCount > 0;

	const send = useCallback(() => {
		const preflight = resolveKakaApiSendPreflight({
			baseUrl,
			defaultBaseUrl,
			apiKey,
			timeoutMs,
			nodeType,
			model,
			prompt,
			promptPrefix,
			composer,
			sourceAsset,
			referenceAssets,
		});
		if (preflight.kind === "notice") {
			onNotice(preflight.notice.message, preflight.notice.tone, preflight.notice.dedupeKey);
			return;
		}
		const {
			config,
			routeContext,
			referenceAssets: requestReferenceAssets,
		} = preflight.plan;
		const {
			isMidjourneyRequest,
			nextPrompt,
		} = routeContext;

		const activeRequestScopeId = requestScopeId?.trim() || null;
		if (activeRequestScopeId) onRequestStart?.(activeRequestScopeId);
		setPendingRequestCount((count) => count + 1);

		void (async () => {
			try {
				if (isTextLikeNodeType(nodeType)) {
					const content = await requestTextLikeCompletion({
						config,
						model,
						nextPrompt,
					});
					onSuccess?.({ text: content ?? undefined });
					onNotice(
						content
							? `kaka-api 返回：${content.slice(0, 200)}`
							: "kaka-api 已完成，但没有返回文本内容。",
						"info",
						"kaka-api-send-success",
					);
					return;
				}

				const {
					alignedResponse,
					sentModel,
					isGrokVideoRequest,
					voiceNotice,
				} = await requestGeneratedAsset({
					config,
					nodeType,
					model,
					composer,
					referenceAssets: requestReferenceAssets,
					sourceAsset,
					routeContext,
					nextPrompt,
				});
				if (voiceNotice) {
					onNotice(voiceNotice.message, "info", voiceNotice.dedupeKey);
					window.dispatchEvent(new CustomEvent("kaka-voice-catalog-updated"));
					return;
				}

				const assetResolution = resolveGeneratedAssetResponse(alignedResponse);
				if (assetResolution.kind === "task") {
					onNotice(
						assetResolution.notice.message,
						assetResolution.notice.tone,
						assetResolution.notice.dedupeKey,
					);
					return;
				}
				onSuccess?.({
					assetUrl: assetResolution.assetUrl,
					assetMime: inferAssetMime(nodeType),
					assetName: inferAssetName(nodeType, model),
					provider: isMidjourneyRequest ? "midjourney" : isGrokVideoRequest ? "grok" : undefined,
					providerModel: sentModel,
					taskId: isMidjourneyRequest || isGrokVideoRequest ? assetResolution.taskInfo?.taskId : undefined,
					taskStatus: isMidjourneyRequest || isGrokVideoRequest ? assetResolution.taskInfo?.status : undefined,
					taskMessage: isMidjourneyRequest || isGrokVideoRequest ? assetResolution.taskInfo?.message : undefined,
					metadata: isMidjourneyRequest || isGrokVideoRequest ? assetResolution.unwrappedData : undefined,
				});
				onNotice("kaka-api 已完成，结果已写入节点。", "info", "kaka-api-send-success");
			} catch (error) {
				console.error("[kaka-api] Request failed.", error);
				onNotice(
					error instanceof Error
						? error.message
						: "kaka-api 请求失败，请稍后重试。",
					"warning",
					"kaka-api-send-failed",
				);
			} finally {
				setPendingRequestCount((count) => Math.max(0, count - 1));
				if (activeRequestScopeId) onRequestSettled?.(activeRequestScopeId);
			}
		})();
	}, [
		apiKey,
		baseUrl,
		composer,
		defaultBaseUrl,
		model,
		nodeType,
		onNotice,
		onRequestSettled,
		onRequestStart,
		onSuccess,
		prompt,
		promptPrefix,
		referenceAssets,
		requestScopeId,
		sourceAsset,
		timeoutMs,
	]);

	return { isSending, send };
}

