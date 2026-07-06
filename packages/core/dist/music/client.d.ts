import type { MusicGenConfig, MusicGenRequest, MusicGenResponse } from "./types.js";
export declare class MusicGenError extends Error {
    readonly status?: number | undefined;
    readonly body?: unknown | undefined;
    constructor(message: string, status?: number | undefined, body?: unknown | undefined);
}
export declare class SunoMusicClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly model;
    private readonly defaultInstrumental;
    private static readonly POLL_INTERVAL_MS;
    private static readonly MAX_POLL_MS;
    constructor(config: MusicGenConfig);
    generate(req: MusicGenRequest): Promise<MusicGenResponse>;
    private pollTask;
    private parseMusicResponse;
    private fetchJson;
    private sleep;
}
export declare function createMusicClient(config: MusicGenConfig): SunoMusicClient;
//# sourceMappingURL=client.d.ts.map