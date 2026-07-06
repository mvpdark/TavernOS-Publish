import type { EDL } from "./edl.js";
export type { ExecFileFn } from "./composer-types.js";
export type { ComposeConfig, VideoProbeInfo, ComposeResult, ComposeInput, } from "./composer-types.js";
export { DEFAULT_COMPOSE_CONFIG } from "./composer-types.js";
export { parseFrameRate, buildFilterGraph } from "./composer-filter-graph.js";
import type { ComposeConfig, ComposeResult, ComposeInput, VideoProbeInfo, ExecFileFn } from "./composer-types.js";
export declare class VideoComposer {
    private readonly config;
    private readonly execFn;
    constructor(config?: Partial<ComposeConfig>, execFn?: ExecFileFn);
    /**
     * Probe a video file using ffprobe to get duration, resolution, fps, codec,
     * and audio presence.
     */
    probeVideo(path: string): Promise<VideoProbeInfo>;
    /**
     * Generate a 360p proxy video from a master video.
     * Uses libx264 veryfast preset with CRF 28 for fast, low-bitrate encoding.
     */
    generateProxy(masterPath: string, proxyPath: string): Promise<void>;
    /**
     * Run an FFmpeg command with the given arguments.
     */
    runFFmpeg(args: string[]): Promise<{
        stdout: string;
        stderr: string;
    }>;
    /**
     * Compose multiple video clips into a single output video with transitions.
     *
     * Flow:
     *   1. Build EDL from clips + transitions (uses clip.localPath ?? videoUrl)
     *   2. Delegate to {@link composeWithEDL} which validates, probes each clip
     *      for its effective duration, builds the filter graph, and runs ffmpeg.
     */
    compose(input: ComposeInput): Promise<ComposeResult>;
    /**
     * Compose directly from a pre-built EDL.
     *
     * This entry point lets callers (e.g. AutoCut) that already have an EDL
     * skip the VideoClip → EDL conversion step. Each clip's `sourcePath` is
     * probed to determine its effective (post-trim) duration so that xfade
     * offsets and fade-out start times are computed correctly.
     *
     * @param edl    Pre-built Edit Decision List.
     * @param config Optional per-call config overrides.
     */
    composeFromEDL(edl: EDL, config?: Partial<ComposeConfig>): Promise<ComposeResult>;
    /**
     * Shared composition core: validate → probe → build filter graph → run ffmpeg.
     *
     * Probing happens *before* the filter graph is built so that accurate
     * per-clip durations can be passed to {@link buildFilterGraph} for correct
     * xfade `offset` and fade-out `st` values.
     */
    private composeWithEDL;
    /**
     * Build a uniform failure result (used by the early-exit paths above).
     */
    private failureResult;
}
//# sourceMappingURL=composer.d.ts.map