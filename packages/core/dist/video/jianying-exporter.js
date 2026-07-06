// JianYing (CapCut) draft file exporter.
//
// Converts TavernOS VideoClips and EDL transitions into JianYing's .draft
// (draft_content.json) format — a JSON structure containing canvas_config,
// materials (videos/audios/texts/transitions), and tracks with segments.
//
// The exported .draft file can be opened directly in JianYing/CapCut for
// further manual editing. JianYing will auto-fill any omitted fields.
//
// Key concepts:
//   - Time units: JianYing uses microseconds (1 sec = 1,000,000 us)
//   - source_timerange: which portion of the source media is used (trim)
//   - target_timerange: where the segment sits on the timeline
//   - render_index: layer ordering (video=0, audio=10, text=15000)
//   - Transition mapping: cut -> none, crossfade -> 叠化(overlay), fade -> 淡入淡出(fade)
//
// References:
//   - draft_content.json structure analysis (CSDN: 剪映草稿文件结构解析)
//   - pyJianYingDraft library (GitHub: GuanYixuan/pyJianYingDraft)
//   - JianYingApi architecture (CSDN: JianYingApi 剪映自动化架构)
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Microseconds per second — JianYing's native time unit. */
const US_PER_SECOND = 1_000_000;
/** Default canvas width (1080p landscape). */
const DEFAULT_WIDTH = 1920;
/** Default canvas height (1080p landscape). */
const DEFAULT_HEIGHT = 1080;
/** Default frame rate. */
const DEFAULT_FPS = 30;
/** Default clip duration fallback (seconds) when VideoClip has no duration info. */
const DEFAULT_CLIP_DURATION_S = 5;
/** Default transition duration in seconds (for crossfade/fade). */
const DEFAULT_TRANSITION_DURATION_S = 0.5;
/** Render index for video tracks (bottom layer). */
const RENDER_INDEX_VIDEO = 0;
/** Render index for audio tracks. */
const RENDER_INDEX_AUDIO = 10;
/** Render index for text/subtitle tracks (top layer). */
const RENDER_INDEX_TEXT = 15000;
// ---------------------------------------------------------------------------
// Zod Schemas — draft structure validation
// ---------------------------------------------------------------------------
/** Time range in microseconds (start + duration). */
const TimeRangeSchema = z.object({
    start: z.number().int().min(0),
    duration: z.number().int().min(0),
});
/** Transform properties for a segment clip (position, scale). */
const ClipTransformSchema = z.object({
    x: z.number().default(0.0),
    y: z.number().default(0.0),
    scale: z.object({
        x: z.number().default(1.0),
        y: z.number().default(1.0),
    }),
});
/** Clip properties (alpha, rotation, transform). */
const ClipSchema = z.object({
    alpha: z.number().min(0).max(1).default(1.0),
    rotation: z.number().default(0.0),
    transform: ClipTransformSchema.default(() => ({
        x: 0.0,
        y: 0.0,
        scale: { x: 1.0, y: 1.0 },
    })),
});
/** Video material — references a video file with metadata. */
const VideoMaterialSchema = z.object({
    id: z.string().min(1),
    path: z.string(),
    duration: z.number().int().min(0),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    type: z.literal("video").default("video"),
    create_time: z.number().int(),
    import_time: z.number().int(),
    md5: z.string().default(""),
});
/** Audio material — references an audio file with metadata. */
const AudioMaterialSchema = z.object({
    id: z.string().min(1),
    path: z.string(),
    duration: z.number().int().min(0),
    type: z.literal("audio").default("audio"),
    create_time: z.number().int(),
    import_time: z.number().int(),
    md5: z.string().default(""),
});
/** Text material — subtitle/text content with styling. */
const TextMaterialSchema = z.object({
    id: z.string().min(1),
    content: z.string(),
    text_url: z.string().default(""),
    duration: z.number().int().min(0),
    type: z.literal("text").default("text"),
    text_size: z.number().positive().default(30.0),
    text_color: z.string().default("#FFFFFF"),
    text_alpha: z.number().min(0).max(1).default(1.0),
});
/** Transition material — defines a transition effect between segments. */
const TransitionMaterialSchema = z.object({
    id: z.string().min(1),
    type: z.literal("transition").default("transition"),
    name: z.string(),
    duration: z.number().int().min(0),
    transition_type: z.string(),
    param: z.record(z.string(), z.any()).default({}),
});
/** Materials collection — all media assets referenced by tracks. */
const DraftMaterialsSchema = z.object({
    videos: z.array(VideoMaterialSchema).default([]),
    audios: z.array(AudioMaterialSchema).default([]),
    texts: z.array(TextMaterialSchema).default([]),
    transitions: z.array(TransitionMaterialSchema).default([]),
    stickers: z.array(z.any()).default([]),
    effects: z.array(z.any()).default([]),
    audio_effects: z.array(z.any()).default([]),
    video_effects: z.array(z.any()).default([]),
    speeds: z.array(z.any()).default([]),
    animations: z.array(z.any()).default([]),
    audio_fades: z.array(z.any()).default([]),
    masks: z.array(z.any()).default([]),
    canvases: z.array(z.any()).default([]),
});
/** Segment — a clip instance on a track referencing a material. */
const DraftSegmentSchema = z.object({
    id: z.string().min(1),
    material_id: z.string().min(1),
    target_timerange: TimeRangeSchema,
    source_timerange: TimeRangeSchema.optional(),
    speed: z.number().positive().default(1.0),
    volume: z.number().min(0).default(1.0),
    clip: ClipSchema.optional(),
    animations: z.array(z.any()).default([]),
    effects: z.array(z.any()).default([]),
    filters: z.array(z.any()).default([]),
    transition: z.union([z.null(), TransitionMaterialSchema]).default(null),
});
/** Track — a timeline layer containing segments of the same type. */
const DraftTrackSchema = z.object({
    id: z.string().min(1),
    type: z.enum(["video", "audio", "text", "sticker"]),
    name: z.string(),
    render_index: z.number().int(),
    mute: z.boolean().default(false),
    segments: z.array(DraftSegmentSchema).default([]),
});
/** Canvas configuration — resolution, aspect ratio, frame rate. */
const CanvasConfigSchema = z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    ratio: z.string(),
    fps: z.number().int().positive(),
});
/** Draft project — top-level .draft file structure. */
const DraftProjectSchema = z.object({
    id: z.string().min(1),
    canvas_config: CanvasConfigSchema,
    duration: z.number().int().min(0),
    materials: DraftMaterialsSchema,
    tracks: z.array(DraftTrackSchema),
});
/** Maps EDL transition types to JianYing transition materials. */
const TRANSITION_MAP = {
    cut: { name: "", transitionType: "" },
    crossfade: { name: "叠化", transitionType: "overlay" },
    fade: { name: "淡入淡出", transitionType: "fade" },
};
// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
/**
 * Convert seconds to microseconds (JianYing's time unit).
 * @param seconds - Time in seconds.
 * @returns Time in microseconds.
 */
function toMicroseconds(seconds) {
    return Math.round(seconds * US_PER_SECOND);
}
/**
 * Generate a random UUID for draft entities.
 * @returns A v4 UUID string.
 */
function genId() {
    return randomUUID();
}
/**
 * Get the current Unix timestamp in seconds.
 * @returns Unix timestamp.
 */
function nowTimestamp() {
    return Math.floor(Date.now() / 1000);
}
/**
 * Resolve the source file path for a VideoClip.
 * Prefers localPath over videoUrl.
 * @param clip - The video clip.
 * @returns The file path or URL.
 * @throws If neither localPath nor videoUrl is available.
 */
function resolveClipPath(clip) {
    const path = clip.localPath ?? clip.videoUrl;
    if (!path) {
        throw new Error(`Clip ${clip.id} (chapter ${clip.chapterId}, clip ${clip.clipNumber}) has no videoUrl or localPath — cannot export to JianYing draft`);
    }
    return path;
}
/**
 * Calculate the effective duration of a clip in seconds, accounting for trim.
 * @param clip - The video clip.
 * @returns Duration in seconds.
 */
function getClipDurationSeconds(clip) {
    const baseDuration = clip.generateConfig.duration ?? DEFAULT_CLIP_DURATION_S;
    const trimStart = clip.trimStart ?? 0;
    const trimEnd = clip.trimEnd ?? null;
    if (trimEnd !== null && trimEnd > trimStart) {
        return trimEnd - trimStart;
    }
    return Math.max(0, baseDuration - trimStart);
}
/**
 * Build a transition lookup map keyed by target clip ID ("to" field).
 * @param transitions - Array of transitions from the EDL.
 * @returns Map from target clip ID to transition.
 */
function buildTransitionIndex(transitions) {
    const map = new Map();
    for (const t of transitions) {
        map.set(t.to, t);
    }
    return map;
}
// ---------------------------------------------------------------------------
// Material builders
// ---------------------------------------------------------------------------
/**
 * Build a video material from a VideoClip.
 * @param clip - The source video clip.
 * @param width - Canvas width for default material dimensions.
 * @param height - Canvas height for default material dimensions.
 * @param fps - Frame rate.
 * @returns A DraftVideoMaterial object.
 */
function buildVideoMaterial(clip, width, height, fps) {
    const duration = getClipDurationSeconds(clip);
    const now = nowTimestamp();
    return {
        id: genId(),
        path: resolveClipPath(clip),
        duration: toMicroseconds(duration),
        width,
        height,
        fps,
        type: "video",
        create_time: now,
        import_time: now,
        md5: "",
    };
}
/**
 * Build an audio material from a VideoClip (extracts audio from the video file).
 * @param clip - The source video clip.
 * @returns A DraftAudioMaterial object.
 */
function buildAudioMaterial(clip) {
    const duration = getClipDurationSeconds(clip);
    const now = nowTimestamp();
    return {
        id: genId(),
        path: resolveClipPath(clip),
        duration: toMicroseconds(duration),
        type: "audio",
        create_time: now,
        import_time: now,
        md5: "",
    };
}
/**
 * Build a text material from a VideoClip (subtitle text).
 * Uses actingAnchors if available, otherwise falls back to prompt.
 * @param clip - The source video clip.
 * @returns A DraftTextMaterial object.
 */
function buildTextMaterial(clip) {
    const duration = getClipDurationSeconds(clip);
    const content = clip.actingAnchors ?? clip.prompt;
    return {
        id: genId(),
        content,
        text_url: "",
        duration: toMicroseconds(duration),
        type: "text",
        text_size: 30.0,
        text_color: "#FFFFFF",
        text_alpha: 1.0,
    };
}
/**
 * Build a transition material from an EDL Transition.
 * @param transition - The EDL transition.
 * @returns A DraftTransitionMaterial, or null for "cut" (no transition).
 */
function buildTransitionMaterial(transition) {
    const mapping = TRANSITION_MAP[transition.type];
    if (!mapping || transition.type === "cut") {
        return null;
    }
    const durationS = transition.duration ?? DEFAULT_TRANSITION_DURATION_S;
    return {
        id: genId(),
        type: "transition",
        name: mapping.name,
        duration: toMicroseconds(durationS),
        transition_type: mapping.transitionType,
        param: {},
    };
}
// ---------------------------------------------------------------------------
// Segment builders
// ---------------------------------------------------------------------------
/**
 * Build a video segment for a clip.
 * @param clip - The source video clip.
 * @param materialId - The video material ID.
 * @param targetStart - Start time on the timeline (microseconds).
 * @param transitionMaterial - Optional transition material into this segment.
 * @returns A DraftSegment object.
 */
function buildVideoSegment(clip, materialId, targetStart, transitionMaterial) {
    const durationS = getClipDurationSeconds(clip);
    const trimStartS = clip.trimStart ?? 0;
    const sourceStart = toMicroseconds(trimStartS);
    const sourceDuration = toMicroseconds(durationS);
    const targetDuration = sourceDuration;
    return {
        id: genId(),
        material_id: materialId,
        target_timerange: {
            start: targetStart,
            duration: targetDuration,
        },
        source_timerange: {
            start: sourceStart,
            duration: sourceDuration,
        },
        speed: 1.0,
        volume: 1.0,
        clip: {
            alpha: 1.0,
            rotation: 0.0,
            transform: {
                x: 0.0,
                y: 0.0,
                scale: { x: 1.0, y: 1.0 },
            },
        },
        animations: [],
        effects: [],
        filters: [],
        transition: transitionMaterial,
    };
}
/**
 * Build an audio segment for a clip (mirrors the video segment timing).
 * @param clip - The source video clip.
 * @param materialId - The audio material ID.
 * @param targetStart - Start time on the timeline (microseconds).
 * @returns A DraftSegment object.
 */
function buildAudioSegment(clip, materialId, targetStart) {
    const durationS = getClipDurationSeconds(clip);
    const trimStartS = clip.trimStart ?? 0;
    const sourceStart = toMicroseconds(trimStartS);
    const sourceDuration = toMicroseconds(durationS);
    return {
        id: genId(),
        material_id: materialId,
        target_timerange: {
            start: targetStart,
            duration: sourceDuration,
        },
        source_timerange: {
            start: sourceStart,
            duration: sourceDuration,
        },
        speed: 1.0,
        volume: 1.0,
        animations: [],
        effects: [],
        filters: [],
        transition: null,
    };
}
/**
 * Build a text/subtitle segment for a clip.
 * Positions the text at the bottom of the frame (y = -0.8).
 * @param clip - The source video clip.
 * @param materialId - The text material ID.
 * @param targetStart - Start time on the timeline (microseconds).
 * @returns A DraftSegment object.
 */
function buildTextSegment(clip, materialId, targetStart) {
    const durationS = getClipDurationSeconds(clip);
    const sourceDuration = toMicroseconds(durationS);
    return {
        id: genId(),
        material_id: materialId,
        target_timerange: {
            start: targetStart,
            duration: sourceDuration,
        },
        source_timerange: {
            start: 0,
            duration: sourceDuration,
        },
        speed: 1.0,
        volume: 1.0,
        clip: {
            alpha: 1.0,
            rotation: 0.0,
            transform: {
                x: 0.0,
                y: -0.8,
                scale: { x: 1.0, y: 1.0 },
            },
        },
        animations: [],
        effects: [],
        filters: [],
        transition: null,
    };
}
// ---------------------------------------------------------------------------
// Core export function
// ---------------------------------------------------------------------------
/**
 * Convert an array of VideoClips into a JianYing .draft JSON string.
 *
 * Creates a draft project with:
 *   - A video track containing all clips as segments (with trim via source_timerange)
 *   - An audio track mirroring the video segments (audio from video files)
 *   - A text track with subtitles (if includeSubtitles is enabled)
 *   - Transition effects mapped from EDL transitions (cut -> none, crossfade -> 叠化, fade -> 淡入淡出)
 *
 * The output JSON can be written to a .draft file and opened in JianYing/CapCut.
 *
 * @param options - Export configuration (clips, output path, dimensions, etc.)
 * @returns The draft project as a JSON string.
 * @throws If no clips are provided or clips lack video sources.
 */
export function exportToJianyingDraft(options) {
    const { clips, fps = DEFAULT_FPS, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, includeSubtitles = true, transitions = [], } = options;
    if (clips.length === 0) {
        throw new Error("Cannot export JianYing draft: no clips provided");
    }
    // Validate that all clips have a video source (throws early if missing)
    for (const clip of clips) {
        resolveClipPath(clip);
    }
    // Build transition lookup: target clip ID -> transition
    const transitionIndex = buildTransitionIndex(transitions);
    // --- Build materials and segments ---
    const videoMaterials = [];
    const audioMaterials = [];
    const textMaterials = [];
    const transitionMaterials = [];
    const videoSegments = [];
    const audioSegments = [];
    const textSegments = [];
    let timelineCursorUs = 0;
    let totalDurationUs = 0;
    for (const clip of clips) {
        const durationS = getClipDurationSeconds(clip);
        const durationUs = toMicroseconds(durationS);
        // Build materials
        const videoMat = buildVideoMaterial(clip, width, height, fps);
        videoMaterials.push(videoMat);
        const audioMat = buildAudioMaterial(clip);
        audioMaterials.push(audioMat);
        if (includeSubtitles) {
            const textMat = buildTextMaterial(clip);
            textMaterials.push(textMat);
            const textSeg = buildTextSegment(clip, textMat.id, timelineCursorUs);
            textSegments.push(textSeg);
        }
        // Check for a transition into this clip
        const transition = transitionIndex.get(clip.id);
        let transitionMat = null;
        let targetStart = timelineCursorUs;
        if (transition && transition.type !== "cut") {
            transitionMat = buildTransitionMaterial(transition);
            if (transitionMat) {
                transitionMaterials.push(transitionMat);
            }
            // For crossfade/fade, pull this clip's start back to create overlap
            const transDurS = transition.duration ?? DEFAULT_TRANSITION_DURATION_S;
            const transDurUs = toMicroseconds(transDurS);
            targetStart = Math.max(0, timelineCursorUs - transDurUs);
        }
        // Build video and audio segments with transition material
        const videoSeg = buildVideoSegment(clip, videoMat.id, targetStart, transitionMat);
        videoSegments.push(videoSeg);
        const audioSeg = buildAudioSegment(clip, audioMat.id, targetStart);
        audioSegments.push(audioSeg);
        // Advance timeline cursor
        timelineCursorUs = targetStart + durationUs;
        totalDurationUs = Math.max(totalDurationUs, timelineCursorUs);
    }
    // --- Build tracks ---
    const videoTrack = {
        id: genId(),
        type: "video",
        name: "video_track_main",
        render_index: RENDER_INDEX_VIDEO,
        mute: false,
        segments: videoSegments,
    };
    const audioTrack = {
        id: genId(),
        type: "audio",
        name: "audio_track_main",
        render_index: RENDER_INDEX_AUDIO,
        mute: false,
        segments: audioSegments,
    };
    const tracks = [videoTrack, audioTrack];
    if (includeSubtitles && textSegments.length > 0) {
        const textTrack = {
            id: genId(),
            type: "text",
            name: "text_track_subtitles",
            render_index: RENDER_INDEX_TEXT,
            mute: false,
            segments: textSegments,
        };
        tracks.push(textTrack);
    }
    // --- Assemble draft project ---
    const ratio = (width / height).toString();
    const draft = {
        id: genId(),
        canvas_config: {
            width,
            height,
            ratio,
            fps,
        },
        duration: totalDurationUs,
        materials: {
            videos: videoMaterials,
            audios: audioMaterials,
            texts: textMaterials,
            transitions: transitionMaterials,
            stickers: [],
            effects: [],
            audio_effects: [],
            video_effects: [],
            speeds: [],
            animations: [],
            audio_fades: [],
            masks: [],
            canvases: [],
        },
        tracks,
    };
    // --- Validate with Zod ---
    const result = DraftProjectSchema.safeParse(draft);
    if (!result.success) {
        const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        throw new Error(`Invalid JianYing draft structure: ${messages.join("; ")}`);
    }
    return JSON.stringify(result.data, null, 2);
}
// ---------------------------------------------------------------------------
// File writer
// ---------------------------------------------------------------------------
/**
 * Export VideoClips to a JianYing .draft file on disk.
 *
 * Creates the output directory if it doesn't exist, then writes the draft JSON.
 *
 * @param options - Export configuration (clips, output path, dimensions, etc.)
 * @returns The output file path.
 * @throws If writing fails or clips are invalid.
 */
export async function exportToJianyingDraftFile(options) {
    const json = exportToJianyingDraft(options);
    // Ensure output directory exists
    const dir = dirname(options.outputPath);
    await mkdir(dir, { recursive: true });
    await writeFile(options.outputPath, json, "utf-8");
    return options.outputPath;
}
// ---------------------------------------------------------------------------
// JianyingDraftExporter class (OOP wrapper)
// ---------------------------------------------------------------------------
/**
 * Object-oriented wrapper for JianYing draft export.
 *
 * Provides a fluent interface for configuring and exporting a JianYing draft
 * from VideoClips.
 *
 * @example
 * ```typescript
 * const exporter = new JianyingDraftExporter("/output/project.draft");
 * const json = exporter
 *   .setClips(clips)
 *   .setTransitions(transitions)
 *   .setCanvas(1920, 1080, 30)
 *   .setSubtitles(true)
 *   .export();
 * await exporter.exportToFile();
 * ```
 */
export class JianyingDraftExporter {
    clips = [];
    outputPath;
    fps = DEFAULT_FPS;
    width = DEFAULT_WIDTH;
    height = DEFAULT_HEIGHT;
    includeSubtitles = true;
    transitions = [];
    /**
     * Create a new exporter.
     * @param outputPath - The output .draft file path.
     */
    constructor(outputPath) {
        this.outputPath = outputPath;
    }
    /**
     * Set the video clips to export.
     * @param clips - Array of VideoClips.
     * @returns This exporter for chaining.
     */
    setClips(clips) {
        this.clips = clips;
        return this;
    }
    /**
     * Set transitions between clips.
     * @param transitions - Array of EDL transitions.
     * @returns This exporter for chaining.
     */
    setTransitions(transitions) {
        this.transitions = transitions;
        return this;
    }
    /**
     * Set canvas dimensions and frame rate.
     * @param width - Canvas width in pixels.
     * @param height - Canvas height in pixels.
     * @param fps - Frame rate.
     * @returns This exporter for chaining.
     */
    setCanvas(width, height, fps) {
        this.width = width;
        this.height = height;
        this.fps = fps;
        return this;
    }
    /**
     * Enable or disable subtitle text track.
     * @param enabled - Whether to include subtitles.
     * @returns This exporter for chaining.
     */
    setSubtitles(enabled) {
        this.includeSubtitles = enabled;
        return this;
    }
    /**
     * Export to a JSON string.
     * @returns The draft project as a JSON string.
     */
    export() {
        return exportToJianyingDraft({
            clips: this.clips,
            outputPath: this.outputPath,
            fps: this.fps,
            width: this.width,
            height: this.height,
            includeSubtitles: this.includeSubtitles,
            transitions: this.transitions,
        });
    }
    /**
     * Export to a file on disk.
     * @returns The output file path.
     */
    async exportToFile() {
        return exportToJianyingDraftFile({
            clips: this.clips,
            outputPath: this.outputPath,
            fps: this.fps,
            width: this.width,
            height: this.height,
            includeSubtitles: this.includeSubtitles,
            transitions: this.transitions,
        });
    }
}
//# sourceMappingURL=jianying-exporter.js.map