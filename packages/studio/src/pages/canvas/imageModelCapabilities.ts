import { getModelDisplayLabel, getSelectedModelPlatformEmoji } from "./modelOptions";
import { MIDJOURNEY_ACTION_OPTIONS, getMidjourneyActionLabel } from "./midjourneyActions";
import type { ComposerPreset } from "./canvas-types";

export type ImageSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
};

export type ImageModelCapability = {
  model: string;
  maxReferenceImages: number;
  versionLabel?: string;
  versions?: string[];
  versionReferenceLimits?: Record<string, number>;
  aspectRatios?: string[];
  resolutions?: string[];
  versionResolutions?: Record<string, string[]>;
  outputFormats?: string[];
  qualityOptions?: string[];
  midjourneyActionOptions?: string[];
  speedModeOptions?: string[];
  backgroundOptions?: string[];
  watermarkOptions?: string[];
  promptExtendOptions?: string[];
  sizePresets?: Array<{ value: string; label: string }>;
  allowsCustomDimensions?: boolean;
  quantityRange?: {
    min: number;
    defaultValue: number;
    defaultMax: number;
    sequentialMax?: number;
  };
  supportsEnableSequential?: boolean;
  supportsSeed?: boolean;
  supportsInferenceSteps?: boolean;
  supportsGuidanceScale?: boolean;
  defaultInferenceSteps?: string;
  defaultGuidanceScale?: string;
  supportsThinkingMode?: boolean;
  autoDisableAspectRatioWhenReference?: boolean;
  autoDisableThinkingWhenReference?: boolean;
  autoDisableThinkingWhenSequential?: boolean;
  disable4kWhenReference?: boolean;
};

const DEFAULT_IMAGE_MODEL_CAPABILITY: ImageModelCapability = {
  model: "Image",
  maxReferenceImages: 0,
  aspectRatios: ["1:1", "3:4", "4:3", "16:9", "9:16"],
  resolutions: ["1K", "2K", "4K"],
};

const IMAGE_MODEL_CAPABILITIES: Record<string, ImageModelCapability> = {
  "Wan 2.7 Image 💎": {
    model: "Wan 2.7 Image 💎",
    maxReferenceImages: 1,
    versionLabel: "版本",
    versions: ["标准", "Pro"],
    aspectRatios: ["1:1", "16:9", "4:3", "21:9", "3:4", "9:16", "8:1", "1:8"],
    resolutions: ["1K", "2K", "4K"],
    quantityRange: {
      min: 1,
      defaultValue: 4,
      defaultMax: 4,
      sequentialMax: 12,
    },
    supportsEnableSequential: true,
    supportsThinkingMode: true,
    autoDisableAspectRatioWhenReference: true,
    autoDisableThinkingWhenReference: true,
    autoDisableThinkingWhenSequential: true,
    disable4kWhenReference: true,
  },
  "Kolors 🌊": {
    model: "Kolors 🌊",
    maxReferenceImages: 1,
    sizePresets: [
      { value: "1024x1024", label: "1024x1024 · 1:1" },
      { value: "960x1280", label: "960x1280 · 3:4" },
      { value: "768x1024", label: "768x1024 · 3:4" },
      { value: "720x1440", label: "720x1440 · 1:2" },
      { value: "720x1280", label: "720x1280 · 9:16" },
    ],
    quantityRange: {
      min: 1,
      defaultValue: 1,
      defaultMax: 4,
    },
    supportsSeed: true,
    supportsInferenceSteps: true,
    supportsGuidanceScale: true,
    defaultInferenceSteps: "20",
    defaultGuidanceScale: "7.5",
  },
  "Nano Banana ☁️": {
    model: "Nano Banana ☁️",
    maxReferenceImages: 14,
    versionLabel: "模式",
    versions: ["标准", "高级"],
    versionReferenceLimits: {
      "标准": 14,
      "高级": 14,
    },
    aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "auto"],
    resolutions: ["0.5K", "1K", "2K", "4K"],
    versionResolutions: {
      "高级": ["1K", "2K", "4K"],
    },
    outputFormats: ["png", "jpg"],
  },
  "GPT Image ☁️": {
    model: "GPT Image ☁️",
    maxReferenceImages: 4,
    versionLabel: "模式",
    versions: ["标准", "高级"],
    aspectRatios: ["auto", "1:1", "3:2", "2:3", "16:9", "9:16"],
    resolutions: ["auto", "1K", "1.5K", "2K", "4K"],
    qualityOptions: ["auto", "low", "medium", "high"],
    outputFormats: ["png", "jpeg", "webp"],
    backgroundOptions: ["auto", "opaque", "transparent"],
    quantityRange: {
      min: 1,
      defaultValue: 1,
      defaultMax: 4,
    },
  },
  "Z Image Turbo ☁️": {
    model: "Z Image Turbo ☁️",
    maxReferenceImages: 0,
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    resolutions: ["720P", "1080P"],
    watermarkOptions: ["false", "true"],
    promptExtendOptions: ["true", "false"],
    quantityRange: {
      min: 1,
      defaultValue: 1,
      defaultMax: 1,
    },
  },
  "Ideogram 3.0 ☁️": {
    model: "Ideogram 3.0 ☁️",
    maxReferenceImages: 0,
    versionLabel: "速度",
    versions: ["极速", "标准", "质量"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "1:3", "3:1"],
    resolutions: ["1024x1024", "1024x1792", "1792x1024", "1344x768", "768x1344"],
    quantityRange: {
      min: 1,
      defaultValue: 1,
      defaultMax: 4,
    },
  },
  "Ideogram ☁️": {
    model: "Ideogram ☁️",
    maxReferenceImages: 1,
    versionLabel: "模式",
    versions: ["局部", "混合", "重构", "更换背景", "放大", "反推"],
    versionReferenceLimits: {
      局部: 1,
      混合: 1,
      重构: 1,
      更换背景: 1,
      放大: 1,
      反推: 1,
    },
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
    resolutions: ["1024x1024", "1024x1792", "1792x1024", "1344x768", "768x1344"],
  },
  "Midjourney ☁️": {
    model: "Midjourney ☁️",
    maxReferenceImages: 5,
    midjourneyActionOptions: MIDJOURNEY_ACTION_OPTIONS
      .filter((option) => option.value !== "describe")
      .map((option) => option.value),
    versionLabel: "版本",
    versions: ["V7"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
    speedModeOptions: ["Fast", "Turbo", "Relax"],
  },
  "Midjourney 混图 ☁️": {
    model: "Midjourney 混图 ☁️",
    maxReferenceImages: 5,
    versionLabel: "功能",
    versions: ["混图"],
    aspectRatios: ["1:1", "3:2", "2:3"],
  },
  "Midjourney 反推 ☁️": {
    model: "Midjourney 反推 ☁️",
    maxReferenceImages: 1,
    versionLabel: "功能",
    versions: ["反推"],
  },
  "Nano Banana 2 💎": {
    model: "Nano Banana 2 💎",
    maxReferenceImages: 14,
    aspectRatios: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9", "auto"],
    resolutions: ["1K", "2K", "4K"],
    outputFormats: ["jpg", "png"],
  },
  "Nano Banana Pro 💎": {
    model: "Nano Banana Pro 💎",
    maxReferenceImages: 8,
    aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "auto"],
    resolutions: ["1K", "2K", "4K"],
    outputFormats: ["png", "jpg"],
  },
};

function getImageCapabilityKey(model: string) {
  const displayLabel = getModelDisplayLabel(model).trim();
  const platformEmoji = getSelectedModelPlatformEmoji(model).trim();
  return platformEmoji ? `${displayLabel} ${platformEmoji}` : displayLabel;
}

function getAutoOptionLabel(value: string) {
  return value.toLowerCase() === "auto" ? "自动" : value;
}

function getOutputFormatLabel(value: string) {
  return value.toLowerCase() === "auto" ? "自动" : value.toUpperCase();
}

function getSpeedModeLabel(value: string) {
  const labels: Record<string, string> = {
    Fast: "快速",
    Turbo: "极速",
    Relax: "慢速",
  };
  return labels[value] ?? getAutoOptionLabel(value);
}

function getImageResolutionValues(
  capability: ImageModelCapability,
  current?: Partial<ComposerPreset>,
) {
  const currentVersion = current?.version;
  if (currentVersion && capability.versionResolutions?.[currentVersion]) {
    return capability.versionResolutions[currentVersion];
  }
  return capability.resolutions ?? [];
}

function resolveQuantityOptions(capability: ImageModelCapability, composer: ComposerPreset) {
	const quantityRange = capability.quantityRange;
	if (!quantityRange) return [];
	const max = composer.enableSequential
		? quantityRange.sequentialMax ?? quantityRange.defaultMax
		: quantityRange.defaultMax;
	return Array.from({ length: max - quantityRange.min + 1 }, (_, index) => {
		const value = String(quantityRange.min + index);
		return { value, label: value };
	});
}

export function getImageModelCapability(model: string) {
  if (getModelDisplayLabel(model).trim() === "Nano Banana") {
    return IMAGE_MODEL_CAPABILITIES["Nano Banana ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Nano Banana 2") {
    return IMAGE_MODEL_CAPABILITIES["Nano Banana 2 💎"];
  }
  if (getModelDisplayLabel(model).trim() === "Nano Banana Pro") {
    return IMAGE_MODEL_CAPABILITIES["Nano Banana Pro 💎"];
  }
  if (getModelDisplayLabel(model).trim() === "GPT Image") {
    return IMAGE_MODEL_CAPABILITIES["GPT Image ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "GPT Image 1.5" || getModelDisplayLabel(model).trim() === "GPT Image 2") {
    return IMAGE_MODEL_CAPABILITIES["GPT Image ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Z Image Turbo") {
    return IMAGE_MODEL_CAPABILITIES["Z Image Turbo ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Ideogram 3.0") {
    return IMAGE_MODEL_CAPABILITIES["Ideogram 3.0 ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Ideogram") {
    return IMAGE_MODEL_CAPABILITIES["Ideogram ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Midjourney") {
    return IMAGE_MODEL_CAPABILITIES["Midjourney ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Midjourney 混图") {
    return IMAGE_MODEL_CAPABILITIES["Midjourney 混图 ☁️"];
  }
  if (getModelDisplayLabel(model).trim() === "Midjourney 反推") {
    return IMAGE_MODEL_CAPABILITIES["Midjourney 反推 ☁️"];
  }
  return IMAGE_MODEL_CAPABILITIES[getImageCapabilityKey(model)] ?? DEFAULT_IMAGE_MODEL_CAPABILITY;
}

export function getImageReferenceLimit(model: string, current?: Partial<ComposerPreset>) {
  const capability = getImageModelCapability(model);
  const currentVersion = current?.version;
  if (currentVersion && typeof capability.versionReferenceLimits?.[currentVersion] === "number") {
    return capability.versionReferenceLimits[currentVersion];
  }
  return capability.maxReferenceImages;
}

export function resolveImageComposerPreset(
  model: string,
  current?: Partial<ComposerPreset>,
  referenceCount = 0,
): Pick<
  ComposerPreset,
  | "version"
  | "imageSize"
  | "aspectRatio"
  | "resolution"
  | "outputFormat"
  | "quality"
  | "midjourneyAction"
  | "speedMode"
  | "background"
  | "watermark"
  | "promptExtend"
  | "quantity"
  | "seed"
  | "width"
  | "height"
  | "imageInferenceSteps"
  | "imageGuidanceScale"
  | "enableSequential"
  | "thinkingMode"
> {
  const capability = getImageModelCapability(model);
  const nextEnableSequential = Boolean(current?.enableSequential);
  const nextVersion = capability.versions?.includes(current?.version ?? "")
    ? current?.version
    : capability.versions?.[0];
  const nextImageSize = capability.sizePresets?.some((option) => option.value === current?.imageSize)
    ? current?.imageSize
    : capability.sizePresets?.[0]?.value;
  const aspectRatioDisabled = capability.autoDisableAspectRatioWhenReference && referenceCount > 0;
  const nextAspectRatio = aspectRatioDisabled
    ? undefined
    : capability.aspectRatios?.includes(current?.aspectRatio ?? "")
      ? current?.aspectRatio
      : capability.aspectRatios?.[0];
  const resolutionValues = getImageResolutionValues(capability, {
    ...current,
    version: nextVersion,
  });
  const nextResolution = resolutionValues.includes(current?.resolution ?? "")
    ? current?.resolution
    : resolutionValues[0];
  const nextOutputFormat = capability.outputFormats?.includes(current?.outputFormat ?? "")
    ? current?.outputFormat
    : capability.outputFormats?.[0];
  const nextQuality = capability.qualityOptions?.includes(current?.quality ?? "")
    ? current?.quality
    : capability.qualityOptions?.[0];
  const nextMidjourneyAction = capability.midjourneyActionOptions?.includes(current?.midjourneyAction ?? "")
    ? current?.midjourneyAction
    : capability.midjourneyActionOptions?.[0];
  const nextSpeedMode = capability.speedModeOptions?.includes(current?.speedMode ?? "")
    ? current?.speedMode
    : capability.speedModeOptions?.[0];
  const nextBackground = capability.backgroundOptions?.includes(current?.background ?? "")
    ? current?.background
    : capability.backgroundOptions?.[0];
  const nextWatermark = capability.watermarkOptions?.includes(current?.watermark ?? "")
    ? current?.watermark
    : capability.watermarkOptions?.[0];
  const nextPromptExtend = capability.promptExtendOptions?.includes(current?.promptExtend ?? "")
    ? current?.promptExtend
    : capability.promptExtendOptions?.[0];
  const quantityOptions = resolveQuantityOptions(capability, {
    ...current,
    enableSequential: nextEnableSequential,
  } as ComposerPreset);
  const nextQuantity = quantityOptions.some((option) => option.value === current?.quantity)
    ? current?.quantity
    : quantityOptions[0]?.value;
  const thinkingDisabled =
    (capability.autoDisableThinkingWhenReference && referenceCount > 0) ||
    (capability.autoDisableThinkingWhenSequential && nextEnableSequential);

  return {
    version: nextVersion,
    imageSize: nextImageSize,
    aspectRatio: nextAspectRatio,
    resolution:
      capability.disable4kWhenReference && referenceCount > 0 && nextResolution === "4K"
        ? resolutionValues.find((value) => value !== "4K")
        : nextResolution,
    outputFormat: nextOutputFormat,
    quality: nextQuality,
    midjourneyAction: nextMidjourneyAction,
    speedMode: nextSpeedMode,
    background: nextBackground,
    watermark: nextWatermark,
    promptExtend: nextPromptExtend,
    quantity: nextQuantity,
    seed: current?.seed,
    width: current?.width,
    height: current?.height,
    imageInferenceSteps: capability.supportsInferenceSteps
      ? current?.imageInferenceSteps || capability.defaultInferenceSteps
      : undefined,
    imageGuidanceScale: capability.supportsGuidanceScale
      ? current?.imageGuidanceScale || capability.defaultGuidanceScale
      : undefined,
    enableSequential: capability.supportsEnableSequential ? nextEnableSequential : undefined,
    thinkingMode:
      capability.supportsThinkingMode && !thinkingDisabled
        ? Boolean(current?.thinkingMode)
        : false,
  };
}

export function getImageAspectRatioOptions(model: string, referenceCount: number): ImageSelectOption[] {
  const capability = getImageModelCapability(model);
  return (capability.aspectRatios ?? []).map((value) => ({
    value,
    label: getAutoOptionLabel(value),
    disabled: Boolean(capability.autoDisableAspectRatioWhenReference && referenceCount > 0),
  }));
}

export function getImageResolutionOptions(
  model: string,
  referenceCount: number,
  current?: Partial<ComposerPreset>,
): ImageSelectOption[] {
  const capability = getImageModelCapability(model);
  return getImageResolutionValues(capability, current).map((value) => ({
    value,
    label: getAutoOptionLabel(value),
    disabled: Boolean(capability.disable4kWhenReference && referenceCount > 0 && value === "4K"),
    description:
      capability.disable4kWhenReference && referenceCount > 0 && value === "4K"
        ? "4K 更适合文生图场景"
        : undefined,
  }));
}

export function getImageQuantityOptions(model: string, composer: ComposerPreset): ImageSelectOption[] {
  return resolveQuantityOptions(getImageModelCapability(model), composer).map((option) => ({
    ...option,
    value: option.value,
    label: option.label,
  }));
}

export function getImageQualityOptions(model: string): ImageSelectOption[] {
  const qualityLabels: Record<string, string> = {
    auto: "自动",
    low: "低",
    medium: "中",
    high: "高",
  };
  return (getImageModelCapability(model).qualityOptions ?? []).map((value) => ({
    value,
    label: qualityLabels[value] ?? value,
  }));
}

export function getImageSpeedModeOptions(model: string): ImageSelectOption[] {
  return (getImageModelCapability(model).speedModeOptions ?? []).map((value) => ({
    value,
    label: getSpeedModeLabel(value),
  }));
}

export function getImageMidjourneyActionOptions(model: string): ImageSelectOption[] {
  return (getImageModelCapability(model).midjourneyActionOptions ?? []).map((value) => ({
    value,
    label: getMidjourneyActionLabel(value),
  }));
}

export function getImageOutputFormatOptions(model: string): ImageSelectOption[] {
  return (getImageModelCapability(model).outputFormats ?? []).map((value) => ({
    value,
    label: getOutputFormatLabel(value),
  }));
}

export function getImageBackgroundOptions(model: string): ImageSelectOption[] {
  return (getImageModelCapability(model).backgroundOptions ?? []).map((value) => ({
    value,
    label: getAutoOptionLabel(value),
  }));
}

export function getImageWatermarkOptions(model: string): ImageSelectOption[] {
  return (getImageModelCapability(model).watermarkOptions ?? []).map((value) => ({
    value,
    label: value === "true" ? "开启" : "关闭",
  }));
}

export function getImagePromptExtendOptions(model: string): ImageSelectOption[] {
  return (getImageModelCapability(model).promptExtendOptions ?? []).map((value) => ({
    value,
    label: value === "true" ? "开启" : "关闭",
  }));
}

export function isImageThinkingDisabled(model: string, composer: ComposerPreset, referenceCount: number) {
  const capability = getImageModelCapability(model);
  return Boolean(
    (capability.autoDisableThinkingWhenReference && referenceCount > 0) ||
      (capability.autoDisableThinkingWhenSequential && composer.enableSequential),
  );
}
