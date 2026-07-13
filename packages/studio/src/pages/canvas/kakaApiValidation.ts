import {
	isLocalKakaApiBaseUrl,
	isYunwuKakaApiBaseUrl,
	type KakaModelDiscoveryResult,
	type KakaUpstreamModelType,
} from "./kakaApi";
import { normalizeKakaApiBaseUrl } from "./kakaApiModelStorage";

export type KakaApiValidationState = {
	status: "idle" | "loading" | "valid" | "invalid";
	message: string;
};

export const KAKA_API_IDLE_MESSAGE =
	"填写后台生成的 sk-kaka API 令牌后会自动检测，也可手动刷新；应用会在每天 2:00 自动复检。";

export function isKakaPanelToken(value: string) {
	return value.trim().startsWith("sk-kaka-");
}

export function createEmptyUpstreamModelOptions(): Record<KakaUpstreamModelType, string[]> {
	return {
		text: [],
		image: [],
		video: [],
		audio: [],
		music: [],
	};
}

export function createEmptyUpstreamModelValueMap(): Record<KakaUpstreamModelType, Record<string, string>> {
	return {
		text: {},
		image: {},
		video: {},
		audio: {},
		music: {},
	};
}

export function createEmptyUpstreamModelFailureMap(): Record<KakaUpstreamModelType, boolean> {
	return {
		text: false,
		image: false,
		video: false,
		audio: false,
		music: false,
	};
}

export function createAllFailedUpstreamModelFailureMap(): Record<KakaUpstreamModelType, boolean> {
	return {
		text: true,
		image: true,
		video: true,
		audio: true,
		music: true,
	};
}

export function getKakaApiCredentialMode(baseUrl: string, apiKey: string) {
	const normalizedBaseUrl = normalizeKakaApiBaseUrl(baseUrl);
	const trimmedApiKey = apiKey.trim();
	const useLocalProxy = isLocalKakaApiBaseUrl(normalizedBaseUrl);
	const useYunwuDirectKey = isYunwuKakaApiBaseUrl(normalizedBaseUrl);
	return {
		apiKey: trimmedApiKey,
		normalizedBaseUrl,
		useLocalProxy,
		useYunwuDirectKey,
		needsApiKey: !trimmedApiKey && !useLocalProxy,
		hasInvalidPanelToken:
			Boolean(trimmedApiKey) &&
			!isKakaPanelToken(trimmedApiKey) &&
			!useLocalProxy &&
			!useYunwuDirectKey,
	};
}

export function buildKakaApiModelDiscoveryState(result: KakaModelDiscoveryResult) {
	const failureMessages = Object.values(result.failures).filter(Boolean);
	const modelTypes = Object.keys(result.models) as KakaUpstreamModelType[];
	const hasAnyModels = modelTypes.some((type) => result.models[type].length > 0);
	const failuresByType = modelTypes.reduce<Record<KakaUpstreamModelType, boolean>>((accumulator, type) => {
		accumulator[type] = Boolean(result.failures[type]) || result.models[type].length === 0;
		return accumulator;
	}, createEmptyUpstreamModelFailureMap());
	const validation: KakaApiValidationState =
		!hasAnyModels || failureMessages.length > 0
			? {
					status: "invalid",
					message: failureMessages[0] ?? "连接成功，但没有发现任何可用上游模型。",
				}
			: {
					status: "valid",
					message: "连接正常，已检测到可用的上游模型。",
				};
	return {
		failuresByType,
		validation,
	};
}

export function getKakaApiConnectionErrorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: "连接失败，请检查 Base URL、API Key 或网络状态。";
}
