/** Maximum total audio duration across all references. */
declare const MAX_TOTAL_AUDIO_DURATION = 15;
/** Result of a successful VOD audio upload. */
export interface AudioUploadResult {
    /** VOD video ID (used in material_list audio_info.vid). */
    vid: string;
    /** Storage URI. */
    uri: string;
    /** Audio metadata extracted from VOD response. */
    audioMeta: {
        /** Duration in seconds. */
        duration: number;
        /** Duration in milliseconds (used in material_list audio_info.duration). */
        durationMs: number;
        /** File format (e.g. "mp3", "wav"). */
        format: string;
        /** File size in bytes. */
        size: number;
        /** MD5 hash of the file. */
        md5: string;
    };
}
/** Maximum total audio duration across all references. */
export { MAX_TOTAL_AUDIO_DURATION as MAX_TOTAL_AUDIO_DURATION_SEC };
/**
 * Upload an audio buffer to VOD and return the Vid + metadata.
 *
 * This is the main entry point for audio uploads in omni_reference mode.
 * It executes the full 4-step VOD pipeline:
 *   1. Get STS credentials from Jimeng Web API
 *   2. Apply for upload permission (ApplyUploadInner)
 *   3. Upload binary data
 *   4. Commit upload (CommitUploadInner) → get Vid
 *
 * @param audioBuffer       The audio file as an ArrayBuffer/Buffer
 * @param sessionid         Jimeng sessionid (for get_upload_token)
 * @param buildHeadersFn    Function to build Jimeng API headers (from jimeng-direct.ts)
 * @param buildQueryParamsFn Function to build Jimeng query params (from jimeng-direct.ts)
 * @param postFn            Function to POST to Jimeng API (from jimeng-direct.ts)
 * @returns AudioUploadResult with vid, uri, and audioMeta
 */
export declare function uploadAudioBuffer(audioBuffer: ArrayBuffer | Buffer, sessionid: string, buildHeadersFn: (sessionid: string, uri: string, timestamp: number) => Record<string, string>, buildQueryParamsFn: () => Record<string, string | number>, postFn: (url: string, params: Record<string, unknown>, body: Record<string, unknown>, headers: Record<string, string>, timeoutMs?: number) => Promise<Response>): Promise<AudioUploadResult>;
/**
 * Download audio from a URL and upload it to VOD.
 *
 * @param audioUrl          URL of the audio file to download
 * @param sessionid         Jimeng sessionid
 * @param buildHeadersFn    Function to build Jimeng API headers
 * @param buildQueryParamsFn Function to build Jimeng query params
 * @param postFn            Function to POST to Jimeng API
 * @returns AudioUploadResult with vid, uri, and audioMeta
 */
export declare function uploadAudioFromUrl(audioUrl: string, sessionid: string, buildHeadersFn: (sessionid: string, uri: string, timestamp: number) => Record<string, string>, buildQueryParamsFn: () => Record<string, string | number>, postFn: (url: string, params: Record<string, unknown>, body: Record<string, unknown>, headers: Record<string, string>, timeoutMs?: number) => Promise<Response>): Promise<AudioUploadResult>;
//# sourceMappingURL=jimeng-vod-uploader.d.ts.map