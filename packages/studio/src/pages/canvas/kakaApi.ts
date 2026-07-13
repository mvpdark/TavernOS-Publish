import { encodeUpstreamModelOption } from "./modelOptions";

export const KAKA_API_TIMEOUT_MS = 30 * 60 * 1000;
const KAKA_API_LOCAL_PROXY_PREFIX = "/api/canvas-proxy";
const KAKA_API_LOCAL_PROXY_PLACEHOLDER_KEY = "sk-kaka-local-proxy";
const KAKA_API_PROXY_TARGET_PARAM = "__kaka_api_target";

export type KakaApiConfig = {
	baseUrl: string;
	apiKey: string;
	timeoutMs?: number;
};

export type KakaApiRequestResult<TData> = {
	status: number;
	data: TData;
	rawText: string;
};

export type KakaAlignedResponse<TData = unknown> = {
	success?: boolean;
	data?: TData | null;
	error?: string | { message?: string | null } | null;
	message?: string | null;
};

export type KakaUpstreamModelType = "text" | "image" | "video" | "audio" | "music";

export type KakaModelDiscoveryResult = {
	models: Record<KakaUpstreamModelType, string[]>;
	modelValues: Record<KakaUpstreamModelType, Record<string, string>>;
	failures: Partial<Record<KakaUpstreamModelType, string>>;
};

export type KakaImageGenerationRequest = {
	model: string;
	prompt: string;
	negative_prompt?: string;
	image?: string;
	image_url?: string;
	image_size?: string;
	options?: Record<string, unknown>;
};

export type KakaVideoGenerationRequest = {
	model: string;
	prompt: string;
	image_url?: string;
	video_url?: string;
	audio_url?: string;
	duration?: number;
	seed?: number;
	options?: Record<string, unknown>;
};

export type KakaMusicGenerationRequest = {
	model: string;
	prompt?: string;
	lyrics?: string;
	audio_url?: string;
	options?: Record<string, unknown>;
};

export type KakaAudioGenerationRequest = {
	model: string;
	text: string;
	voice_id?: string;
	format?: string;
	speed?: number;
	options?: Record<string, unknown>;
};

export type KakaVoiceAlias = {
	display_name: string;
	voice_id: string;
	provider?: string;
	source?: string;
	metadata?: Record<string, unknown>;
	created_at?: string;
	updated_at?: string;
};

export type KakaVoiceAliasUpsertRequest = {
	display_name: string;
	voice_id: string;
	provider?: string;
	source?: string;
	metadata?: Record<string, unknown>;
};

export type KakaChatMessageContentPart =
	| { type: "text"; text: string }
	| { type: "image_url"; image_url: { url: string } };

export type KakaChatMessage = {
	role: "system" | "user" | "assistant" | "tool";
	content: string | KakaChatMessageContentPart[];
};

export type KakaChatCompletionRequest = {
	model: string;
	messages: KakaChatMessage[];
	stream?: boolean;
};

export type KakaChatCompletionResponse = {
	id?: string;
	object?: string;
	created?: number;
	model?: string;
	choices?: Array<{
		index: number;
		finish_reason?: string | null;
		message?: KakaChatMessage;
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	};
	error?: {
		message?: string;
		type?: string;
		code?: string | number;
	};
};

function normalizeBaseUrl(baseUrl: string) {
	return baseUrl.trim().replace(/\/+$/, "");
}

function normalizeRequestPath(path: string) {
	return path.startsWith("/") ? path : `/${path}`;
}

export function isLocalKakaApiBaseUrl(baseUrl: string) {
	try {
		const url = new URL(baseUrl);
		return (
			(url.protocol === "http:" || url.protocol === "https:") &&
			(isLoopbackKakaApiHost(url.hostname) || isPrivateIpv4Host(url.hostname)) &&
			(url.port === "1987" || url.port === "1988")
		);
	} catch {
		return false;
	}
}

function normalizeHostname(hostname: string) {
	return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function isLoopbackKakaApiHost(hostname: string) {
	const host = normalizeHostname(hostname);
	return host === "localhost" || host === "::1" || host === "0:0:0:0:0:0:0:1" || host.startsWith("127.");
}

function isPrivateIpv4Host(hostname: string) {
	const host = normalizeHostname(hostname);
	const parts = host.split(".");
	if (parts.length !== 4) return false;
	const octets = parts.map((part) => Number(part));
	if (octets.some((octet, index) => !Number.isInteger(octet) || octet < 0 || octet > 255 || String(octet) !== parts[index])) {
		return false;
	}
	return (
		octets[0] === 10 ||
		(octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
		(octets[0] === 192 && octets[1] === 168)
	);
}

export function isYunwuKakaApiBaseUrl(baseUrl: string) {
	try {
		const url = new URL(baseUrl);
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		const host = normalizeHostname(url.hostname);
		return (
			host === "yunwu.ai" ||
			host.endsWith(".yunwu.ai") ||
			host === "api.apiplus.org" ||
			host.endsWith(".apiplus.org") ||
			host === "wlai.vip" ||
			host.endsWith(".wlai.vip")
		);
	} catch {
		return false;
	}
}

function shouldProxyKakaApiBaseUrl(baseUrl: string) {
	try {
		const url = new URL(baseUrl);
		return (
			(url.protocol === "http:" || url.protocol === "https:") &&
			(isLoopbackKakaApiHost(url.hostname) ||
				isPrivateIpv4Host(url.hostname) ||
				isYunwuKakaApiBaseUrl(baseUrl))
		);
	} catch {
		return false;
	}
}

function resolveKakaApiProxyUrl(baseUrl: string, requestPath: string) {
	const separator = requestPath.includes("?") ? "&" : "?";
	return `${KAKA_API_LOCAL_PROXY_PREFIX}${requestPath}${separator}${KAKA_API_PROXY_TARGET_PARAM}=${encodeURIComponent(
		normalizeBaseUrl(baseUrl),
	)}`;
}

function resolveKakaApiRequestUrl(baseUrl: string, path: string) {
	const requestPath = normalizeRequestPath(path);
	if (typeof window !== "undefined" && shouldProxyKakaApiBaseUrl(baseUrl)) {
		return resolveKakaApiProxyUrl(baseUrl, requestPath);
	}
	return `${baseUrl}${requestPath}`;
}

function resolveTimeoutMs(timeoutMs?: number) {
	if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		return KAKA_API_TIMEOUT_MS;
	}
	return Math.max(Math.round(timeoutMs), KAKA_API_TIMEOUT_MS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getRecordString(record: Record<string, unknown>, key: string) {
	const value = record[key];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractErrorMessage(rawText: string, payload: unknown) {
	if (isRecord(payload)) {
		const errorValue = payload.error;
		if (typeof errorValue === "string" && errorValue.trim()) {
			return errorValue.trim();
		}
		if (isRecord(errorValue)) {
			const errorMessage = getRecordString(errorValue, "message");
			if (errorMessage) {
				return errorMessage;
			}
		}
		const message = getRecordString(payload, "message");
		if (message) {
			return message;
		}
	}
	return rawText.trim();
}

function createEmptyModelDiscoveryMap(): Record<KakaUpstreamModelType, string[]> {
	return {
		text: [],
		image: [],
		video: [],
		audio: [],
		music: [],
	};
}

function createEmptyModelValueMap(): Record<KakaUpstreamModelType, Record<string, string>> {
	return {
		text: {},
		image: {},
		video: {},
		audio: {},
		music: {},
	};
}

function extractAlignedErrorMessage(payload: unknown) {
	if (!isRecord(payload)) return null;
	const errorValue = payload.error;
	if (typeof errorValue === "string" && errorValue.trim()) {
		return errorValue.trim();
	}
	if (isRecord(errorValue)) {
		const nestedMessage = getRecordString(errorValue, "message");
		if (nestedMessage) {
			return nestedMessage;
		}
	}
	return getRecordString(payload, "message");
}

function unwrapAlignedResponseData(payload: unknown) {
	if (!isRecord(payload)) return payload;
	if (payload.success === false) {
		throw new Error(extractAlignedErrorMessage(payload) ?? "kaka-api model discovery failed.");
	}
	return "data" in payload ? payload.data : payload;
}

function extractModelStringFromRecord(record: Record<string, unknown>) {
	for (const key of ["full_name", "display_name", "id", "model", "modelId", "name", "modelName", "slug", "value"]) {
		const value = getRecordString(record, key);
		if (value) {
			return value;
		}
	}
	return null;
}

function parseModelOptionRecord(record: Record<string, unknown>) {
	const fullName = getRecordString(record, "full_name");
	const displayName = getRecordString(record, "display_name");
	if (fullName && displayName) {
		return {
			label: encodeUpstreamModelOption(displayName, fullName),
			value: fullName,
		};
	}
	if (fullName) {
		return { label: fullName, value: fullName };
	}
	if (displayName) {
		return { label: displayName, value: displayName };
	}
	const fallback = extractModelStringFromRecord(record);
	if (!fallback) return null;
	return { label: fallback, value: fallback };
}

function collectModelOptions(
	value: unknown,
	results: string[],
	valueMap: Record<string, string>,
	seen: WeakSet<object>,
	depth = 0,
) {
	if (depth > 6 || value === null || value === undefined) return;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed) {
			results.push(trimmed);
			valueMap[trimmed] = trimmed;
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((entry) => {
			collectModelOptions(entry, results, valueMap, seen, depth + 1);
		});
		return;
	}
	if (!isRecord(value) || seen.has(value)) return;
	seen.add(value);

	const prioritizedKeys = ["data", "models", "items", "list", "results", "records", "rows"];
	let traversedPriorityKey = false;
	for (const key of prioritizedKeys) {
		if (key in value) {
			traversedPriorityKey = true;
			collectModelOptions(value[key], results, valueMap, seen, depth + 1);
		}
	}
	if (traversedPriorityKey) return;

	const parsedOption = parseModelOptionRecord(value);
	if (parsedOption) {
		results.push(parsedOption.label);
		valueMap[parsedOption.label] = parsedOption.value;
		return;
	}

	Object.values(value).forEach((entry) => {
		collectModelOptions(entry, results, valueMap, seen, depth + 1);
	});
}

function extractModelOptionsFromPayload(payload: unknown) {
	const unwrappedPayload = unwrapAlignedResponseData(payload);
	if (unwrappedPayload === null || unwrappedPayload === undefined) {
		return { models: [], values: {} as Record<string, string> };
	}
	const results: string[] = [];
	const valueMap: Record<string, string> = {};
	collectModelOptions(unwrappedPayload, results, valueMap, new WeakSet<object>());
	const models = Array.from(new Set(results.map((value) => value.trim()).filter(Boolean)));
	const filteredValueMap: Record<string, string> = {};
	models.forEach((label) => {
		filteredValueMap[label] = valueMap[label] ?? label;
	});
	return { models, values: filteredValueMap };
}

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;

function isRetryableError(error: unknown, status?: number): boolean {
	if (typeof status === "number" && RETRYABLE_STATUS_CODES.has(status)) return true;
	if (error instanceof TypeError) return true;
	return false;
}

function friendlyErrorMessage(status: number, rawDetail: string, retries: number): string {
	const retryHint = retries > 0 ? `已自动重试 ${retries} 次，` : "";
	switch (status) {
		case 429:
			return `上游服务请求过于频繁（429），${retryHint}请稍后再试。`;
		case 502:
			return `上游服务网关错误（502），${retryHint}请稍后再试。`;
		case 503:
			return `上游服务暂时不可用（503），${retryHint}请稍后再试。`;
		case 504:
			return `上游服务响应超时（504），${retryHint}请稍后再试。`;
		case 500:
			return `上游服务内部错误（500），请求已经到达网关但 Yunwu/模型服务处理失败。请稍后重试，或先切换其它视频模型；技术细节：${rawDetail || "Internal Server Error"}`;
		default:
			return rawDetail || `kaka-api request failed: ${status}`;
	}
}

async function sleep(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function requestKakaApiJson<TRequest, TResponse>(
	config: KakaApiConfig,
	path: string,
	options: {
		method: "DELETE" | "GET" | "POST";
		body?: TRequest;
	},
): Promise<KakaApiRequestResult<TResponse>> {
	const baseUrl = normalizeBaseUrl(config.baseUrl);
	if (!baseUrl) {
		throw new Error("Kaka API base URL is required.");
	}
	const useLocalProxy = isLocalKakaApiBaseUrl(baseUrl);
	const apiKey = config.apiKey.trim();
	if (!apiKey && !useLocalProxy) {
		throw new Error("Kaka API key is required.");
	}

	const timeoutMs = resolveTimeoutMs(config.timeoutMs);
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

		try {
			const headers: Record<string, string> = {
				Authorization: `Bearer ${apiKey || KAKA_API_LOCAL_PROXY_PLACEHOLDER_KEY}`,
			};
			const requestInit: RequestInit = {
				method: options.method,
				headers,
				signal: controller.signal,
			};

			if (options.body !== undefined) {
				headers["Content-Type"] = "application/json";
				requestInit.body = JSON.stringify(options.body);
			}

			const response = await fetch(resolveKakaApiRequestUrl(baseUrl, path), requestInit);

			const rawText = await response.text().catch(() => {
				throw new Error("Failed to read kaka-api response body.");
			});

			let payload: TResponse | null = null;
			if (rawText) {
				try {
					payload = JSON.parse(rawText) as TResponse;
				} catch {
					throw new Error("Failed to parse kaka-api response body as JSON.");
				}
			}

			if (!response.ok) {
				const detail = extractErrorMessage(rawText, payload);
				if (isRetryableError(null, response.status) && attempt < MAX_RETRIES) {
					lastError = new Error(friendlyErrorMessage(response.status, detail, attempt));
					await sleep(1000 * 2 ** attempt);
					continue;
				}
				throw new Error(
					friendlyErrorMessage(response.status, detail, attempt) ||
						`kaka-api request failed: ${response.status} ${response.statusText}`,
				);
			}

			if (payload === null) {
				throw new Error("kaka-api returned an empty response body.");
			}

			return { status: response.status, data: payload, rawText };
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				throw new Error(`kaka-api request timed out after ${timeoutMs}ms.`);
			}
			if (error instanceof TypeError) {
				if (attempt < MAX_RETRIES) {
					lastError = new Error(
						`无法连接到 kaka-api，已自动重试 ${attempt + 1} 次，请检查网络连接。`,
					);
					await sleep(1000 * 2 ** attempt);
					continue;
				}
				throw new Error(
					lastError?.message ||
						"Failed to reach kaka-api. Check the base URL and network connection.",
				);
			}
			throw error;
		} finally {
			window.clearTimeout(timeoutId);
		}
	}

	throw lastError ?? new Error("kaka-api request failed after maximum retries.");
}

export async function requestKakaApi<TRequest, TResponse>(
	config: KakaApiConfig,
	path: string,
	body: TRequest,
): Promise<KakaApiRequestResult<TResponse>> {
	return requestKakaApiJson<TRequest, TResponse>(config, path, {
		method: "POST",
		body,
	});
}

export function requestKakaApiGet<TResponse>(config: KakaApiConfig, path: string) {
	return requestKakaApiJson<undefined, TResponse>(config, path, {
		method: "GET",
	});
}

export function requestKakaApiDelete<TResponse>(config: KakaApiConfig, path: string) {
	return requestKakaApiJson<undefined, TResponse>(config, path, {
		method: "DELETE",
	});
}

export async function requestKakaUpstreamModels(
	config: KakaApiConfig,
): Promise<KakaModelDiscoveryResult> {
	const endpoints: Record<KakaUpstreamModelType, string> = {
		text: "/v1/models",
		image: "/v1/images/models",
		video: "/v1/videos/models",
		audio: "/v1/audio/models",
		music: "/v1/music/models",
	};
	const models = createEmptyModelDiscoveryMap();
	const modelValues = createEmptyModelValueMap();
	const failures: Partial<Record<KakaUpstreamModelType, string>> = {};

	await Promise.all(
		(Object.entries(endpoints) as Array<[KakaUpstreamModelType, string]>).map(
			async ([type, path]) => {
				try {
					const response = await requestKakaApiGet<KakaAlignedResponse | unknown>(
						config,
						path,
					);
					const parsed = extractModelOptionsFromPayload(response.data);
					models[type] = parsed.models;
					modelValues[type] = parsed.values;
				} catch (error) {
					failures[type] =
						error instanceof Error ? error.message : "kaka-api model discovery failed.";
				}
			},
		),
	);

	return { models, modelValues, failures };
}

export function requestKakaChatCompletion(
	config: KakaApiConfig,
	body: KakaChatCompletionRequest,
) {
	return requestKakaApi<KakaChatCompletionRequest, KakaChatCompletionResponse>(
		config,
		"/v1/chat/completions",
		body,
	);
}

export function requestKakaImageGeneration(
	config: KakaApiConfig,
	body: KakaImageGenerationRequest,
) {
	return requestKakaApi<KakaImageGenerationRequest, KakaAlignedResponse>(
		config,
		"/v1/images/generations",
		body,
	);
}

export function requestKakaVideoGeneration(
	config: KakaApiConfig,
	body: KakaVideoGenerationRequest,
) {
	return requestKakaApi<KakaVideoGenerationRequest, KakaAlignedResponse>(
		config,
		"/v1/videos/generations",
		body,
	);
}

export function requestKakaMusicGeneration(
	config: KakaApiConfig,
	body: KakaMusicGenerationRequest,
) {
	return requestKakaApi<KakaMusicGenerationRequest, KakaAlignedResponse>(
		config,
		"/v1/music/generations",
		body,
	);
}

export function requestKakaAudioGeneration(
	config: KakaApiConfig,
	body: KakaAudioGenerationRequest,
) {
	return requestKakaApi<KakaAudioGenerationRequest, KakaAlignedResponse>(
		config,
		"/v1/audio/speech",
		body,
	);
}

export function requestKakaVoiceAliases(config: KakaApiConfig) {
	return requestKakaApiGet<KakaAlignedResponse<{ count: number; voices: KakaVoiceAlias[] }>>(
		config,
		"/v1/audio/voices",
	);
}

export function saveKakaVoiceAlias(
	config: KakaApiConfig,
	body: KakaVoiceAliasUpsertRequest,
) {
	return requestKakaApi<
		KakaVoiceAliasUpsertRequest,
		KakaAlignedResponse<{ voice: KakaVoiceAlias }>
	>(config, "/v1/audio/voices", body);
}

export function deleteKakaVoiceAlias(config: KakaApiConfig, displayName: string) {
	return requestKakaApiDelete<KakaAlignedResponse<{ removed: boolean }>>(
		config,
		`/v1/audio/voices/${encodeURIComponent(displayName)}`,
	);
}
