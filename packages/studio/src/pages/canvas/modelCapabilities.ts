export type ModelSource = {
  label: string;
  url: string;
  note?: string;
};

export type VideoModelCapability = {
  maxReferenceImages: number;
  sources: ModelSource[];
};

const DEFAULT_VIDEO_MODEL_CAPABILITY: VideoModelCapability = {
  maxReferenceImages: 1,
  sources: [],
};

export const VIDEO_MODEL_CAPABILITIES: Record<string, VideoModelCapability> = {
  'Seedance 1.5 Pro': {
    maxReferenceImages: 1,
    sources: [
      {
        label: 'Seedance 1.5 Pro product page',
        url: 'https://seed.bytedance.com/en/seedance1_5_pro',
        note: 'Official product page documents text/audio-video generation but does not document multi-image reference input.',
      },
    ],
  },
  'Kling 2.1 Master': {
    maxReferenceImages: 1,
    sources: [
      {
        label: 'Kling VIDEO 3.0 user guide',
        url: 'https://app.klingai.com/cn/quickstart/klingai-video-3-model-user-guide',
        note: 'Kling 3.0 upgrade page states multi-image element reference is newly added in 3.0 and absent in 2.6, so 2.1 is treated as single-image by inference.',
      },
    ],
  },
  'Veo 3 Fast': {
    maxReferenceImages: 1,
    sources: [
      {
        label: 'Veo 3.1 Fast documentation',
        url: 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-fast-generate-preview',
        note: 'Google documents image-to-video support but not multiple image reference input.',
      },
      {
        label: 'Google AI forum clarification',
        url: 'https://discuss.ai.google.dev/t/is-there-a-way-to-generate-videos-with-multiple-images-using-the-veo3-api/105634',
        note: 'Google AI forum moderator states Veo 3 does not support multiple images.',
      },
    ],
  },
};

export function getVideoModelCapability(model: string): VideoModelCapability {
  return VIDEO_MODEL_CAPABILITIES[model] ?? DEFAULT_VIDEO_MODEL_CAPABILITY;
}
