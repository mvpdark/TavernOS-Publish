import { useCallback, useEffect, useRef, useState } from "react";
import {
	isLocalKakaApiBaseUrl,
	type KakaUpstreamModelType,
	requestKakaUpstreamModels,
} from "../kakaApi";
import {
	DEFAULT_KAKA_API_BASE_URL,
	normalizeKakaApiBaseUrl,
	readKakaApiBaseUrlStorage,
	readKakaApiKeyStorage,
	readKakaApiTimeoutStorage,
	writeKakaApiBaseUrlStorage,
	writeKakaApiKeyStorage,
	writeKakaApiTimeoutStorage,
} from "../kakaApiModelStorage";
import {
	KAKA_API_IDLE_MESSAGE,
	buildKakaApiModelDiscoveryState,
	createAllFailedUpstreamModelFailureMap,
	createEmptyUpstreamModelFailureMap,
	createEmptyUpstreamModelOptions,
	createEmptyUpstreamModelValueMap,
	getKakaApiConnectionErrorMessage,
	getKakaApiCredentialMode,
	type KakaApiValidationState,
} from "../kakaApiValidation";

export { DEFAULT_KAKA_API_BASE_URL, normalizeKakaApiBaseUrl };
export type { KakaApiValidationState };

function getMillisecondsUntilNextLocalTwoAm(now = new Date()) {
	const next = new Date(now);
	next.setHours(2, 0, 0, 0);
	if (next.getTime() <= now.getTime()) {
		next.setDate(next.getDate() + 1);
	}
	return Math.max(0, next.getTime() - now.getTime());
}

export function useKakaApiModels() {
	const [kakaApiBaseUrl, setKakaApiBaseUrl] = useState(
		() => readKakaApiBaseUrlStorage(),
	);
	const [kakaApiKey, setKakaApiKey] = useState(() => readKakaApiKeyStorage());
	const [kakaApiTimeoutMs, setKakaApiTimeoutMs] = useState(() =>
		readKakaApiTimeoutStorage(),
	);
	const [upstreamModelOptions, setUpstreamModelOptions] = useState<
		Record<KakaUpstreamModelType, string[]>
	>(() => createEmptyUpstreamModelOptions());
	const [isLoadingUpstreamModels, setIsLoadingUpstreamModels] = useState(false);
	const [upstreamModelValueMap, setUpstreamModelValueMap] = useState<
		Record<KakaUpstreamModelType, Record<string, string>>
	>(() => createEmptyUpstreamModelValueMap());
	const [didUpstreamModelFetchFailByType, setDidUpstreamModelFetchFailByType] =
		useState<Record<KakaUpstreamModelType, boolean>>(() =>
			createEmptyUpstreamModelFailureMap(),
		);
	const [upstreamModelRefreshState, setUpstreamModelRefreshState] = useState(() => ({
		token: 0,
		requestedAt: Date.now(),
	}));
	const [kakaApiValidation, setKakaApiValidation] =
		useState<KakaApiValidationState>({
			status: "idle",
			message: KAKA_API_IDLE_MESSAGE,
		});
	const upstreamModelRequestIdRef = useRef(0);
	const latestKakaApiConfigRef = useRef({
		baseUrl: readKakaApiBaseUrlStorage(),
		apiKey: readKakaApiKeyStorage(),
		timeoutMs: readKakaApiTimeoutStorage(),
	});

	useEffect(() => {
		latestKakaApiConfigRef.current = {
			baseUrl: normalizeKakaApiBaseUrl(kakaApiBaseUrl),
			apiKey: kakaApiKey,
			timeoutMs: kakaApiTimeoutMs,
		};
	}, [kakaApiBaseUrl, kakaApiKey, kakaApiTimeoutMs]);

	const triggerUpstreamModelRefresh = useCallback(() => {
		setUpstreamModelRefreshState((current) => ({
			token: current.token + 1,
			requestedAt: Date.now(),
		}));
	}, []);

	useEffect(() => {
		const normalizedBaseUrl = normalizeKakaApiBaseUrl(kakaApiBaseUrl);
		if (normalizedBaseUrl !== kakaApiBaseUrl) {
			setKakaApiBaseUrl(normalizedBaseUrl);
			return;
		}
		writeKakaApiBaseUrlStorage(normalizedBaseUrl);
	}, [kakaApiBaseUrl]);
	useEffect(() => {
		writeKakaApiKeyStorage(kakaApiKey);
	}, [kakaApiKey]);
	useEffect(() => {
		writeKakaApiTimeoutStorage(kakaApiTimeoutMs);
	}, [kakaApiTimeoutMs]);
	useEffect(() => {
		const credentialMode = getKakaApiCredentialMode(kakaApiBaseUrl, kakaApiKey);
		if (credentialMode.needsApiKey) {
			upstreamModelRequestIdRef.current += 1;
			setUpstreamModelOptions(createEmptyUpstreamModelOptions());
			setUpstreamModelValueMap(createEmptyUpstreamModelValueMap());
			setDidUpstreamModelFetchFailByType(createEmptyUpstreamModelFailureMap());
			setIsLoadingUpstreamModels(false);
			setKakaApiValidation({
				status: "idle",
				message: KAKA_API_IDLE_MESSAGE,
			});
			return;
		}
		if (credentialMode.hasInvalidPanelToken) {
			upstreamModelRequestIdRef.current += 1;
			setUpstreamModelOptions(createEmptyUpstreamModelOptions());
			setUpstreamModelValueMap(createEmptyUpstreamModelValueMap());
			setDidUpstreamModelFetchFailByType(createAllFailedUpstreamModelFailureMap());
			setIsLoadingUpstreamModels(false);
			setKakaApiValidation({
				status: "invalid",
				message: "这里只接受后台生成的 sk-kaka API 令牌，不接受旧 Gateway Key。",
			});
			return;
		}
		triggerUpstreamModelRefresh();
	}, [kakaApiBaseUrl, kakaApiKey, triggerUpstreamModelRefresh]);
	useEffect(() => {
		const refreshToken = upstreamModelRefreshState.token;
		void refreshToken;
		const { baseUrl: rawBaseUrl, apiKey: rawApiKey, timeoutMs } =
			latestKakaApiConfigRef.current;
		const baseUrl = normalizeKakaApiBaseUrl(rawBaseUrl);
		const apiKey = rawApiKey.trim();
		const useLocalProxy = isLocalKakaApiBaseUrl(baseUrl);
		upstreamModelRequestIdRef.current += 1;
		const requestId = upstreamModelRequestIdRef.current;

		if (!apiKey && !useLocalProxy) {
			return;
		}

		setIsLoadingUpstreamModels(true);
		setDidUpstreamModelFetchFailByType(createEmptyUpstreamModelFailureMap());
		setKakaApiValidation({
			status: "loading",
			message: "正在检测 kaka-api 连接与鉴权…",
		});
		void (async () => {
			try {
				const result = await requestKakaUpstreamModels({
					baseUrl,
					apiKey,
					timeoutMs,
				});
				if (upstreamModelRequestIdRef.current !== requestId) {
					return;
				}
				const discoveryState = buildKakaApiModelDiscoveryState(result);
				setUpstreamModelOptions(result.models);
				setUpstreamModelValueMap(result.modelValues);
				setDidUpstreamModelFetchFailByType(discoveryState.failuresByType);
				setKakaApiValidation(discoveryState.validation);
			} catch (error) {
				if (upstreamModelRequestIdRef.current !== requestId) {
					return;
				}
				setUpstreamModelOptions(createEmptyUpstreamModelOptions());
				setUpstreamModelValueMap(createEmptyUpstreamModelValueMap());
				setDidUpstreamModelFetchFailByType(createAllFailedUpstreamModelFailureMap());
				setKakaApiValidation({
					status: "invalid",
					message: getKakaApiConnectionErrorMessage(error),
				});
			} finally {
				if (upstreamModelRequestIdRef.current === requestId) {
					setIsLoadingUpstreamModels(false);
				}
			}
		})();
	}, [upstreamModelRefreshState.token]);
	useEffect(() => {
		const scheduledAt = upstreamModelRefreshState.requestedAt;
		const timeoutId = window.setTimeout(() => {
			triggerUpstreamModelRefresh();
		}, getMillisecondsUntilNextLocalTwoAm(new Date(Math.max(Date.now(), scheduledAt))));
		return () => window.clearTimeout(timeoutId);
	}, [triggerUpstreamModelRefresh, upstreamModelRefreshState.requestedAt]);

	return {
		kakaApiBaseUrl,
		setKakaApiBaseUrl,
		kakaApiKey,
		setKakaApiKey,
		kakaApiTimeoutMs,
		setKakaApiTimeoutMs,
		upstreamModelOptions,
		upstreamModelValueMap,
		didUpstreamModelFetchFailByType,
		isLoadingUpstreamModels,
		kakaApiValidation,
		triggerUpstreamModelRefresh,
	};
}
