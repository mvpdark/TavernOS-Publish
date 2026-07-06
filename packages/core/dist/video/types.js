// Video generation module: types and Zod schemas.
//
// Ported and re-architected from MJ's Seedance/Jimeng video adapters.
// MJ used a CLI subprocess + local jimeng-api multipart uploader; TavernOS
// uses a clean HTTP client with configurable provider registry, enabling
// Seedance (Volcano Engine), Jimeng (local API), and custom endpoints.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const VideoProviderSchema = z.enum(["seedance", "jimeng", "jimeng-direct", "yunwu", "agnes", "custom"]);
export const VideoResolutionSchema = z.enum(["720p", "1080p", "4k"]);
export const VideoAspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
export const VideoClipStatusSchema = z.enum([
    "pending",
    "generating",
    "completed",
    "failed",
]);
// ---------------------------------------------------------------------------
// Video generation config (provider + model + credentials + defaults)
// ---------------------------------------------------------------------------
export const VideoGenConfigSchema = z.object({
    provider: VideoProviderSchema.default("seedance"),
    model: z.string().default("seedance-2.0-fast"),
    apiKey: z.string().default(""),
    baseUrl: z.string().default(""),
    /** Default clip duration in seconds (4–15 per Seedance spec). */
    duration: z.number().int().min(4).max(15).default(5),
    resolution: VideoResolutionSchema.default("1080p"),
    aspectRatio: VideoAspectRatioSchema.default("16:9"),
    /** Jimeng direct mode: sessionid from jimeng.jianying.com (Application → Cookies). */
    jimengSessionId: z.string().default(""),
});
// ---------------------------------------------------------------------------
// Video generation request (per-call overrides)
// ---------------------------------------------------------------------------
export const VideoGenRequestSchema = z.object({
    prompt: z.string().min(1),
    /** Optional single reference image URL (legacy, image-to-video first/last frame). */
    referenceImageUrl: z.string().optional(),
    /** Multiple reference image URLs for omni_reference mode (up to 9, Seedance 2.0 only). */
    referenceImageUrls: z.array(z.string()).optional(),
    /** Reference audio URLs for omni_reference mode (up to 3, MP3/WAV only). */
    referenceAudioUrls: z.array(z.string()).optional(),
    /** Per-call duration override (4–15 seconds). */
    duration: z.number().int().min(4).max(15).optional(),
    /** Per-call model override. */
    model: z.string().optional(),
});
// ---------------------------------------------------------------------------
// Video clip (tracking a single clip within a chapter)
// ---------------------------------------------------------------------------
export const VideoClipSchema = z.object({
    /** Stable unique identifier for the clip. */
    id: z.string().min(1),
    /** Chapter number this clip belongs to. */
    chapterId: z.number().int().min(1),
    /** Sequential clip number within the chapter (1-based). */
    clipNumber: z.number().int().min(1),
    /** Generation prompt describing the scene/action. */
    prompt: z.string().min(1),
    /** Video URL once generation completes. */
    videoUrl: z.string().optional(),
    /** Local file path if the video has been downloaded locally. Preferred over
     *  `videoUrl` when feeding into ffmpeg (avoids re-downloading). */
    localPath: z.string().optional(),
    /** Current status of the clip. */
    status: VideoClipStatusSchema.default("pending"),
    /** The config used to generate this clip (provider, model, etc.). */
    generateConfig: VideoGenConfigSchema,
    /** Trim start time in seconds (from frame quality check). */
    trimStart: z.number().min(0).optional(),
    /** Trim end time in seconds (from frame quality check, null = no trim). */
    trimEnd: z.number().min(0).nullable().optional(),
    /** Acting anchors (facial/hand/body cues from storyboard). */
    actingAnchors: z.string().optional(),
    /** Emotion label (e.g. "愤怒", "委屈"). */
    emotionLabel: z.string().optional(),
    /** Voice profile ID from voice-library. */
    voiceId: z.string().optional(),
    /** Voice performance instruction. */
    voiceInstruction: z.string().optional(),
    /** Shot ID from storyboard (for traceability). */
    shotId: z.string().optional(),
    /** Thumbnail URL. */
    thumbnailUrl: z.string().optional(),
    /** ISO-8601 timestamp of clip creation. */
    createdAt: z.string(),
});
//# sourceMappingURL=types.js.map