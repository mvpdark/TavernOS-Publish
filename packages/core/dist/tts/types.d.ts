import { z } from "zod";
export declare const TTSProviderSchema: z.ZodEnum<["openai", "azure", "yunwu", "yunwu-kling", "yunwu-tongyi", "yunwu-minimax", "yunwu-vidu", "custom"]>;
export type TTSProvider = z.infer<typeof TTSProviderSchema>;
export declare const TTSVoiceSchema: z.ZodString;
export type TTSVoice = z.infer<typeof TTSVoiceSchema>;
export declare const TTSResponseFormatSchema: z.ZodEnum<["mp3", "opus", "aac", "flac", "wav", "pcm"]>;
export type TTSResponseFormat = z.infer<typeof TTSResponseFormatSchema>;
export declare const TTSConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["openai", "azure", "yunwu", "yunwu-kling", "yunwu-tongyi", "yunwu-minimax", "yunwu-vidu", "custom"]>>;
    model: z.ZodDefault<z.ZodString>;
    voice: z.ZodDefault<z.ZodString>;
    speed: z.ZodDefault<z.ZodNumber>;
    apiKey: z.ZodDefault<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
    responseFormat: z.ZodDefault<z.ZodEnum<["mp3", "opus", "aac", "flac", "wav", "pcm"]>>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    provider: "openai" | "custom" | "yunwu" | "azure" | "yunwu-kling" | "yunwu-tongyi" | "yunwu-minimax" | "yunwu-vidu";
    apiKey: string;
    model: string;
    speed: number;
    voice: string;
    responseFormat: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}, {
    baseUrl?: string | undefined;
    provider?: "openai" | "custom" | "yunwu" | "azure" | "yunwu-kling" | "yunwu-tongyi" | "yunwu-minimax" | "yunwu-vidu" | undefined;
    apiKey?: string | undefined;
    model?: string | undefined;
    speed?: number | undefined;
    voice?: string | undefined;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm" | undefined;
}>;
export type TTSConfig = z.infer<typeof TTSConfigSchema>;
export declare const TTSRequestSchema: z.ZodObject<{
    text: z.ZodString;
    voice: z.ZodOptional<z.ZodString>;
    speed: z.ZodOptional<z.ZodNumber>;
    responseFormat: z.ZodOptional<z.ZodEnum<["mp3", "opus", "aac", "flac", "wav", "pcm"]>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    speed?: number | undefined;
    voice?: string | undefined;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm" | undefined;
}, {
    text: string;
    speed?: number | undefined;
    voice?: string | undefined;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm" | undefined;
}>;
export type TTSRequest = z.infer<typeof TTSRequestSchema>;
export interface TTSResponse {
    /** Raw audio bytes. */
    readonly audio: Uint8Array;
    /** Audio format identifier (e.g. "mp3", "wav"). */
    readonly format: string;
    /** MIME content type (e.g. "audio/mpeg"). */
    readonly contentType: string;
}
export interface TTSVoiceCard {
    readonly id: string;
    readonly name: string;
}
export interface TTSModelCard {
    readonly id: string;
    readonly name: string;
}
export interface TTSProviderConfig {
    readonly id: string;
    readonly name: string;
    readonly baseUrl: string;
    readonly models: ReadonlyArray<TTSModelCard>;
    readonly voices: ReadonlyArray<TTSVoiceCard>;
    readonly apiKeyOptional?: boolean;
    /** API endpoint pattern. "openai" uses /audio/speech; others use vendor-specific paths. */
    readonly apiPattern?: "openai" | "kling" | "tongyi" | "minimax" | "vidu";
}
export declare const TTS_PROVIDER_CONFIGS: ReadonlyArray<TTSProviderConfig>;
export declare class TTSProviderRegistry {
    private readonly table;
    constructor(configs: ReadonlyArray<TTSProviderConfig>);
    get(id: string): TTSProviderConfig | undefined;
    has(id: string): boolean;
    list(): TTSProviderConfig[];
    /** First model id for a provider, or undefined when the provider has no models. */
    defaultModel(id: string): string | undefined;
    /** First voice id for a provider, or undefined when the provider has no voices. */
    defaultVoice(id: string): string | undefined;
}
export declare const ttsProviderRegistry: TTSProviderRegistry;
export declare const TTS_CONTENT_TYPES: Readonly<Record<string, string>>;
//# sourceMappingURL=types.d.ts.map