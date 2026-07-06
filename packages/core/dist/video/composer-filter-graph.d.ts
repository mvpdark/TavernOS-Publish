import type { EDLClip, Transition } from "./edl.js";
import type { ComposeConfig } from "./composer-types.js";
/** Default transition duration in seconds. */
export declare const DEFAULT_TRANSITION_DURATION = 0.5;
/**
 * Parse an ffprobe r_frame_rate fraction string (e.g. "30000/1001") into a number.
 */
export declare function parseFrameRate(value: string | undefined): number | undefined;
/**
 * Build the FFmpeg filter_complex string for multi-clip composition.
 *
 * Each clip is scaled and padded to the target resolution, then clips are
 * joined with the specified transitions:
 *   - cut: concatenated via concat filter
 *   - crossfade: joined via xfade filter (dissolve)
 *   - fade: fade in/out applied per-clip, then concatenated
 *
 * When `clipDurations` is supplied, it is used to compute accurate xfade
 * `offset` values and fade-out start times. Each entry is the *effective*
 * (post-trim) playback duration of the corresponding clip in seconds. When
 * omitted, a 5-second default is assumed per clip (backward compatible).
 *
 * When `config.bgmPath` or `config.voiceoverPaths` are set, an audio sub-graph
 * is appended that mixes those sources into an `[aout]` label. The audio
 * inputs must be appended AFTER the video clip inputs in the ffmpeg command
 * (BGM first, then voiceovers), so their stream indices start at
 * `clips.length`.
 *
 * This is a pure function — no side effects — making it easy to unit test.
 */
export declare function buildFilterGraph(clips: EDLClip[], transitions: Transition[], config: ComposeConfig, clipDurations?: number[]): string;
//# sourceMappingURL=composer-filter-graph.d.ts.map