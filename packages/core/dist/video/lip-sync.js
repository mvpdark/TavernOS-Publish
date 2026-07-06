// Lip-sync module — multi-backend lip synchronization for AI short-drama videos.
//
// TavernOS generates video clips via Seedance/Jimeng, then applies TTS voiceover.
// Without lip-sync, the character's mouth movements do not match the spoken
// dialogue. This module provides a pluggable lip-sync layer with multiple
// backend implementations:
//
//   1. Wav2Lip        — open-source GAN-based, input video + audio → lip-synced video
//   2. SadTalker      — open-source, single portrait image + audio → talking-head video
//   3. MuseTalk       — open-source, real-time high-fidelity lip-sync (latent-space inpainting)
//   4. Seedance Audio — Seedance 2.0 omni_reference mode (generation-time sync, not post-processing)
//   5. Stub           — no-op backend for development/testing
//
// The LipSyncManager auto-selects the best available backend and supports
// custom backend registration. Python-based backends (Wav2Lip, SadTalker,
// MuseTalk) are invoked via child_process.execFile with configurable timeouts,
// mirroring the ExecFileFn injection pattern used by VideoComposer and
// AudioRhythmAnalyzer.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, statSync } from "node:fs";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join, dirname, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createVideoGenClient, } from "./client.js";
import { VideoDownloader } from "./video-downloader.js";
const execFileAsync = promisify(execFile);
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
/** Default timeout for Python subprocess calls (10 minutes). */
const DEFAULT_LIPSYNC_TIMEOUT_MS = 600_000;
/** Default FFprobe timeout (30 seconds). */
const DEFAULT_FFPROBE_TIMEOUT_MS = 30_000;
/** Default Python version-check timeout (10 seconds). */
const DEFAULT_PYTHON_CHECK_TIMEOUT_MS = 10_000;
/**
 * Default lip-sync provider configurations.
 *
 * Seedance audio is enabled by default because it requires no local
 * deployment — it leverages the existing Seedance 2.0 API's omni_reference
 * mode. The Python-based backends are disabled until the user configures
 * their local environments.
 */
export const DEFAULT_LIPSYNC_CONFIGS = [
    {
        provider: "seedance-audio",
        enabled: true,
    },
    {
        provider: "wav2lip",
        enabled: false,
        pythonEnv: "python",
        scriptPath: "",
        modelPath: "",
    },
    {
        provider: "sadtalker",
        enabled: false,
        pythonEnv: "python",
        scriptPath: "",
        modelPath: "",
    },
    {
        provider: "musetalk",
        enabled: false,
        pythonEnv: "python",
        scriptPath: "",
        modelPath: "",
    },
];
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/**
 * Check whether a Python executable is available and functional.
 *
 * Runs `<pythonPath> --version` with a short timeout. Returns false on any
 * error (missing binary, timeout, non-zero exit) without throwing.
 *
 * @param pythonPath - Path to the Python executable (e.g. "python", "python3",
 *   or a full path like "C:\\envs\\wav2lip\\python.exe").
 * @returns True if Python responded with a version string.
 */
export async function checkPythonEnv(pythonPath) {
    if (!pythonPath)
        return false;
    try {
        const result = await execFileAsync(pythonPath, ["--version"], {
            timeout: DEFAULT_PYTHON_CHECK_TIMEOUT_MS,
            maxBuffer: 1024,
        });
        // Python 3 prints "Python 3.x.x" to stdout; Python 2 prints to stderr.
        const output = `${result.stdout}${result.stderr}`;
        return /Python\s+\d/.test(output);
    }
    catch {
        return false;
    }
}
/**
 * Check whether a model file (or directory) exists on disk.
 *
 * Synchronous and non-blocking in practice (a single stat call). For
 * directories, returns true only if the path exists and is a directory.
 *
 * @param modelPath - File or directory path to check.
 * @returns True if the path exists.
 */
export function checkModelFile(modelPath) {
    if (!modelPath)
        return false;
    try {
        return existsSync(modelPath) && statSync(modelPath).size > 0;
    }
    catch {
        return false;
    }
}
/**
 * Get the duration of a video file in seconds using ffprobe.
 *
 * @param videoPath - Local file path to the video.
 * @param ffprobePath - Path to ffprobe binary (default "ffprobe").
 * @returns Duration in seconds, or 0 if probing fails.
 */
export async function getVideoDuration(videoPath, ffprobePath = "ffprobe") {
    try {
        const args = [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            videoPath,
        ];
        const { stdout } = await execFileAsync(ffprobePath, args, {
            timeout: DEFAULT_FFPROBE_TIMEOUT_MS,
        });
        const duration = parseFloat(stdout.trim());
        return Number.isFinite(duration) ? duration : 0;
    }
    catch {
        return 0;
    }
}
/**
 * Validate that an audio file path has a supported format (WAV or MP3).
 *
 * @param audioPath - File path to check.
 * @returns True if the extension is .wav or .mp3 (case-insensitive).
 */
export function validateAudioFormat(audioPath) {
    if (!audioPath)
        return false;
    const ext = extname(audioPath).toLowerCase();
    return ext === ".wav" || ext === ".mp3";
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Resolve the local file path for a video, preferring the local path over URL.
 */
function resolveVideoPath(request) {
    return request.videoLocalPath || request.videoUrl;
}
/**
 * Resolve the local file path for audio, preferring the local path over URL.
 */
function resolveAudioPath(request) {
    return request.audioLocalPath || request.audioUrl;
}
/**
 * Build a failure LipSyncResult.
 */
function failureResult(provider, outputPath, error, startTime) {
    return {
        success: false,
        outputPath,
        duration: 0,
        provider,
        processingTime: (Date.now() - startTime) / 1000,
        error,
    };
}
/**
 * Build a success LipSyncResult.
 */
function successResult(provider, outputPath, duration, startTime, warnings) {
    return {
        success: true,
        outputPath,
        duration,
        provider,
        processingTime: (Date.now() - startTime) / 1000,
        warnings,
    };
}
// ---------------------------------------------------------------------------
// StubBackend — no-op backend for development and testing
// ---------------------------------------------------------------------------
/**
 * Stub lip-sync backend that performs no actual processing.
 *
 * Returns a success result immediately with the input video path as the
 * output. Useful for development, testing, and environments where no
 * lip-sync backend is deployed. Mirrors the stub pattern from video/stub.ts.
 */
export class StubBackend {
    provider = "custom";
    isAvailable() {
        return true;
    }
    async sync(request) {
        const startTime = Date.now();
        const videoPath = resolveVideoPath(request);
        // Try to get the real duration; fall back to 0.
        let duration = 0;
        try {
            duration = await getVideoDuration(videoPath);
        }
        catch {
            // Non-fatal: stub mode may not have ffprobe.
        }
        return successResult(this.provider, request.outputPath || videoPath, duration, startTime, ["Stub backend: no actual lip-sync processing was performed."]);
    }
}
// ---------------------------------------------------------------------------
// Wav2LipBackend — Python subprocess (GAN-based lip-sync)
// ---------------------------------------------------------------------------
/**
 * Wav2Lip backend — invokes the Wav2Lip inference script via Python subprocess.
 *
 * Wav2Lip takes an existing video and an audio file, then modifies the lip
 * region of the video to match the audio. It uses a GAN-based model for
 * high-accuracy lip synchronization.
 *
 * Command reference (from https://github.com/Rudrabha/Wav2Lip):
 *   python inference.py \
 *     --checkpoint_path <model> \
 *     --face <video> \
 *     --audio <audio> \
 *     --outfile <output> \
 *     --pads 0 20 0 0 \
 *     --resize_factor 1 \
 *     --face_det_batch_size 16 \
 *     --wav2lip_batch_size 128
 *
 * The exec function is injectable for testability, mirroring the pattern
 * used by VideoComposer and AudioRhythmAnalyzer.
 */
export class Wav2LipBackend {
    provider = "wav2lip";
    config;
    execFn;
    timeoutMs;
    constructor(config, execFn, timeoutMs = DEFAULT_LIPSYNC_TIMEOUT_MS) {
        this.config = config;
        this.execFn = execFn ?? (async (file, args, opts) => {
            const result = await execFileAsync(file, args, opts);
            return { stdout: String(result.stdout), stderr: String(result.stderr) };
        });
        this.timeoutMs = timeoutMs;
    }
    /**
     * Quick availability check — verifies that the Python environment and
     * script path are configured. Does NOT run Python (non-blocking).
     *
     * For a full runtime check (including Python responsiveness), use
     * `checkPythonEnv()` separately.
     */
    isAvailable() {
        return (this.config.enabled &&
            !!this.config.pythonEnv &&
            !!this.config.scriptPath &&
            existsSync(this.config.scriptPath) &&
            (!this.config.modelPath || existsSync(this.config.modelPath)));
    }
    /**
     * Execute Wav2Lip lip synchronization.
     *
     * Flow:
     *   1. Validate inputs (video path, audio path, model path)
     *   2. Build command-line arguments for inference.py
     *   3. Run Python subprocess with timeout
     *   4. Verify output file was created
     *   5. Return result with duration
     */
    async sync(request) {
        const startTime = Date.now();
        const videoPath = resolveVideoPath(request);
        const audioPath = resolveAudioPath(request);
        // Validate inputs
        if (!videoPath) {
            return failureResult(this.provider, request.outputPath, "No video path provided (set videoLocalPath or videoUrl).", startTime);
        }
        if (!audioPath) {
            return failureResult(this.provider, request.outputPath, "No audio path provided (set audioLocalPath or audioUrl).", startTime);
        }
        const checkpointPath = this.resolveCheckpointPath(request.options?.quality);
        if (!checkpointPath || !checkModelFile(checkpointPath)) {
            return failureResult(this.provider, request.outputPath, `Wav2Lip model checkpoint not found at: ${checkpointPath}. ` +
                `Configure modelPath in LipSyncProviderConfig, or download from ` +
                `https://github.com/Rudrabha/Wav2Lip#getting-the-weights`, startTime);
        }
        // Build command-line arguments
        const args = this.buildArgs(videoPath, audioPath, checkpointPath, request.outputPath, request.options);
        // Ensure output directory exists
        try {
            await mkdir(dirname(request.outputPath), { recursive: true });
        }
        catch {
            // Directory may already exist; ignore.
        }
        // Run Python subprocess
        try {
            await this.execFn(this.config.pythonEnv, args, {
                timeout: this.timeoutMs,
                maxBuffer: 50 * 1024 * 1024,
            });
        }
        catch (err) {
            const errObj = err;
            // Detect timeout
            if (errObj.killed || errObj.signal === "SIGTERM") {
                return failureResult(this.provider, request.outputPath, `Wav2Lip processing timed out after ${this.timeoutMs / 1000}s.`, startTime);
            }
            const stderr = errObj.stderr ?? "";
            let errorMsg = errObj.message ?? String(err);
            // Provide actionable hints for common errors
            if (/No module named|ModuleNotFoundError|ImportError/i.test(stderr)) {
                errorMsg =
                    "Wav2Lip Python dependencies are not installed. " +
                        "Run: pip install -r requirements.txt  (in the Wav2Lip directory)";
            }
            else if (/s3fd\.pth|face_detection/i.test(stderr)) {
                errorMsg =
                    "Face detection model (s3fd.pth) not found. " +
                        "Download it to face_detection/detection/sfd/s3fd.pth. " +
                        "See: https://github.com/Rudrabha/Wav2Lip#prerequisites";
            }
            else if (/CUDA|cuda|GPU/i.test(stderr) && /error/i.test(stderr)) {
                errorMsg =
                    "GPU/CUDA error during Wav2Lip processing. " +
                        "Ensure CUDA is available or run on CPU. Details: " + stderr.slice(0, 500);
            }
            return failureResult(this.provider, request.outputPath, `Wav2Lip processing failed: ${errorMsg}`, startTime);
        }
        // Verify output file
        if (!existsSync(request.outputPath)) {
            return failureResult(this.provider, request.outputPath, "Wav2Lip completed but output file was not found at the expected path. " +
                "Check that --outfile is writable and ffmpeg is installed.", startTime);
        }
        const duration = await getVideoDuration(request.outputPath);
        return successResult(this.provider, request.outputPath, duration, startTime);
    }
    /**
     * Resolve the model checkpoint path based on quality option.
     *
     * - "enhanced" → wav2lip_gan.pth (better visual quality, slightly less accurate)
     * - "fast" (default) → wav2lip.pth (highly accurate lip-sync)
     */
    resolveCheckpointPath(quality) {
        const base = this.config.modelPath ?? "";
        if (!base)
            return "";
        // If modelPath points directly to a .pth file, use it as-is.
        if (existsSync(base) && statSync(base).isFile())
            return base;
        // Otherwise, treat modelPath as a directory and resolve the checkpoint.
        const filename = quality === "enhanced" ? "wav2lip_gan.pth" : "wav2lip.pth";
        return join(base, filename);
    }
    /**
     * Build Wav2Lip command-line arguments.
     *
     * Reference: python inference.py --checkpoint_path <ckpt> --face <video>
     *   --audio <audio> --outfile <output> --pads <t b l r> --resize_factor <n>
     *   --face_det_batch_size <n> --wav2lip_batch_size <n> [--nosmooth]
     */
    buildArgs(videoPath, audioPath, checkpointPath, outputPath, options) {
        const args = [
            this.config.scriptPath,
            "--checkpoint_path", checkpointPath,
            "--face", videoPath,
            "--audio", audioPath,
            "--outfile", outputPath,
        ];
        // Padding: adjust face bounding box. Default "0 20 0 0" includes chin.
        // When padMode is "crop", use zero padding for a tighter face crop.
        if (options?.padMode === "crop") {
            args.push("--pads", "0", "0", "0", "0");
        }
        else {
            args.push("--pads", "0", "20", "0", "0");
        }
        // Resize factor: lower values produce lower-resolution (faster) output.
        // resolution "96" → factor 4; "512" (default) → factor 1.
        const resizeFactor = options?.resolution === "96" ? "4" : "1";
        args.push("--resize_factor", resizeFactor);
        // Batch sizes (defaults from Wav2Lip)
        args.push("--face_det_batch_size", "16");
        args.push("--wav2lip_batch_size", "128");
        // Disable smoothing for problematic detections
        if (options?.quality === "enhanced") {
            args.push("--nosmooth");
        }
        return args;
    }
}
// ---------------------------------------------------------------------------
// SadTalkerBackend — Python subprocess (single image + audio → talking head)
// ---------------------------------------------------------------------------
/**
 * SadTalker backend — generates a talking-head video from a single portrait
 * image and an audio file.
 *
 * Unlike Wav2Lip (which modifies an existing video), SadTalker generates a
 * new video from a still image. This is useful when no suitable video clip
 * exists, or when a character needs to be "brought to life" from a
 * reference portrait.
 *
 * Command reference (from https://github.com/OpenTalker/SadTalker):
 *   python inference.py \
 *     --driven_audio <audio.wav> \
 *     --source_image <image.png> \
 *     --result_dir <output_dir> \
 *     --enhancer gfpgan \
 *     --preprocess full \
 *     --still
 *
 * The exec function is injectable for testability.
 */
export class SadTalkerBackend {
    provider = "sadtalker";
    config;
    execFn;
    timeoutMs;
    constructor(config, execFn, timeoutMs = DEFAULT_LIPSYNC_TIMEOUT_MS) {
        this.config = config;
        this.execFn = execFn ?? (async (file, args, opts) => {
            const result = await execFileAsync(file, args, opts);
            return { stdout: String(result.stdout), stderr: String(result.stderr) };
        });
        this.timeoutMs = timeoutMs;
    }
    /**
     * Quick availability check — verifies Python env and script path.
     * Does NOT run Python (non-blocking).
     */
    isAvailable() {
        return (this.config.enabled &&
            !!this.config.pythonEnv &&
            !!this.config.scriptPath &&
            existsSync(this.config.scriptPath) &&
            (!this.config.modelPath || existsSync(this.config.modelPath)));
    }
    /**
     * Execute SadTalker lip synchronization.
     *
     * Flow:
     *   1. Validate inputs (character image, audio path)
     *   2. Build command-line arguments for inference.py
     *   3. Run Python subprocess with timeout
     *   4. Locate the output file (SadTalker saves to result_dir with a timestamp)
     *   5. Return result
     */
    async sync(request) {
        const startTime = Date.now();
        const audioPath = resolveAudioPath(request);
        // SadTalker requires a character reference image
        const sourceImage = request.characterImage;
        if (!sourceImage) {
            return failureResult(this.provider, request.outputPath, "SadTalker requires a characterImage (portrait photo). " +
                "Set characterImage in the LipSyncRequest.", startTime);
        }
        if (!audioPath) {
            return failureResult(this.provider, request.outputPath, "No audio path provided (set audioLocalPath or audioUrl).", startTime);
        }
        // Check model path
        if (this.config.modelPath && !existsSync(this.config.modelPath)) {
            return failureResult(this.provider, request.outputPath, `SadTalker model directory not found: ${this.config.modelPath}. ` +
                `Download checkpoints from https://github.com/OpenTalker/SadTalker#2-download-models`, startTime);
        }
        // SadTalker writes to result_dir, not a specific output file.
        // Use the dirname of outputPath as result_dir.
        const resultDir = dirname(request.outputPath);
        try {
            await mkdir(resultDir, { recursive: true });
        }
        catch {
            // Directory may already exist; ignore.
        }
        const args = this.buildArgs(sourceImage, audioPath, resultDir, request.options);
        let stdout;
        try {
            const result = await this.execFn(this.config.pythonEnv, args, {
                timeout: this.timeoutMs,
                maxBuffer: 50 * 1024 * 1024,
                cwd: dirname(this.config.scriptPath),
            });
            stdout = result.stdout;
        }
        catch (err) {
            const errObj = err;
            if (errObj.killed || errObj.signal === "SIGTERM") {
                return failureResult(this.provider, request.outputPath, `SadTalker processing timed out after ${this.timeoutMs / 1000}s.`, startTime);
            }
            const stderr = errObj.stderr ?? "";
            let errorMsg = errObj.message ?? String(err);
            if (/No module named|ModuleNotFoundError|ImportError/i.test(stderr)) {
                errorMsg =
                    "SadTalker Python dependencies are not installed. " +
                        "Run: pip install -r requirements.txt  (in the SadTalker directory)";
            }
            else if (/gfpgan|enhancer/i.test(stderr) && /error/i.test(stderr)) {
                errorMsg =
                    "GFPGAN enhancer failed. Try running without --enhancer, or " +
                        "download the GFPGAN weights. Details: " + stderr.slice(0, 500);
            }
            return failureResult(this.provider, request.outputPath, `SadTalker processing failed: ${errorMsg}`, startTime);
        }
        // SadTalker saves output as results/<timestamp>/<basename>.mp4
        // Try to locate the generated file.
        const outputFilePath = await this.locateSadTalkerOutput(stdout, resultDir);
        if (!outputFilePath) {
            return failureResult(this.provider, request.outputPath, "SadTalker completed but no output video was found in: " + resultDir, startTime);
        }
        // If the located file differs from the requested outputPath, note it.
        const warnings = [];
        let finalPath = request.outputPath;
        if (outputFilePath !== request.outputPath) {
            warnings.push(`SadTalker output saved to: ${outputFilePath} ` +
                `(requested path was: ${request.outputPath})`);
            finalPath = outputFilePath;
        }
        const duration = await getVideoDuration(finalPath);
        return successResult(this.provider, finalPath, duration, startTime, warnings.length > 0 ? warnings : undefined);
    }
    /**
     * Build SadTalker command-line arguments.
     *
     * Reference: python inference.py --driven_audio <audio> --source_image <image>
     *   --result_dir <dir> --enhancer gfpgan --preprocess full --still
     */
    buildArgs(sourceImage, audioPath, resultDir, options) {
        const args = [
            this.config.scriptPath,
            "--driven_audio", audioPath,
            "--source_image", sourceImage,
            "--result_dir", resultDir,
        ];
        // Enhancer: GFPGAN for face enhancement (default on for better quality)
        if (options?.quality !== "fast") {
            args.push("--enhancer", "gfpgan");
        }
        // Preprocess mode: "full" for full-body, "crop" for face-only
        if (options?.padMode === "crop") {
            args.push("--preprocess", "crop");
        }
        else {
            args.push("--preprocess", "full");
            args.push("--still");
        }
        // Resolution: 512 or 256
        if (options?.resolution === "512") {
            args.push("--size", "512");
        }
        else {
            args.push("--size", "256");
        }
        return args;
    }
    /**
     * Locate the SadTalker output video file.
     *
     * SadTalker prints the output path to stdout and also saves it under
     * result_dir/<timestamp>/. This method parses stdout for the path, then
     * falls back to scanning the result directory for the most recent .mp4.
     */
    async locateSadTalkerOutput(stdout, resultDir) {
        // Try to parse the output path from stdout
        const match = stdout.match(/saved to:\s*(.+\.mp4)/i);
        if (match && match[1]) {
            const path = match[1].trim();
            if (existsSync(path))
                return path;
        }
        // Fallback: scan result_dir for the most recently modified .mp4
        try {
            const { readdir } = await import("node:fs/promises");
            const entries = await readdir(resultDir, { withFileTypes: true });
            let latestFile;
            let latestTime = 0;
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subDir = join(resultDir, entry.name);
                    const subEntries = await readdir(subDir);
                    for (const subEntry of subEntries) {
                        if (subEntry.endsWith(".mp4")) {
                            const fullPath = join(subDir, subEntry);
                            const stat = statSync(fullPath);
                            if (stat.mtimeMs > latestTime) {
                                latestTime = stat.mtimeMs;
                                latestFile = fullPath;
                            }
                        }
                    }
                }
                else if (entry.name.endsWith(".mp4")) {
                    const fullPath = join(resultDir, entry.name);
                    const stat = statSync(fullPath);
                    if (stat.mtimeMs > latestTime) {
                        latestTime = stat.mtimeMs;
                        latestFile = fullPath;
                    }
                }
            }
            return latestFile;
        }
        catch {
            return undefined;
        }
    }
}
// ---------------------------------------------------------------------------
// MuseTalkBackend — Python subprocess (real-time high-fidelity lip-sync)
// ---------------------------------------------------------------------------
/**
 * MuseTalk backend — real-time high-quality lip synchronization using
 * latent-space inpainting.
 *
 * MuseTalk modifies the lip region of a video to match the input audio,
 * operating in the latent space of a VAE. It achieves 30fps+ on NVIDIA
 * Tesla V100 and produces higher-fidelity results than Wav2Lip.
 *
 * Unlike Wav2Lip's direct inference.py call, MuseTalk uses a module-based
 * invocation with a YAML config file. On Windows, the ffmpeg_path must be
 * specified explicitly.
 *
 * Command reference (from https://github.com/TMElyralab/MuseTalk):
 *   # Linux: sh inference.sh v1.5 normal
 *   # Windows:
 *   python -m scripts.inference \
 *     --inference_config configs/inference/test.yaml \
 *     --result_dir results/test \
 *     --unet_model_path models/musetalkV15/unet.pth \
 *     --unet_config models/musetalkV15/musetalk.json \
 *     --version v15 \
 *     --ffmpeg_path <ffmpeg_bin_dir>
 *
 * The config YAML contains:
 *   video_path: <path to input video>
 *   audio_path: <path to input audio>
 *
 * The exec function is injectable for testability.
 */
export class MuseTalkBackend {
    provider = "musetalk";
    config;
    execFn;
    timeoutMs;
    constructor(config, execFn, timeoutMs = DEFAULT_LIPSYNC_TIMEOUT_MS) {
        this.config = config;
        this.execFn = execFn ?? (async (file, args, opts) => {
            const result = await execFileAsync(file, args, opts);
            return { stdout: String(result.stdout), stderr: String(result.stderr) };
        });
        this.timeoutMs = timeoutMs;
    }
    /**
     * Quick availability check — verifies Python env, script path, and model.
     * Does NOT run Python or check GPU (non-blocking).
     */
    isAvailable() {
        return (this.config.enabled &&
            !!this.config.pythonEnv &&
            !!this.config.scriptPath &&
            existsSync(this.config.scriptPath) &&
            !!this.config.modelPath &&
            existsSync(this.config.modelPath));
    }
    /**
     * Execute MuseTalk lip synchronization.
     *
     * Flow:
     *   1. Validate inputs (video path, audio path, model path)
     *   2. Write a temporary YAML config file with video_path and audio_path
     *   3. Build command-line arguments for `python -m scripts.inference`
     *   4. Run Python subprocess with timeout
     *   5. Locate the output video (MuseTalk saves to result_dir)
     *   6. Return result
     */
    async sync(request) {
        const startTime = Date.now();
        const videoPath = resolveVideoPath(request);
        const audioPath = resolveAudioPath(request);
        if (!videoPath) {
            return failureResult(this.provider, request.outputPath, "No video path provided (set videoLocalPath or videoUrl).", startTime);
        }
        if (!audioPath) {
            return failureResult(this.provider, request.outputPath, "No audio path provided (set audioLocalPath or audioUrl).", startTime);
        }
        // Resolve model paths
        const { unetModelPath, unetConfigPath, version } = this.resolveModelPaths(request.options?.highRes);
        if (!unetModelPath || !existsSync(unetModelPath)) {
            return failureResult(this.provider, request.outputPath, `MuseTalk model not found: ${unetModelPath}. ` +
                `Download weights from https://github.com/TMElyralab/MuseTalk#download-weights`, startTime);
        }
        // Ensure output directory exists
        const resultDir = dirname(request.outputPath);
        try {
            await mkdir(resultDir, { recursive: true });
        }
        catch {
            // Directory may already exist; ignore.
        }
        // Write temporary YAML config file
        const configPath = join(tmpdir(), `musetalk-config-${randomUUID()}.yaml`);
        const configContent = `video_path: "${videoPath.replace(/\\/g, "/")}"\n` +
            `audio_path: "${audioPath.replace(/\\/g, "/")}"\n`;
        try {
            await writeFile(configPath, configContent, "utf8");
        }
        catch (err) {
            return failureResult(this.provider, request.outputPath, `Failed to write MuseTalk config file: ${err.message}`, startTime);
        }
        const args = this.buildArgs(configPath, resultDir, unetModelPath, unetConfigPath, version);
        try {
            await this.execFn(this.config.pythonEnv, args, {
                timeout: this.timeoutMs,
                maxBuffer: 50 * 1024 * 1024,
                cwd: dirname(this.config.scriptPath),
            });
        }
        catch (err) {
            const errObj = err;
            if (errObj.killed || errObj.signal === "SIGTERM") {
                return failureResult(this.provider, request.outputPath, `MuseTalk processing timed out after ${this.timeoutMs / 1000}s.`, startTime);
            }
            const stderr = errObj.stderr ?? "";
            let errorMsg = errObj.message ?? String(err);
            if (/No module named|ModuleNotFoundError|ImportError/i.test(stderr)) {
                errorMsg =
                    "MuseTalk Python dependencies are not installed. " +
                        "Run: pip install -r requirements.txt  (in the MuseTalk directory)";
            }
            else if (/CUDA|cuda|GPU|RuntimeError.*device/i.test(stderr)) {
                errorMsg =
                    "GPU/CUDA error during MuseTalk processing. " +
                        "MuseTalk requires an NVIDIA GPU. Details: " + stderr.slice(0, 500);
            }
            else if (/ffmpeg/i.test(stderr) && /error|not found/i.test(stderr)) {
                errorMsg =
                    "FFmpeg not found. Set ffmpegPath in LipSyncProviderConfig " +
                        "or add ffmpeg to PATH. Details: " + stderr.slice(0, 500);
            }
            return failureResult(this.provider, request.outputPath, `MuseTalk processing failed: ${errorMsg}`, startTime);
        }
        finally {
            // Clean up temp config file (best-effort).
            try {
                await unlink(configPath);
            }
            catch {
                // ignore
            }
        }
        // Locate the output video
        const outputFilePath = await this.locateMuseTalkOutput(resultDir, basename(request.outputPath));
        if (!outputFilePath) {
            return failureResult(this.provider, request.outputPath, "MuseTalk completed but no output video was found in: " + resultDir, startTime);
        }
        const warnings = [];
        let finalPath = request.outputPath;
        if (outputFilePath !== request.outputPath) {
            warnings.push(`MuseTalk output saved to: ${outputFilePath} ` +
                `(requested path was: ${request.outputPath})`);
            finalPath = outputFilePath;
        }
        const duration = await getVideoDuration(finalPath);
        return successResult(this.provider, finalPath, duration, startTime, warnings.length > 0 ? warnings : undefined);
    }
    /**
     * Resolve MuseTalk model paths based on the highRes option.
     *
     * - highRes=true (default): v1.5 model (models/musetalkV15/unet.pth)
     * - highRes=false: v1.0 model (models/musetalk/pytorch_model.bin)
     */
    resolveModelPaths(highRes) {
        const base = this.config.modelPath ?? "";
        if (highRes !== false) {
            return {
                unetModelPath: join(base, "musetalkV15", "unet.pth"),
                unetConfigPath: join(base, "musetalkV15", "musetalk.json"),
                version: "v15",
            };
        }
        return {
            unetModelPath: join(base, "musetalk", "pytorch_model.bin"),
            unetConfigPath: join(base, "musetalk", "musetalk.json"),
            version: "v1",
        };
    }
    /**
     * Build MuseTalk command-line arguments.
     *
     * Uses module-based invocation: python -m scripts.inference
     */
    buildArgs(configPath, resultDir, unetModelPath, unetConfigPath, version) {
        const args = [
            "-m", "scripts.inference",
            "--inference_config", configPath,
            "--result_dir", resultDir,
            "--unet_model_path", unetModelPath,
            "--unet_config", unetConfigPath,
            "--version", version,
        ];
        // FFmpeg path (required on Windows)
        if (this.config.ffmpegPath) {
            args.push("--ffmpeg_path", this.config.ffmpegPath);
        }
        return args;
    }
    /**
     * Locate the MuseTalk output video file.
     *
     * MuseTalk saves output as <result_dir>/<video_basename>_musetalk.mp4
     * or <result_dir>/output.mp4.
     */
    async locateMuseTalkOutput(resultDir, expectedName) {
        try {
            const { readdir } = await import("node:fs/promises");
            const entries = await readdir(resultDir, { withFileTypes: true });
            // Prefer the expected file name
            const expectedPath = join(resultDir, expectedName);
            if (existsSync(expectedPath))
                return expectedPath;
            // Look for .mp4 files, prefer ones with "musetalk" in the name
            let bestMatch;
            let bestTime = 0;
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith(".mp4")) {
                    const fullPath = join(resultDir, entry.name);
                    const stat = statSync(fullPath);
                    // Prefer musetalk-named files, then most recent
                    if (entry.name.includes("musetalk") ||
                        entry.name === "output.mp4" ||
                        !bestMatch) {
                        if (stat.mtimeMs > bestTime || entry.name.includes("musetalk")) {
                            bestTime = stat.mtimeMs;
                            bestMatch = fullPath;
                        }
                    }
                }
            }
            return bestMatch;
        }
        catch {
            return undefined;
        }
    }
}
// ---------------------------------------------------------------------------
// SeedanceAudioBackend — Seedance 2.0 omni_reference (generation-time sync)
// ---------------------------------------------------------------------------
/**
 * Seedance audio backend — uses Seedance 2.0's omni_reference mode to
 * achieve lip synchronization at generation time.
 *
 * Unlike Wav2Lip/SadTalker/MuseTalk (which post-process an existing video),
 * this backend is fundamentally different: it attaches the TTS audio as a
 * `reference_audio` to the video generation request, so the generated video
 * already has synchronized lip movements. There is no separate post-processing
 * step.
 *
 * When used via the ILipSyncBackend.sync() interface, this backend re-generates
 * the video with the audio reference attached. In practice, it is more efficient
 * to call `buildAudioReferenceRequest()` before generation to avoid producing
 * an unsynchronized video in the first place.
 *
 * The backend requires a VideoGenConfig to create a VideoGenClient for
 * re-generation. If no config is provided, sync() returns a descriptive error.
 */
export class SeedanceAudioBackend {
    provider = "seedance-audio";
    config;
    genClient;
    genConfig;
    timeoutMs;
    /**
     * @param config - Provider configuration (apiUrl, apiKey).
     * @param genConfig - Optional VideoGenConfig for creating a generation client.
     *   When provided, sync() can re-generate the video with audio reference.
     * @param timeoutMs - Timeout for the generation request (default 600s).
     */
    constructor(config, genConfig, timeoutMs = DEFAULT_LIPSYNC_TIMEOUT_MS) {
        this.config = config;
        this.genConfig = genConfig;
        this.timeoutMs = timeoutMs;
        if (genConfig) {
            // Override API credentials from the lip-sync config if provided
            const mergedConfig = {
                ...genConfig,
                apiKey: config.apiKey || genConfig.apiKey,
                baseUrl: config.apiUrl || genConfig.baseUrl,
            };
            this.genClient = createVideoGenClient(mergedConfig);
        }
    }
    /**
     * Availability check — Seedance audio is available when an API key or
     * a generation client is configured.
     */
    isAvailable() {
        return (this.config.enabled &&
            (!!this.genClient || !!this.config.apiUrl || !!this.config.apiKey));
    }
    /**
     * Execute lip synchronization by re-generating the video with audio reference.
     *
     * This is a "generation-time sync" approach: instead of post-processing,
     * a new video is generated with the TTS audio attached as a reference.
     * The original video URL is used as a reference image.
     *
     * If no VideoGenClient is available, returns an error explaining that
     * a generation config is required.
     */
    async sync(request) {
        const startTime = Date.now();
        if (!this.genClient) {
            return failureResult(this.provider, request.outputPath, "SeedanceAudioBackend requires a VideoGenConfig to re-generate the video. " +
                "Pass a genConfig to the constructor, or use buildAudioReferenceRequest() " +
                "to add audio reference to the generation request before generating.", startTime);
        }
        const audioUrl = request.audioUrl;
        if (!audioUrl) {
            return failureResult(this.provider, request.outputPath, "No audio URL provided for Seedance audio reference.", startTime);
        }
        // Build a generation request with audio reference.
        // The original video is used as a reference image (first frame).
        const genRequest = {
            prompt: "Lip-synced video regeneration with audio reference",
            referenceImageUrl: request.characterImage || request.videoUrl,
            referenceAudioUrls: [audioUrl],
            duration: this.genConfig?.duration ?? 5,
        };
        try {
            const response = await this.genClient.generate(genRequest);
            // response.videoUrl 是远程 URL，下游代码需要本地文件路径，因此下载到本地
            const downloader = new VideoDownloader({ baseDir: dirname(request.outputPath) });
            const clipId = `seedance-lipsync-${randomUUID()}`;
            const dlResult = await downloader.download(response.videoUrl, clipId);
            if (!dlResult.success || !dlResult.localPath) {
                return failureResult(this.provider, request.outputPath, `Failed to download lip-synced video: ${dlResult.error ?? "unknown error"}`, startTime);
            }
            return {
                success: true,
                outputPath: dlResult.localPath,
                duration: response.duration,
                provider: this.provider,
                processingTime: (Date.now() - startTime) / 1000,
                warnings: [
                    "Seedance audio reference: video was re-generated with audio " +
                        "attached at generation time (not post-processed).",
                    `Timeout: ${this.timeoutMs / 1000}s`,
                ],
            };
        }
        catch (err) {
            return failureResult(this.provider, request.outputPath, `Seedance audio reference generation failed: ${err.message}`, startTime);
        }
    }
    /**
     * Build a VideoGenRequest with audio reference attached.
     *
     * This is the recommended way to use Seedance audio sync: call this method
     * BEFORE generating the video, so the generated video already has
     * synchronized lips. This avoids the need for a separate post-processing
     * step entirely.
     *
     * @param baseRequest - The original generation request (prompt, images, etc.)
     * @param audioUrl - TTS audio URL to attach as reference.
     * @returns Modified VideoGenRequest with referenceAudioUrls set.
     */
    buildAudioReferenceRequest(baseRequest, audioUrl) {
        return {
            ...baseRequest,
            referenceAudioUrls: [audioUrl],
        };
    }
    /**
     * Check whether a generation request already has audio reference attached.
     *
     * Useful for the pipeline to decide whether lip-sync post-processing is
     * needed (if audio reference was already used during generation, no
     * post-processing is required).
     */
    static hasAudioReference(request) {
        return (!!request.referenceAudioUrls && request.referenceAudioUrls.length > 0);
    }
}
// ---------------------------------------------------------------------------
// LipSyncManager — core orchestration class
// ---------------------------------------------------------------------------
/**
 * Lip-sync manager — orchestrates multiple lip-sync backends and auto-selects
 * the best available provider.
 *
 * Usage:
 * ```typescript
 * const manager = new LipSyncManager(DEFAULT_LIPSYNC_CONFIGS);
 * const result = await manager.sync({
 *   videoUrl: "https://cdn.tavernos.local/clip-001.mp4",
 *   videoLocalPath: "/tmp/clips/clip-001.mp4",
 *   audioUrl: "https://cdn.tavernos.local/voice-001.wav",
 *   audioLocalPath: "/tmp/audio/voice-001.wav",
 *   outputPath: "/tmp/output/clip-001-lipsync.mp4",
 * });
 * ```
 *
 * The manager tries providers in the order they appear in the config array.
 * The first provider whose `isAvailable()` returns true is used. To force a
 * specific provider, use `syncWith()`.
 */
export class LipSyncManager {
    backends = new Map();
    providerOrder = [];
    /**
     * @param configs - Provider configurations. Order determines priority
     *   (first enabled provider wins when auto-selecting).
     * @param genConfig - Optional VideoGenConfig for SeedanceAudioBackend.
     * @param execFn - Optional injectable exec function for Python backends.
     */
    constructor(configs = DEFAULT_LIPSYNC_CONFIGS, genConfig, execFn) {
        for (const cfg of configs) {
            if (!cfg.enabled)
                continue;
            let backend;
            switch (cfg.provider) {
                case "wav2lip":
                    backend = new Wav2LipBackend(cfg, execFn);
                    break;
                case "sadtalker":
                    backend = new SadTalkerBackend(cfg, execFn);
                    break;
                case "musetalk":
                    backend = new MuseTalkBackend(cfg, execFn);
                    break;
                case "seedance-audio":
                    backend = new SeedanceAudioBackend(cfg, genConfig);
                    break;
                case "custom":
                    // Custom backends are registered via registerBackend()
                    break;
            }
            if (backend) {
                this.backends.set(cfg.provider, backend);
                this.providerOrder.push(cfg.provider);
            }
        }
    }
    /**
     * Execute lip synchronization using the first available provider.
     *
     * Tries providers in priority order (as configured). The first provider
     * whose `isAvailable()` returns true is used. If no provider is available,
     * falls back to StubBackend with a warning.
     *
     * @param request - Lip-sync request.
     * @returns Result from the selected provider.
     */
    async sync(request) {
        for (const provider of this.providerOrder) {
            const backend = this.backends.get(provider);
            if (backend && backend.isAvailable()) {
                return backend.sync(request);
            }
        }
        // No provider available — use stub with a warning
        const stub = new StubBackend();
        const result = await stub.sync(request);
        return {
            ...result,
            warnings: [
                ...(result.warnings ?? []),
                "No lip-sync provider was available. Used stub backend (no processing). " +
                    "Configure Wav2Lip, SadTalker, MuseTalk, or Seedance audio to enable lip-sync.",
            ],
        };
    }
    /**
     * Execute lip synchronization using a specific provider.
     *
     * @param provider - Provider to use.
     * @param request - Lip-sync request.
     * @returns Result from the specified provider.
     * @throws Error if the provider is not registered.
     */
    async syncWith(provider, request) {
        const backend = this.backends.get(provider);
        if (!backend) {
            throw new Error(`Lip-sync provider "${provider}" is not registered. ` +
                `Available providers: ${this.listAvailableProviders().join(", ") || "(none)"}`);
        }
        return backend.sync(request);
    }
    /**
     * List all registered providers that are currently available.
     *
     * @returns Array of available provider identifiers.
     */
    listAvailableProviders() {
        const available = [];
        for (const [provider, backend] of this.backends) {
            if (backend.isAvailable()) {
                available.push(provider);
            }
        }
        return available;
    }
    /**
     * List all registered providers (regardless of availability).
     */
    listRegisteredProviders() {
        return Array.from(this.backends.keys());
    }
    /**
     * Register a custom backend.
     *
     * Allows third-party or user-defined backends to be added at runtime.
     * The provider is appended to the end of the priority order.
     *
     * @param backend - Backend implementing ILipSyncBackend.
     */
    registerBackend(backend) {
        this.backends.set(backend.provider, backend);
        if (!this.providerOrder.includes(backend.provider)) {
            this.providerOrder.push(backend.provider);
        }
    }
    /**
     * Check whether a specific provider is registered and available.
     */
    isProviderAvailable(provider) {
        const backend = this.backends.get(provider);
        return backend ? backend.isAvailable() : false;
    }
    /**
     * Get a registered backend by provider.
     *
     * @returns The backend, or undefined if not registered.
     */
    getBackend(provider) {
        return this.backends.get(provider);
    }
}
//# sourceMappingURL=lip-sync.js.map