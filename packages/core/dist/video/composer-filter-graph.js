// FFmpeg filter_complex builder — pure functions for constructing the
// multi-clip filter graph string.
//
// Extracted from composer.ts for single-responsibility: this module contains
// only pure, side-effect-free functions that can be unit tested in isolation.
// The VideoComposer class in composer.ts uses these to build the filter graph
// before invoking ffmpeg.
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default transition duration in seconds. */
export const DEFAULT_TRANSITION_DURATION = 0.5;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Parse an ffprobe r_frame_rate fraction string (e.g. "30000/1001") into a number.
 */
export function parseFrameRate(value) {
    if (!value || value === "0/0")
        return undefined;
    if (value.includes("/")) {
        const [num, den] = value.split("/", 2);
        const d = parseFloat(den);
        if (d === 0)
            return undefined;
        return parseFloat(num) / d;
    }
    const n = parseFloat(value);
    return isNaN(n) ? undefined : n;
}
// ---------------------------------------------------------------------------
// Filter graph builder
// ---------------------------------------------------------------------------
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
export function buildFilterGraph(clips, transitions, config, clipDurations) {
    if (clips.length === 0) {
        throw new Error("Cannot build filter graph: no clips");
    }
    const { width, height, fps } = config;
    const filters = [];
    const hasTransitions = transitions.length > 0;
    // Whether we produce an audio track from BGM / voiceover sources.
    const bgmVolume = config.bgmVolume ?? 0.3;
    const voiceoverPaths = config.voiceoverPaths ?? [];
    const hasBgm = !!config.bgmPath;
    const hasVoiceover = voiceoverPaths.length > 0;
    const hasAudio = hasBgm || hasVoiceover;
    // Step 1: Scale + pad each clip to target resolution
    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const parts = [];
        // Trim if start/end specified
        if (clip.start !== undefined || clip.end !== undefined) {
            const start = clip.start ?? 0;
            const end = clip.end !== undefined ? `:end=${clip.end.toFixed(3)}` : "";
            parts.push(`trim=start=${start.toFixed(3)}${end}`);
            parts.push("setpts=PTS-STARTPTS");
        }
        // Scale and pad to target resolution
        parts.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`, `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`, "setsar=1", `fps=${fps}`);
        // Apply fade in/out for 'fade' transitions
        const hasFadeBefore = transitions.some((t) => t.to === clip.clipId && t.type === "fade");
        const hasFadeAfter = transitions.some((t) => t.from === clip.clipId && t.type === "fade");
        const fadeDur = transitions.find((t) => (t.to === clip.clipId || t.from === clip.clipId) && t.type === "fade")?.duration ?? DEFAULT_TRANSITION_DURATION;
        if (hasFadeBefore) {
            parts.push(`fade=t=in:st=0:d=${fadeDur}`);
        }
        if (hasFadeAfter) {
            // Fade out near the end of the clip. Use the effective clip duration
            // (passed in via clipDurations) to compute a correct start time instead
            // of the previous hard-coded st=9999.
            const clipDur = clipDurations?.[i] ?? 5;
            const trimStart = clip.start ?? 0;
            const trimEnd = clip.end ?? clipDur;
            const effectiveDur = Math.max(0, trimEnd - trimStart);
            const fadeSt = Math.max(0, effectiveDur - fadeDur);
            parts.push(`fade=t=out:st=${fadeSt.toFixed(3)}:d=${fadeDur}`);
        }
        filters.push(`[${i}:v]${parts.join(",")}[v${i}]`);
    }
    // Step 2: Join clips with transitions.
    // The video join always drops audio (a=0) — audio is produced separately
    // from BGM/voiceover sources when hasAudio is true.
    const useConcat = !hasTransitions ||
        transitions.every((t) => t.type === "cut" || t.type === "fade");
    if (useConcat) {
        // Use concat filter for cut and fade transitions
        const concatInputs = clips.map((_, i) => `[v${i}]`).join("");
        const n = clips.length;
        filters.push(`${concatInputs}concat=n=${n}:v=1:a=0[vout]`);
    }
    else {
        // Use xfade for crossfade transitions, chaining pairs.
        //
        // xfade offset semantics: offset is the time (from the start of the
        // chained output so far) at which the transition begins. It equals the
        // cumulative playback duration of all preceding clips (minus the overlap
        // already consumed by earlier xfades) minus this transition's duration.
        let prevLabel = "v0";
        // First clip's effective playback duration (default 5s when unknown).
        let accumulatedDuration = clipDurations?.[0] ?? 5;
        for (let i = 1; i < clips.length; i++) {
            // Find transition between clip i-1 and clip i
            const prevClipId = clips[i - 1].clipId;
            const currClipId = clips[i].clipId;
            const transition = transitions.find((t) => t.from === prevClipId && t.to === currClipId);
            const currDur = clipDurations?.[i] ?? 5;
            const outLabel = i === clips.length - 1 ? "vout" : `vx${i}`;
            if (transition && transition.type === "crossfade") {
                const dur = transition.duration ?? DEFAULT_TRANSITION_DURATION;
                // offset = cumulative duration so far - this transition's duration
                const offset = Math.max(0, accumulatedDuration - dur);
                filters.push(`[${prevLabel}][v${i}]xfade=transition=fade:duration=${dur}:offset=${offset.toFixed(3)}[${outLabel}]`);
                // The two clips overlap by `dur`, so the accumulated duration grows
                // by (currDur - dur).
                accumulatedDuration += currDur - dur;
            }
            else {
                // cut / fade / no transition — concat this pair (no overlap).
                filters.push(`[${prevLabel}][v${i}]concat=n=2:v=1:a=0[${outLabel}]`);
                accumulatedDuration += currDur;
            }
            prevLabel = outLabel;
        }
    }
    // Step 3: Pad if minDuration is set (tpad with clone)
    if (config.minDuration !== undefined && config.minDuration > 0) {
        // Replace [vout] with padded version
        const lastFilter = filters[filters.length - 1];
        filters[filters.length - 1] = lastFilter.replace("[vout]", "[vpre]");
        filters.push(`[vpre]tpad=stop_mode=clone:stop_duration=${config.minDuration.toFixed(3)}[vout]`);
    }
    // Step 4: Build the audio sub-graph (BGM + voiceover mix) → [aout].
    // Audio inputs are appended AFTER the video clip inputs in the ffmpeg
    // command, so their stream indices start at `clips.length`:
    //   - BGM (if any)        → index clips.length
    //   - voiceover[0..n-1]   → indices clips.length+1 .. clips.length+n
    if (hasAudio) {
        const audioParts = [];
        let inputIdx = clips.length;
        const mixLabels = [];
        if (hasBgm) {
            audioParts.push(`[${inputIdx}:a]volume=${bgmVolume}[bgmvol]`);
            mixLabels.push("[bgmvol]");
            inputIdx += 1;
        }
        for (let v = 0; v < voiceoverPaths.length; v++) {
            const voLabel = `vo${v}`;
            audioParts.push(`[${inputIdx}:a]anull[${voLabel}]`);
            mixLabels.push(`[${voLabel}]`);
            inputIdx += 1;
        }
        if (mixLabels.length === 1) {
            // Single audio source — point it directly at [aout].
            const last = audioParts[audioParts.length - 1];
            audioParts[audioParts.length - 1] = last.replace(/\[[^\]]+\]$/, "[aout]");
        }
        else {
            audioParts.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=0[aout]`);
        }
        filters.push(...audioParts);
    }
    return filters.join(";");
}
//# sourceMappingURL=composer-filter-graph.js.map