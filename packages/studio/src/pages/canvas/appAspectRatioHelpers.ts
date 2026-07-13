import {
	getImageAspectRatioOptions,
	resolveImageComposerPreset,
} from "./imageModelCapabilities";
import type { ComposerPreset, NodeType } from "./canvas-types";
import {
	getVideoModelCapability,
	resolveVideoComposerPreset,
} from "./videoModelCapabilities";
import { countReferenceAssets } from "./referenceAssetUtils";

export const IMAGE_ASPECT_RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16"];
export const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"];
export const GLOBAL_ASPECT_RATIO_OPTIONS = [
	"1:1",
	"16:9",
	"9:16",
	"4:3",
	"3:4",
	"2:3",
	"3:2",
	"4:5",
	"5:4",
	"21:9",
	"2.39:1",
] as const;
export const SHOT_FRAME_RATIO_OPTIONS = ["16:9", "9:16", "2.39:1", "1:1"] as const;

export function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function getGreatestCommonDivisor(a: number, b: number): number {
	let x = Math.abs(Math.round(a));
	let y = Math.abs(Math.round(b));
	while (y !== 0) {
		const next = x % y;
		x = y;
		y = next;
	}
	return x || 1;
}

export function getAspectRatioValue(width: number, height: number): number | null {
	if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) return null;
	return Number((width / height).toFixed(6));
}

export function getAspectRatioLabel(width: number, height: number): string {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "unknown";
	const divisor = getGreatestCommonDivisor(width, height);
	return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

export function applyAspectRatioToComposer(
	type: NodeType,
	composer: ComposerPreset,
	aspectRatio: string,
) {
	if (type === "shot") {
		if (!SHOT_FRAME_RATIO_OPTIONS.includes(aspectRatio as (typeof SHOT_FRAME_RATIO_OPTIONS)[number])) {
			return composer;
		}
		return composer.frameRatio === aspectRatio
			? composer
			: { ...composer, frameRatio: aspectRatio };
	}

	if (type === "image" || type === "editor") {
		const referenceCount = countReferenceAssets(composer.referenceAssets ?? []);
		const option = getImageAspectRatioOptions(composer.model, referenceCount).find(
			(item) => item.value === aspectRatio,
		);
		if (!option || option.disabled) return composer;
		if (composer.aspectRatio === aspectRatio) return composer;
		return {
			...composer,
			aspectRatio,
			...resolveImageComposerPreset(
				composer.model,
				{ ...composer, aspectRatio },
				referenceCount,
			),
		};
	}

	if (type === "video") {
		const capability = getVideoModelCapability(composer.model, composer);
		if (!capability.aspectRatios.includes(aspectRatio)) return composer;
		if (composer.aspectRatio === aspectRatio) return composer;
		return {
			...composer,
			aspectRatio,
			...resolveVideoComposerPreset(composer.model, {
				...composer,
				aspectRatio,
			}),
		};
	}

	return composer;
}
