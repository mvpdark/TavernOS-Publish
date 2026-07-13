export type NodeType = 'text' | 'shot' | 'character' | 'scene' | 'image' | 'video' | 'audio' | 'music' | 'editor';
export type AppView = 'landing' | 'canvas-browser' | 'canvas' | 'workshop-browser' | 'workshop' | 'settings';
export type ThemeTone = 'emerald' | 'indigo' | 'black' | 'cycle';
export type OpenDropdown = null | 'model' | 'textOptions' | 'imageOptions' | 'videoOptions' | 'audioMusicOptions' | 'musicStyleOptions';

export type StyleSource = 'auto' | 'manual';

export type NodeStyleRef = {
  categoryId: string;
  presetId: string;
  docId: string;
  source: StyleSource;
  updatedAt: number;
};

export type StyleCategory = {
  id: string;
  name: string;
  description: string;
  cover: string;
};

export type StylePreset = {
  id: string;
  categoryId: string;
  name: string;
  summary: string;
  cover: string;
  docId: string;
};

export type StyleDocument = {
  id: string;
  categoryId: string;
  presetId: string;
  title: string;
  body: string;
  updatedAt: number;
};

export type StyleLibraryState = {
  categories: StyleCategory[];
  presets: StylePreset[];
  documents: StyleDocument[];
};

export type AssetRef = {
  name: string;
  url: string;
  mime: string;
  cloudPath?: string;
  storageUrl?: string;
  storageKey?: string;
  provider?: string;
  providerModel?: string;
  providerTaskId?: string;
  providerTaskIndex?: number;
  providerTaskStatus?: string;
  providerTaskMessage?: string;
  providerMetadata?: unknown;
};

export type ReferenceAsset = Omit<AssetRef, 'mime'> & {
  id?: string;
  mime?: string;
};

export type ReferenceAssetSlot = ReferenceAsset | null;
export type ReferenceAssetSlotList = ReferenceAssetSlot[];
export type ReferenceAssetSlotInput<T extends ReferenceAsset = ReferenceAsset> =
  | T
  | null
  | undefined
  | false;
export type ReferenceAssetSlotInputList<
  T extends ReferenceAsset = ReferenceAsset,
> = readonly ReferenceAssetSlotInput<T>[];

export type CanvasNode = {
	id: string;
	type: NodeType;
	x: number;
	y: number;
	width: number;
	height: number;
	title: string;
	composer?: ComposerPreset;
	asset?: AssetRef;
	style?: NodeStyleRef;
};

export type ComposerPreset = {
  model: string;
  variants: string;
  credits: string;
  placeholder: string;
  meta: string[];
  prompt: string;
  textMode?: string;
  version?: string;
  shotSize?: string;
  cameraAngle?: string;
  frameRatio?: string;
  imageSize?: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  quality?: string;
  midjourneyAction?: string;
  speedMode?: string;
  background?: string;
  watermark?: string;
  promptExtend?: string;
  quantity?: string;
  seed?: string;
  width?: string;
  height?: string;
  imageInferenceSteps?: string;
  imageGuidanceScale?: string;
  enableSequential?: boolean;
  thinkingMode?: boolean;
  audioTier?: string;
  audioVoiceMode?: 'tts' | 'clone' | 'design';
  audioVoiceName?: string;
  audioVoiceId?: string;
  audioVoiceStyle?: string;
  musicAction?: string;
  musicVersion?: string;
  musicOutputFormat?: string;
  musicLyrics?: string;
  musicSampleRate?: string;
  musicBitrate?: string;
  musicAudioFormat?: string;
  musicInstrumental?: string;
  musicLyricsOptimizer?: string;
  musicWatermark?: string;
  musicStyleCategory?: string;
  musicStylePreset?: string;
  riffusionPromptB?: string;
  riffusionAlpha?: string;
  riffusionDenoising?: string;
  riffusionSeedImageId?: string;
  riffusionInferenceSteps?: string;
  riffusionVersion?: string;
  videoTier?: string;
  videoQuality?: string;
  videoVersion?: string;
  videoFeature?: string;
  videoGenerationMode?: string;
  duration?: string;
  referenceAssets?: ReferenceAssetSlotList;
};

export type ThemeOption = {
  id: ThemeTone;
  name: string;
  desc: string;
  swatch: string;
};
