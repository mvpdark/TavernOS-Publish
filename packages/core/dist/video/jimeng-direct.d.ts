import type { VideoGenConfig, VideoGenRequest, VideoGenResponse } from "./types.js";
/** Jimeng direct connection credentials. */
export interface JimengDirectCredentials {
    /** sessionid from jimeng.jianying.com DevTools → Application → Cookies. */
    sessionid: string;
}
/**
 * Generate a video via Jimeng's web API (direct connection).
 *
 * This function replaces the external jimeng-api service by calling Jimeng's
 * web API directly from the TavernOS backend. Users only need to provide their
 * sessionid — everything else (deviceId, Cookie, Sign) is auto-generated.
 *
 * @param config  - Video generation config (provider, model, duration, etc.)
 * @param creds   - Jimeng credentials (just sessionid)
 * @param request - Generation request (prompt, optional reference image)
 * @returns Video generation response with the video URL.
 *
 * @throws Error if sessionid is missing/expired, or the generation fails.
 */
export declare function generateVideoViaJimengDirect(config: VideoGenConfig, creds: JimengDirectCredentials, request: VideoGenRequest): Promise<VideoGenResponse>;
/**
 * Check if the Jimeng sessionid is valid by making a lightweight request.
 * Used by the frontend settings page for the "test connection" button.
 *
 * @returns An object with `valid: true` or an error message.
 */
export declare function testJimengDirectConnection(creds: JimengDirectCredentials): Promise<{
    valid: boolean;
    error?: string;
}>;
//# sourceMappingURL=jimeng-direct.d.ts.map