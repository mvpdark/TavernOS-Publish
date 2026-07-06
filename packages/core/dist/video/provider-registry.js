// Video provider registry.
//
// Defines built-in provider configurations (Seedance / Jimeng / Custom) and
// a Map-backed lookup class. Mirrors the image module's ImageProviderRegistry
// pattern so that video clients can resolve base URLs and model lists at
// runtime without hard-coding endpoints.
// ---------------------------------------------------------------------------
// Built-in provider configurations
// ---------------------------------------------------------------------------
export const VIDEO_PROVIDER_CONFIGS = [
    {
        id: "seedance",
        name: "Seedance (Volcano Engine)",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        models: [
            { id: "seedance-2.0-fast", name: "Seedance 2.0 Fast" },
            { id: "seedance-2.0", name: "Seedance 2.0" },
            { id: "seedance-2.0-vip", name: "Seedance 2.0 VIP" },
        ],
    },
    {
        id: "jimeng",
        name: "Jimeng (Local API)",
        baseUrl: "http://127.0.0.1:5100/v1",
        apiKeyOptional: true,
        models: [
            { id: "seedance-2.0-fast", name: "Seedance 2.0 Fast" },
            { id: "seedance-2.0", name: "Seedance 2.0" },
            { id: "seedance-2.0-vip", name: "Seedance 2.0 VIP" },
        ],
    },
    {
        id: "jimeng-direct",
        name: "即梦直连 (Web API Direct)",
        baseUrl: "https://jimeng.jianying.com",
        apiKeyOptional: true,
        models: [
            { id: "jimeng-video-seedance-2.0", name: "Seedance 2.0" },
            { id: "jimeng-video-seedance-2.0-fast", name: "Seedance 2.0 Fast" },
            { id: "jimeng-video-3.5-pro", name: "视频 3.5 Pro" },
            { id: "jimeng-video-3.0", name: "视频 3.0" },
            { id: "jimeng-video-3.0-fast", name: "视频 3.0 Fast" },
        ],
    },
    {
        id: "yunwu",
        name: "云雾 (Yunwu) Video",
        baseUrl: "https://yunwu.ai/v1",
        apiPattern: "yunwu",
        models: [
            { id: "doubao-seedance-1-5-pro-251215", name: "豆包 Seedance 1.5 Pro" },
            { id: "doubao-seedance-1-0-pro-250528", name: "豆包 Seedance 1.0 Pro" },
            { id: "doubao-seedance-1-0-pro-fast-251015", name: "豆包 Seedance 1.0 Pro Fast" },
            { id: "kling-3.0-turbo", name: "Kling 3.0 Turbo" },
            { id: "kling-video", name: "Kling Video" },
            { id: "kling-video-extend", name: "Kling Video Extend" },
            { id: "kling-omni-video", name: "Kling Omni Video" },
            { id: "kling-avatar-image2video", name: "Kling Avatar 图生视频" },
            { id: "viduq3-pro", name: "VIDU Q3 Pro" },
            { id: "viduq3-turbo", name: "VIDU Q3 Turbo" },
            { id: "viduq3-mix", name: "VIDU Q3 Mix" },
            { id: "viduq3", name: "VIDU Q3" },
            { id: "viduq2-pro", name: "VIDU Q2 Pro" },
            { id: "viduq2-turbo", name: "VIDU Q2 Turbo" },
            { id: "viduq2", name: "VIDU Q2" },
            { id: "vidu2.0", name: "VIDU 2.0" },
            { id: "happyhorse-1.1-i2v", name: "Happy Horse 1.1 图生视频" },
            { id: "happyhorse-1.1-t2v", name: "Happy Horse 1.1 文生视频" },
            { id: "happyhorse-1.1-r2v", name: "Happy Horse 1.1 参考生成" },
            { id: "happyhorse-1.0-i2v", name: "Happy Horse 1.0 图生视频" },
            { id: "happyhorse-1.0-t2v", name: "Happy Horse 1.0 文生视频" },
            { id: "wan2.6-i2v", name: "Wan 2.6 图生视频" },
            { id: "wan2.5-i2v-preview", name: "Wan 2.5 图生视频" },
            { id: "pixverse-video", name: "PixVerse Video" },
            { id: "mj_video", name: "Midjourney Video" },
        ],
    },
    {
        id: "agnes",
        name: "Agnes AI Video",
        baseUrl: "https://apihub.agnes-ai.com/v1",
        apiPattern: "agnes",
        models: [
            { id: "agnes-video-v2.0", name: "Agnes Video 2.0" },
        ],
    },
    {
        id: "custom",
        name: "Custom Endpoint",
        baseUrl: "",
        apiKeyOptional: true,
        models: [],
    },
];
// ---------------------------------------------------------------------------
// VideoProviderRegistry — Map-backed lookup (mirrors ImageProviderRegistry)
// ---------------------------------------------------------------------------
export class VideoProviderRegistry {
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
export const videoProviderRegistry = new VideoProviderRegistry(VIDEO_PROVIDER_CONFIGS);
//# sourceMappingURL=provider-registry.js.map