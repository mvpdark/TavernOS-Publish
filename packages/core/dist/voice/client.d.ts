import type { VoiceDesignRequest, VoiceCloneRequest, KlingCustomVoiceRequest } from "./types.js";
export interface VoiceClientConfig {
    apiKey: string;
    /** Base URL without trailing slash, e.g. "https://yunwu.ai". */
    baseUrl: string;
}
export interface VoiceClient {
    /** MiniMax: upload an audio file for voice cloning. Returns file_id. */
    uploadAudio(audio: ArrayBuffer, filename: string, purpose: string): Promise<{
        fileId: number;
        raw: unknown;
    }>;
    /** MiniMax: design a voice from a text prompt. Returns the new voice_id. */
    designVoice(req: VoiceDesignRequest): Promise<{
        voiceId: string;
        raw: unknown;
    }>;
    /** MiniMax: clone a voice from an uploaded audio file. */
    cloneVoice(req: VoiceCloneRequest): Promise<{
        voiceId: string;
        raw: unknown;
    }>;
    /** Kling: create a custom voice from an audio URL or video ID. */
    createKlingVoice(req: KlingCustomVoiceRequest): Promise<{
        taskId: string;
        raw: unknown;
    }>;
    /** Kling: query a custom voice by voice_id. */
    queryKlingVoice(voiceId: string): Promise<unknown>;
    /** Kling: list official voices. */
    listKlingOfficialVoices(): Promise<unknown>;
    /** Kling: delete a custom voice. */
    deleteKlingVoice(voiceId: string): Promise<unknown>;
}
export declare function createVoiceClient(config: VoiceClientConfig): VoiceClient;
//# sourceMappingURL=client.d.ts.map