// Music generation module: types, Zod schemas, and music provider registry.
//
// Supports Suno music generation through yunwu.ai proxy API.
// Default provider: yunwu (suno)
import { z } from "zod";
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const MusicGenProviderSchema = z.enum(["yunwu", "custom"]);
// ---------------------------------------------------------------------------
// Music generation config (provider + model + credentials)
// ---------------------------------------------------------------------------
export const MusicGenConfigSchema = z.object({
    provider: MusicGenProviderSchema.default("yunwu"),
    model: z.string().default("chirp-v4"),
    apiKey: z.string().default(""),
    baseUrl: z.string().default("https://yunwu.ai"),
    /** 是否生成纯音乐（无歌词） */
    instrumental: z.boolean().default(false),
});
// ---------------------------------------------------------------------------
// Music generation request (per-call overrides)
// ---------------------------------------------------------------------------
export const MusicGenRequestSchema = z.object({
    /** 自定义模式歌词/提示词（包含 [Verse]、[Chorus] 等结构标签）；与 descriptionPrompt 二选一 */
    prompt: z.string().optional(),
    /** 歌词（兼容字段，将合并到 prompt 中） */
    lyrics: z.string().optional(),
    /** 音乐风格标签（对应 API tags，逗号分隔，如 pop, rock, classical） */
    style: z.string().optional(),
    /** 是否纯音乐 */
    instrumental: z.boolean().optional(),
    /** 标题 */
    title: z.string().optional(),
    /** 灵感模式自然语言描述（对应 API gpt_description_prompt）；与 prompt 二选一 */
    descriptionPrompt: z.string().optional(),
}).refine((data) => data.prompt || data.descriptionPrompt || data.lyrics, { message: "prompt, lyrics, 或 descriptionPrompt 至少需要提供一个" });
export const MUSIC_PROVIDER_CONFIGS = [
    {
        id: "yunwu",
        name: "云雾 (Yunwu) — Suno",
        baseUrl: "https://yunwu.ai",
        models: [
            { id: "chirp-v3-0", name: "Suno V3.0" },
            { id: "chirp-v3-5", name: "Suno V3.5" },
            { id: "chirp-v4", name: "Suno V4" },
            { id: "chirp-auk", name: "Suno V4.5 (Auk)" },
            { id: "chirp-v5", name: "Suno V5" },
            { id: "chirp-fenix", name: "Suno V5.5 (Fenix)" },
        ],
    },
    {
        id: "custom",
        name: "自定义 (Custom)",
        baseUrl: "",
        apiKeyOptional: true,
        models: [],
    },
];
// ---------------------------------------------------------------------------
// MusicProviderRegistry
// ---------------------------------------------------------------------------
export class MusicProviderRegistry {
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
    defaultModel(id) {
        return this.table.get(id)?.models[0]?.id;
    }
}
export const musicProviderRegistry = new MusicProviderRegistry(MUSIC_PROVIDER_CONFIGS);
//# sourceMappingURL=types.js.map