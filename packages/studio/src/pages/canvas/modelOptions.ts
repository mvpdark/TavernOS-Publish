import type { NodeType } from "./canvas-types";

export const AUTO_MODEL_PLATFORM_EMOJI = "⚙️";
const UPSTREAM_MODEL_OPTION_DELIMITER = "<<<RAW>>>";

const SYNTHETIC_PLATFORM_EMOJI_POOL = ["☁️", "🤖", "🌐", "🌊", "🎥"] as const;

export type ModelOptionCatalog = {
	modelNames: string[];
	availableEmojisByModel: Record<string, string[]>;
	preferredRawLabelByModel: Record<string, string>;
	rawLabelByModelAndEmoji: Record<string, Record<string, string>>;
};

function splitUpstreamModelOption(model: string) {
	const delimiterIndex = model.indexOf(UPSTREAM_MODEL_OPTION_DELIMITER);
	if (delimiterIndex === -1) {
		return { displayLabel: model, rawValue: model };
	}
	return {
		displayLabel: model.slice(0, delimiterIndex),
		rawValue: model.slice(delimiterIndex + UPSTREAM_MODEL_OPTION_DELIMITER.length),
	};
}

export function encodeUpstreamModelOption(displayLabel: string, rawValue: string) {
	const normalizedDisplayLabel = displayLabel.trim();
	const normalizedRawValue = rawValue.trim();
	if (!normalizedDisplayLabel || !normalizedRawValue) {
		return normalizedDisplayLabel || normalizedRawValue;
	}
	return `${normalizedDisplayLabel}${UPSTREAM_MODEL_OPTION_DELIMITER}${normalizedRawValue}`;
}

export function getUpstreamModelOptionDisplayLabel(model: string) {
	return splitUpstreamModelOption(model).displayLabel.trim();
}

export function getUpstreamModelOptionRawValue(model: string) {
	return splitUpstreamModelOption(model).rawValue.trim();
}

const MODEL_STORAGE_TO_DISPLAY: Partial<Record<NodeType, Record<string, string>>> = {
	text: {
		"MiniMax M2.7 High Speed 🤖": "MiniMax M2.7 High Speed 🤖",
		"GPT-5.5 ☁️": "GPT-5.5 ☁️",
		"GPT-5.5": "GPT-5.5 ☁️",
		"gpt-5.5": "GPT-5.5 ☁️",
		"gpt-5.5(yunwu)": "GPT-5.5 ☁️",
		"gpt-5.5-xhigh": "GPT-5.5 ☁️",
		"gpt-5.5-xhigh(yunwu)": "GPT-5.5 ☁️",
		"Claude Opus 4.7 ☁️": "Claude Opus 4.7 ☁️",
		"Claude Opus 4.7": "Claude Opus 4.7 ☁️",
		"claude-opus-4-7": "Claude Opus 4.7 ☁️",
		"claude-opus-4-7(yunwu)": "Claude Opus 4.7 ☁️",
		"Claude Sonnet 4.6 ☁️": "Claude Sonnet 4.6 ☁️",
		"Claude Sonnet 4.6": "Claude Sonnet 4.6 ☁️",
		"claude-sonnet-4-6": "Claude Sonnet 4.6 ☁️",
		"claude-sonnet-4-6(yunwu)": "Claude Sonnet 4.6 ☁️",
		"Qwen3.6-35B-A3B 🌊": "Qwen3.6-35B-A3B 🌊",
		"Qwen3.6-35B-A3B": "Qwen3.6-35B-A3B 🌊",
		"Qwen/Qwen3.6-35B-A3B": "Qwen3.6-35B-A3B 🌊",
		"Qwen/Qwen3.6-35B-A3B(siliconflow)": "Qwen3.6-35B-A3B 🌊",
		"DeepSeek-V4-Flash 🌊": "DeepSeek-V4-Flash 🌊",
		"DeepSeek-V4-Flash": "DeepSeek-V4-Flash 🌊",
		"deepseek-ai/DeepSeek-V4-Flash": "DeepSeek-V4-Flash 🌊",
		"deepseek-ai/DeepSeek-V4-Flash(siliconflow)": "DeepSeek-V4-Flash 🌊",
		"Qwen/Qwen3-VL-32B-Instruct(siliconflow)": "Qwen3-VL-32B-Instruct 🌊",
		"minimax-m2.7-highspeed": "MiniMax M2.7 High Speed 🤖",
		"minimax-m2.7-highspeed(minimax)": "MiniMax M2.7 High Speed 🤖",
	},
	image: {
		"Kolors 🌊": "Kolors 🌊",
		"Kolors": "Kolors 🌊",
		"Kwai-Kolors 🌊": "Kolors 🌊",
		"Kwai-Kolors/Kolors": "Kolors 🌊",
		"Kwai-Kolors/Kolors(siliconflow)": "Kolors 🌊",
		"GPT Image ☁️": "GPT Image ☁️",
		"GPT Image 1.5 ☁️": "GPT Image ☁️",
		"GPT Image 2 ☁️": "GPT Image ☁️",
		"gpt-image-1.5": "GPT Image ☁️",
		"gpt-image-1.5(yunwu)": "GPT Image ☁️",
		"gpt-image-1.5-all": "GPT Image ☁️",
		"gpt-image-1.5-all(yunwu)": "GPT Image ☁️",
		"gpt-image-2": "GPT Image ☁️",
		"gpt-image-2(yunwu)": "GPT Image ☁️",
		"gpt-image-2-all": "GPT Image ☁️",
		"gpt-image-2-all(yunwu)": "GPT Image ☁️",
		"Z Image Turbo ☁️": "Z Image Turbo ☁️",
		"z-image-turbo": "Z Image Turbo ☁️",
		"z-image-turbo(yunwu)": "Z Image Turbo ☁️",
		"Ideogram 3.0 ☁️": "Ideogram 3.0 ☁️",
		"ideogram_generate_V_3_TURBO": "Ideogram 3.0 ☁️",
		"ideogram_generate_V_3_TURBO(yunwu)": "Ideogram 3.0 ☁️",
		"ideogram_generate_V_3_DEFAULT": "Ideogram 3.0 ☁️",
		"ideogram_generate_V_3_DEFAULT(yunwu)": "Ideogram 3.0 ☁️",
		"ideogram_generate_V_3_QUALITY": "Ideogram 3.0 ☁️",
		"ideogram_generate_V_3_QUALITY(yunwu)": "Ideogram 3.0 ☁️",
		"Midjourney ☁️": "Midjourney ☁️",
		"mj_imagine": "Midjourney ☁️",
		"mj_imagine(yunwu)": "Midjourney ☁️",
		"midjourney-v7": "Midjourney ☁️",
		"midjourney-v7(yunwu)": "Midjourney ☁️",
		"Nano Banana ☁️": "Nano Banana ☁️",
		"Nano Banana 2 ☁️": "Nano Banana ☁️",
		"Nano Banana 2 🌐": "Nano Banana 2 🌐",
		"Nano Banana Pro 🌐": "Nano Banana Pro 🌐",
		"Nano Banana Pro ☁️": "Nano Banana ☁️",
		"gemini-3.1-flash-image-preview": "Nano Banana ☁️",
		"gemini-3.1-flash-image-preview(yunwu)": "Nano Banana ☁️",
		"gemini-3-pro-image-preview": "Nano Banana ☁️",
		"gemini-3-pro-image-preview(yunwu)": "Nano Banana ☁️",
	},
	video: {
		"VEO 3.1": "VEO 3.1",
		"VEO 3.1 ☁️": "VEO 3.1 ☁️",
		"veo3.1(yunwu)": "VEO 3.1 ☁️",
		"veo_3_1(yunwu)": "VEO 3.1 ☁️",
		"Runway Gen4 ☁️": "Runway Gen4 ☁️",
		"Runway Gen4": "Runway Gen4 ☁️",
		"runwayml-gen4_turbo-10": "Runway Gen4 ☁️",
		"runwayml-gen4_turbo-10(yunwu)": "Runway Gen4 ☁️",
		"runwayml-gen4_turbo-5": "Runway Gen4 ☁️",
		"runwayml-gen4_turbo-5(yunwu)": "Runway Gen4 ☁️",
		"Grok Imagine Video ☁️": "Grok Imagine Video ☁️",
		"Grok Videos ☁️": "Grok Imagine Video ☁️",
		"grok-videos": "Grok Imagine Video ☁️",
		"grok-videos(yunwu)": "Grok Imagine Video ☁️",
		"grok-video-3(yunwu)": "Grok Imagine Video ☁️",
		"MiniMax Hailuo 2.3 ☁️": "MiniMax Hailuo 2.3 ☁️",
		"minimax-hailuo-2.3": "MiniMax Hailuo 2.3 ☁️",
		"minimax-hailuo-2.3(yunwu)": "MiniMax Hailuo 2.3 ☁️",
		"minimax-hailuo-2.3-fast": "MiniMax Hailuo 2.3 ☁️",
		"minimax-hailuo-2.3-fast(yunwu)": "MiniMax Hailuo 2.3 ☁️",
		"Wan 2.2 🌊": "Wan 2.2 🌊",
		"Wan-AI/Wan2.2-T2V-A14B": "Wan 2.2 🌊",
		"Wan-AI/Wan2.2-T2V-A14B(siliconflow)": "Wan 2.2 🌊",
		"Wan-AI/Wan2.2-I2V-A14B": "Wan 2.2 🌊",
		"Wan-AI/Wan2.2-I2V-A14B(siliconflow)": "Wan 2.2 🌊",
		"Seedance 2.0 🎥": "Seedance 2.0 🎥",
		"Seedance 1.5 Pro 🎥": "Seedance 1.5 Pro 🎥",
		"Seedance": "Seedance",
		"Veo 3.1 ☁️": "Veo 3.1 ☁️",
		"wan-2.2": "Wan 2.2",
		"dreamina-seedance-2-0-260128": "Seedance 2.0",
		"wanxiang-plus": "Seedance 1.5 Pro",
		"seedance-1.5-pro": "Seedance 1.5 Pro",
	},
	audio: {
		"MiniMax Speech 2.8 HD ☁️": "MiniMax Speech 2.8 HD ☁️",
		"speech-2.8-hd": "MiniMax Speech 2.8 HD ☁️",
		"speech-2.8-hd(yunwu)": "MiniMax Speech 2.8 HD ☁️",
		"Minimax Speech 2.8 ☁️": "MiniMax Speech 2.8 HD ☁️",
	},
	music: {
		"Suno ☁️": "Suno ☁️",
		"suno_music": "Suno ☁️",
		"suno_music(yunwu)": "Suno ☁️",
		"suno_lyrics": "Suno ☁️",
		"suno_lyrics(yunwu)": "Suno ☁️",
		"suno_uploads": "Suno ☁️",
		"suno_uploads(yunwu)": "Suno ☁️",
	},
	editor: {
		"GPT Image ☁️": "GPT Image ☁️",
		"GPT Image 1.5 ☁️": "GPT Image ☁️",
		"GPT Image 2 ☁️": "GPT Image ☁️",
		"gpt-image-1.5": "GPT Image ☁️",
		"gpt-image-1.5(yunwu)": "GPT Image ☁️",
		"gpt-image-1.5-all": "GPT Image ☁️",
		"gpt-image-1.5-all(yunwu)": "GPT Image ☁️",
		"gpt-image-2": "GPT Image ☁️",
		"gpt-image-2(yunwu)": "GPT Image ☁️",
		"gpt-image-2-all": "GPT Image ☁️",
		"gpt-image-2-all(yunwu)": "GPT Image ☁️",
		"Z Image Turbo ☁️": "Z Image Turbo ☁️",
		"z-image-turbo": "Z Image Turbo ☁️",
		"z-image-turbo(yunwu)": "Z Image Turbo ☁️",
		"Midjourney 混图 ☁️": "Midjourney 混图 ☁️",
		"Midjourney 反推 ☁️": "Midjourney 反推 ☁️",
		"Ideogram ☁️": "Ideogram ☁️",
		"ideogram_edit_V_3_DEFAULT": "Ideogram ☁️",
		"ideogram_edit_V_3_DEFAULT(yunwu)": "Ideogram ☁️",
		"ideogram_remix_V_3_DEFAULT": "Ideogram ☁️",
		"ideogram_remix_V_3_DEFAULT(yunwu)": "Ideogram ☁️",
		"ideogram_reframe_V_3_DEFAULT": "Ideogram ☁️",
		"ideogram_reframe_V_3_DEFAULT(yunwu)": "Ideogram ☁️",
		"ideogram_replace_background_V_3_DEFAULT": "Ideogram ☁️",
		"ideogram_replace_background_V_3_DEFAULT(yunwu)": "Ideogram ☁️",
		"ideogram_upscale": "Ideogram ☁️",
		"ideogram_upscale(yunwu)": "Ideogram ☁️",
		"ideogram_describe": "Ideogram ☁️",
		"ideogram_describe(yunwu)": "Ideogram ☁️",
		"mj_blend": "Midjourney 混图 ☁️",
		"mj_blend(yunwu)": "Midjourney 混图 ☁️",
		"mj_describe": "Midjourney 反推 ☁️",
		"mj_describe(yunwu)": "Midjourney 反推 ☁️",
		"Nano Banana ☁️": "Nano Banana ☁️",
		"gemini-3.1-flash-image-preview": "Nano Banana ☁️",
		"gemini-3.1-flash-image-preview(yunwu)": "Nano Banana ☁️",
		"gemini-3-pro-image-preview": "Nano Banana ☁️",
		"gemini-3-pro-image-preview(yunwu)": "Nano Banana ☁️",
	},
};

const MODEL_DISPLAY_TO_STORAGE: Partial<Record<NodeType, Record<string, string>>> = {
	text: {
		"MiniMax M2.7 High Speed 🤖": "minimax-m2.7-highspeed(minimax)",
		"GPT-5.5": "gpt-5.5(yunwu)",
		"GPT-5.5 ☁️": "gpt-5.5(yunwu)",
		"Claude Opus 4.7": "claude-opus-4-7(yunwu)",
		"Claude Opus 4.7 ☁️": "claude-opus-4-7(yunwu)",
		"Claude Sonnet 4.6": "claude-sonnet-4-6(yunwu)",
		"Claude Sonnet 4.6 ☁️": "claude-sonnet-4-6(yunwu)",
		"Qwen3.6-35B-A3B": "Qwen/Qwen3.6-35B-A3B(siliconflow)",
		"Qwen3.6-35B-A3B 🌊": "Qwen/Qwen3.6-35B-A3B(siliconflow)",
		"DeepSeek-V4-Flash": "deepseek-ai/DeepSeek-V4-Flash(siliconflow)",
		"DeepSeek-V4-Flash 🌊": "deepseek-ai/DeepSeek-V4-Flash(siliconflow)",
	},
	image: {
		"Kolors": "Kwai-Kolors/Kolors(siliconflow)",
		"Kolors 🌊": "Kwai-Kolors/Kolors(siliconflow)",
		"Kwai-Kolors 🌊": "Kwai-Kolors/Kolors(siliconflow)",
		"GPT Image": "gpt-image-1.5(yunwu)",
		"GPT Image ☁️": "gpt-image-1.5(yunwu)",
		"GPT Image 1.5 ☁️": "gpt-image-1.5(yunwu)",
		"GPT Image 2 ☁️": "gpt-image-2(yunwu)",
		"Z Image Turbo": "z-image-turbo(yunwu)",
		"Z Image Turbo ☁️": "z-image-turbo(yunwu)",
		"Ideogram 3.0": "ideogram_generate_V_3_TURBO(yunwu)",
		"Ideogram 3.0 ☁️": "ideogram_generate_V_3_TURBO(yunwu)",
		"Midjourney": "mj_imagine(yunwu)",
		"Midjourney ☁️": "mj_imagine(yunwu)",
		"Nano Banana": "gemini-3.1-flash-image-preview(yunwu)",
		"Nano Banana ☁️": "gemini-3.1-flash-image-preview(yunwu)",
		"Nano Banana 2 ☁️": "gemini-3.1-flash-image-preview(yunwu)",
		"Nano Banana 2 🌐": "Nano Banana 2 🌐",
		"Nano Banana Pro 🌐": "Nano Banana Pro 🌐",
		"Nano Banana Pro ☁️": "gemini-3-pro-image-preview(yunwu)",
	},
	video: {
		"VEO 3.1": "veo3.1(yunwu)",
		"VEO 3.1 ☁️": "veo3.1(yunwu)",
		"Runway Gen4": "runwayml-gen4_turbo-10(yunwu)",
		"Runway Gen4 ☁️": "runwayml-gen4_turbo-10(yunwu)",
		"Grok Imagine Video": "grok-videos(yunwu)",
		"Grok Imagine Video ☁️": "grok-videos(yunwu)",
		"Grok Videos ☁️": "grok-videos(yunwu)",
		"Minimax Hailuo 2.3 ☁️": "minimax-hailuo-2.3(yunwu)",
		"MiniMax Hailuo 2.3 ☁️": "minimax-hailuo-2.3(yunwu)",
		"Wan 2.2": "Wan-AI/Wan2.2-T2V-A14B(siliconflow)",
		"Wan 2.2 🌊": "Wan-AI/Wan2.2-T2V-A14B(siliconflow)",
		"Seedance 2.0 🎥": "Seedance 2.0 🎥",
		"Seedance 1.5 Pro 🎥": "Seedance 1.5 Pro 🎥",
		"Seedance": "Seedance",
		"Veo 3.1 ☁️": "Veo 3.1 ☁️",
		"Seedance 2.0": "dreamina-seedance-2-0-260128",
		"Seedance 1.5 Pro": "seedance-1.5-pro",
	},
	audio: {
		"MiniMax Speech 2.8 HD ☁️": "speech-2.8-hd(yunwu)",
		"Minimax Speech 2.8 ☁️": "speech-2.8-hd(yunwu)",
	},
	music: {
		"Suno ☁️": "suno_music(yunwu)",
		"suno_music": "suno_music(yunwu)",
	},
	editor: {
		"GPT Image": "gpt-image-1.5(yunwu)",
		"GPT Image ☁️": "gpt-image-1.5(yunwu)",
		"GPT Image 1.5 ☁️": "gpt-image-1.5(yunwu)",
		"GPT Image 2 ☁️": "gpt-image-2(yunwu)",
		"Z Image Turbo": "z-image-turbo(yunwu)",
		"Z Image Turbo ☁️": "z-image-turbo(yunwu)",
		"Nano Banana": "gemini-3.1-flash-image-preview(yunwu)",
		"Nano Banana ☁️": "gemini-3.1-flash-image-preview(yunwu)",
		"Midjourney 混图": "mj_blend(yunwu)",
		"Midjourney 混图 ☁️": "mj_blend(yunwu)",
		"Midjourney 反推": "mj_describe(yunwu)",
		"Midjourney 反推 ☁️": "mj_describe(yunwu)",
		"Ideogram": "ideogram_edit_V_3_DEFAULT(yunwu)",
		"Ideogram ☁️": "ideogram_edit_V_3_DEFAULT(yunwu)",
	},
};

const ALLOWED_MODEL_DISPLAY_NAMES_BY_TYPE: Record<NodeType, Set<string>> = {
	text: new Set(["MiniMax M2.7 High Speed", "GPT-5.5", "Claude Opus 4.7", "Claude Sonnet 4.6", "DeepSeek-V4-Flash", "Qwen3.6-35B-A3B"]),
	shot: new Set(),
	character: new Set(),
	scene: new Set(),
	image: new Set(["Nano Banana", "Nano Banana 2", "Nano Banana Pro", "GPT Image", "GPT Image 1.5", "GPT Image 2", "Z Image Turbo", "Ideogram 3.0", "Midjourney", "Kolors"]),
	video: new Set(["VEO 3.1", "Runway Gen4", "Grok Imagine Video", "MiniMax Hailuo 2.3", "Wan 2.2", "Seedance"]),
	audio: new Set(["MiniMax Speech 2.8 HD"]),
	music: new Set(["Suno"]),
	editor: new Set(["Nano Banana", "GPT Image", "Z Image Turbo", "Midjourney 混图", "Midjourney 反推", "Ideogram"]),
};

function isAllowedModelForType(type: NodeType, model?: string) {
	const allowedNames = ALLOWED_MODEL_DISPLAY_NAMES_BY_TYPE[type];
	if (!model?.trim()) return false;
	const sourceDisplayLabel = getUpstreamModelOptionDisplayLabel(model);
	const resolvedModel = resolveModelLabel(type, sourceDisplayLabel) ?? sourceDisplayLabel;
	return allowedNames.has(getModelDisplayLabel(resolvedModel).trim());
}

function filterAllowedModelOptions(type: NodeType, options: string[]) {
	return options.filter((model) => isAllowedModelForType(type, model));
}

function mergeModelOptions(options: string[], selectedModel?: string) {
	const trimmedSelectedModel = selectedModel?.trim();
	return Array.from(
		new Set([...options, ...(trimmedSelectedModel ? [trimmedSelectedModel] : [])]),
	);
}

function resolveSelectedModelLabel(type: NodeType, model?: string) {
	const resolvedModel = resolveModelLabel(type, model)?.trim();
	return resolvedModel || undefined;
}

function isModelSuffixEmojiToken(token: string) {
	if (!token) return false;
	return Array.from(token).some((char) => {
		const codePoint = char.codePointAt(0) ?? 0;
		return (
			codePoint >= 0x2600 && codePoint <= 0x27bf ||
			codePoint >= 0x1f300 && codePoint <= 0x1f9ff ||
			codePoint >= 0x1fa70 && codePoint <= 0x1faff ||
			codePoint === 0x200d ||
			codePoint === 0xfe0f
		);
	});
}

function parseModelVisualLabel(model: string) {
	const normalized = getUpstreamModelOptionDisplayLabel(model);
	if (!normalized) {
		return { displayLabel: normalized, platformEmoji: "" };
	}
	const tokens = normalized.split(/\s+/);
	const suffix = tokens[tokens.length - 1];
	if (!suffix || !isModelSuffixEmojiToken(suffix)) {
		return { displayLabel: normalized, platformEmoji: "" };
	}
	return {
		displayLabel: tokens.slice(0, -1).join(" ").trim() || normalized,
		platformEmoji: suffix,
	};
}

function prettifyCleanModelName(label: string) {
	const normalized = label.trim();
	if (!normalized) return normalized;
	if (["Suno 音乐生成", "Suno 歌词生成", "Suno 音频上传"].includes(normalized)) {
		return "Suno";
	}
	const lower = normalized.toLowerCase().replace(/[_\s]+/g, "-");
	const exactPatterns: Array<[RegExp, (...matches: string[]) => string]> = [
		[/^gpt-(\d+)[-.](\d+)$/, (_, major, minor) => `GPT-${major}.${minor}`],
		[/^gemini-(\d+)[-.](\d+)-pro-preview$/, (_, major, minor) => `Gemini ${major}.${minor} Pro Preview`],
		[/^gemini-(\d+)[-.](\d+)-pro$/, (_, major, minor) => `Gemini ${major}.${minor} Pro`],
		[/^deepseek-v?(\d+(?:[.-]\d+)?)$/, (_, version) => `DeepSeek V${version.replace(/-/g, ".")}`],
		[/^glm-(\d+(?:[.-]\d+)?)$/, (_, version) => `GLM ${version.replace(/-/g, ".")}`],
		[/^qwen(\d+(?:\.\d+)*)-plus$/, (_, version) => `Qwen ${version} Plus`],
		[/^qwen-(\d+(?:[.-]\d+)*)-plus$/, (_, version) => `Qwen ${version.replace(/-/g, ".")} Plus`],
		[/^claude-opus-(\d+)[-.](\d+)$/, (_, major, minor) => `Claude Opus ${major}.${minor}`],
		[/^claude-sonnet-(\d+)[-.](\d+)$/, (_, major, minor) => `Claude Sonnet ${major}.${minor}`],
	];
	for (const [pattern, formatter] of exactPatterns) {
		const match = lower.match(pattern);
		if (match) return formatter(...match);
	}
	return normalized;
}

function getCleanModelDisplayName(model: string) {
	const displayLabel = parseModelVisualLabel(model).displayLabel.trim();
	const withoutPlatformId = displayLabel.replace(/\(([a-z0-9_-]{4,})\)\s*$/i, "").trim();
	return prettifyCleanModelName(withoutPlatformId);
}

function getModelPlatformKey(model: string) {
	const explicitEmoji = getModelPlatformEmoji(model);
	if (explicitEmoji) return explicitEmoji;
	const normalized = getUpstreamModelOptionRawValue(model) || model.trim();
	const platformIdMatch = normalized.match(/\(([a-z0-9_-]{4,})\)\s*$/i);
	if (platformIdMatch) return platformIdMatch[1].toLowerCase();
	return "";
}

function getSyntheticPlatformEmoji(
	cleanModelName: string,
	platformKey: string,
	assignedSyntheticEmojiByModel: Map<string, Map<string, string>>,
) {
	let assignedByPlatformKey = assignedSyntheticEmojiByModel.get(cleanModelName);
	if (!assignedByPlatformKey) {
		assignedByPlatformKey = new Map<string, string>();
		assignedSyntheticEmojiByModel.set(cleanModelName, assignedByPlatformKey);
	}
	const existingEmoji = assignedByPlatformKey.get(platformKey);
	if (existingEmoji) return existingEmoji;
	const usedEmojis = new Set(assignedByPlatformKey.values());
	const nextEmoji =
		SYNTHETIC_PLATFORM_EMOJI_POOL.find((emoji) => !usedEmojis.has(emoji)) ??
		SYNTHETIC_PLATFORM_EMOJI_POOL[
			assignedByPlatformKey.size % SYNTHETIC_PLATFORM_EMOJI_POOL.length
		];
	assignedByPlatformKey.set(platformKey, nextEmoji);
	return nextEmoji;
}

export function getModelDisplayLabel(model: string) {
	return getCleanModelDisplayName(model);
}

export function getModelPlatformEmoji(model: string) {
	return parseModelVisualLabel(model).platformEmoji;
}

export function getSelectedModelPlatformEmoji(model: string) {
	return getModelPlatformEmoji(model) || AUTO_MODEL_PLATFORM_EMOJI;
}

export function composeModelDisplayLabel(modelName: string, platformEmoji: string) {
	const cleanModelName = getModelDisplayLabel(modelName).trim();
	if (!cleanModelName) return "";
	return `${cleanModelName} ${platformEmoji || AUTO_MODEL_PLATFORM_EMOJI}`;
}


export function buildModelOptionCatalog(
	type: NodeType,
	models: readonly string[],
): ModelOptionCatalog {
	const modelNames: string[] = [];
	const availableEmojisByModel: Record<string, string[]> = {};
	const preferredRawLabelByModel: Record<string, string> = {};
	const rawLabelByModelAndEmoji: Record<string, Record<string, string>> = {};
	const seenModelNames = new Set<string>();
	const seenModelEmojiKeys = new Set<string>();
	const assignedSyntheticEmojiByModel = new Map<string, Map<string, string>>();

	for (const model of models) {
		if (!model) continue;
		const rawModelLabel = model.trim();
		if (!rawModelLabel) continue;
		if (!isAllowedModelForType(type, rawModelLabel)) continue;
		const sourceDisplayLabel = getUpstreamModelOptionDisplayLabel(rawModelLabel);
		const resolvedModel = resolveModelLabel(type, sourceDisplayLabel) ?? sourceDisplayLabel;
		const cleanModelName = getModelDisplayLabel(resolvedModel).trim();
		if (!cleanModelName) continue;
		if (!seenModelNames.has(cleanModelName)) {
			seenModelNames.add(cleanModelName);
			modelNames.push(cleanModelName);
			preferredRawLabelByModel[cleanModelName] = rawModelLabel;
		}
		const explicitPlatformEmoji = getModelPlatformEmoji(resolvedModel);
		if (explicitPlatformEmoji) {
			let assignedByPlatformKey = assignedSyntheticEmojiByModel.get(cleanModelName);
			if (!assignedByPlatformKey) {
				assignedByPlatformKey = new Map<string, string>();
				assignedSyntheticEmojiByModel.set(cleanModelName, assignedByPlatformKey);
			}
			assignedByPlatformKey.set(`explicit:${explicitPlatformEmoji}`, explicitPlatformEmoji);
		}
		const platformEmoji = explicitPlatformEmoji
			? explicitPlatformEmoji
			: (() => {
				const platformKey = getModelPlatformKey(rawModelLabel) || getModelPlatformKey(resolvedModel);
				return platformKey
					? getSyntheticPlatformEmoji(
							cleanModelName,
							platformKey,
							assignedSyntheticEmojiByModel,
						)
					: "";
			})();
		if (!platformEmoji) continue;
		const modelEmojiKey = `${cleanModelName}::${platformEmoji}`;
		rawLabelByModelAndEmoji[cleanModelName] = {
			...(rawLabelByModelAndEmoji[cleanModelName] ?? {}),
			[platformEmoji]: rawModelLabel,
		};
		if (seenModelEmojiKeys.has(modelEmojiKey)) continue;
		seenModelEmojiKeys.add(modelEmojiKey);
		availableEmojisByModel[cleanModelName] = [
			...(availableEmojisByModel[cleanModelName] ?? []),
			platformEmoji,
		];
	}

	return {
		modelNames,
		availableEmojisByModel,
		preferredRawLabelByModel,
		rawLabelByModelAndEmoji,
	};
}

export function resolveModelLabel(type: NodeType, storedValue?: string) {
	if (!storedValue) return undefined;
	const sourceDisplayLabel = getUpstreamModelOptionDisplayLabel(storedValue);
	return MODEL_STORAGE_TO_DISPLAY[type]?.[sourceDisplayLabel] ?? sourceDisplayLabel;
}

export function getStoredModelValue(type: NodeType, displayValue: string) {
	const normalizedDisplayValue = displayValue.trim();
	if (!normalizedDisplayValue) return displayValue;
	const upstreamRawValue = getUpstreamModelOptionRawValue(normalizedDisplayValue);
	if (upstreamRawValue && upstreamRawValue !== normalizedDisplayValue) {
		return upstreamRawValue;
	}
	const directMatch =
		MODEL_DISPLAY_TO_STORAGE[type]?.[normalizedDisplayValue] ??
		MODEL_DISPLAY_TO_STORAGE[type]?.[resolveModelLabel(type, normalizedDisplayValue) ?? ""];
	if (directMatch) return directMatch;
	const { displayLabel, platformEmoji } = parseModelVisualLabel(normalizedDisplayValue);
	const entries = Object.entries(MODEL_DISPLAY_TO_STORAGE[type] ?? {});
	const exactEmojiMatch = entries.find(([label]) => {
		const parsedLabel = parseModelVisualLabel(label);
		return (
			parsedLabel.displayLabel === displayLabel &&
			parsedLabel.platformEmoji === platformEmoji
		);
	});
	if (exactEmojiMatch) return exactEmojiMatch[1];
	const cleanLabelMatch = entries.find(([label]) => {
		return parseModelVisualLabel(label).displayLabel === displayLabel;
	});
	return cleanLabelMatch?.[1] ?? displayLabel ?? normalizedDisplayValue;
}

export function getVisibleModelOptions({
	type,
	selectedModel,
	localOptions,
	upstreamOptions,
	isLoadingUpstreamModels,
	didUpstreamModelFetchFail,
}: {
	type: NodeType;
	selectedModel?: string;
	localOptions: string[];
	upstreamOptions: string[];
	isLoadingUpstreamModels: boolean;
	didUpstreamModelFetchFail: boolean;
}) {
	const normalizedSelectedModel = resolveSelectedModelLabel(type, selectedModel);
	const allowedSelectedModel = isAllowedModelForType(type, normalizedSelectedModel)
		? normalizedSelectedModel
		: undefined;
	if (type === "editor") {
		return filterAllowedModelOptions(
			type,
			mergeModelOptions(localOptions, allowedSelectedModel),
		);
	}
	if (type === "video") {
		return filterAllowedModelOptions(type, localOptions);
	}
	const shouldUseUpstreamOptions =
		!isLoadingUpstreamModels &&
		!didUpstreamModelFetchFail &&
		upstreamOptions.length > 0;
	return filterAllowedModelOptions(
		type,
		mergeModelOptions(
			shouldUseUpstreamOptions ? [...upstreamOptions, ...localOptions] : localOptions,
			allowedSelectedModel,
		),
	);
}

export function resolveCompatibleModelSelection({
	type,
	selectedModel,
	options,
	fallbackModel,
}: {
	type: NodeType;
	selectedModel: string;
	options: string[];
	fallbackModel: string;
}) {
	const resolvedSelectedModel = resolveSelectedModelLabel(type, selectedModel);
	const selectedDisplayLabel = getModelDisplayLabel(
		resolvedSelectedModel ?? selectedModel,
	).trim();
	const allowedFallbackModel = isAllowedModelForType(type, fallbackModel)
		? fallbackModel
		: "";
	return (
		(resolvedSelectedModel && options.includes(resolvedSelectedModel)
			? resolvedSelectedModel
			: options.find(
				(option) => getModelDisplayLabel(option).trim() === selectedDisplayLabel,
			)) ??
		options[0] ??
		allowedFallbackModel
	);
}
