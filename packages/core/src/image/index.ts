// Image generation module exports

export {
  ImageGenProviderSchema,
  ImageSizeSchema,
  ImageStyleSchema,
  ImageQualitySchema,
  ImageGenConfigSchema,
  ImageGenRequestSchema,
  type ImageGenProvider,
  type ImageSize,
  type ImageStyle,
  type ImageQuality,
  type ImageGenConfig,
  type ImageGenRequest,
  type GeneratedImage,
  type ImageGenResponse,
} from "./types.js";

export {
  IMAGE_PROVIDER_CONFIGS,
  ImageProviderRegistry,
  imageProviderRegistry,
  type ImageProviderConfig,
  type ImageModelCard,
} from "./types.js";

export { isImageStubEnabled, stubImageGeneration } from "./stub.js";

export { createImageGenClient, type ImageGenClient } from "./client.js";

// Midjourney async client (yunwu midjourney-proxy: submit + poll)
export {
  createMJClient,
  type MJConfig,
  type MJClient,
  type MJTask,
  type MJTaskStatus,
  type MJBotType,
  type MJSubmitOptions,
} from "./mj-client.js";
