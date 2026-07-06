import type { ExecFileFn } from "./composer-types.js";
/** Information about a single extracted frame. */
export interface FrameInfo {
    /** Timestamp of the frame in seconds (index * interval). */
    timestamp: number;
    /** Sequential frame index (0-based). */
    index: number;
    /** SSIM with the previous frame (1.0 = identical). Undefined for the first frame. */
    ssimWithPrev?: number;
}
/** A contiguous range of bad frames. */
export interface BadFrameRange {
    /** Index of the first bad frame in the range. */
    startIndex: number;
    /** Index of the last bad frame in the range. */
    endIndex: number;
    /** Timestamp of the first bad frame in seconds. */
    startTime: number;
    /** Timestamp of the last bad frame in seconds. */
    endTime: number;
    /** Average SSIM across all frames in the range. */
    avgSSIM: number;
}
/** Result of frame quality analysis. */
export interface FrameQualityResult {
    /** All extracted frames with their SSIM values. */
    frames: FrameInfo[];
    /** Ranges of consecutive bad frames. */
    badFrameRanges: BadFrameRange[];
    /** Average SSIM across all frame pairs. */
    averageSSIM: number;
    /** Minimum SSIM observed across all frame pairs. */
    minSSIM: number;
    /** Whether the analysis succeeded. */
    success: boolean;
    /** Error message if success is false. */
    error?: string;
}
/** Result of auto-trim analysis. */
export interface AutoTrimResult {
    /** Trim start point in seconds (0 if no trim needed at the start). */
    trimStart: number;
    /** Trim end point in seconds (null if no trim needed at the end). */
    trimEnd: number | null;
    /** Duration in seconds after trimming. */
    trimmedDuration: number;
    /** Original video duration in seconds. */
    originalDuration: number;
    /** Total number of bad frames detected (across all ranges). */
    badFrameCount: number;
    /** Whether the trim analysis succeeded. */
    success: boolean;
    /** Error message if success is false. */
    error?: string;
}
/** A detected scene cut point. */
export interface SceneCut {
    /** Timestamp of the scene cut in seconds. */
    timestamp: number;
    /** Frame index at the scene cut. */
    frameIndex: number;
}
/** Configuration for frame quality checking. */
export interface FrameQualityConfig {
    /** Path to the ffmpeg binary. */
    ffmpegPath: string;
    /** Path to the ffprobe binary. */
    ffprobePath: string;
    /** Interval between extracted frames in seconds (default 0.5). */
    frameInterval: number;
    /** SSIM threshold below which a frame is considered "bad" (default 0.6). */
    ssimThreshold: number;
    /** Minimum number of consecutive bad frames to trigger a trim (default 2). */
    minConsecutiveBadFrames: number;
    /** Timeout for ffmpeg operations in milliseconds. */
    timeoutMs: number;
}
/** Default frame quality configuration. */
export declare const DEFAULT_FRAME_QUALITY_CONFIG: FrameQualityConfig;
/**
 * Frame-level video quality checker using FFmpeg.
 *
 * Provides frame extraction, inter-frame SSIM computation, bad frame detection,
 * auto-trim point calculation, and scene cut detection.
 *
 * The exec function is injectable for testing, following the same pattern as
 * VideoComposer in composer.ts.
 */
export declare class FrameQualityChecker {
    private readonly config;
    private readonly execFn;
    /**
     * @param config Partial configuration overrides (merged with defaults).
     * @param execFn Injectable exec function for testing. Defaults to promisified execFile.
     */
    constructor(config?: Partial<FrameQualityConfig>, execFn?: ExecFileFn);
    /**
     * Probe the duration of a video file using ffprobe.
     *
     * @param videoPath Path to the input video file.
     * @returns Duration in seconds, or 0 if it cannot be determined.
     * @throws If ffprobe fails or the file is invalid.
     */
    probeDuration(videoPath: string): Promise<number>;
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
    extractFrames(videoPath: string, outputDir: string, interval: number): Promise<string[]>;
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
    computeInterFrameSSIM(videoPath: string, interval: number): Promise<FrameInfo[]>;
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
    detectBadFrames(videoPath: string): Promise<FrameQualityResult>;
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
    autoTrim(videoPath: string): Promise<AutoTrimResult>;
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
    detectSceneCuts(videoPath: string, sceneThreshold?: number): Promise<SceneCut[]>;
    /**
     * Compute SSIM between two frame images using FFmpeg's ssim filter.
     *
     * Runs:
     *   ffmpeg -i frame1.png -i frame2.png -filter_complex "[0:v][1:v]ssim" -f null -
     *
     * Parses the "All:" SSIM value from stderr. Returns 0 if parsing fails.
     */
    private computeSSIM;
    /**
     * Create a BadFrameRange from a start and end frame index.
     * Computes the average SSIM across all frames in the range.
     */
    private createBadFrameRange;
}
//# sourceMappingURL=frame-quality.d.ts.map