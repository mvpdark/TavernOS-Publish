// Type definitions and default configuration for the FFmpeg video composer.
//
// Extracted from composer.ts for single-responsibility: this module holds only
// types and the default config constant, with no runtime logic.
/** Default composition configuration (1080p60, CRF 18, medium preset). */
export const DEFAULT_COMPOSE_CONFIG = {
    width: 1920,
    height: 1080,
    fps: 60,
    preset: "medium",
    crf: 18,
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    timeoutMs: 3_600_000, // 1 hour
};
//# sourceMappingURL=composer-types.js.map