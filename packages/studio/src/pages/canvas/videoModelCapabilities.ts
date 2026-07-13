import { getModelDisplayLabel } from './modelOptions';
import type { ComposerPreset } from './canvas-types';

export type VideoGenerationModeId =
  | 'text'
  | 'firstFrame'
  | 'firstLastFrame'
  | 'multiReference'
  | 'videoToVideo'
  | 'videoExtension';

export type VideoGenerationModeOption = {
  id: VideoGenerationModeId;
  label: string;
  maxReferenceImages: number;
};

export type VideoModelCapability = {
  model: string;
  modes: VideoGenerationModeOption[];
  tiers?: string[];
  qualities?: string[];
  versions?: string[];
  features?: string[];
  aspectRatios: string[];
  resolutions: string[];
  durations: string[];
  defaultMode: VideoGenerationModeId;
  defaultTier?: string;
  defaultQuality?: string;
  defaultVersion?: string;
  defaultFeature?: string;
  defaultAspectRatio: string;
  defaultResolution: string;
  defaultDuration: string;
  sourceLabel: string;
  sourceUrl: string;
  supportsSeed?: boolean;
  displayOnlyDuration?: string;
  inferred?: boolean;
};

const VIDEO_MODE_OPTIONS: Record<VideoGenerationModeId, VideoGenerationModeOption> = {
  text: { id: 'text', label: '文生视频', maxReferenceImages: 0 },
  firstFrame: { id: 'firstFrame', label: '图生视频', maxReferenceImages: 1 },
  firstLastFrame: { id: 'firstLastFrame', label: '首尾帧', maxReferenceImages: 2 },
  multiReference: { id: 'multiReference', label: '多参模式', maxReferenceImages: 4 },
  videoToVideo: { id: 'videoToVideo', label: '视频转视频', maxReferenceImages: 0 },
  videoExtension: { id: 'videoExtension', label: '视频延展', maxReferenceImages: 0 },
};

const DEFAULT_VIDEO_MODEL_CAPABILITY: VideoModelCapability = {
  model: 'Video',
  modes: [VIDEO_MODE_OPTIONS.firstFrame],
  aspectRatios: ['16:9'],
  resolutions: ['480P'],
  durations: ['5s'],
  defaultMode: 'firstFrame',
  defaultAspectRatio: '16:9',
  defaultResolution: '480P',
  defaultDuration: '5s',
  sourceLabel: 'Conservative fallback',
  sourceUrl: 'https://ai.google.dev/gemini-api/docs/video',
  inferred: true,
};

const GROK_IMAGINE_VIDEO_DURATIONS = Array.from({ length: 25 }, (_, index) => `${index + 6}s`);
const SEEDANCE_DURATION_OPTIONS = Array.from({ length: 12 }, (_, index) => `${index + 4}s`);

const SEEDANCE_COMMON_ASPECT_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];

function resolveSeedanceVersion(current?: Partial<ComposerPreset>) {
  const requestedVersion = (current?.videoVersion ?? current?.version ?? '2.0').trim();
  if (requestedVersion.startsWith('1.0')) return '1.0';
  if (requestedVersion.startsWith('1.5')) return '1.5';
  return '2.0';
}

function resolveSeedanceResolutions(version: string, current?: Partial<ComposerPreset>) {
  const quality = [current?.videoQuality, current?.videoTier]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const isFast = quality.includes('fast') || quality.includes('\u5feb');
  if (version === '1.0' && isFast) return ['720P', '1080P'];
  return ['720P'];
}

function buildSeedanceAggregateCapability(current?: Partial<ComposerPreset>): VideoModelCapability {
  const version = resolveSeedanceVersion(current);
  const resolutions = resolveSeedanceResolutions(version, current);

  if (version === '1.0') {
    return {
      model: 'Seedance',
      modes: [
        VIDEO_MODE_OPTIONS.text,
        VIDEO_MODE_OPTIONS.firstFrame,
        VIDEO_MODE_OPTIONS.firstLastFrame,
      ],
      qualities: ['\u6807\u51c6', 'Fast'],
      versions: ['1.0', '1.5', '2.0'],
      aspectRatios: SEEDANCE_COMMON_ASPECT_RATIOS,
      resolutions,
      durations: ['5s', '10s'],
      defaultMode: 'text',
      defaultQuality: '\u6807\u51c6',
      defaultVersion: '1.0',
      defaultAspectRatio: '16:9',
      defaultResolution: resolutions[0],
      defaultDuration: '5s',
      sourceLabel: 'jimeng-api README (Seedance 1.0 / v3.0 family)',
      sourceUrl: 'https://github.com/iptag/jimeng-api',
    };
  }

  if (version === '1.5') {
    return {
      model: 'Seedance',
      modes: [
        VIDEO_MODE_OPTIONS.text,
        VIDEO_MODE_OPTIONS.firstFrame,
        VIDEO_MODE_OPTIONS.firstLastFrame,
      ],
      qualities: ['\u6807\u51c6'],
      versions: ['1.0', '1.5', '2.0'],
      aspectRatios: SEEDANCE_COMMON_ASPECT_RATIOS,
      resolutions,
      durations: ['5s', '10s', '12s'],
      defaultMode: 'text',
      defaultQuality: '\u6807\u51c6',
      defaultVersion: '1.5',
      defaultAspectRatio: '16:9',
      defaultResolution: resolutions[0],
      defaultDuration: '5s',
      sourceLabel: 'jimeng-api README (Seedance 1.5 / v3.5 pro)',
      sourceUrl: 'https://github.com/iptag/jimeng-api',
    };
  }

  return {
    model: 'Seedance',
    modes: [
      VIDEO_MODE_OPTIONS.text,
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.firstLastFrame,
      VIDEO_MODE_OPTIONS.multiReference,
    ],
    qualities: ['\u6807\u51c6', 'Fast', 'VIP', 'Fast VIP'],
    versions: ['1.0', '1.5', '2.0'],
    aspectRatios: SEEDANCE_COMMON_ASPECT_RATIOS,
    resolutions,
    durations: SEEDANCE_DURATION_OPTIONS,
    defaultMode: 'text',
    defaultQuality: '\u6807\u51c6',
    defaultVersion: '2.0',
    defaultAspectRatio: '16:9',
    defaultResolution: resolutions[0],
    defaultDuration: '5s',
    sourceLabel: 'jimeng-api README (Seedance 2.0)',
    sourceUrl: 'https://github.com/iptag/jimeng-api',
  };
}

export const VIDEO_MODEL_CAPABILITIES: Record<string, VideoModelCapability> = {
  'Runway Gen4 ☁️': {
    model: 'Runway Gen4 ☁️',
    modes: [VIDEO_MODE_OPTIONS.text, VIDEO_MODE_OPTIONS.firstFrame],
    tiers: ['10秒', '5秒'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720P'],
    durations: ['10s', '5s'],
    defaultMode: 'text',
    defaultTier: '10秒',
    defaultAspectRatio: '16:9',
    defaultResolution: '720P',
    defaultDuration: '10s',
    sourceLabel: 'Yunwu model marketplace',
    sourceUrl: 'https://yunwu.ai',
  },
  'Wan 2.7 Video 💎': {
    model: 'Wan 2.7 Video 💎',
    modes: [VIDEO_MODE_OPTIONS.text],
    aspectRatios: [],
    resolutions: [],
    durations: ['10s'],
    defaultMode: 'text',
    defaultAspectRatio: '',
    defaultResolution: '',
    defaultDuration: '10s',
    displayOnlyDuration: '10s',
    sourceLabel: 'Local model config',
    sourceUrl: '',
  },
  'Grok Imagine Video 💎': {
    model: 'Grok Imagine Video 💎',
    modes: [VIDEO_MODE_OPTIONS.firstFrame],
    aspectRatios: ['2:3', '3:2', '1:1', '16:9', '9:16'],
    resolutions: ['480P', '720P'],
    durations: GROK_IMAGINE_VIDEO_DURATIONS,
    defaultMode: 'firstFrame',
    defaultAspectRatio: '16:9',
    defaultResolution: '480P',
    defaultDuration: '6s',
    sourceLabel: 'Local model config',
    sourceUrl: '',
  },
  'Grok Imagine Video ☁️': {
    model: 'Grok Imagine Video ☁️',
    modes: [VIDEO_MODE_OPTIONS.firstFrame],
    tiers: ['10秒', '标准'],
    aspectRatios: ['2:3', '3:2', '1:1'],
    resolutions: ['720P'],
    durations: ['10s'],
    defaultMode: 'firstFrame',
    defaultTier: '10秒',
    defaultAspectRatio: '3:2',
    defaultResolution: '720P',
    defaultDuration: '10s',
    displayOnlyDuration: '10s',
    sourceLabel: 'Yunwu Grok video docs',
    sourceUrl: 'E:/kaka-api/data/yunwu_calling_guide.json',
  },
  'Seedance 2.0': {
    model: 'Seedance 2.0',
    modes: [
      VIDEO_MODE_OPTIONS.multiReference,
      VIDEO_MODE_OPTIONS.firstLastFrame,
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.videoToVideo,
      VIDEO_MODE_OPTIONS.videoExtension,
    ],
    tiers: ['标准', 'Fast', 'VIP', 'Fast VIP'],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['480P', '720P'],
    durations: SEEDANCE_DURATION_OPTIONS,
    defaultMode: 'multiReference',
    defaultTier: '标准',
    defaultAspectRatio: '16:9',
    defaultResolution: '480P',
    defaultDuration: '5s',
    sourceLabel: 'BytePlus ModelArk Seedance 2.0',
    sourceUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1330310',
  },
  'Seedance 2.0 🎥': {
    model: 'Seedance 2.0 🎥',
    modes: [
      VIDEO_MODE_OPTIONS.multiReference,
      VIDEO_MODE_OPTIONS.firstLastFrame,
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.videoToVideo,
      VIDEO_MODE_OPTIONS.videoExtension,
    ],
    tiers: ['标准', 'Fast', 'VIP', 'Fast VIP'],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['480P', '720P'],
    durations: SEEDANCE_DURATION_OPTIONS,
    defaultMode: 'multiReference',
    defaultTier: '标准',
    defaultAspectRatio: '16:9',
    defaultResolution: '480P',
    defaultDuration: '5s',
    sourceLabel: 'BytePlus ModelArk Seedance 2.0',
    sourceUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1330310',
  },
  'Seedance 1.5 Pro': {
    model: 'Seedance 1.5 Pro',
    modes: [
      VIDEO_MODE_OPTIONS.firstLastFrame,
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.text,
    ],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['480P', '720P', '1080P'],
    durations: SEEDANCE_DURATION_OPTIONS,
    defaultMode: 'firstLastFrame',
    defaultAspectRatio: '16:9',
    defaultResolution: '480P',
    defaultDuration: '5s',
    sourceLabel: 'BytePlus ModelArk Seedance 1.5 Pro',
    sourceUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1544106',
  },
  'Seedance 1.5 Pro 🎥': {
    model: 'Seedance 1.5 Pro 🎥',
    modes: [
      VIDEO_MODE_OPTIONS.firstLastFrame,
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.text,
    ],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['480P', '720P', '1080P'],
    durations: SEEDANCE_DURATION_OPTIONS,
    defaultMode: 'firstLastFrame',
    defaultAspectRatio: '16:9',
    defaultResolution: '480P',
    defaultDuration: '5s',
    sourceLabel: 'BytePlus ModelArk Seedance 1.5 Pro',
    sourceUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1544106',
  },
  'Kling 2.1 Master': {
    model: 'Kling 2.1 Master',
    modes: [
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.text,
    ],
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['1080P'],
    durations: ['5s', '10s'],
    defaultMode: 'firstFrame',
    defaultAspectRatio: '16:9',
    defaultResolution: '1080P',
    defaultDuration: '5s',
    sourceLabel: 'Conservative Kling 2.1 baseline',
    sourceUrl: 'https://kling.ai/quickstart/klingai-video-3-omni-model-user-guide',
    inferred: true,
  },
  'Kling 3.0 💎': {
    model: 'Kling 3.0 💎',
    modes: [
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.text,
    ],
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['1080P'],
    durations: ['5s', '10s'],
    defaultMode: 'firstFrame',
    defaultAspectRatio: '16:9',
    defaultResolution: '1080P',
    defaultDuration: '5s',
    sourceLabel: 'Conservative Kling baseline',
    sourceUrl: 'https://kling.ai/quickstart/klingai-video-3-omni-model-user-guide',
    inferred: true,
  },
  'Veo 3 Fast': {
    model: 'Veo 3 Fast',
    modes: [
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.text,
    ],
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720P', '1080P'],
    durations: ['8s'],
    defaultMode: 'firstFrame',
    defaultAspectRatio: '16:9',
    defaultResolution: '720P',
    defaultDuration: '8s',
    sourceLabel: 'Google Gemini API Veo 3 Fast',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/video',
  },
  'VEO 3.1 ☁️': {
    model: 'VEO 3.1 ☁️',
    modes: [
      VIDEO_MODE_OPTIONS.text,
      VIDEO_MODE_OPTIONS.firstFrame,
      VIDEO_MODE_OPTIONS.firstLastFrame,
    ],
    qualities: ['轻量', '标准', '快速', '高级'],
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['1K', '4K'],
    durations: ['4s', '6s', '8s'],
    defaultMode: 'text',
    defaultQuality: '标准',
    defaultAspectRatio: '16:9',
    defaultResolution: '1K',
    defaultDuration: '8s',
    sourceLabel: 'Yunwu VEO 3.1 unified route',
    sourceUrl: 'https://api3.wlai.vip/pricing',
  },
  'MiniMax Hailuo 2.3 ☁️': {
    model: 'MiniMax Hailuo 2.3 ☁️',
    modes: [VIDEO_MODE_OPTIONS.text, VIDEO_MODE_OPTIONS.firstFrame],
    qualities: ['标准', '快速'],
    // MiniMax 官方视频接口没有独立 aspect_ratio 字段；图生视频时输出比例跟随首帧图。
    // 这里开放官方图片比例限制 2:5 ~ 5:2 内的常用比例，前端会按所选比例规范化首帧。
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21', '5:2', '2:5'],
    resolutions: ['768P', '1080P'],
    durations: ['6s', '10s'],
    defaultMode: 'text',
    defaultQuality: '标准',
    defaultAspectRatio: '16:9',
    defaultResolution: '768P',
    defaultDuration: '6s',
    sourceLabel: 'MiniMax video generation docs',
    sourceUrl: 'https://platform.minimaxi.com/docs/api-reference/video-generation-t2v',
  },
  'Wan 2.2': {
    model: 'Wan 2.2',
    modes: [VIDEO_MODE_OPTIONS.text, VIDEO_MODE_OPTIONS.firstFrame],
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720P'],
    durations: ['5s'],
    defaultMode: 'text',
    defaultAspectRatio: '16:9',
    defaultResolution: '720P',
    defaultDuration: '5s',
    displayOnlyDuration: '5s',
    supportsSeed: true,
    sourceLabel: 'SiliconFlow video docs',
    sourceUrl: 'https://docs.siliconflow.cn/cn/userguide/capabilities/video',
  },
  'Wan 2.2 🌊': {
    model: 'Wan 2.2 🌊',
    modes: [VIDEO_MODE_OPTIONS.text, VIDEO_MODE_OPTIONS.firstFrame],
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['720P'],
    durations: ['5s'],
    defaultMode: 'text',
    defaultAspectRatio: '16:9',
    defaultResolution: '720P',
    defaultDuration: '5s',
    displayOnlyDuration: '5s',
    supportsSeed: true,
    sourceLabel: 'SiliconFlow video docs',
    sourceUrl: 'https://docs.siliconflow.cn/cn/userguide/capabilities/video',
  },
};

export function getVideoModelCapability(model: string, current?: Partial<ComposerPreset>) {
  const displayLabel = getModelDisplayLabel(model).trim();
  if (displayLabel.toUpperCase() === 'VEO 3.1') {
    return VIDEO_MODEL_CAPABILITIES['VEO 3.1 ☁️'];
  }
  if (displayLabel === 'MiniMax Hailuo 2.3') {
    return VIDEO_MODEL_CAPABILITIES['MiniMax Hailuo 2.3 ☁️'];
  }
  if (displayLabel === 'Wan 2.2') {
    return VIDEO_MODEL_CAPABILITIES['Wan 2.2 🌊'];
  }
  if (displayLabel === 'Seedance') {
    return buildSeedanceAggregateCapability(current);
  }
  const capability = VIDEO_MODEL_CAPABILITIES[model] ?? VIDEO_MODEL_CAPABILITIES[displayLabel];
  if (!capability) return DEFAULT_VIDEO_MODEL_CAPABILITY;
  return capability;
}

export function getVideoModeOption(model: string, modeId?: string, current?: Partial<ComposerPreset>) {
  const capability = getVideoModelCapability(model, current);
  return capability.modes.find((mode) => mode.id === modeId) ?? capability.modes[0];
}

export function supportsVideoMode(model: string, modeId: VideoGenerationModeId, current?: Partial<ComposerPreset>) {
  return getVideoModelCapability(model, current).modes.some((mode) => mode.id === modeId);
}

export function recommendVideoGenerationMode(model: string, referenceImageCount: number, current?: Partial<ComposerPreset>) {
  const capability = getVideoModelCapability(model, current);
  const supportedModeIds = new Set(capability.modes.map((mode) => mode.id));

  if (referenceImageCount >= 3 && supportedModeIds.has('multiReference')) {
    return 'multiReference';
  }
  if (referenceImageCount >= 2) {
    if (supportedModeIds.has('firstLastFrame')) return 'firstLastFrame';
    if (supportedModeIds.has('multiReference')) return 'multiReference';
    if (supportedModeIds.has('firstFrame')) return 'firstFrame';
  }
  if (referenceImageCount === 1) {
    if (supportedModeIds.has('firstFrame')) return 'firstFrame';
    if (supportedModeIds.has('firstLastFrame')) return 'firstLastFrame';
    if (supportedModeIds.has('multiReference')) return 'multiReference';
  }
  if (referenceImageCount === 0 && supportedModeIds.has('text')) {
    return 'text';
  }

  return capability.defaultMode;
}

export function getAutoVideoModel(model: string, referenceImageCount: number) {
  const label = getModelDisplayLabel(model).trim();
  if (label !== 'VEO 3.1') return model;
  if (referenceImageCount >= 3) return supportsVideoMode(model, 'multiReference') ? model : 'VEO 3.1 ☁️';
  if (referenceImageCount === 2) {
    return supportsVideoMode(model, 'firstLastFrame') ? model : 'VEO 3.1 ☁️';
  }
  if (referenceImageCount === 1) {
    return supportsVideoMode(model, 'firstFrame') ? model : 'VEO 3.1 ☁️';
  }
  return model;
}

export function getAutoVideoMode(model: string, referenceImageCount: number, current?: Partial<ComposerPreset>) {
  if (referenceImageCount >= 3) return supportsVideoMode(model, 'multiReference', current) ? 'multiReference' : recommendVideoGenerationMode(model, referenceImageCount, current);
  if (referenceImageCount === 2) {
    if (supportsVideoMode(model, 'firstLastFrame', current)) return 'firstLastFrame';
    return recommendVideoGenerationMode(model, referenceImageCount, current);
  }
  if (referenceImageCount === 1) return supportsVideoMode(model, 'firstFrame', current) ? 'firstFrame' : recommendVideoGenerationMode(model, referenceImageCount, current);
  return supportsVideoMode(model, 'text', current) ? 'text' : getVideoModelCapability(model, current).defaultMode;
}

export function resolveVideoComposerPreset(
  model: string,
  current?: Partial<ComposerPreset>,
): Pick<ComposerPreset, 'videoGenerationMode' | 'videoTier' | 'videoQuality' | 'videoVersion' | 'videoFeature' | 'aspectRatio' | 'resolution' | 'duration' | 'seed'> {
  const capability = getVideoModelCapability(model, current);
  const mode = capability.modes.some((item) => item.id === current?.videoGenerationMode)
    ? current?.videoGenerationMode as VideoGenerationModeId
    : capability.defaultMode;
  const videoTier = capability.tiers?.includes(current?.videoTier ?? '')
    ? current?.videoTier
    : capability.defaultTier;
  const videoQuality = capability.qualities?.includes(current?.videoQuality ?? '')
    ? current?.videoQuality
    : capability.qualities?.includes(current?.videoTier ?? '')
      ? current?.videoTier
      : capability.defaultQuality;
  const videoVersion = capability.versions?.includes(current?.videoVersion ?? '')
    ? current?.videoVersion
    : capability.defaultVersion;
  const videoFeature = capability.features?.includes(current?.videoFeature ?? '')
    ? current?.videoFeature
    : capability.defaultFeature;
  const aspectRatio = capability.aspectRatios.includes(current?.aspectRatio ?? '')
    ? current?.aspectRatio
    : capability.defaultAspectRatio;
  const resolution = capability.resolutions.includes(current?.resolution ?? '')
    ? current?.resolution
    : capability.defaultResolution;
  const duration = capability.durations.includes(current?.duration ?? '')
    ? current?.duration
    : capability.defaultDuration;

  return {
    videoGenerationMode: mode,
    videoTier,
    videoQuality,
    videoVersion,
    videoFeature,
    aspectRatio,
    resolution,
    duration,
    seed: capability.supportsSeed ? current?.seed : undefined,
  };
}

export function formatVideoMeta(composer: Pick<ComposerPreset, 'videoGenerationMode' | 'videoTier' | 'videoQuality' | 'videoVersion' | 'videoFeature' | 'aspectRatio' | 'resolution' | 'duration'>, model: string) {
  const capability = getVideoModelCapability(model, composer);
  const mode = getVideoModeOption(model, composer.videoGenerationMode, composer);
  return [mode.label, composer.videoTier, composer.videoQuality, composer.videoVersion, composer.videoFeature, composer.aspectRatio ?? capability.defaultAspectRatio, composer.resolution ?? capability.defaultResolution, composer.duration ?? capability.displayOnlyDuration ?? capability.defaultDuration]
    .filter(Boolean)
    .join(' · ');
}
