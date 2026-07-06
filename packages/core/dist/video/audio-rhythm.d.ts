import type { ExecFileFn } from "./composer-types.js";
export interface BeatInfo {
    /** Tempo in BPM */
    bpm: number;
    /** Timestamps of each beat in seconds */
    beatTimes: number[];
    /** Onset envelope values (0-1, energy at each frame) */
    onsetEnvelope: number[];
    /** Times of onset frames */
    onsetTimes: number[];
    /** Estimated downbeat indices (first beat of each bar) */
    downbeatIndices: number[];
    /** Audio duration in seconds */
    duration: number;
    /** Sample rate used for analysis */
    sampleRate: number;
    /**
     * Energy at each beat (0-1), sampled from the onset envelope at beat times.
     * Populated by the Python analyzer; optional so callers can construct
     * BeatInfo manually without it (generateSyncPoints falls back to the
     * onset envelope when this is absent).
     */
    beatEnergies?: number[];
}
export interface BeatSyncPoint {
    /** Timestamp in seconds */
    time: number;
    /** Beat index */
    beatIndex: number;
    /** Whether this is a downbeat */
    isDownbeat: boolean;
    /** Energy level at this point (0-1) */
    energy: number;
    /** Recommended transition type for this sync point */
    suggestedTransition: "cut" | "flash" | "crossfade";
}
export interface AudioRhythmResult {
    beats: BeatInfo;
    syncPoints: BeatSyncPoint[];
    /** Average energy level (0-1) */
    averageEnergy: number;
    /** Estimated mood from tempo: "calm" | "moderate" | "energetic" | "intense" */
    mood: "calm" | "moderate" | "energetic" | "intense";
    success: boolean;
    error?: string;
}
export interface AudioRhythmConfig {
    /** Path to Python executable */
    pythonPath: string;
    /** Sample rate for analysis (default 22050) */
    sampleRate: number;
    /** Hop length for onset detection (default 512) */
    hopLength: number;
    /** Minimum energy threshold for sync points (default 0.3) */
    energyThreshold: number;
    /** Timeout for Python subprocess in ms (default 60000) */
    timeoutMs: number;
}
export declare const DEFAULT_AUDIO_RHYTHM_CONFIG: AudioRhythmConfig;
/**
 * Analyzes audio files for rhythm information using a Python (librosa)
 * subprocess. The exec function is injectable for testability, mirroring the
 * pattern used by VideoComposer.
 */
export declare class AudioRhythmAnalyzer {
    private readonly config;
    private readonly execFn;
    constructor(config?: Partial<AudioRhythmConfig>, execFn?: ExecFileFn);
    /**
     * Analyze an audio file and extract rhythm information.
     *
     * Flow:
     *   1. Write PYTHON_ANALYSIS_SCRIPT to a temp .py file
     *   2. Run: `python script.py audioPath sampleRate hopLength`
     *   3. Parse JSON from stdout
     *   4. Generate sync points from beat info
     *   5. Return AudioRhythmResult
     *   6. Clean up temp file in finally block
     *
     * Returns success=false with a helpful error if librosa is not installed
     * or if the subprocess fails for any other reason.
     */
    analyze(audioPath: string): Promise<AudioRhythmResult>;
    /**
     * Generate beat-synced transition points from beat info.
     *
     * Only includes beats with energy above the configured threshold. For each
     * qualifying beat a transition type is suggested:
     *   - downbeat + high energy (> 0.7) -> "flash"
     *   - high energy (> 0.6)            -> "cut"
     *   - otherwise                       -> "crossfade"
     *
     * Results are sorted by time.
     */
    generateSyncPoints(beats: BeatInfo, config?: {
        energyThreshold?: number;
    }): BeatSyncPoint[];
    /**
     * Align clip durations to beat times.
     *
     * For each clip duration, finds the nearest beat time that is >= the
     * duration (i.e. snaps the clip end forward to the next beat). If no beat
     * exists at or after the duration (the clip extends beyond the last beat),
     * the original duration is returned unchanged.
     */
    alignToBeats(clipDurations: number[], beats: BeatInfo): number[];
    /**
     * Estimate mood from tempo.
     *
     *   BPM < 70        -> "calm"
     *   BPM 70 - 100    -> "moderate"
     *   BPM 100 - 130   -> "energetic"
     *   BPM > 130       -> "intense"
     */
    estimateMood(bpm: number): "calm" | "moderate" | "energetic" | "intense";
    /**
     * Get the energy at a given beat index. Uses beatEnergies when available,
     * otherwise samples the (downsampled) onset envelope at the beat time.
     */
    private getBeatEnergy;
    /** Compute the average energy across all beats (or onset envelope). */
    private computeAverageEnergy;
}
//# sourceMappingURL=audio-rhythm.d.ts.map