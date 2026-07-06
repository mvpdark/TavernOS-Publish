// Image generation module: types, Zod schemas, and image provider registry.
//
// Supports the OpenAI DALL-E image generation API format
// (POST /v1/images/generations) plus configurable base URLs so that
// Stable Diffusion / ComfyUI compatible endpoints can be used.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const ImageGenProviderSchema = z.enum([
    "dalle",
    "stable-diffusion",
    "comfyui",
    "yunwu",
    "agnes",
    "custom",
]);
export const ImageSizeSchema = z.enum([
    "256x256",
    "512x512",
    "1024x1024",
    "1792x1024",
    "1024x1792",
]);
export const ImageStyleSchema = z.enum(["vivid", "natural"]);
export const ImageQualitySchema = z.enum(["standard", "hd"]);
// ---------------------------------------------------------------------------
// Image generation config (provider + model + credentials)
// ---------------------------------------------------------------------------
export const ImageGenConfigSchema = z.object({
    provider: ImageGenProviderSchema.default("dalle"),
    model: z.string().default("dall-e-3"),
    apiKey: z.string().default(""),
    baseUrl: z.string().default("https://api.openai.com/v1"),
    size: ImageSizeSchema.default("1024x1024"),
    style: ImageStyleSchema.default("vivid"),
    quality: ImageQualitySchema.default("standard"),
});
// ---------------------------------------------------------------------------
// Image generation request (per-call overrides)
// ---------------------------------------------------------------------------
export const ImageGenRequestSchema = z.object({
    prompt: z.string().min(1),
    size: ImageSizeSchema.optional(),
    style: ImageStyleSchema.optional(),
    quality: ImageQualitySchema.optional(),
    n: z.number().int().min(1).max(10).default(1),
    /** Reference image URL for image editing (gpt-image-2 /images/edits endpoint). */
    referenceImageUrl: z.string().optional(),
    /** Pre-downloaded reference image buffer (takes priority over referenceImageUrl).
     *  Used when the caller needs to authenticate the image download (e.g. WebDAV Basic Auth). */
    referenceImageBuffer: z.any().optional(),
});
export const IMAGE_PROVIDER_CONFIGS = [
    {
        id: "dalle",
        name: "OpenAI DALL-E",
        baseUrl: "https://api.openai.com/v1",
        models: [
            { id: "dall-e-3", name: "DALL-E 3" },
            { id: "dall-e-2", name: "DALL-E 2" },
        ],
    },
    {
        id: "stable-diffusion",
        name: "Stable Diffusion",
        baseUrl: "https://api.stability.ai/v1",
        models: [
            { id: "stable-image-core", name: "Stable Image Core" },
            { id: "stable-image-ultra", name: "Stable Image Ultra" },
        ],
    },
    {
        id: "comfyui",
        name: "ComfyUI (Local)",
        baseUrl: "http://localhost:8188",
        apiKeyOptional: true,
        models: [],
    },
    {
        id: "yunwu",
        name: "云雾 (Yunwu)",
        baseUrl: "https://yunwu.ai/v1",
        models: [
            { id: "gpt-image-2", name: "GPT Image 2" },
            { id: "gpt-image-2-c", name: "GPT Image 2C" },
            { id: "gpt-image-1.5", name: "GPT Image 1.5" },
            { id: "gpt-image-1", name: "GPT Image 1" },
            { id: "gpt-image-1-mini", name: "GPT Image 1 Mini" },
            { id: "dall-e-3", name: "DALL-E 3" },
            { id: "doubao-seedream-5-0-260128", name: "豆包 Seedream 5.0" },
            { id: "doubao-seedream-4-5-251128", name: "豆包 Seedream 4.5" },
            { id: "doubao-seedream-4-0-250828", name: "豆包 Seedream 4.0" },
            { id: "doubao-seedream-3-0-t2i-250415", name: "豆包 Seedream 3.0" },
            { id: "flux-2-pro", name: "FLUX 2 Pro" },
            { id: "flux-1.1-pro", name: "FLUX 1.1 Pro" },
            { id: "flux.1-kontext-pro", name: "FLUX Kontext Pro" },
            { id: "gemini-3-pro-image", name: "Gemini 3 Pro Image" },
            { id: "gemini-3.1-flash-image", name: "Gemini 3.1 Flash Image" },
            { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image" },
            { id: "grok-imagine-image-pro", name: "Grok Imagine Pro" },
            { id: "grok-imagine-image", name: "Grok Imagine" },
            { id: "kling-image", name: "Kling Image" },
            { id: "kling-omni-image", name: "Kling Omni Image" },
            { id: "qwen-image-max", name: "Qwen Image Max" },
            { id: "qwen-image-2.0-2026-03-03", name: "Qwen Image 2.0" },
            { id: "z-image-turbo", name: "Z-Image Turbo" },
            { id: "wan2.7-image-pro", name: "Wan 2.7 Image Pro" },
        ],
    },
    {
        id: "agnes",
        name: "Agnes AI",
        baseUrl: "https://apihub.agnes-ai.com/v1",
        models: [
            { id: "agnes-image-2.1-flash", name: "Agnes Image 2.1 Flash" },
            { id: "agnes-image-2.0-flash", name: "Agnes Image 2.0 Flash" },
        ],
    },
];
// ---------------------------------------------------------------------------
// ImageProviderRegistry — Map-backed lookup (mirrors ProviderRegistry)
// ---------------------------------------------------------------------------
export class ImageProviderRegistry {
    table;
    constructor(configs) {
        const map = new Map();
        for (const cfg of configs) {
            map.set(cfg.id, cfg);
        }
        this.table = map;
    }
    get(id) {
        return this.table.get(id);
    }
    has(id) {
        return this.table.has(id);
    }
    list() {
        return Array.from(this.table.values());
    }
    /** First model id for a provider, or undefined when the provider has no models. */
    defaultModel(id) {
        return this.table.get(id)?.models[0]?.id;
    }
}
export const imageProviderRegistry = new ImageProviderRegistry(IMAGE_PROVIDER_CONFIGS);
//# sourceMappingURL=types.js.map