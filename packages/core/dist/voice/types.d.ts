import { z } from "zod";
export declare const VoiceDesignRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    preview_text: z.ZodDefault<z.ZodString>;
    voice_id: z.ZodString;
    aigc_watermark: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    voice_id: string;
    preview_text: string;
    aigc_watermark: boolean;
}, {
    prompt: string;
    voice_id: string;
    preview_text?: string | undefined;
    aigc_watermark?: boolean | undefined;
}>;
export type VoiceDesignRequest = z.infer<typeof VoiceDesignRequestSchema>;
export declare const VoiceCloneRequestSchema: z.ZodObject<{
    file_id: z.ZodNumber;
    voice_id: z.ZodString;
    clone_prompt: z.ZodOptional<z.ZodObject<{
        prompt_audio: z.ZodNumber;
        prompt_text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        prompt_audio: number;
        prompt_text: string;
    }, {
        prompt_audio: number;
        prompt_text: string;
    }>>;
    text: z.ZodOptional<z.ZodString>;
    model: z.ZodDefault<z.ZodString>;
    language_boost: z.ZodDefault<z.ZodString>;
    need_noise_reduction: z.ZodDefault<z.ZodBoolean>;
    need_volume_normalization: z.ZodDefault<z.ZodBoolean>;
    aigc_watermark: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    model: string;
    voice_id: string;
    aigc_watermark: boolean;
    file_id: number;
    language_boost: string;
    need_noise_reduction: boolean;
    need_volume_normalization: boolean;
    text?: string | undefined;
    clone_prompt?: {
        prompt_audio: number;
        prompt_text: string;
    } | undefined;
}, {
    voice_id: string;
    file_id: number;
    model?: string | undefined;
    text?: string | undefined;
    aigc_watermark?: boolean | undefined;
    clone_prompt?: {
        prompt_audio: number;
        prompt_text: string;
    } | undefined;
    language_boost?: string | undefined;
    need_noise_reduction?: boolean | undefined;
    need_volume_normalization?: boolean | undefined;
}>;
export type VoiceCloneRequest = z.infer<typeof VoiceCloneRequestSchema>;
export declare const KlingCustomVoiceRequestSchema: z.ZodObject<{
    voice_name: z.ZodString;
    voice_url: z.ZodOptional<z.ZodString>;
    video_id: z.ZodOptional<z.ZodString>;
    callback_url: z.ZodOptional<z.ZodString>;
    external_task_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    voice_name: string;
    voice_url?: string | undefined;
    video_id?: string | undefined;
    callback_url?: string | undefined;
    external_task_id?: string | undefined;
}, {
    voice_name: string;
    voice_url?: string | undefined;
    video_id?: string | undefined;
    callback_url?: string | undefined;
    external_task_id?: string | undefined;
}>;
export type KlingCustomVoiceRequest = z.infer<typeof KlingCustomVoiceRequestSchema>;
export declare const VoiceInfoSchema: z.ZodObject<{
    voice_id: z.ZodString;
    voice_name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    provider: z.ZodEnum<["minimax", "kling"]>;
}, "strip", z.ZodTypeAny, {
    provider: "kling" | "minimax";
    voice_id: string;
    status?: string | undefined;
    voice_name?: string | undefined;
}, {
    provider: "kling" | "minimax";
    voice_id: string;
    status?: string | undefined;
    voice_name?: string | undefined;
}>;
export type VoiceInfo = z.infer<typeof VoiceInfoSchema>;
export declare const CustomVoiceSchema: z.ZodObject<{
    /** The voice_id returned by the design/clone API (user-defined). */
    voiceId: z.ZodString;
    /** Human-readable label shown in the UI dropdown. */
    name: z.ZodString;
    /** Which TTS provider this voice belongs to. */
    provider: z.ZodEnum<["minimax", "kling"]>;
    /** How the voice was created. */
    source: z.ZodEnum<["design", "clone"]>;
    /** Design prompt or clone description for reference. */
    prompt: z.ZodDefault<z.ZodString>;
    /** ISO timestamp of creation. */
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    name: string;
    provider: "kling" | "minimax";
    voiceId: string;
    source: "design" | "clone";
    prompt: string;
}, {
    name: string;
    provider: "kling" | "minimax";
    voiceId: string;
    source: "design" | "clone";
    createdAt?: string | undefined;
    prompt?: string | undefined;
}>;
export type CustomVoice = z.infer<typeof CustomVoiceSchema>;
//# sourceMappingURL=types.d.ts.map