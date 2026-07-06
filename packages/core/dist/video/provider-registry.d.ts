export interface VideoModelCard {
    readonly id: string;
    readonly name: string;
}
export interface VideoProviderConfig {
    readonly id: string;
    readonly name: string;
    readonly baseUrl: string;
    readonly models: ReadonlyArray<VideoModelCard>;
    /** When true, an empty API key is acceptable (e.g. local jimeng-api). */
    readonly apiKeyOptional?: boolean;
    /** API endpoint pattern. "openai" uses /videos/generations; "yunwu" uses /video/create + /video/query; "agnes" uses /video/generations (singular). */
    readonly apiPattern?: "openai" | "yunwu" | "agnes";
}
export declare const VIDEO_PROVIDER_CONFIGS: ReadonlyArray<VideoProviderConfig>;
export declare class VideoProviderRegistry {
    private readonly table;
    constructor(configs: ReadonlyArray<VideoProviderConfig>);
    get(id: string): VideoProviderConfig | undefined;
    has(id: string): boolean;
    list(): VideoProviderConfig[];
    /** First model id for a provider, or undefined when the provider has no models. */
    defaultModel(id: string): string | undefined;
}
export declare const videoProviderRegistry: VideoProviderRegistry;
//# sourceMappingURL=provider-registry.d.ts.map