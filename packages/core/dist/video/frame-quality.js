// Frame-level quality checking and auto-trim using FFmpeg.
//
// Provides:
//   - extractFrames: Extract frames at regular intervals for analysis
//   - computeInterFrameSSIM: Compute SSIM between consecutive frames
//   - detectBadFrames: Find frames with low SSIM (corrupted/garbled)
//   - autoTrim: Remove bad frames from start/end, return trim points
//   - detectSceneCuts: Use FFmpeg select filter to find scene changes
//
// Uses the same ExecFileFn pattern as composer.ts: the FFmpeg/FFprobe exec
// function is injectable for testing. All higher-level methods (detectBadFrames,
// autoTrim) return structured results with success/error fields and never throw.
// Lower-level methods (probeDuration, extractFrames, computeInterFrameSSIM,
// detectSceneCuts) may throw — callers should wrap them in try/catch or use the
// higher-level methods which handle errors internally.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
/** Default frame quality configuration. */
export const DEFAULT_FRAME_QUALITY_CONFIG = {
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    frameInterval: 0.5,
    ssimThreshold: 0.6,
    minConsecutiveBadFrames: 2,
    timeoutMs: 120_000,
};
// ---------------------------------------------------------------------------
// Regex patterns for parsing FFmpeg stderr
// ---------------------------------------------------------------------------
/**
 * Matches the "All:" SSIM value in FFmpeg's ssim filter output.
 * Example stderr line:
 *   [Parsed_ssim_0 @ 0x...] SSIM Y:0.95 (12.32 dB) U:0.97 (15.21 dB) V:0.96 (14.56 dB) All:0.95 (13.82 dB)
 */
const SSIM_ALL_REGEX = /All:([0-9.]+)/;
/**
 * Matches "pts_time:" in FFmpeg's showinfo filter output.
 * Example stderr line:
 *   [Parsed_showinfo_1 @ 0x...] n: 123 pts:123456 pts_time:5.12 pos:1234567 ...
 */
const SHOWINFO_PTS_TIME_REGEX = /pts_time:([0-9.]+)/;
/** Matches "n:" frame index in showinfo output. */
const SHOWINFO_FRAME_INDEX_REGEX = /n:\s*(\d+)/;
// ---------------------------------------------------------------------------
// FrameQualityChecker class
// ---------------------------------------------------------------------------
const execFileAsync = promisify(execFile);
/**
 * Frame-level video quality checker using FFmpeg.
 *
 * Provides frame extraction, inter-frame SSIM computation, bad frame detection,
 * auto-trim point calculation, and scene cut detection.
 *
 * The exec function is injectable for testing, following the same pattern as
 * VideoComposer in composer.ts.
 */
export class FrameQualityChecker {
    config;
    execFn;
    /**
     * @param config Partial configuration overrides (merged with defaults).
     * @param execFn Injectable exec function for testing. Defaults to promisified execFile.
     */
    constructor(config, execFn) {
        this.config = { ...DEFAULT_FRAME_QUALITY_CONFIG, ...config };
        this.execFn = execFn ?? (async (file, args, opts) => {
            const result = await execFileAsync(file, args, opts);
            return { stdout: String(result.stdout), stderr: String(result.stderr) };
        });
    }
    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------
    /**
     * Probe the duration of a video file using ffprobe.
     *
     * @param videoPath Path to the input video file.
     * @returns Duration in seconds, or 0 if it cannot be determined.
     * @throws If ffprobe fails or the file is invalid.
     */
    async probeDuration(videoPath) {
        const args = [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            videoPath,
        ];
        const { stdout } = await this.execFn(this.config.ffprobePath, args, {
            timeout: 30_000,
        });
        return parseFloat(stdout.trim()) || 0;
    }
    /**
     * Extract frames from a video at regular intervals as PNG images.
     *
     * Uses FFmpeg's fps filter to sample one frame every `interval` seconds:
     *   ffmpeg -i input -vf fps=1/interval -frame_pts 1 output_%08d.png
     *
     * The `-frame_pts 1` option tells the image2 muxer to use the frame's
     * presentation timestamp as the sequence number in the output filename.
     *
     * @param videoPath Path to the input video file.
     * @param outputDir Directory where PNG frames will be written (created if needed).
     * @param interval Interval between frames in seconds.
     * @returns Array of sorted frame file paths.
     * @throws If FFmpeg fails or the output directory cannot be created.
     */
    async extractFrames(videoPath, outputDir, interval) {
        // Ensure the output directory exists.
        await mkdir(outputDir, { recursive: true });
        const outputPattern = join(outputDir, "frame_%08d.png");
        const args = [
            "-y",
            "-i", videoPath,
            "-vf", `fps=1/${interval}`,
            "-frame_pts", "1",
            outputPattern,
        ];
        await this.execFn(this.config.ffmpegPath, args, {
            timeout: this.config.timeoutMs,
        });
        // List and sort the extracted PNG files.
        const files = await readdir(outputDir);
        return files
            .filter((f) => f.endsWith(".png"))
            .sort()
            .map((f) => join(outputDir, f));
    }
    /**
     * Compute SSIM between consecutive frames extracted at regular intervals.
     *
     * Flow:
     *   1. Extract frames to a temporary directory.
     *   2. For each pair of consecutive frames, compute SSIM using:
     *        ffmpeg -i frame1.png -i frame2.png -filter_complex "[0:v][1:v]ssim" -f null -
     *   3. Parse the "All:" SSIM value from stderr.
     *   4. Clean up the temporary directory.
     *
     * The first frame (index 0) has no ssimWithPrev (undefined) since there is
     * no previous frame to compare against.
     *
     * @param videoPath Path to the input video file.
     * @param interval Interval between frames in seconds.
     * @returns Array of FrameInfo with SSIM values.
     * @throws If frame extraction or SSIM computation fails.
     */
    async computeInterFrameSSIM(videoPath, interval) {
        const tempDir = await mkdtemp(join(tmpdir(), "frame-quality-"));
        try {
            const framePaths = await this.extractFrames(videoPath, tempDir, interval);
            if (framePaths.length === 0) {
                return [];
            }
            const frames = [];
            for (let i = 0; i < framePaths.length; i++) {
                const info = {
                    timestamp: i * interval,
                    index: i,
                };
                if (i > 0) {
                    info.ssimWithPrev = await this.computeSSIM(framePaths[i - 1], framePaths[i]);
                }
                frames.push(info);
            }
            return frames;
        }
        finally {
            // Always clean up the temporary directory, even on error.
            await rm(tempDir, { recursive: true, force: true }).catch(() => { });
        }
    }
    /**
     * Detect bad/corrupted frames by computing inter-frame SSIM and finding
     * frames with SSIM below the configured threshold.
     *
     * Consecutive bad frames are grouped into BadFrameRange entries. The result
     * includes all frames with their SSIM values, the bad frame ranges, and
     * aggregate statistics (average and minimum SSIM).
     *
     * This method never throws — errors are returned in the result's error field.
     *
     * @param videoPath Path to the input video file.
     * @returns FrameQualityResult with frames, bad ranges, and statistics.
     */
    async detectBadFrames(videoPath) {
        try {
            const interval = this.config.frameInterval;
            const threshold = this.config.ssimThreshold;
            const frames = await this.computeInterFrameSSIM(videoPath, interval);
            if (frames.length === 0) {
                return {
                    frames: [],
                    badFrameRanges: [],
                    averageSSIM: 0,
                    minSSIM: 0,
                    success: true,
                };
            }
            // Collect SSIM values (skip first frame which has no ssimWithPrev).
            const ssimValues = [];
            for (let i = 1; i < frames.length; i++) {
                if (frames[i].ssimWithPrev !== undefined) {
                    ssimValues.push(frames[i].ssimWithPrev);
                }
            }
            const averageSSIM = ssimValues.length > 0
                ? ssimValues.reduce((a, b) => a + b, 0) / ssimValues.length
                : 0;
            const minSSIM = ssimValues.length > 0
                ? Math.min(...ssimValues)
                : 0;
            // Group consecutive bad frames into ranges.
            const badFrameRanges = [];
            let rangeStart = null;
            let rangeEnd = null;
            for (let i = 1; i < frames.length; i++) {
                const ssim = frames[i].ssimWithPrev;
                const isBad = ssim !== undefined && ssim < threshold;
                if (isBad) {
                    if (rangeStart === null) {
                        rangeStart = i;
                    }
                    rangeEnd = i;
                }
                else {
                    if (rangeStart !== null && rangeEnd !== null) {
                        badFrameRanges.push(this.createBadFrameRange(frames, rangeStart, rangeEnd));
                    }
                    rangeStart = null;
                    rangeEnd = null;
                }
            }
            // Handle a trailing range that extends to the last frame.
            if (rangeStart !== null && rangeEnd !== null) {
                badFrameRanges.push(this.createBadFrameRange(frames, rangeStart, rangeEnd));
            }
            return {
                frames,
                badFrameRanges,
                averageSSIM,
                minSSIM,
                success: true,
            };
        }
        catch (err) {
            return {
                frames: [],
                badFrameRanges: [],
                averageSSIM: 0,
                minSSIM: 0,
                success: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
    /**
     * Find trim points to remove bad frames from the beginning and end of a video.
     *
     * Only bad ranges at the start (beginning of video) or end (end of video)
     * are trimmed. Bad frames in the middle are NOT trimmed — that indicates a
     * content issue requiring a reroll, not a simple trim.
     *
     * Only ranges with at least `minConsecutiveBadFrames` consecutive bad frames
     * are considered for trimming. This filters out isolated single-frame
     * anomalies that may be false positives.
     *
     * This method never throws — errors are returned in the result's error field.
     *
     * @param videoPath Path to the input video file.
     * @returns AutoTrimResult with trim points and statistics.
     */
    async autoTrim(videoPath) {
        let duration = 0;
        try {
            duration = await this.probeDuration(videoPath);
            const interval = this.config.frameInterval;
            const minConsecutive = this.config.minConsecutiveBadFrames;
            const qualityResult = await this.detectBadFrames(videoPath);
            if (!qualityResult.success) {
                return {
                    trimStart: 0,
                    trimEnd: null,
                    trimmedDuration: duration,
                    originalDuration: duration,
                    badFrameCount: 0,
                    success: false,
                    error: qualityResult.error,
                };
            }
            const { frames, badFrameRanges } = qualityResult;
            const lastFrameIndex = frames.length > 0 ? frames.length - 1 : 0;
            let trimStart = 0;
            let trimEnd = null;
            for (const range of badFrameRanges) {
                const rangeLength = range.endIndex - range.startIndex + 1;
                // Only consider ranges with enough consecutive bad frames for trimming.
                if (rangeLength < minConsecutive)
                    continue;
                // Bad range at the start: starts from the first frame with SSIM (index 1).
                // Trim to just after the end of this range.
                if (range.startIndex <= 1) {
                    const newTrimStart = frames[range.endIndex].timestamp + interval;
                    if (newTrimStart > trimStart) {
                        trimStart = newTrimStart;
                    }
                }
                // Bad range at the end: ends at or near the last frame.
                // Trim to the start of this range.
                if (range.endIndex >= lastFrameIndex - 1) {
                    const newTrimEnd = frames[range.startIndex].timestamp;
                    if (trimEnd === null || newTrimEnd < trimEnd) {
                        trimEnd = newTrimEnd;
                    }
                }
            }
            const effectiveEnd = trimEnd !== null ? trimEnd : duration;
            const trimmedDuration = Math.max(0, effectiveEnd - trimStart);
            const badFrameCount = badFrameRanges.reduce((sum, r) => sum + (r.endIndex - r.startIndex + 1), 0);
            return {
                trimStart,
                trimEnd,
                trimmedDuration,
                originalDuration: duration,
                badFrameCount,
                success: true,
            };
        }
        catch (err) {
            return {
                trimStart: 0,
                trimEnd: null,
                trimmedDuration: duration,
                originalDuration: duration,
                badFrameCount: 0,
                success: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
    /**
     * Detect scene cuts using FFmpeg's select filter.
     *
     * Uses:
     *   ffmpeg -i input -vf "select=gt(scene\,threshold),showinfo" -f null -
     *
     * The select filter evaluates the scene change score for each frame and
     * passes through only frames where the score exceeds the threshold. The
     * showinfo filter logs information about each passed frame, including
     * pts_time (the timestamp) and n (the frame index).
     *
     * @param videoPath Path to the input video file.
     * @param sceneThreshold Scene change threshold (0–1, default 0.3).
     *   Higher values detect only major scene changes; lower values detect
     *   more subtle transitions.
     * @returns Array of SceneCut with timestamps and frame indices.
     * @throws If FFmpeg fails.
     */
    async detectSceneCuts(videoPath, sceneThreshold = 0.3) {
        // The comma inside gt(scene,threshold) must be escaped with a backslash
        // for FFmpeg's filter graph parser (unescaped commas separate filters).
        // In the JS string, "\\" produces a single backslash for FFmpeg.
        const vf = `select=gt(scene\\,${sceneThreshold}),showinfo`;
        const args = [
            "-y",
            "-i", videoPath,
            "-vf", vf,
            "-an", // Disable audio processing for speed.
            "-f", "null", "-",
        ];
        const { stderr } = await this.execFn(this.config.ffmpegPath, args, {
            timeout: this.config.timeoutMs,
            maxBuffer: 10 * 1024 * 1024, // 10 MB — showinfo can produce a lot of output.
        });
        const cuts = [];
        for (const line of stderr.split("\n")) {
            if (!line.includes("showinfo"))
                continue;
            const ptsMatch = line.match(SHOWINFO_PTS_TIME_REGEX);
            if (!ptsMatch)
                continue;
            const indexMatch = line.match(SHOWINFO_FRAME_INDEX_REGEX);
            cuts.push({
                timestamp: parseFloat(ptsMatch[1]),
                frameIndex: indexMatch ? parseInt(indexMatch[1], 10) : cuts.length,
            });
        }
        return cuts;
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /**
     * Compute SSIM between two frame images using FFmpeg's ssim filter.
     *
     * Runs:
     *   ffmpeg -i frame1.png -i frame2.png -filter_complex "[0:v][1:v]ssim" -f null -
     *
     * Parses the "All:" SSIM value from stderr. Returns 0 if parsing fails.
     */
    async computeSSIM(frame1, frame2) {
        const args = [
            "-y",
            "-i", frame1,
            "-i", frame2,
            "-filter_complex", "[0:v][1:v]ssim",
            "-f", "null", "-",
        ];
        const { stderr } = await this.execFn(this.config.ffmpegPath, args, {
            timeout: 30_000,
        });
        const match = stderr.match(SSIM_ALL_REGEX);
        return match ? parseFloat(match[1]) : 0;
    }
    /**
     * Create a BadFrameRange from a start and end frame index.
     * Computes the average SSIM across all frames in the range.
     */
    createBadFrameRange(frames, startIndex, endIndex) {
        const ssimValues = [];
        for (let i = startIndex; i <= endIndex; i++) {
            if (frames[i].ssimWithPrev !== undefined) {
                ssimValues.push(frames[i].ssimWithPrev);
            }
        }
        const avgSSIM = ssimValues.length > 0
            ? ssimValues.reduce((a, b) => a + b, 0) / ssimValues.length
            : 0;
        return {
            startIndex,
            endIndex,
            startTime: frames[startIndex].timestamp,
            endTime: frames[endIndex].timestamp,
            avgSSIM,
        };
    }
}
//# sourceMappingURL=frame-quality.js.map