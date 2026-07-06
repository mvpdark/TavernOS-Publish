// Audio rhythm analysis — beat detection, tempo (BPM), and onset detection.
//
// Uses a Python subprocess (librosa) to analyze audio files and extract:
//   - Tempo (BPM)
//   - Beat timestamps (when each beat occurs)
//   - Onset envelope (energy curve for detecting "drops" and "hits")
//   - Downbeat detection (first beat of each bar)
//
// These are used for:
//   - Beat-synced video cutting (卡点剪辑): align clip transitions to beats
//   - BGM selection: match music tempo to scene energy
//   - Auto-sync: align dialogue start with downbeats
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
const execFileAsync = promisify(execFile);
export const DEFAULT_AUDIO_RHYTHM_CONFIG = {
    pythonPath: "python",
    sampleRate: 22050,
    hopLength: 512,
    energyThreshold: 0.3,
    timeoutMs: 60_000,
};
// ---------------------------------------------------------------------------
// Python analysis script
// ---------------------------------------------------------------------------
// The Python script that does the actual analysis. Receives:
//   sys.argv[1] = audio file path
//   sys.argv[2] = sample rate
//   sys.argv[3] = hop length
// Prints a single JSON line to stdout with all analysis results.
const PYTHON_ANALYSIS_SCRIPT = `
import json
import sys
import librosa
import numpy as np

audio_path = sys.argv[1]
sample_rate = int(sys.argv[2])
hop_length = int(sys.argv[3])

y, sr = librosa.load(audio_path, sr=sample_rate)
duration = len(y) / sr

# Tempo and beats
tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
# Handle librosa versions that return tempo as a numpy array
tempo = float(np.atleast_1d(tempo)[0])
beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop_length)

# Onset envelope
onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
onset_frames = librosa.util.peak_pick(onset_env, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)

# Normalize onset envelope to 0-1
onset_env_norm = onset_env / (onset_env.max() if onset_env.max() > 0 else 1)

# Downbeat estimation (every 4th beat in 4/4 time)
downbeat_indices = [i for i in range(len(beat_frames)) if i % 4 == 0]

# Sample onset envelope at beat times for energy
beat_energies = []
for bt in beat_times:
    frame = int(bt * sr / hop_length)
    if frame < len(onset_env_norm):
        beat_energies.append(float(onset_env_norm[frame]))
    else:
        beat_energies.append(0.0)

result = {
    "bpm": float(tempo),
    "beatTimes": [float(t) for t in beat_times],
    "onsetEnvelope": [float(e) for e in onset_env_norm[::20]],  # downsample for output
    "onsetTimes": [float(t) for t in onset_times],
    "downbeatIndices": downbeat_indices,
    "duration": float(duration),
    "sampleRate": sr,
    "beatEnergies": beat_energies,
}
print(json.dumps(result))
`;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Build an empty BeatInfo for failure results. */
function emptyBeats() {
    return {
        bpm: 0,
        beatTimes: [],
        onsetEnvelope: [],
        onsetTimes: [],
        downbeatIndices: [],
        duration: 0,
        sampleRate: 0,
    };
}
/** Build a failure AudioRhythmResult with the given error message. */
function failureResult(error) {
    return {
        beats: emptyBeats(),
        syncPoints: [],
        averageEnergy: 0,
        mood: "calm",
        success: false,
        error,
    };
}
// ---------------------------------------------------------------------------
// AudioRhythmAnalyzer class
// ---------------------------------------------------------------------------
/**
 * Analyzes audio files for rhythm information using a Python (librosa)
 * subprocess. The exec function is injectable for testability, mirroring the
 * pattern used by VideoComposer.
 */
export class AudioRhythmAnalyzer {
    config;
    execFn;
    constructor(config, execFn) {
        this.config = { ...DEFAULT_AUDIO_RHYTHM_CONFIG, ...config };
        this.execFn = execFn ?? (async (file, args, opts) => {
            const result = await execFileAsync(file, args, opts);
            return { stdout: String(result.stdout), stderr: String(result.stderr) };
        });
    }
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
    async analyze(audioPath) {
        const scriptPath = join(tmpdir(), `audio-rhythm-${randomUUID()}.py`);
        await writeFile(scriptPath, PYTHON_ANALYSIS_SCRIPT, "utf8");
        try {
            const args = [
                scriptPath,
                audioPath,
                String(this.config.sampleRate),
                String(this.config.hopLength),
            ];
            let stdout;
            try {
                const result = await this.execFn(this.config.pythonPath, args, {
                    timeout: this.config.timeoutMs,
                    maxBuffer: 10 * 1024 * 1024,
                });
                stdout = result.stdout;
            }
            catch (err) {
                const errObj = err;
                const combined = `${errObj.message ?? ""}\n${errObj.stderr ?? ""}`;
                // Detect missing librosa dependency and give an actionable message.
                if (/ModuleNotFoundError|ImportError|No module named/i.test(combined)) {
                    return failureResult("librosa is not installed in the Python environment. " +
                        "Install it with: pip install librosa numpy");
                }
                if (/librosa/i.test(combined)) {
                    return failureResult("librosa failed to load. Ensure librosa (and numpy) are installed: " +
                        "pip install librosa numpy");
                }
                // Timeout or other subprocess failure.
                return failureResult(`Python analysis failed: ${errObj.message ?? String(err)}`);
            }
            // Parse JSON output.
            let parsed;
            try {
                parsed = JSON.parse(stdout.trim());
            }
            catch (err) {
                return failureResult("Failed to parse Python output as JSON: " +
                    (err instanceof Error ? err.message : String(err)));
            }
            const beats = {
                bpm: asNumber(parsed.bpm),
                beatTimes: asNumberArray(parsed.beatTimes),
                onsetEnvelope: asNumberArray(parsed.onsetEnvelope),
                onsetTimes: asNumberArray(parsed.onsetTimes),
                downbeatIndices: asNumberArray(parsed.downbeatIndices).map((n) => Math.round(n)),
                duration: asNumber(parsed.duration),
                sampleRate: Math.round(asNumber(parsed.sampleRate)),
                beatEnergies: asNumberArray(parsed.beatEnergies),
            };
            const syncPoints = this.generateSyncPoints(beats);
            const averageEnergy = this.computeAverageEnergy(beats);
            const mood = this.estimateMood(beats.bpm);
            return {
                beats,
                syncPoints,
                averageEnergy,
                mood,
                success: true,
            };
        }
        finally {
            // Clean up the temp script (best-effort, ignore errors).
            try {
                await unlink(scriptPath);
            }
            catch {
                // ignore
            }
        }
    }
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
    generateSyncPoints(beats, config) {
        const threshold = config?.energyThreshold ?? this.config.energyThreshold;
        const downbeatSet = new Set(beats.downbeatIndices);
        const points = [];
        for (let i = 0; i < beats.beatTimes.length; i++) {
            const energy = this.getBeatEnergy(beats, i);
            if (energy < threshold)
                continue;
            const isDownbeat = downbeatSet.has(i);
            let suggestedTransition;
            if (isDownbeat && energy > 0.7) {
                suggestedTransition = "flash";
            }
            else if (energy > 0.6) {
                suggestedTransition = "cut";
            }
            else {
                suggestedTransition = "crossfade";
            }
            points.push({
                time: beats.beatTimes[i],
                beatIndex: i,
                isDownbeat,
                energy,
                suggestedTransition,
            });
        }
        // Beats are naturally time-ordered, but sort defensively.
        return points.sort((a, b) => a.time - b.time);
    }
    /**
     * Align clip durations to beat times.
     *
     * For each clip duration, finds the nearest beat time that is >= the
     * duration (i.e. snaps the clip end forward to the next beat). If no beat
     * exists at or after the duration (the clip extends beyond the last beat),
     * the original duration is returned unchanged.
     */
    alignToBeats(clipDurations, beats) {
        return clipDurations.map((duration) => {
            for (const beatTime of beats.beatTimes) {
                if (beatTime >= duration) {
                    return beatTime;
                }
            }
            // No beat at or after this duration; keep the original.
            return duration;
        });
    }
    /**
     * Estimate mood from tempo.
     *
     *   BPM < 70        -> "calm"
     *   BPM 70 - 100    -> "moderate"
     *   BPM 100 - 130   -> "energetic"
     *   BPM > 130       -> "intense"
     */
    estimateMood(bpm) {
        if (bpm < 70)
            return "calm";
        if (bpm < 100)
            return "moderate";
        if (bpm <= 130)
            return "energetic";
        return "intense";
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /**
     * Get the energy at a given beat index. Uses beatEnergies when available,
     * otherwise samples the (downsampled) onset envelope at the beat time.
     */
    getBeatEnergy(beats, index) {
        if (beats.beatEnergies && index < beats.beatEnergies.length) {
            return beats.beatEnergies[index];
        }
        // Fallback: sample the downsampled onset envelope.
        // onsetEnvelope is downsampled by a factor of 20 from raw frames, so each
        // entry covers ~20 hop lengths of time.
        if (beats.beatTimes.length === 0 ||
            beats.onsetEnvelope.length === 0 ||
            beats.sampleRate <= 0) {
            return 0;
        }
        const beatTime = beats.beatTimes[index];
        const hopLength = this.config.hopLength;
        const frame = Math.floor((beatTime * beats.sampleRate) / hopLength);
        const envIndex = Math.floor(frame / 20);
        if (envIndex >= 0 && envIndex < beats.onsetEnvelope.length) {
            return beats.onsetEnvelope[envIndex];
        }
        return 0;
    }
    /** Compute the average energy across all beats (or onset envelope). */
    computeAverageEnergy(beats) {
        const source = beats.beatEnergies && beats.beatEnergies.length > 0
            ? beats.beatEnergies
            : beats.onsetEnvelope;
        if (source.length === 0)
            return 0;
        const sum = source.reduce((acc, v) => acc + v, 0);
        return sum / source.length;
    }
}
// ---------------------------------------------------------------------------
// JSON coercion helpers
// ---------------------------------------------------------------------------
/** Coerce an unknown JSON value to a finite number (0 on failure). */
function asNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const n = parseFloat(value);
        if (Number.isFinite(n))
            return n;
    }
    return 0;
}
/** Coerce an unknown JSON value to a number[]. */
function asNumberArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((v) => asNumber(v));
}
//# sourceMappingURL=audio-rhythm.js.map