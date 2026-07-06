import type { VideoClip } from "./types.js";
import type { Transition } from "./edl.js";
/** ExecFile function signature (injectable for testing). */
export type ExecFileFn = (file: string, args: string[], options?: {
    timeout?: number;
    maxBuffer?: number;
}) => Promise<{
    stdout: string;
    stderr: string;
}>;
/** Composition configuration. */
export interface ComposeConfig {
    /** Target video width in pixels. */
    width: number;
    /** Target video height in pixels. */
    height: number;
    /** Target frames per second. */
    fps: number;
    /** FFmpeg encoding preset (ultrafast … veryslow). */
    preset: string;
    /** Constant Rate Factor (0–51, lower = higher quality). */
    crf: number;
    /** Minimum output duration in seconds (pads with last frame if shorter). */
    minDuration?: number;
    /** BGM audio file path or URL (optional). When set, the composer adds the
     *  file as an additional ffmpeg input and mixes it into the output audio. */
    bgmPath?: string;
    /** BGM volume (0–1, default 0.3). */
    bgmVolume?: number;
    /** Voiceover audio file paths (optional). Each is added as an ffmpeg input
     *  and mixed together with the BGM into the output audio track. */
    voiceoverPaths?: string[];
    /** Path to the ffmpeg binary. */
    ffmpegPath: string;
    /** Path to the ffprobe binary. */
    ffprobePath: string;
    /** Timeout for ffmpeg operations in milliseconds. */
    timeoutMs: number;
}
/** Default composition configuration (1080p60, CRF 18, medium preset). */
export declare const DEFAULT_COMPOSE_CONFIG: ComposeConfig;
/** Video probe information from ffprobe. */
export interface VideoProbeInfo {
    path: string;
    /** Duration in seconds. */
    duration: number;
    /** Width in pixels (undefined if no video stream). */
    width?: number;
    /** Height in pixels (undefined if no video stream). */
    height?: number;
    /** Frame rate (undefined if not parseable). */
    fps?: number;
    /** Video codec name (undefined if no video stream). */
    codec?: string;
    /** Whether the file has an audio stream. */
    hasAudio: boolean;
}
/** Result of a compose operation. */
export interface ComposeResult {
    outputPath: string;
    /** Estimated total duration of the output in seconds. */
    duration: number;
    /** Number of clips used in the composition. */
    clipCount: number;
    /** Number of transitions applied. */
    transitionCount: number;
    /** The FFmpeg filter_complex string that was used. */
    filterComplex: string;
    /** Whether the composition succeeded. */
    success: boolean;
    /** Error message if success is false. */
    error?: string;
}
/** Input for the compose method. */
export interface ComposeInput {
    clips: VideoClip[];
    transitions: Transition[];
    outputPath: string;
    config?: Partial<ComposeConfig>;
    /**
     * Pre-computed probe results keyed by clip path. When provided, the
     * composer skips re-probing clips (avoids duplicate ffprobe calls when
     * the route layer already probed for progress reporting).
     */
    probes?: Map<string, VideoProbeInfo>;
}
//# sourceMappingURL=composer-types.d.ts.map