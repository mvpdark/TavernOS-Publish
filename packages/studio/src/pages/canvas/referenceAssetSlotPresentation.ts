import type { VideoGenerationModeId } from "./videoModelCapabilities";
import type { ReferenceAsset, ReferenceAssetSlotInputList } from "./canvas-types";
import {
	countReferenceAssets,
} from "./referenceAssetUtils";

export {
	countReferenceAssets,
	getFilledReferenceAssets,
	isReferenceAssetSlotFilled,
} from "./referenceAssetUtils";

export const REFERENCE_IMAGE_SLOT_PREFIX = "参考图";
export const REFERENCE_AUDIO_SLOT_PREFIX = "音频";
export const VIDEO_FIRST_FRAME_LABEL = "首帧";
export const VIDEO_LAST_FRAME_LABEL = "尾帧";

export function getReferenceAssetSlotKey(
	label: string,
	index: number,
	asset: ReferenceAssetSlotInputList[number],
) {
	const assetKey = asset ? (asset.id ?? asset.url ?? asset.name) : "empty";
	return `${label}-${index}-${assetKey}`;
}

export function formatReferenceAssetSlotTitle(
	titlePrefix: string,
	asset: ReferenceAsset,
) {
	return `${titlePrefix}: ${asset.name}`;
}

export function buildImageReferenceSlotLabels(
	referenceCount: number,
	maxReferenceImages: number,
	canAddReferenceAsset: boolean,
) {
	if (maxReferenceImages <= 0) return [];
	const slotCount = getVisibleReferenceAssetSlotCount({
		referenceCount,
		minSlotCount: 1,
		maxSlotCount: maxReferenceImages,
		canAddReferenceAsset,
	});
	return Array.from(
		{ length: slotCount },
		(_, index) => `${REFERENCE_IMAGE_SLOT_PREFIX} ${index + 1}`,
	);
}

export function getVisibleReferenceAssetSlotCount({
	referenceCount,
	minSlotCount,
	maxSlotCount,
	canAddReferenceAsset,
}: {
	referenceCount: number;
	minSlotCount: number;
	maxSlotCount?: number;
	canAddReferenceAsset: boolean;
}) {
	const nextSlotCount = Math.max(
		minSlotCount,
		referenceCount + (canAddReferenceAsset ? 1 : 0),
	);
	return typeof maxSlotCount === "number"
		? Math.min(maxSlotCount, nextSlotCount)
		: nextSlotCount;
}

export function buildImageReferenceSlotState(
	referenceAssets: ReferenceAssetSlotInputList,
	maxReferenceImages: number,
	canAddReferenceAsset: boolean,
) {
	const referenceCount = countReferenceAssets(referenceAssets);
	return {
		referenceCount,
		labels: buildImageReferenceSlotLabels(
			referenceCount,
			maxReferenceImages,
			canAddReferenceAsset,
		),
	};
}

export function buildVideoReferenceSlotLabels(
	mode: VideoGenerationModeId,
	slotCount: number,
	minSlotCount: number,
) {
	const normalizedSlotCount = Math.max(slotCount, minSlotCount);
	const buildReferenceLabels = (count: number, startIndex = 1) =>
		Array.from(
			{ length: count },
			(_, index) => `${REFERENCE_IMAGE_SLOT_PREFIX}${index + startIndex}`,
		);

	if (mode === "firstLastFrame") {
		return [
			VIDEO_FIRST_FRAME_LABEL,
			VIDEO_LAST_FRAME_LABEL,
			...buildReferenceLabels(Math.max(0, normalizedSlotCount - 2), 3),
		];
	}

	if (mode === "firstFrame") {
		return [
			VIDEO_FIRST_FRAME_LABEL,
			...buildReferenceLabels(Math.max(0, normalizedSlotCount - 1), 2),
		];
	}

	if (mode === "multiReference") {
		return buildReferenceLabels(Math.max(2, normalizedSlotCount));
	}

	return buildReferenceLabels(Math.max(1, normalizedSlotCount));
}

export function buildVideoReferenceSlotState(
	mode: VideoGenerationModeId,
	referenceAssets: ReferenceAssetSlotInputList,
	maxReferenceImages: number,
	canAddReferenceAsset: boolean,
) {
	const referenceCount = countReferenceAssets(referenceAssets);
	const slotCount = getVisibleReferenceAssetSlotCount({
		referenceCount,
		minSlotCount: maxReferenceImages,
		canAddReferenceAsset,
	});
	return {
		referenceCount,
		slotCount,
		labels: buildVideoReferenceSlotLabels(mode, slotCount, maxReferenceImages),
	};
}
