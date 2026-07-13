import { getModelDisplayLabel } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";

function normalizeVideoChoiceText(...values: Array<string | undefined>) {
	return values
		.filter((value): value is string => Boolean(value?.trim()))
		.map((value) => value.trim().toLowerCase())
		.join(" ");
}

export function isFastVideoChoice(...values: Array<string | undefined>) {
	const text = normalizeVideoChoiceText(...values);
	return text.includes("fast") || text.includes("快速");
}

function isVipVideoChoice(...values: Array<string | undefined>) {
	const text = normalizeVideoChoiceText(...values);
	return text.includes("vip");
}

function isFiveSecondVideoChoice(...values: Array<string | undefined>) {
	const text = normalizeVideoChoiceText(...values);
	return text.includes("5秒") || text.includes("5s");
}

export function isMiniMaxHailuo23Request(model: string, composer: ComposerPreset) {
	return [model, composer.model]
		.map((value) => getModelDisplayLabel(value).trim())
		.some((label) => label === "MiniMax Hailuo 2.3" || label === "Minimax Hailuo 2.3");
}

export function resolveMiniMaxHailuo23Model(composer: ComposerPreset) {
	return isFastVideoChoice(composer.videoQuality, composer.videoTier)
		? "minimax-hailuo-2.3-fast(yunwu)"
		: "minimax-hailuo-2.3(yunwu)";
}

export function resolveMiniMaxHailuo23Duration(composer: ComposerPreset) {
	const requested = Number.parseInt(composer.duration ?? "6", 10);
	if ((composer.resolution ?? "").toUpperCase() === "1080P") return 6;
	return requested === 10 ? 10 : 6;
}

export function isSiliconFlowWan22Request(model: string, composer: ComposerPreset) {
	return [model, composer.model]
		.map((value) => getModelDisplayLabel(value).trim())
		.some((label) => label === "Wan 2.2");
}

export function resolveSiliconFlowWan22Model(hasImage: boolean) {
	return hasImage
		? "Wan-AI/Wan2.2-I2V-A14B(siliconflow)"
		: "Wan-AI/Wan2.2-T2V-A14B(siliconflow)";
}

export function resolveSiliconFlowWan22ImageSize(aspectRatio?: string, resolution?: string) {
	if (resolution === "1280x720" || resolution === "720x1280" || resolution === "960x960") {
		return resolution;
	}
	if (aspectRatio === "9:16") return "720x1280";
	if (aspectRatio === "1:1") return "960x960";
	return "1280x720";
}

export function isRunwayGen4Request(model: string, composer: ComposerPreset) {
	return [model, composer.model]
		.map((value) => getModelDisplayLabel(value).trim())
		.some((label) => label === "Runway Gen4");
}

export function resolveRunwayGen4Model(composer: ComposerPreset) {
	return isFiveSecondVideoChoice(composer.duration, composer.videoTier)
		? "runwayml-gen4_turbo-5(yunwu)"
		: "runwayml-gen4_turbo-10(yunwu)";
}

export function isSeedanceRequest(model: string, composer: ComposerPreset) {
	return [model, composer.model, getModelDisplayLabel(model), getModelDisplayLabel(composer.model)]
		.map((value) => value.trim().toLowerCase())
		.some((label) => label === "seedance" || label.startsWith("seedance ") || label.includes("seedance"));
}

export function resolveSeedanceModel(composer: ComposerPreset) {
	const version = (composer.videoVersion || composer.version || "2.0").trim();
	const isVip = isVipVideoChoice(composer.videoQuality, composer.videoTier);
	const isFast = isFastVideoChoice(composer.videoQuality, composer.videoTier);
	if (version.startsWith("1.0")) {
		return isFast ? "jimeng-video-3.0-fast(jimeng)" : "jimeng-video-3.0-pro(jimeng)";
	}
	if (version.startsWith("1.5")) {
		return "jimeng-video-3.5-pro(jimeng)";
	}
	if (isVip && isFast) {
		return "jimeng-video-seedance-2.0-fast-vip(jimeng)";
	}
	if (isVip) {
		return "jimeng-video-seedance-2.0-vip(jimeng)";
	}
	return isFast ? "jimeng-video-seedance-2.0-fast(jimeng)" : "jimeng-video-seedance-2.0(jimeng)";
}
