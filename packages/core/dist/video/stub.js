// Video generation stub mode.
//
// When the TAVERNOS_VIDEO_STUB environment variable is truthy, the video
// client short-circuits real HTTP calls and returns deterministic placeholder
// video URLs. This mirrors the image/LLM stub pattern and enables fully
// offline tests.
/** True when the video-generation stub is enabled via env var. */
export function isVideoStubEnabled() {
    const v = process.env["TAVERNOS_VIDEO_STUB"];
    return v === "true" || v === "1";
}
/**
 * Deterministic stub video generation.
 * Produces a stable placeholder response derived from the prompt so that the
 * same prompt always yields the same video URL — no network access required.
 */
export function stubVideoGeneration(request) {
    // Deterministic URL derived from prompt hash so the same prompt always
    // produces the same stub URL (useful for snapshot tests).
    const hash = simpleHash(request.prompt);
    const duration = request.duration ?? 5;
    return {
        videoUrl: `https://stub.tavernos.local/video/${hash}.mp4`,
        thumbnailUrl: `https://stub.tavernos.local/thumb/${hash}.png`,
        duration,
        createdAt: new Date().toISOString(),
    };
}
/**
 * Simple non-cryptographic string hash (djb2 variant).
 * Used only to derive a deterministic stub URL from a prompt.
 */
function simpleHash(input) {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
}
//# sourceMappingURL=stub.js.map