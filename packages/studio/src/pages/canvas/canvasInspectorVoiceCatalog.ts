import type { PanelOption } from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type InspectorVoiceCatalogEntry = {
	displayName: string;
	voiceId: string;
	provider?: string;
	source?: string;
};

export type InspectorVoiceCatalogState = {
	voices: InspectorVoiceCatalogEntry[];
	voiceSelectOptions: PanelOption[];
	selectedVoice?: InspectorVoiceCatalogEntry;
	selectedVoiceId: string;
	selectedVoiceName: string;
};

function formatVoiceProviderLabel(provider?: string) {
	const normalized = provider?.trim().toLowerCase();
	if (!normalized) return "";
	if (normalized === "yunwu") return "云雾";
	if (normalized === "minimax") return "MiniMax";
	return provider?.trim() ?? "";
}

export function buildVoiceCatalogState(
	voiceCatalog: InspectorVoiceCatalogEntry[] | undefined,
	composer: ComposerPreset,
): InspectorVoiceCatalogState {
	const voices = voiceCatalog ?? [];
	const voiceCatalogOptions: PanelOption[] = voices.map((voice) => {
		const providerLabel = formatVoiceProviderLabel(voice.provider);
		const sourceLabel = voice.source === "official" ? "官方" : "我的";
		return {
			value: voice.voiceId,
			label: `${sourceLabel} · ${voice.displayName}`,
			description: `${sourceLabel}音色${providerLabel ? ` · ${providerLabel}` : ""}`,
		};
	});
	const voiceSelectOptions = voiceCatalogOptions.length
		? voiceCatalogOptions
		: [
				{
					value: "__empty_voice_catalog__",
					label: "暂无音色，可先克隆/设计音色或读取 MiniMax 官方音色",
					disabled: true,
				},
			];
	const selectedVoice = voices.find(
		(voice) =>
			voice.voiceId === composer.audioVoiceId ||
			voice.displayName === composer.audioVoiceName,
	);
	const selectedVoiceId = selectedVoice?.voiceId ?? composer.audioVoiceId ?? "";
	const selectedVoiceName =
		selectedVoice?.displayName ?? composer.audioVoiceName ?? "";

	return {
		voices,
		voiceSelectOptions,
		selectedVoice,
		selectedVoiceId,
		selectedVoiceName,
	};
}
