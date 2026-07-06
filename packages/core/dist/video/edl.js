// Edit Decision List (EDL) — parsing, building, and validation.
//
// An EDL describes which clips to include in the final composition and what
// transitions to apply between them. Ported and re-architected from MJ's
// build_ffmpeg_from_story_edl.py (which used render_segments on a single
// source) into a multi-clip EDL model where each clip is a separate file.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Transition types
// ---------------------------------------------------------------------------
export const TransitionTypeSchema = z.enum(["cut", "crossfade", "fade"]);
export const TransitionSchema = z.object({
    /** Source clip ID (the clip before the transition). */
    from: z.string().min(1),
    /** Target clip ID (the clip after the transition). */
    to: z.string().min(1),
    /** Transition type: cut (hard cut), crossfade (dissolve), fade (fade through black). */
    type: TransitionTypeSchema,
    /** Duration of the transition in seconds (for crossfade/fade). */
    duration: z.number().positive().optional(),
});
// ---------------------------------------------------------------------------
// EDL clip entry
// ---------------------------------------------------------------------------
export const EDLClipSchema = z.object({
    /** Reference to the source VideoClip ID. */
    clipId: z.string().min(1),
    /** File path or URL of the source video. */
    sourcePath: z.string().min(1),
    /** Trim start time in seconds (optional, defaults to 0). */
    start: z.number().min(0).optional(),
    /** Trim end time in seconds (optional, defaults to full duration). */
    end: z.number().positive().optional(),
});
// ---------------------------------------------------------------------------
// EDL (Edit Decision List)
// ---------------------------------------------------------------------------
export const EDLSchema = z.object({
    clips: z.array(EDLClipSchema).min(1),
    transitions: z.array(TransitionSchema).default([]),
    outputPath: z.string().min(1),
    /** Optional composition configuration overrides. */
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    fps: z.number().int().positive().optional(),
    preset: z.string().optional(),
    crf: z.number().int().min(0).max(51).optional(),
    minDuration: z.number().positive().optional(),
});
// ---------------------------------------------------------------------------
// parseEDL — parse a JSON string into an EDL
// ---------------------------------------------------------------------------
export function parseEDL(json) {
    const raw = JSON.parse(json);
    const result = EDLSchema.safeParse(raw);
    if (!result.success) {
        const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        throw new Error(`Invalid EDL: ${messages.join("; ")}`);
    }
    return result.data;
}
// ---------------------------------------------------------------------------
// buildEDL — construct an EDL from VideoClips and transitions
// ---------------------------------------------------------------------------
export function buildEDL(clips, transitions, outputPath, config) {
    if (clips.length === 0) {
        throw new Error("Cannot build EDL: no clips provided");
    }
    const edlClips = clips.map((clip) => {
        // Prefer a local file path (avoids re-downloading for ffmpeg) but fall
        // back to the remote videoUrl when no local copy exists yet.
        const sourcePath = clip.localPath ?? clip.videoUrl;
        if (!sourcePath) {
            throw new Error(`Cannot build EDL: clip ${clip.id} has no videoUrl/localPath (status: ${clip.status})`);
        }
        const edlClip = {
            clipId: clip.id,
            sourcePath,
        };
        // Apply trim points from frame quality check
        if (clip.trimStart !== undefined && clip.trimStart > 0) {
            edlClip.start = clip.trimStart;
        }
        if (clip.trimEnd !== undefined && clip.trimEnd !== null && clip.trimEnd > 0) {
            edlClip.end = clip.trimEnd;
        }
        return edlClip;
    });
    return {
        clips: edlClips,
        transitions,
        outputPath,
        ...config,
    };
}
// ---------------------------------------------------------------------------
// validateEDL — validate an EDL for consistency
// ---------------------------------------------------------------------------
export function validateEDL(edl, config) {
    const errors = [];
    const warnings = [];
    // Check clips
    if (edl.clips.length === 0) {
        errors.push("EDL has no clips");
    }
    const clipIds = new Set();
    for (const clip of edl.clips) {
        if (clipIds.has(clip.clipId)) {
            warnings.push(`Duplicate clip ID: ${clip.clipId}`);
        }
        clipIds.add(clip.clipId);
        if (clip.start !== undefined && clip.end !== undefined && clip.end <= clip.start) {
            errors.push(`Clip ${clip.clipId}: end (${clip.end}) must be greater than start (${clip.start})`);
        }
    }
    // Check transitions reference valid clips
    for (let i = 0; i < edl.transitions.length; i++) {
        const t = edl.transitions[i];
        if (!clipIds.has(t.from)) {
            errors.push(`Transition ${i}: 'from' clip '${t.from}' not found in EDL clips`);
        }
        if (!clipIds.has(t.to)) {
            errors.push(`Transition ${i}: 'to' clip '${t.to}' not found in EDL clips`);
        }
        if (t.from === t.to) {
            warnings.push(`Transition ${i}: 'from' and 'to' are the same clip (${t.from})`);
        }
        if ((t.type === "crossfade" || t.type === "fade") && !t.duration) {
            warnings.push(`Transition ${i}: ${t.type} transition has no duration, will use default`);
        }
    }
    // Check transition count doesn't exceed clip count - 1
    const maxTransitions = Math.max(0, edl.clips.length - 1);
    if (edl.transitions.length > maxTransitions) {
        warnings.push(`EDL has ${edl.transitions.length} transitions but only ${maxTransitions} are possible between ${edl.clips.length} clips`);
    }
    // Check minDuration
    const minDur = config?.minDuration ?? edl.minDuration;
    if (minDur !== undefined && minDur <= 0) {
        errors.push(`minDuration must be positive, got ${minDur}`);
    }
    return {
        ok: errors.length === 0,
        errors,
        warnings,
    };
}
//# sourceMappingURL=edl.js.map