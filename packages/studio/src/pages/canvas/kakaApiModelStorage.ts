import { KAKA_API_TIMEOUT_MS } from "./kakaApi";

export const DEFAULT_KAKA_API_BASE_URL = "http://127.0.0.1:1987";

const STORAGE_KEYS = {
	kakaApiKey: "kakashow:kaka-api-key",
	kakaApiBaseUrl: "kakashow:kaka-api-base-url",
	kakaApiTimeoutMs: "kakashow:kaka-api-timeout-ms",
} as const;

const SESSION_STORAGE_KEYS = {
	kakaApiKey: "kakashow:kaka-api-key",
} as const;

export function normalizeKakaApiBaseUrl(value: string) {
	const trimmedValue = value.trim();
	if (!trimmedValue) return DEFAULT_KAKA_API_BASE_URL;
	try {
		const url = new URL(trimmedValue);
		const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
		if (isLocalHost && (url.port === "1987" || url.port === "1988")) {
			return DEFAULT_KAKA_API_BASE_URL;
		}
		return trimmedValue.replace(/\/+$/, "");
	} catch {
		return trimmedValue.replace(/\/+$/, "") || DEFAULT_KAKA_API_BASE_URL;
	}
}

export function readStorageString(key: string, fallback: string) {
	if (typeof window === "undefined") return fallback;
	try {
		return window.localStorage.getItem(key) ?? fallback;
	} catch {
		return fallback;
	}
}

export function readStorageNumber(key: string, fallback: number) {
	const rawValue = readStorageString(key, "");
	const parsedValue = Number(rawValue);
	return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function readKakaApiBaseUrlStorage() {
	return normalizeKakaApiBaseUrl(
		readStorageString(STORAGE_KEYS.kakaApiBaseUrl, DEFAULT_KAKA_API_BASE_URL),
	);
}

export function writeKakaApiBaseUrlStorage(value: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEYS.kakaApiBaseUrl, normalizeKakaApiBaseUrl(value));
}

export function readKakaApiTimeoutStorage() {
	return Math.max(
		readStorageNumber(STORAGE_KEYS.kakaApiTimeoutMs, KAKA_API_TIMEOUT_MS),
		KAKA_API_TIMEOUT_MS,
	);
}

export function writeKakaApiTimeoutStorage(value: number) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEYS.kakaApiTimeoutMs, String(value));
}

export function readKakaApiKeyStorage() {
	if (typeof window === "undefined") return "";
	try {
		const sessionValue = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.kakaApiKey);
		if (sessionValue !== null) return sessionValue;
		const legacyValue = window.localStorage.getItem(STORAGE_KEYS.kakaApiKey) ?? "";
		if (legacyValue) {
			window.sessionStorage.setItem(SESSION_STORAGE_KEYS.kakaApiKey, legacyValue);
			window.localStorage.removeItem(STORAGE_KEYS.kakaApiKey);
		}
		return legacyValue;
	} catch {
		return "";
	}
}

export function writeKakaApiKeyStorage(value: string) {
	if (typeof window === "undefined") return;
	try {
		if (value) {
			window.sessionStorage.setItem(SESSION_STORAGE_KEYS.kakaApiKey, value);
		} else {
			window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.kakaApiKey);
		}
		window.localStorage.removeItem(STORAGE_KEYS.kakaApiKey);
	} catch {
		// Browsers can deny web storage; keep the in-memory React state usable.
	}
}
