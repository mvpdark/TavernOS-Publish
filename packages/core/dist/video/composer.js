// FFmpeg video composer — multi-clip concatenation with transitions.
//
// Ported and re-architected from MJ's build_ffmpeg_from_story_edl.py and
// final_cut/ffmpeg_tools.py. MJ used a single-source trim+concat model; TavernOS
// uses a multi-clip model where each VideoClip is a separate input file, with
// support for cut / crossfade / fade transitions between clips.
//
// The composer wraps child_process.execFile calls to ffmpeg/ffprobe. For
// testability, the exec function is injectable via the constructor.
//
// Type definitions live in composer-types.ts; the pure filter-graph builder
// lives in composer-filter-graph.ts. This file re-exports them for backward
// compatibility and contains only the VideoComposer class.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildEDL, validateEDL } from "./edl.js";
import { parseFrameRate, buildFilterGraph } from "./composer-filter-graph.js";
export { DEFAULT_COMPOSE_CONFIG } from "./composer-types.js";
export { parseFrameRate, buildFilterGraph } from "./composer-filter-graph.js";
import { DEFAULT_COMPOSE_CONFIG } from "./composer-types.js";
const execFileAsync = promisify(execFile);
// ---------------------------------------------------------------------------
// VideoComposer class
// ---------------------------------------------------------------------------
export class VideoComposer {
    config;
    execFn;
    constructor(config, execFn) {
        this.config = { ...DEFAULT_COMPOSE_CONFIG, ...config };
        this.execFn = execFn ?? (async (file, args, opts) => {
            const result = await execFileAsync(file, args, opts);
            return { stdout: String(result.stdout), stderr: String(result.stderr) };
        });
    }
    /**
     * Probe a video file using ffprobe to get duration, resolution, fps, codec,
     * and audio presence.
     */
    async probeVideo(path) {
        const args = [
            "-v", "error",
            "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_name,codec_type",
            "-of", "json",
            path,
        ];
        const { stdout } = await this.execFn(this.config.ffprobePath, args, {
            timeout: 30_000,
        });
        const data = JSON.parse(stdout || "{}");
        const duration = parseFloat(data.format?.duration ?? "0") || 0;
        const videoStream = data.streams?.find((s) => s.codec_type === "video");
        const hasAudio = data.streams?.some((s) => s.codec_type === "audio") ?? false;
        return {
            path,
            duration,
            width: videoStream?.width,
            height: videoStream?.height,
            fps: parseFrameRate(videoStream?.r_frame_rate),
            codec: videoStream?.codec_name,
            hasAudio,
        };
    }
    /**
     * Generate a 360p proxy video from a master video.
     * Uses libx264 veryfast preset with CRF 28 for fast, low-bitrate encoding.
     */
    async generateProxy(masterPath, proxyPath) {
        const args = [
            "-y",
            "-i", masterPath,
            "-vf", "scale=-2:360,setsar=1",
            "-r", "30",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "28",
            "-c:a", "aac",
            "-b:a", "96k",
            "-movflags", "+faststart",
            proxyPath,
        ];
        await this.execFn(this.config.ffmpegPath, args, {
            timeout: this.config.timeoutMs,
        });
    }
    /**
     * Run an FFmpeg command with the given arguments.
     */
    async runFFmpeg(args) {
        return this.execFn(this.config.ffmpegPath, args, {
            timeout: this.config.timeoutMs,
        });
    }
    /**
     * Compose multiple video clips into a single output video with transitions.
     *
     * Flow:
     *   1. Build EDL from clips + transitions (uses clip.localPath ?? videoUrl)
     *   2. Delegate to {@link composeWithEDL} which validates, probes each clip
     *      for its effective duration, builds the filter graph, and runs ffmpeg.
     */
    async compose(input) {
        const { clips, transitions, outputPath } = input;
        const config = { ...this.config, ...input.config };
        // Step 1: Build EDL
        let edl;
        try {
            edl = buildEDL(clips, transitions, outputPath, {
                width: config.width,
                height: config.height,
                fps: config.fps,
                preset: config.preset,
                crf: config.crf,
                minDuration: config.minDuration,
            });
        }
        catch (err) {
            return this.failureResult(outputPath, clips.length, transitions.length, err);
        }
        return this.composeWithEDL(edl, config, input.probes);
    }
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
    async composeFromEDL(edl, config) {
        const mergedConfig = { ...this.config, ...config };
        return this.composeWithEDL(edl, mergedConfig, undefined);
    }
    /**
     * Shared composition core: validate → probe → build filter graph → run ffmpeg.
     *
     * Probing happens *before* the filter graph is built so that accurate
     * per-clip durations can be passed to {@link buildFilterGraph} for correct
     * xfade `offset` and fade-out `st` values.
     */
    async composeWithEDL(edl, config, preProbed) {
        const { outputPath } = edl;
        // Step 1: Validate EDL
        const validation = validateEDL(edl, { minDuration: config.minDuration });
        if (!validation.ok) {
            return this.failureResult(outputPath, edl.clips.length, edl.transitions.length, `EDL validation failed: ${validation.errors.join("; ")}`);
        }
        // Step 2: Probe each clip to get effective durations (for xfade offset &
        // fade-out st) and estimate total duration. Best-effort: probe failures
        // fall back to a 5-second default so composition can still proceed.
        const clipDurations = [];
        let estimatedDuration = 0;
        for (const clip of edl.clips) {
            try {
                const info = preProbed?.get(clip.sourcePath) ?? await this.probeVideo(clip.sourcePath);
                const start = clip.start ?? 0;
                const end = clip.end ?? info.duration;
                const eff = Math.max(0, end - start);
                clipDurations.push(eff);
                estimatedDuration += eff;
            }
            catch {
                // Non-fatal: if probe fails, default to 5s and keep going.
                clipDurations.push(5);
            }
        }
        // Step 3: Build filter graph (with clipDurations for accurate offsets)
        let filterComplex;
        try {
            filterComplex = buildFilterGraph(edl.clips, edl.transitions, config, clipDurations);
        }
        catch (err) {
            return this.failureResult(outputPath, edl.clips.length, edl.transitions.length, err);
        }
        // Step 4: Build FFmpeg args and run.
        // Video clip inputs come first; BGM / voiceover inputs are appended after
        // so their stream indices align with buildFilterGraph's audio sub-graph
        // (BGM at index clips.length, voiceovers at clips.length+1..).
        const inputArgs = [];
        for (const clip of edl.clips) {
            inputArgs.push("-i", clip.sourcePath);
        }
        const voiceoverPaths = config.voiceoverPaths ?? [];
        const hasAudio = !!config.bgmPath || voiceoverPaths.length > 0;
        if (config.bgmPath) {
            inputArgs.push("-i", config.bgmPath);
        }
        for (const vo of voiceoverPaths) {
            inputArgs.push("-i", vo);
        }
        const ffmpegArgs = [
            "-y",
            ...inputArgs,
            "-filter_complex", filterComplex,
            "-map", "[vout]",
        ];
        if (hasAudio) {
            // Map the mixed audio track produced by the filter graph and stop at
            // the shortest stream (so trailing BGM doesn't extend the output).
            ffmpegArgs.push("-map", "[aout]", "-shortest");
        }
        ffmpegArgs.push("-c:v", "libx264", "-preset", config.preset, "-crf", String(config.crf), "-r", String(config.fps), "-pix_fmt", "yuv420p");
        if (hasAudio) {
            ffmpegArgs.push("-c:a", "aac", "-b:a", "128k");
        }
        ffmpegArgs.push("-movflags", "+faststart", outputPath);
        try {
            await this.runFFmpeg(ffmpegArgs);
            return {
                outputPath,
                duration: estimatedDuration,
                clipCount: edl.clips.length,
                transitionCount: edl.transitions.length,
                filterComplex,
                success: true,
            };
        }
        catch (err) {
            return {
                outputPath,
                duration: estimatedDuration,
                clipCount: edl.clips.length,
                transitionCount: edl.transitions.length,
                filterComplex,
                success: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
    /**
     * Build a uniform failure result (used by the early-exit paths above).
     */
    failureResult(outputPath, clipCount, transitionCount, error) {
        const msg = typeof error === "string"
            ? error
            : error instanceof Error
                ? error.message
                : String(error);
        return {
            outputPath,
            duration: 0,
            clipCount,
            transitionCount,
            filterComplex: "",
            success: false,
            error: msg,
        };
    }
}
//# sourceMappingURL=composer.js.map