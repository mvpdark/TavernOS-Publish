import type { TTSConfig, TTSRequest, TTSResponse } from "./types.js";
export interface TTSClient {
    readonly provider: string;
    readonly baseUrl: string;
    readonly defaults: {
        readonly model: string;
        readonly voice: string;
        readonly speed: number;
        readonly responseFormat: string;
    };
    /** Synthesize speech from text. Returns raw audio bytes. */
    synthesize(request: TTSRequest): Promise<TTSResponse>;
}
export declare function createTTSClient(config: TTSConfig): TTSClient;
//# sourceMappingURL=client.d.ts.map