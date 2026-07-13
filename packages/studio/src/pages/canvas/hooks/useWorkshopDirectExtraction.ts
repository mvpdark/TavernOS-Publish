import { useCallback } from "react";

import {
	extractChatCompletionText,
} from "../appResponseParsing";
import {
	isLocalKakaApiBaseUrl,
	requestKakaChatCompletion,
} from "../kakaApi";
import type { RuntimeNotice } from "./useRuntimeNotices";
import {
	buildWorkshopExtractionPrompt,
	normalizeWorkshopExtractionFromText,
	resolveWorkshopTextModelValue,
	type WorkshopExtractionState,
} from "../workshopExtractionHelpers";

type WorkshopModelCatalog = {
	preferredRawLabelByModel: Record<string, string | undefined>;
};

type UseWorkshopDirectExtractionParams = {
	isExtracting: boolean;
	defaultKakaApiBaseUrl: string;
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	workshopScript: string;
	workshopTextModel: string;
	workshopTextModelCatalog: WorkshopModelCatalog;
	onNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	setIsExtracting: (isExtracting: boolean) => void;
	setWorkshopExtraction: (extraction: WorkshopExtractionState) => void;
};

export function useWorkshopDirectExtraction({
	isExtracting,
	defaultKakaApiBaseUrl,
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	workshopScript,
	workshopTextModel,
	workshopTextModelCatalog,
	onNotice,
	setIsExtracting,
	setWorkshopExtraction,
}: UseWorkshopDirectExtractionParams) {
	return useCallback(async () => {
		if (isExtracting) return false;
		const config = {
			baseUrl: kakaApiBaseUrl.trim() || defaultKakaApiBaseUrl,
			apiKey: kakaApiKey.trim(),
			timeoutMs: kakaApiTimeoutMs,
		};
		const useLocalProxy = isLocalKakaApiBaseUrl(config.baseUrl);
		if (!config.apiKey && !useLocalProxy) {
			onNotice(
				"请先在设置页填写后台生成的 sk-kaka API 令牌。",
				"warning",
				"workshop-direct-extract-missing-key",
			);
			return false;
		}
		const model = resolveWorkshopTextModelValue(
			workshopTextModel,
			workshopTextModelCatalog,
		);
		setIsExtracting(true);
		onNotice(
			"正在调用文本模型提取角色、场景和物品...",
			"info",
			"workshop-direct-extract-start",
		);
		try {
			const result = await requestKakaChatCompletion(config, {
				model,
				messages: [
					{
						role: "user",
						content: buildWorkshopExtractionPrompt(workshopScript.trim()),
					},
				],
				stream: false,
			});
			const content =
				extractChatCompletionText(result.data) ??
				result.data.choices?.[0]?.message?.content;
			if (typeof content !== "string" || !content.trim()) {
				throw new Error("模型没有返回可用文本。");
			}
			const extraction = normalizeWorkshopExtractionFromText(content);
			setWorkshopExtraction(extraction);
			onNotice(
				`已提取 ${extraction.characters.length} 个角色、${extraction.scenes.length} 个场景、${extraction.props.length} 个物品。`,
				"info",
				"workshop-direct-extract-done",
			);
			return true;
		} catch (error) {
			onNotice(
				error instanceof Error ? error.message : "角色场景提取失败，请稍后重试。",
				"warning",
				"workshop-direct-extract-failed",
			);
			return false;
		} finally {
			setIsExtracting(false);
		}
	}, [
		isExtracting,
		defaultKakaApiBaseUrl,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		onNotice,
		setIsExtracting,
		setWorkshopExtraction,
		workshopScript,
		workshopTextModel,
		workshopTextModelCatalog,
	]);
}
