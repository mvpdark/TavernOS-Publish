import { getModelDisplayLabel, getSelectedModelPlatformEmoji } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";

export type AudioMusicOption = {
	value: string;
	label: string;
	disabled?: boolean;
	description?: string;
};

export type AudioModelCapability = {
	model: string;
	tiers?: string[];
	defaultTier?: string;
	notes: string[];
	remainingLabel?: string;
	docPending?: boolean;
};

export type MusicModelCapability = {
	model: string;
	versions?: AudioMusicOption[];
	defaultVersion?: string;
	actions?: AudioMusicOption[];
	defaultAction?: string;
	outputFormats?: AudioMusicOption[];
	defaultOutputFormat?: string;
	sampleRates?: AudioMusicOption[];
	defaultSampleRate?: string;
	bitrates?: AudioMusicOption[];
	defaultBitrate?: string;
	audioFormats?: AudioMusicOption[];
	defaultAudioFormat?: string;
	booleanOptions?: AudioMusicOption[];
	defaultStyleCategory?: string;
	defaultStylePreset?: string;
	referenceLimit?: number;
	notes: string[];
	remainingLabel?: string;
	docPending?: boolean;
};

export type MusicComposerOptionKey =
	| "musicAction"
	| "musicVersion"
	| "musicOutputFormat"
	| "musicLyrics"
	| "musicSampleRate"
	| "musicBitrate"
	| "musicAudioFormat"
	| "musicInstrumental"
	| "musicLyricsOptimizer"
	| "musicWatermark"
	| "musicStyleCategory"
	| "musicStylePreset"




export type MusicStylePresetOption = AudioMusicOption;

export type MusicStyleGroup = {
	value: string;
	label: string;
	description: string;
	presets: MusicStylePresetOption[];
};

const DEFAULT_AUDIO_CAPABILITY: AudioModelCapability = {
	model: "Audio",
	notes: ["当前仅展示基础模型信息，详细参数仍待补全文档。"],
	docPending: true,
};

const DEFAULT_MUSIC_CAPABILITY: MusicModelCapability = {
	model: "Music",
	notes: ["当前仅展示基础模型信息，详细参数仍待补全文档。"],
	docPending: true,
};

const AUDIO_MODEL_CAPABILITIES: Record<string, AudioModelCapability> = {
	"MiniMax Speech 2.8 HD ☁️": {
		model: "MiniMax Speech 2.8 HD ☁️",
		tiers: ["HD"],
		defaultTier: "HD",
		remainingLabel: "套餐剩余",
		notes: [
			"固定路由到 MiniMax speech-2.8-hd，同步 TTS 接口返回音频资源。",
			"默认使用 male-qn-qingse，可通过 kaka-api options 传 voice_id、voice_setting、audio_setting 等高级参数。",
			"真实剩余次数应优先读取 remaining_usage_counts。",
		],
	},
	"Eleven v3 🌐": {
		model: "Eleven v3 🌐",
		docPending: true,
		notes: [
			"当前作为 ai1foo 侧 TTS / 对话音频能力展示。",
			"语音风格、角色、语速等参数文档尚未补齐。",
		],
	},
	"IndexTTS2 🌐": {
		model: "IndexTTS2 🌐",
		docPending: true,
		notes: [
			"当前作为基础 TTS 节点展示。",
			"更多语音参数尚未在规范中写死。",
		],
	},
};

const MUSIC_MODEL_CAPABILITIES: Record<string, MusicModelCapability> = {
	"Suno ☁️": {
		model: "Suno ☁️",
		actions: [
			{ value: "music", label: "作曲", description: "走 suno_music" },
			{ value: "lyrics", label: "歌词", description: "走 suno_lyrics" },
			{ value: "upload", label: "上传音频", description: "走 suno_uploads，需要挂载音频" },
		],
		defaultAction: "music",
		defaultStyleCategory: "pop",
		defaultStylePreset: "anthemic-pop",
		referenceLimit: 1,
		notes: [
			"作曲、歌词、上传音频分别路由到 yunwu 的三个 Suno 操作模型。",
			"上传音频需要先给当前音乐节点挂载一段音频。",
		],
	},
	"Suno 🌐": {
		model: "Suno 🌐",
		docPending: true,
		notes: [
			"ai1foo 平台当前先不统计价格。",
			"lyrics、参考音频和时长能力仍待补全文档。",
		],
	},
};

export const SUNO_MUSIC_STYLE_GROUPS: MusicStyleGroup[] = [
	{
		value: "pop",
		label: "流行",
		description: "适合主流歌曲、旋律 Hook、清晰人声。",
		presets: [
			{ value: "anthemic-pop", label: "大气流行" },
			{ value: "indie-pop", label: "独立流行" },
			{ value: "synth-pop", label: "合成器流行" },
			{ value: "ballad-pop", label: "抒情流行" },
		],
	},
	{
		value: "rock",
		label: "摇滚",
		description: "吉他驱动、乐队质感、强节奏。",
		presets: [
			{ value: "alt-rock", label: "另类摇滚" },
			{ value: "pop-rock", label: "流行摇滚" },
			{ value: "hard-rock", label: "硬摇滚" },
			{ value: "post-rock", label: "后摇" },
		],
	},
	{
		value: "hiphop",
		label: "嘻哈/R&B",
		description: "节拍、人声律动、低频和律动感更突出。",
		presets: [
			{ value: "trap", label: "Trap" },
			{ value: "boom-bap", label: "Boom Bap" },
			{ value: "alt-rnb", label: "另类 R&B" },
			{ value: "neo-soul", label: "Neo Soul" },
		],
	},
	{
		value: "electronic",
		label: "电子",
		description: "合成器、舞曲结构、电子音色。",
		presets: [
			{ value: "edm", label: "EDM" },
			{ value: "house", label: "House" },
			{ value: "ambient", label: "氛围电子" },
			{ value: "future-bass", label: "Future Bass" },
		],
	},
	{
		value: "cinematic",
		label: "影视/游戏",
		description: "叙事性、空间感和配乐氛围更强。",
		presets: [
			{ value: "cinematic-orchestral", label: "电影管弦" },
			{ value: "epic-trailer", label: "史诗预告" },
			{ value: "lofi-score", label: "Lo-fi 配乐" },
			{ value: "game-bgm", label: "游戏 BGM" },
		],
	},
	{
		value: "folk",
		label: "民谣/原声",
		description: "原声乐器、叙事歌词、自然人声。",
		presets: [
			{ value: "acoustic-folk", label: "原声民谣" },
			{ value: "country-folk", label: "乡村民谣" },
			{ value: "singer-songwriter", label: "唱作人" },
			{ value: "city-folk", label: "城市民谣" },
		],
	},
	{
		value: "jazz",
		label: "爵士/蓝调",
		description: "和声色彩、即兴感、温暖律动。",
		presets: [
			{ value: "smooth-jazz", label: "Smooth Jazz" },
			{ value: "swing", label: "Swing" },
			{ value: "blues", label: "Blues" },
			{ value: "bossa-nova", label: "Bossa Nova" },
		],
	},
	{
		value: "chinese",
		label: "华语/国风",
		description: "适合中文歌词、国风器乐和华语流行表达。",
		presets: [
			{ value: "c-pop", label: "华语流行" },
			{ value: "chinese-ballad", label: "华语抒情" },
			{ value: "guofeng", label: "国风" },
			{ value: "chinese-rock", label: "华语摇滚" },
		],
	},
];

function getModelKey(model: string) {
	const label = getModelDisplayLabel(model).trim();
	const emoji = getSelectedModelPlatformEmoji(model).trim();
	return emoji ? `${label} ${emoji}` : label;
}

export function getAudioModelCapability(model: string) {
	if (getModelDisplayLabel(model).trim() === "MiniMax Speech 2.8 HD") {
		return AUDIO_MODEL_CAPABILITIES["MiniMax Speech 2.8 HD ☁️"];
	}
	return AUDIO_MODEL_CAPABILITIES[getModelKey(model)] ?? DEFAULT_AUDIO_CAPABILITY;
}

export function getMusicModelCapability(model: string) {
	return MUSIC_MODEL_CAPABILITIES[getModelKey(model)] ?? DEFAULT_MUSIC_CAPABILITY;
}

export function resolveAudioComposerPreset(
	model: string,
	current?: Partial<ComposerPreset>,
): Pick<ComposerPreset, "audioTier" | "audioVoiceMode" | "audioVoiceName" | "audioVoiceId" | "audioVoiceStyle"> {
	const capability = getAudioModelCapability(model);
	const audioTier = capability.tiers?.includes(current?.audioTier ?? "")
		? current?.audioTier
		: capability.defaultTier;
	return {
		audioTier,
		audioVoiceMode: current?.audioVoiceMode ?? "tts",
		audioVoiceName: current?.audioVoiceName ?? "",
		audioVoiceId: current?.audioVoiceId ?? "",
		audioVoiceStyle: current?.audioVoiceStyle ?? "",
	};
}

export function resolveMusicComposerPreset(
	model: string,
	current?: Partial<ComposerPreset>,
): Pick<
	ComposerPreset,
	| "musicAction"
	| "musicVersion"
	| "musicOutputFormat"
	| "musicLyrics"
	| "musicSampleRate"
	| "musicBitrate"
	| "musicAudioFormat"
	| "musicInstrumental"
	| "musicLyricsOptimizer"
	| "musicWatermark"
	| "musicStyleCategory"
	| "musicStylePreset"
> {
	const capability = getMusicModelCapability(model);
	const musicVersion = capability.versions?.some((option) => option.value === current?.musicVersion)
		? current?.musicVersion
		: capability.defaultVersion;
	const musicOutputFormat = capability.outputFormats?.some((option) => option.value === current?.musicOutputFormat)
		? current?.musicOutputFormat
		: capability.defaultOutputFormat;
	const musicSampleRate = capability.sampleRates?.some((option) => option.value === current?.musicSampleRate)
		? current?.musicSampleRate
		: capability.defaultSampleRate;
	const musicBitrate = capability.bitrates?.some((option) => option.value === current?.musicBitrate)
		? current?.musicBitrate
		: capability.defaultBitrate;
	const musicAudioFormat = capability.audioFormats?.some((option) => option.value === current?.musicAudioFormat)
		? current?.musicAudioFormat
		: capability.defaultAudioFormat;
	const musicAction = capability.actions?.some((option) => option.value === current?.musicAction)
		? current?.musicAction
		: capability.defaultAction;
	const musicStyleCategory = SUNO_MUSIC_STYLE_GROUPS.some(
		(group) => group.value === current?.musicStyleCategory,
	)
		? current?.musicStyleCategory
		: capability.defaultStyleCategory ?? SUNO_MUSIC_STYLE_GROUPS[0]?.value;
	const currentGroup =
		SUNO_MUSIC_STYLE_GROUPS.find((group) => group.value === musicStyleCategory) ??
		SUNO_MUSIC_STYLE_GROUPS[0];
	const musicStylePreset = currentGroup?.presets.some(
		(option) => option.value === current?.musicStylePreset,
	)
		? current?.musicStylePreset
		: capability.defaultStylePreset &&
				currentGroup?.presets.some((option) => option.value === capability.defaultStylePreset)
		? capability.defaultStylePreset
		: currentGroup?.presets[0]?.value;
	return {
		musicAction,
		musicVersion,
		musicOutputFormat,
		musicSampleRate,
		musicBitrate,
		musicAudioFormat,
		musicLyrics: current?.musicLyrics,
		musicInstrumental: current?.musicInstrumental ?? "false",
		musicLyricsOptimizer: current?.musicLyricsOptimizer ?? "false",
		musicWatermark: current?.musicWatermark ?? "false",
		musicStyleCategory,
		musicStylePreset,
	};
}

export function getAudioTierOptions(model: string): AudioMusicOption[] {
	const capability = getAudioModelCapability(model);
	return (capability.tiers ?? []).map((value) => ({ value, label: value }));
}

export function getMusicActionOptions(model: string): AudioMusicOption[] {
	const capability = getMusicModelCapability(model);
	return capability.actions ?? [];
}

export function getMusicVersionOptions(model: string): AudioMusicOption[] {
	return getMusicModelCapability(model).versions ?? [];
}

export function getMusicOutputFormatOptions(model: string): AudioMusicOption[] {
	return getMusicModelCapability(model).outputFormats ?? [];
}

export function getMusicSampleRateOptions(model: string): AudioMusicOption[] {
	return getMusicModelCapability(model).sampleRates ?? [];
}

export function getMusicBitrateOptions(model: string): AudioMusicOption[] {
	return getMusicModelCapability(model).bitrates ?? [];
}

export function getMusicAudioFormatOptions(model: string): AudioMusicOption[] {
	return getMusicModelCapability(model).audioFormats ?? [];
}

export function getMusicStyleGroups() {
	return SUNO_MUSIC_STYLE_GROUPS;
}

export function getMusicStylePresets(_model: string, category?: string) {
	return (
		SUNO_MUSIC_STYLE_GROUPS.find((group) => group.value === category) ??
		SUNO_MUSIC_STYLE_GROUPS[0]
	)?.presets ?? [];
}

export function getMusicStyleLabel(composer: ComposerPreset) {
	const group =
		SUNO_MUSIC_STYLE_GROUPS.find((item) => item.value === composer.musicStyleCategory) ??
		SUNO_MUSIC_STYLE_GROUPS[0];
	const preset =
		group?.presets.find((item) => item.value === composer.musicStylePreset) ??
		group?.presets[0];
	return [group?.label, preset?.label].filter(Boolean).join(" / ");
}

export function formatAudioMusicMeta(type: "audio" | "music", composer: ComposerPreset) {
	const capability =
		type === "audio"
			? getAudioModelCapability(composer.model)
			: getMusicModelCapability(composer.model);
	if (type === "audio") {
		const voiceName = composer.audioVoiceName?.trim();
		return voiceName ? `音色 · ${voiceName}` : "选择音色";
	}
	const musicActionLabel =
		type === "music"
			? getMusicActionOptions(composer.model).find((option) => option.value === composer.musicAction)?.label
			: undefined;
	const parts = [
		composer.musicVersion,
		musicActionLabel,
		capability.remainingLabel,
	]
		.filter(Boolean)
		.join(" · ");
	return parts || capability.notes[0] || "查看模型说明";
}
