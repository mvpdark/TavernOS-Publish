import { z } from "zod";
export declare const MusicGenProviderSchema: z.ZodEnum<["yunwu", "custom"]>;
export type MusicGenProvider = z.infer<typeof MusicGenProviderSchema>;
export declare const MusicGenConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["yunwu", "custom"]>>;
    model: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodDefault<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
    /** 是否生成纯音乐（无歌词） */
    instrumental: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    provider: "custom" | "yunwu";
    apiKey: string;
    model: string;
    instrumental: boolean;
}, {
    baseUrl?: string | undefined;
    provider?: "custom" | "yunwu" | undefined;
    apiKey?: string | undefined;
    model?: string | undefined;
    instrumental?: boolean | undefined;
}>;
export type MusicGenConfig = z.infer<typeof MusicGenConfigSchema>;
export declare const MusicGenRequestSchema: z.ZodEffects<z.ZodObject<{
    /** 自定义模式歌词/提示词（包含 [Verse]、[Chorus] 等结构标签）；与 descriptionPrompt 二选一 */
    prompt: z.ZodOptional<z.ZodString>;
    /** 歌词（兼容字段，将合并到 prompt 中） */
    lyrics: z.ZodOptional<z.ZodString>;
    /** 音乐风格标签（对应 API tags，逗号分隔，如 pop, rock, classical） */
    style: z.ZodOptional<z.ZodString>;
    /** 是否纯音乐 */
    instrumental: z.ZodOptional<z.ZodBoolean>;
    /** 标题 */
    title: z.ZodOptional<z.ZodString>;
    /** 灵感模式自然语言描述（对应 API gpt_description_prompt）；与 prompt 二选一 */
    descriptionPrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    prompt?: string | undefined;
    style?: string | undefined;
    instrumental?: boolean | undefined;
    lyrics?: string | undefined;
    descriptionPrompt?: string | undefined;
}, {
    title?: string | undefined;
    prompt?: string | undefined;
    style?: string | undefined;
    instrumental?: boolean | undefined;
    lyrics?: string | undefined;
    descriptionPrompt?: string | undefined;
}>, {
    title?: string | undefined;
    prompt?: string | undefined;
    style?: string | undefined;
    instrumental?: boolean | undefined;
    lyrics?: string | undefined;
    descriptionPrompt?: string | undefined;
}, {
    title?: string | undefined;
    prompt?: string | undefined;
    style?: string | undefined;
    instrumental?: boolean | undefined;
    lyrics?: string | undefined;
    descriptionPrompt?: string | undefined;
}>;
export type MusicGenRequest = z.infer<typeof MusicGenRequestSchema>;
export interface GeneratedMusic {
    /** 音频 URL */
    readonly audioUrl: string;
    /** 视频 URL（带画面的 MV） */
    readonly videoUrl?: string;
    /** 图片 URL（封面） */
    readonly imageUrl?: string;
    /** 标题 */
    readonly title?: string;
    /** 歌词文本（API 返回字段名为 lyric） */
    readonly lyrics?: string;
    /** 模型名称 */
    readonly model?: string;
    /** 歌曲 clip ID，用于续写 */
    readonly clipId?: string;
    /** 时长（秒） */
    readonly duration?: number;
}
export interface MusicGenResponse {
    readonly music: readonly GeneratedMusic[];
    /** 任务 ID */
    readonly taskId: string;
}
export interface MusicModelCard {
    readonly id: string;
    readonly name: string;
}
export interface MusicProviderConfig {
    readonly id: string;
    readonly name: string;
    readonly baseUrl: string;
    readonly models: ReadonlyArray<MusicModelCard>;
    readonly apiKeyOptional?: boolean;
}
export declare const MUSIC_PROVIDER_CONFIGS: ReadonlyArray<MusicProviderConfig>;
export declare class MusicProviderRegistry {
    private readonly table;
    constructor(configs: ReadonlyArray<MusicProviderConfig>);
    get(id: string): MusicProviderConfig | undefined;
    has(id: string): boolean;
    list(): MusicProviderConfig[];
    defaultModel(id: string): string | undefined;
}
export declare const musicProviderRegistry: MusicProviderRegistry;
//# sourceMappingURL=types.d.ts.map