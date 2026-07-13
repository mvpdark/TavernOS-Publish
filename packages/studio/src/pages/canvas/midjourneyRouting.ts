import { getUniqueReferenceAssetUrlsFromReadyAssets, type ReferenceAssetWithUrl } from "./referenceAssetUtils";
import { getModelDisplayLabel } from "./modelOptions";
import { getMidjourneyActionOption, normalizeMidjourneyAction } from "./midjourneyActions";
import type { ComposerPreset } from "./canvas-types";

function isMidjourneyDisplayModel(value: string) {
	return getModelDisplayLabel(value).trim().startsWith("Midjourney");
}

function resolveMidjourneyAction(displayLabel: string, composer: ComposerPreset) {
	const explicitAction = normalizeMidjourneyAction(composer.midjourneyAction);
	if (explicitAction !== "imagine" || displayLabel === "Midjourney") {
		return explicitAction;
	}
	if (displayLabel === "Midjourney 混图") return "blend";
	if (displayLabel === "Midjourney 反推") return "describe";
	return "imagine";
}

export function resolveMidjourneyImageRequest({
	model,
	composer,
	referenceAssets,
}: {
	model: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAssetWithUrl[];
}) {
	if (!isMidjourneyDisplayModel(model) && !isMidjourneyDisplayModel(composer.model)) {
		return null;
	}
	const modelDisplayLabel = getModelDisplayLabel(model).trim();
	const composerDisplayLabel = getModelDisplayLabel(composer.model).trim();
	const displayLabel = modelDisplayLabel.startsWith("Midjourney") ? modelDisplayLabel : composerDisplayLabel;
	const referenceImages = getUniqueReferenceAssetUrlsFromReadyAssets(referenceAssets);
	const action = resolveMidjourneyAction(displayLabel, composer);
	const actionOption = getMidjourneyActionOption(action);
	return {
		model: actionOption.model,
		options: {
			midjourney_route: true,
			midjourney_action: action,
			version: "V7",
			speed_mode: composer.speedMode || "Fast",
			aspect_ratio: composer.aspectRatio,
			botType: "MID_JOURNEY",
			reference_images: referenceImages,
			base64Array: referenceImages,
		},
	};
}
