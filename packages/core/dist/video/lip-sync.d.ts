import type { VideoGenConfig, VideoGenRequest } from "./types.js";
/** Extended exec function type that supports cwd (working directory). */
type LipSyncExecFn = (file: string, args: string[], options: {
    timeout?: number;
    maxBuffer?: number;
    cwd?: string;
}) => Promise<{
    stdout: string;
    stderr: string;
}>;
/** Lip-sync provider identifier. */
export type LipSyncProvider = "wav2lip" | "sadtalker" | "musetalk" | "seedance-audio" | "custom";
/** Lip-sync request — describes the video and audio to synchronize. */
export interface LipSyncRequest {
    /** Input video URL (the generated video clip). */
    readonly videoUrl: string;
    /** Local file path of the video (preferred over videoUrl when available). */
    readonly videoLocalPath?: string;
    /** Audio file URL (TTS-generated voiceover). */
    readonly audioUrl: string;
    /** Local file path of the audio (preferred over audioUrl when available). */
    readonly audioLocalPath?: string;
    /** Character reference image (required for SadTalker; optional for others). */
    readonly characterImage?: string;
    /** Output path for the lip-synced video. */
    readonly outputPath: string;
    /** Provider-specific options. */
    readonly options?: LipSyncOptions;
}
/** Provider-specific tuning options. */
export interface LipSyncOptions {
    /** Wav2Lip model quality: "fast" uses Wav2Lip, "enhanced" uses Wav2Lip+GAN. */
    readonly quality?: "fast" | "enhanced";
    /** Output face resolution: "512" (high) or "96" (low/fast). */
    readonly resolution?: "512" | "96";
    /** Padding/crop mode: "full" preserves the entire frame, "crop" zooms to face. */
    readonly padMode?: "full" | "crop";
    /** MuseTalk: enable high-resolution mode (v1.5 model). */
    readonly highRes?: boolean;
}
/** Result of a lip-sync operation. */
export interface LipSyncResult {
    /** Whether the operation succeeded. */
    readonly success: boolean;
    /** Path to the output video file. */
    readonly outputPath: string;
    /** Duration of the output video in seconds. */
    readonly duration: number;
    /** Provider that performed the sync. */
    readonly provider: LipSyncProvider;
    /** Total processing time in seconds. */
    readonly processingTime: number;
    /** Non-fatal warnings (e.g. quality compromises, fallbacks used). */
    readonly warnings?: string[];
    /** Error message when success is false. */
    readonly error?: string;
}
/** Configuration for a single lip-sync provider. */
export interface LipSyncProviderConfig {
    readonly provider: LipSyncProvider;
    /** API endpoint URL (for remote services like Seedance). */
    readonly apiUrl?: string;
    /** API key for remote services. */
    readonly apiKey?: string;
    /** Local model checkpoint/weights directory path. */
    readonly modelPath?: string;
    /** Python executable path (for Wav2Lip/SadTalker/MuseTalk). */
    readonly pythonEnv?: string;
    /** Script/inference entry-point path (e.g. inference.py). */
    readonly scriptPath?: string;
    /** FFmpeg binary path (required by MuseTalk on Windows). */
    readonly ffmpegPath?: string;
    /** Whether this provider is enabled. */
    readonly enabled: boolean;
}
/** Backend interface — each provider implements this contract. */
export interface ILipSyncBackend {
    /** Provider identifier. */
    readonly provider: LipSyncProvider;
    /** Quick non-blocking availability check. */
    isAvailable(): boolean;
    /** Execute lip synchronization. */
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
}
/**
 * Default lip-sync provider configurations.
 *
 * Seedance audio is enabled by default because it requires no local
 * deployment — it leverages the existing Seedance 2.0 API's omni_reference
 * mode. The Python-based backends are disabled until the user configures
 * their local environments.
 */
export declare const DEFAULT_LIPSYNC_CONFIGS: LipSyncProviderConfig[];
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
export declare function checkPythonEnv(pythonPath: string): Promise<boolean>;
/**
 * Check whether a model file (or directory) exists on disk.
 *
 * Synchronous and non-blocking in practice (a single stat call). For
 * directories, returns true only if the path exists and is a directory.
 *
 * @param modelPath - File or directory path to check.
 * @returns True if the path exists.
 */
export declare function checkModelFile(modelPath: string): boolean;
/**
 * Get the duration of a video file in seconds using ffprobe.
 *
 * @param videoPath - Local file path to the video.
 * @param ffprobePath - Path to ffprobe binary (default "ffprobe").
 * @returns Duration in seconds, or 0 if probing fails.
 */
export declare function getVideoDuration(videoPath: string, ffprobePath?: string): Promise<number>;
/**
 * Validate that an audio file path has a supported format (WAV or MP3).
 *
 * @param audioPath - File path to check.
 * @returns True if the extension is .wav or .mp3 (case-insensitive).
 */
export declare function validateAudioFormat(audioPath: string): boolean;
/**
 * Stub lip-sync backend that performs no actual processing.
 *
 * Returns a success result immediately with the input video path as the
 * output. Useful for development, testing, and environments where no
 * lip-sync backend is deployed. Mirrors the stub pattern from video/stub.ts.
 */
export declare class StubBackend implements ILipSyncBackend {
    readonly provider: LipSyncProvider;
    isAvailable(): boolean;
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
}
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
export declare class Wav2LipBackend implements ILipSyncBackend {
    readonly provider: LipSyncProvider;
    private readonly config;
    private readonly execFn;
    private readonly timeoutMs;
    constructor(config: LipSyncProviderConfig, execFn?: LipSyncExecFn, timeoutMs?: number);
    /**
     * Quick availability check — verifies that the Python environment and
     * script path are configured. Does NOT run Python (non-blocking).
     *
     * For a full runtime check (including Python responsiveness), use
     * `checkPythonEnv()` separately.
     */
    isAvailable(): boolean;
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
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
    /**
     * Resolve the model checkpoint path based on quality option.
     *
     * - "enhanced" → wav2lip_gan.pth (better visual quality, slightly less accurate)
     * - "fast" (default) → wav2lip.pth (highly accurate lip-sync)
     */
    private resolveCheckpointPath;
    /**
     * Build Wav2Lip command-line arguments.
     *
     * Reference: python inference.py --checkpoint_path <ckpt> --face <video>
     *   --audio <audio> --outfile <output> --pads <t b l r> --resize_factor <n>
     *   --face_det_batch_size <n> --wav2lip_batch_size <n> [--nosmooth]
     */
    private buildArgs;
}
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
export declare class SadTalkerBackend implements ILipSyncBackend {
    readonly provider: LipSyncProvider;
    private readonly config;
    private readonly execFn;
    private readonly timeoutMs;
    constructor(config: LipSyncProviderConfig, execFn?: LipSyncExecFn, timeoutMs?: number);
    /**
     * Quick availability check — verifies Python env and script path.
     * Does NOT run Python (non-blocking).
     */
    isAvailable(): boolean;
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
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
    /**
     * Build SadTalker command-line arguments.
     *
     * Reference: python inference.py --driven_audio <audio> --source_image <image>
     *   --result_dir <dir> --enhancer gfpgan --preprocess full --still
     */
    private buildArgs;
    /**
     * Locate the SadTalker output video file.
     *
     * SadTalker prints the output path to stdout and also saves it under
     * result_dir/<timestamp>/. This method parses stdout for the path, then
     * falls back to scanning the result directory for the most recent .mp4.
     */
    private locateSadTalkerOutput;
}
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
export declare class MuseTalkBackend implements ILipSyncBackend {
    readonly provider: LipSyncProvider;
    private readonly config;
    private readonly execFn;
    private readonly timeoutMs;
    constructor(config: LipSyncProviderConfig, execFn?: LipSyncExecFn, timeoutMs?: number);
    /**
     * Quick availability check — verifies Python env, script path, and model.
     * Does NOT run Python or check GPU (non-blocking).
     */
    isAvailable(): boolean;
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
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
    /**
     * Resolve MuseTalk model paths based on the highRes option.
     *
     * - highRes=true (default): v1.5 model (models/musetalkV15/unet.pth)
     * - highRes=false: v1.0 model (models/musetalk/pytorch_model.bin)
     */
    private resolveModelPaths;
    /**
     * Build MuseTalk command-line arguments.
     *
     * Uses module-based invocation: python -m scripts.inference
     */
    private buildArgs;
    /**
     * Locate the MuseTalk output video file.
     *
     * MuseTalk saves output as <result_dir>/<video_basename>_musetalk.mp4
     * or <result_dir>/output.mp4.
     */
    private locateMuseTalkOutput;
}
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
export declare class SeedanceAudioBackend implements ILipSyncBackend {
    readonly provider: LipSyncProvider;
    private readonly config;
    private readonly genClient?;
    private readonly genConfig?;
    private readonly timeoutMs;
    /**
     * @param config - Provider configuration (apiUrl, apiKey).
     * @param genConfig - Optional VideoGenConfig for creating a generation client.
     *   When provided, sync() can re-generate the video with audio reference.
     * @param timeoutMs - Timeout for the generation request (default 600s).
     */
    constructor(config: LipSyncProviderConfig, genConfig?: VideoGenConfig, timeoutMs?: number);
    /**
     * Availability check — Seedance audio is available when an API key or
     * a generation client is configured.
     */
    isAvailable(): boolean;
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
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
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
    buildAudioReferenceRequest(baseRequest: VideoGenRequest, audioUrl: string): VideoGenRequest;
    /**
     * Check whether a generation request already has audio reference attached.
     *
     * Useful for the pipeline to decide whether lip-sync post-processing is
     * needed (if audio reference was already used during generation, no
     * post-processing is required).
     */
    static hasAudioReference(request: VideoGenRequest): boolean;
}
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
export declare class LipSyncManager {
    private readonly backends;
    private readonly providerOrder;
    /**
     * @param configs - Provider configurations. Order determines priority
     *   (first enabled provider wins when auto-selecting).
     * @param genConfig - Optional VideoGenConfig for SeedanceAudioBackend.
     * @param execFn - Optional injectable exec function for Python backends.
     */
    constructor(configs?: LipSyncProviderConfig[], genConfig?: VideoGenConfig, execFn?: LipSyncExecFn);
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
    sync(request: LipSyncRequest): Promise<LipSyncResult>;
    /**
     * Execute lip synchronization using a specific provider.
     *
     * @param provider - Provider to use.
     * @param request - Lip-sync request.
     * @returns Result from the specified provider.
     * @throws Error if the provider is not registered.
     */
    syncWith(provider: LipSyncProvider, request: LipSyncRequest): Promise<LipSyncResult>;
    /**
     * List all registered providers that are currently available.
     *
     * @returns Array of available provider identifiers.
     */
    listAvailableProviders(): LipSyncProvider[];
    /**
     * List all registered providers (regardless of availability).
     */
    listRegisteredProviders(): LipSyncProvider[];
    /**
     * Register a custom backend.
     *
     * Allows third-party or user-defined backends to be added at runtime.
     * The provider is appended to the end of the priority order.
     *
     * @param backend - Backend implementing ILipSyncBackend.
     */
    registerBackend(backend: ILipSyncBackend): void;
    /**
     * Check whether a specific provider is registered and available.
     */
    isProviderAvailable(provider: LipSyncProvider): boolean;
    /**
     * Get a registered backend by provider.
     *
     * @returns The backend, or undefined if not registered.
     */
    getBackend(provider: LipSyncProvider): ILipSyncBackend | undefined;
}
export {};
//# sourceMappingURL=lip-sync.d.ts.map