import { z } from "zod";
export declare const ImageGenProviderSchema: z.ZodEnum<["dalle", "stable-diffusion", "comfyui", "yunwu", "agnes", "custom"]>;
export type ImageGenProvider = z.infer<typeof ImageGenProviderSchema>;
export declare const ImageSizeSchema: z.ZodEnum<["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]>;
export type ImageSize = z.infer<typeof ImageSizeSchema>;
export declare const ImageStyleSchema: z.ZodEnum<["vivid", "natural"]>;
export type ImageStyle = z.infer<typeof ImageStyleSchema>;
export declare const ImageQualitySchema: z.ZodEnum<["standard", "hd"]>;
export type ImageQuality = z.infer<typeof ImageQualitySchema>;
export declare const ImageGenConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["dalle", "stable-diffusion", "comfyui", "yunwu", "agnes", "custom"]>>;
    model: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodDefault<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
    size: z.ZodDefault<z.ZodEnum<["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]>>;
    style: z.ZodDefault<z.ZodEnum<["vivid", "natural"]>>;
    quality: z.ZodDefault<z.ZodEnum<["standard", "hd"]>>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    provider: "custom" | "yunwu" | "agnes" | "dalle" | "stable-diffusion" | "comfyui";
    apiKey: string;
    model: string;
    style: "vivid" | "natural";
    size: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
    quality: "standard" | "hd";
}, {
    baseUrl?: string | undefined;
    provider?: "custom" | "yunwu" | "agnes" | "dalle" | "stable-diffusion" | "comfyui" | undefined;
    apiKey?: string | undefined;
    model?: string | undefined;
    style?: "vivid" | "natural" | undefined;
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" | undefined;
    quality?: "standard" | "hd" | undefined;
}>;
export type ImageGenConfig = z.infer<typeof ImageGenConfigSchema>;
export declare const ImageGenRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    size: z.ZodOptional<z.ZodEnum<["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]>>;
    style: z.ZodOptional<z.ZodEnum<["vivid", "natural"]>>;
    quality: z.ZodOptional<z.ZodEnum<["standard", "hd"]>>;
    n: z.ZodDefault<z.ZodNumber>;
    /** Reference image URL for image editing (gpt-image-2 /images/edits endpoint). */
    referenceImageUrl: z.ZodOptional<z.ZodString>;
    /** Pre-downloaded reference image buffer (takes priority over referenceImageUrl).
     *  Used when the caller needs to authenticate the image download (e.g. WebDAV Basic Auth). */
    referenceImageBuffer: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    n: number;
    referenceImageUrl?: string | undefined;
    style?: "vivid" | "natural" | undefined;
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" | undefined;
    quality?: "standard" | "hd" | undefined;
    referenceImageBuffer?: any;
}, {
    prompt: string;
    referenceImageUrl?: string | undefined;
    style?: "vivid" | "natural" | undefined;
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" | undefined;
    quality?: "standard" | "hd" | undefined;
    n?: number | undefined;
    referenceImageBuffer?: any;
}>;
export type ImageGenRequest = z.infer<typeof ImageGenRequestSchema>;
export interface GeneratedImage {
    /** Remote URL or data URL (data:image/png;base64,...) when b64_json returned. */
    readonly url: string;
    /** The revised prompt returned by the model (DALL-E 3 rewrites prompts). */
    readonly revisedPrompt?: string;
    /** Raw base64 payload when the API returns b64_json. */
    readonly b64Json?: string;
}
export interface ImageGenResponse {
    readonly images: readonly GeneratedImage[];
    /** Unix timestamp (seconds) reported by the API. */
    readonly created: number;
}
export interface ImageModelCard {
    readonly id: string;
    readonly name: string;
}
export interface ImageProviderConfig {
    readonly id: string;
    readonly name: string;
    readonly baseUrl: string;
    readonly models: ReadonlyArray<ImageModelCard>;
    readonly apiKeyOptional?: boolean;
}
export declare const IMAGE_PROVIDER_CONFIGS: ReadonlyArray<ImageProviderConfig>;
export declare class ImageProviderRegistry {
    private readonly table;
    constructor(configs: ReadonlyArray<ImageProviderConfig>);
    get(id: string): ImageProviderConfig | undefined;
    has(id: string): boolean;
    list(): ImageProviderConfig[];
    /** First model id for a provider, or undefined when the provider has no models. */
    defaultModel(id: string): string | undefined;
}
export declare const imageProviderRegistry: ImageProviderRegistry;
//# sourceMappingURL=types.d.ts.map