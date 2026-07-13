import { getModelDisplayLabel } from "./modelOptions";
import type { AssetRef, ComposerPreset } from "./canvas-types";

export type VideoExtensionModelInfo = {
	resolvedModel: string;
	resolvedModelLabel: string;
	source: string;
	fallbackCandidates: string[];
};

function normalizeVideoModelLabel(model: string) {
	return getModelDisplayLabel(model)
		.trim()
		.replace(/[☁️💎🤖🌊🎴]/gu, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

export function getVideoModelCredits(model: string) {
	const normalizedLabel = normalizeVideoModelLabel(model);
	if (normalizedLabel === "veo 3.1" || normalizedLabel === "veo3.1(yunwu)") return "60";
	if (normalizedLabel === "grok imagine video" || normalizedLabel.startsWith("grok video")) return "32";
	if (normalizedLabel === "wan 2.2" || normalizedLabel.includes("wan2.2")) return "10";
	if (normalizedLabel === "seedance 2.0") return "24";
	if (normalizedLabel === "seedance 1.5 pro") return "112";
	if (normalizedLabel === "veo 3 fast") return "18";
	if (normalizedLabel === "kling 2.1 master" || normalizedLabel === "kling 3.0") return "32";
	return "10";
}

export function isWan22ModelChoice(...values: Array<string | undefined>) {
	return values
		.filter((value): value is string => Boolean(value))
		.map((value) => `${value} ${normalizeVideoModelLabel(value)}`.toLowerCase())
		.some((value) => value.includes("wan2.2") || value.includes("wan 2.2"));
}

export function isWan22VideoSource(
	composer: ComposerPreset | undefined,
	asset?: AssetRef,
	fallbackComposer?: ComposerPreset,
) {
	return isWan22ModelChoice(
		asset?.providerModel,
		asset?.provider,
		fallbackComposer?.model,
		composer?.model,
	);
}

export function getWan22ImageSize(aspectRatio?: string) {
	if (aspectRatio === "9:16") return "720x1280";
	if (aspectRatio === "1:1") return "960x960";
	if (typeof aspectRatio === "string") {
		const match = aspectRatio.match(/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
		if (match) {
			const width = Number(match[1]);
			const height = Number(match[2]);
			if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
				const ratio = width / height;
				if (Math.abs(ratio - 1) <= 0.05) return "960x960";
				if (ratio < 1) return "720x1280";
			}
		}
	}
	return "1280x720";
}

export function resolveVideoExtensionRequestModel(
	composer: ComposerPreset | undefined,
	asset?: AssetRef,
	fallbackComposer?: ComposerPreset,
) {
	const requestedModel = fallbackComposer?.model ?? composer?.model ?? "";
	if (isWan22ModelChoice(requestedModel)) return "Wan-AI/Wan2.2-I2V-A14B(siliconflow)";
	if (requestedModel) return requestedModel;
	if (isWan22ModelChoice(asset?.providerModel, asset?.provider)) return "Wan-AI/Wan2.2-I2V-A14B(siliconflow)";
	return asset?.providerModel ?? "";
}

function getVideoExtensionModelSource(
	composer: ComposerPreset | undefined,
	asset?: AssetRef,
	fallbackComposer?: ComposerPreset,
) {
	if (fallbackComposer?.model) return `当前视频生成器：${getModelDisplayLabel(fallbackComposer.model)}`;
	if (composer?.model) return `当前视频节点模型：${getModelDisplayLabel(composer.model)}`;
	if (isWan22ModelChoice(asset?.providerModel, asset?.provider)) {
		return "检测到 Wan 2.2 痕迹（provider/model），已选择 Wan2.2-I2V（siliconflow）";
	}
	if (asset?.providerModel) return `素材保留模型：${getModelDisplayLabel(asset.providerModel)}`;
	return "未匹配到可用模型配置";
}

export function resolveVideoExtensionModelInfo(
	composer: ComposerPreset | undefined,
	asset?: AssetRef,
	fallbackComposer?: ComposerPreset,
): VideoExtensionModelInfo | null {
	const candidateModels = [
		fallbackComposer?.model,
		composer?.model,
		asset?.providerModel,
	]
		.filter((value): value is string => Boolean(value))
		.map((value) => value.trim())
		.filter(Boolean);
	const resolvedModel = resolveVideoExtensionRequestModel(composer, asset, fallbackComposer);
	if (!resolvedModel) return null;
	return {
		resolvedModel,
		resolvedModelLabel: getModelDisplayLabel(resolvedModel),
		source: getVideoExtensionModelSource(composer, asset, fallbackComposer),
		fallbackCandidates: Array.from(
			new Set(
				candidateModels
					.map((candidateModel) => getModelDisplayLabel(candidateModel))
					.filter(Boolean),
			),
		),
	};
}

export function withVideoExtensionModelInfo(
	current: Record<string, VideoExtensionModelInfo>,
	nodeId: string,
	extensionModelInfo: VideoExtensionModelInfo,
) {
	return {
		...current,
		[nodeId]: extensionModelInfo,
	};
}
