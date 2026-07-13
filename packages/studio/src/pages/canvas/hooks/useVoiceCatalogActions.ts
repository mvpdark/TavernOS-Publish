import { useCallback } from "react";
import {
	DEFAULT_KAKA_API_BASE_URL,
} from "./useKakaApiModels";
import {
	type KakaApiConfig,
	type KakaVoiceAlias,
	isLocalKakaApiBaseUrl,
	requestKakaAudioGeneration,
	requestKakaVoiceAliases,
	saveKakaVoiceAlias,
} from "../kakaApi";
import {
	collectVoiceCatalogItems,
	persistVoiceCatalog,
	type VoiceCatalogItem,
} from "../appVoiceCatalog";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UseVoiceCatalogActionsOptions = {
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	voiceCatalog: VoiceCatalogItem[];
	setVoiceCatalog: React.Dispatch<React.SetStateAction<VoiceCatalogItem[]>>;
	setIsVoiceCatalogLoading: React.Dispatch<React.SetStateAction<boolean>>;
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	updateAudioOption: (
		key:
			| "audioTier"
			| "audioVoiceMode"
			| "audioVoiceName"
			| "audioVoiceId"
			| "audioVoiceStyle",
		value: string,
	) => void;
};

function createKakaApiConfig({
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
}: Pick<
	UseVoiceCatalogActionsOptions,
	"kakaApiBaseUrl" | "kakaApiKey" | "kakaApiTimeoutMs"
>): KakaApiConfig {
	return {
		baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
		apiKey: kakaApiKey.trim(),
		timeoutMs: kakaApiTimeoutMs,
	};
}

export function useVoiceCatalogActions({
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	voiceCatalog,
	setVoiceCatalog,
	setIsVoiceCatalogLoading,
	pushRuntimeNotice,
	updateAudioOption,
}: UseVoiceCatalogActionsOptions) {
	const refreshVoiceCatalog = useCallback(async () => {
		const config = createKakaApiConfig({
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
		});
		const useLocalProxy = isLocalKakaApiBaseUrl(config.baseUrl);
		if (!config.apiKey && !useLocalProxy) {
			pushRuntimeNotice(
				"请先在设置页填写 kaka-api 令牌后再读取音色。",
				"warning",
				"voice-catalog-missing-key",
			);
			return;
		}
		setIsVoiceCatalogLoading(true);
		try {
			const saved = await requestKakaVoiceAliases(config);
			const savedVoices = (saved.data.data?.voices ?? []).map(
				(voice: KakaVoiceAlias) => ({
					displayName: voice.display_name,
					voiceId: voice.voice_id,
					provider: voice.provider,
					source: voice.source,
				}),
			);
			const upstream = await requestKakaAudioGeneration(config, {
				model: "voice-management(minimax)",
				text: "list voices",
				options: { voice_type: "all" },
			}).catch((error) => {
				pushRuntimeNotice(
					error instanceof Error
						? error.message
						: "读取 MiniMax 官方音色失败。",
					"warning",
					"official-voice-catalog-minimax-failed",
				);
				return null;
			});
			const officialVoices = collectVoiceCatalogItems(
				upstream?.data.data,
				"minimax",
			);
			const merged = new Map<string, VoiceCatalogItem>();
			[...savedVoices, ...officialVoices].forEach((voice) => {
				if (!voice.voiceId) return;
				const key = voice.voiceId.trim();
				if (!key || merged.has(key)) return;
				merged.set(key, voice);
			});
			const nextVoiceCatalog = [...merged.values()];
			setVoiceCatalog(nextVoiceCatalog);
			persistVoiceCatalog(nextVoiceCatalog);
			pushRuntimeNotice("音色管理已刷新。", "info", "voice-catalog-refreshed");
		} catch (error) {
			pushRuntimeNotice(
				error instanceof Error ? error.message : "读取音色失败。",
				"warning",
				"voice-catalog-failed",
			);
		} finally {
			setIsVoiceCatalogLoading(false);
		}
	}, [
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		pushRuntimeNotice,
		setIsVoiceCatalogLoading,
		setVoiceCatalog,
	]);

	const saveVoiceAliasForCatalog = useCallback(
		async (voiceId: string, displayName: string) => {
			const normalizedVoiceId = voiceId.trim();
			const normalizedDisplayName = displayName.trim();
			if (!normalizedVoiceId || !normalizedDisplayName) {
				pushRuntimeNotice(
					"请选择音色并填写显示名后再保存。",
					"warning",
					"voice-alias-missing-fields",
				);
				return;
			}
			const config = createKakaApiConfig({
				kakaApiBaseUrl,
				kakaApiKey,
				kakaApiTimeoutMs,
			});
			const useLocalProxy = isLocalKakaApiBaseUrl(config.baseUrl);
			if (!config.apiKey && !useLocalProxy) {
				pushRuntimeNotice(
					"请先在设置页填写 kaka-api 令牌后再保存音色命名。",
					"warning",
					"voice-alias-missing-key",
				);
				return;
			}
			try {
				const existing = voiceCatalog.find(
					(voice) => voice.voiceId === normalizedVoiceId,
				);
				const aliasSource =
					existing?.source === "official"
						? "saved"
						: existing?.source || "saved";
				await saveKakaVoiceAlias(config, {
					display_name: normalizedDisplayName,
					voice_id: normalizedVoiceId,
					provider: "minimax",
					source: aliasSource,
					metadata: {
						original_display_name: existing?.displayName ?? normalizedVoiceId,
					},
				});
				setVoiceCatalog((current) => {
					const next = new Map<string, VoiceCatalogItem>();
					next.set(normalizedVoiceId, {
						displayName: normalizedDisplayName,
						voiceId: normalizedVoiceId,
						provider: "minimax",
						source: aliasSource,
					});
					current.forEach((voice) => {
						if (voice.voiceId !== normalizedVoiceId) {
							next.set(voice.voiceId, voice);
						}
					});
					const nextVoiceCatalog = [...next.values()];
					persistVoiceCatalog(nextVoiceCatalog);
					return nextVoiceCatalog;
				});
				updateAudioOption("audioVoiceId", normalizedVoiceId);
				updateAudioOption("audioVoiceName", normalizedDisplayName);
				pushRuntimeNotice(
					`音色已保存为「${normalizedDisplayName}」。`,
					"info",
					`voice-alias-saved-${normalizedVoiceId}`,
				);
			} catch (error) {
				pushRuntimeNotice(
					error instanceof Error ? error.message : "保存音色命名失败。",
					"warning",
					"voice-alias-save-failed",
				);
			}
		},
		[
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			pushRuntimeNotice,
			setVoiceCatalog,
			updateAudioOption,
			voiceCatalog,
		],
	);

	return { refreshVoiceCatalog, saveVoiceAliasForCatalog };
}
