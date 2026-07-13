import type { ImageModelCapability } from "./imageModelCapabilities";
import { getMidjourneyActionLabel } from "./midjourneyActions";
import type { ComposerPreset } from "./canvas-types";

export type PanelOption = {
	value: string;
	label: string;
	disabled?: boolean;
	description?: string;
};

export type PanelSelectSection<Key extends string = string> = {
	key: Key;
	label: string;
	options: PanelOption[];
	currentValue: string;
	onSelect: (value: string) => void;
	wide?: boolean;
	hint?: string;
};

export function createPanelSelectSection<Key extends string>({
	label,
	options,
	currentValue,
	key,
	wide,
	hint,
	onUpdate,
}: {
	label: string;
	options: PanelOption[];
	currentValue?: string;
	key: Key;
	wide?: boolean;
	hint?: string;
	onUpdate?: (key: Key, value: string) => void;
}): PanelSelectSection<Key> {
	return {
		key,
		label,
		options,
		currentValue: currentValue ?? "",
		wide,
		hint,
		onSelect: (value) => onUpdate?.(key, value),
	};
}

export const DISABLE_ENABLE_OPTIONS: PanelOption[] = [
	{ value: "false", label: "关闭" },
	{ value: "true", label: "开启" },
];

export const VOCAL_MODE_OPTIONS: PanelOption[] = [
	{ value: "false", label: "有人声" },
	{ value: "true", label: "纯音乐" },
];

export const IMAGE_GENERATION_MODE_OPTIONS: PanelOption[] = [
	{ value: "false", label: "标准生成" },
	{ value: "true", label: "顺序/组图" },
];

export const IMAGE_REFERENCE_BEHAVIOR_HINT =
	"顺序/组图会影响数量上限，部分模型在参考图场景下也会限制比例、4K 或思考模式。";

export function getDropdownCaret(isOpen: boolean) {
	return isOpen ? "▴" : "▾";
}

export function formatNodeMetric(value?: string | null) {
	const normalized = value?.trim();
	return normalized || "未设置";
}

export function formatImageQualityMetric(value?: string | null) {
	const labels: Record<string, string> = {
		auto: "自动",
		low: "低",
		medium: "中",
		high: "高",
	};
	const normalized = value?.trim();
	return normalized ? (labels[normalized] ?? normalized) : "未设置";
}

export function formatImageAutoMetric(value?: string | null) {
	const normalized = value?.trim();
	if (!normalized) return "未设置";
	return normalized.toLowerCase() === "auto" ? "自动" : normalized;
}

export function formatImageOutputFormatMetric(value?: string | null) {
	const normalized = value?.trim();
	if (!normalized) return "未设置";
	return normalized.toLowerCase() === "auto" ? "自动" : normalized.toUpperCase();
}

export function formatImageSpeedModeMetric(value?: string | null) {
	const labels: Record<string, string> = {
		Fast: "快速",
		Turbo: "极速",
		Relax: "慢速",
	};
	const normalized = value?.trim();
	if (!normalized) return "未设置";
	return labels[normalized] ?? formatImageAutoMetric(normalized);
}

export function formatOptionLabel(value: string) {
	return value === "adaptive" ? "自适应" : value;
}

export function toPanelOptions(values: readonly string[]): PanelOption[] {
	return values.map((value) => ({ value, label: formatOptionLabel(value) }));
}

export function normalizePanelOption(option: string | PanelOption): PanelOption {
	if (typeof option === "string") return { value: option, label: option };
	return option;
}

export function findPanelOptionLabel(
	options: readonly PanelOption[],
	value?: string | null,
	fallback = "未设置",
) {
	const normalized = value?.trim();
	if (!normalized) return fallback;
	return options.find((option) => option.value === normalized)?.label ?? normalized;
}

export function buildImageOptionsSummary(
	composer: ComposerPreset,
	capability: ImageModelCapability | null,
	referenceCount: number,
	thinkingDisabled: boolean,
) {
	const parts: string[] = [];
	if (capability?.versionLabel && composer.version) {
		parts.push(`${capability.versionLabel}:${composer.version}`);
	}
	if (composer.imageSize) parts.push(composer.imageSize);
	if (
		!(capability?.autoDisableAspectRatioWhenReference && referenceCount > 0) &&
		composer.aspectRatio
	) {
		parts.push(composer.aspectRatio);
	}
	if (composer.resolution) parts.push(composer.resolution);
	if (composer.quality && composer.quality !== "auto") {
		parts.push(`质量:${composer.quality}`);
	}
	if (composer.midjourneyAction) {
		parts.push(`功能:${getMidjourneyActionLabel(composer.midjourneyAction)}`);
	}
	if (composer.speedMode) parts.push(`速度:${composer.speedMode}`);
	if (composer.promptExtend === "true") parts.push("优化提示词");
	if (composer.enableSequential) parts.push("组图");
	if (composer.quantity) parts.push(`${composer.quantity}张`);
	if (composer.seed) parts.push(`Seed:${composer.seed}`);
	if (composer.outputFormat) parts.push(composer.outputFormat.toUpperCase());
	if (composer.thinkingMode && !thinkingDisabled) parts.push("思考");
	return (
		parts.slice(0, 4).join(" · ") ||
		[composer.aspectRatio, composer.resolution].filter(Boolean).join(" · ")
	);
}

export function buildImageThinkingModeOptions(
	thinkingDisabled: boolean,
): PanelOption[] {
	return DISABLE_ENABLE_OPTIONS.map((option) =>
		option.value === "true"
			? {
					...option,
					disabled: thinkingDisabled,
					description: thinkingDisabled ? "当前模式下不可用" : undefined,
				}
			: option,
	);
}
