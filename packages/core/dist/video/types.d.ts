import { z } from "zod";
export declare const VideoProviderSchema: z.ZodEnum<["seedance", "jimeng", "jimeng-direct", "yunwu", "agnes", "custom"]>;
export type VideoProvider = z.infer<typeof VideoProviderSchema>;
export declare const VideoResolutionSchema: z.ZodEnum<["720p", "1080p", "4k"]>;
export type VideoResolution = z.infer<typeof VideoResolutionSchema>;
export declare const VideoAspectRatioSchema: z.ZodEnum<["16:9", "9:16", "1:1"]>;
export type VideoAspectRatio = z.infer<typeof VideoAspectRatioSchema>;
export declare const VideoClipStatusSchema: z.ZodEnum<["pending", "generating", "completed", "failed"]>;
export type VideoClipStatus = z.infer<typeof VideoClipStatusSchema>;
export declare const VideoGenConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["seedance", "jimeng", "jimeng-direct", "yunwu", "agnes", "custom"]>>;
    model: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodDefault<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
    /** Default clip duration in seconds (4–15 per Seedance spec). */
    duration: z.ZodDefault<z.ZodNumber>;
    resolution: z.ZodDefault<z.ZodEnum<["720p", "1080p", "4k"]>>;
    aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    /** Jimeng direct mode: sessionid from jimeng.jianying.com (Application → Cookies). */
    jimengSessionId: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    provider: "custom" | "yunwu" | "agnes" | "seedance" | "jimeng" | "jimeng-direct";
    apiKey: string;
    model: string;
    duration: number;
    resolution: "720p" | "1080p" | "4k";
    aspectRatio: "16:9" | "9:16" | "1:1";
    jimengSessionId: string;
}, {
    baseUrl?: string | undefined;
    provider?: "custom" | "yunwu" | "agnes" | "seedance" | "jimeng" | "jimeng-direct" | undefined;
    apiKey?: string | undefined;
    model?: string | undefined;
    duration?: number | undefined;
    resolution?: "720p" | "1080p" | "4k" | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    jimengSessionId?: string | undefined;
}>;
export type VideoGenConfig = z.infer<typeof VideoGenConfigSchema>;
export declare const VideoGenRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    /** Optional single reference image URL (legacy, image-to-video first/last frame). */
    referenceImageUrl: z.ZodOptional<z.ZodString>;
    /** Multiple reference image URLs for omni_reference mode (up to 9, Seedance 2.0 only). */
    referenceImageUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Reference audio URLs for omni_reference mode (up to 3, MP3/WAV only). */
    referenceAudioUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Per-call duration override (4–15 seconds). */
    duration: z.ZodOptional<z.ZodNumber>;
    /** Per-call model override. */
    model: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    model?: string | undefined;
    duration?: number | undefined;
    referenceImageUrl?: string | undefined;
    referenceImageUrls?: string[] | undefined;
    referenceAudioUrls?: string[] | undefined;
}, {
    prompt: string;
    model?: string | undefined;
    duration?: number | undefined;
    referenceImageUrl?: string | undefined;
    referenceImageUrls?: string[] | undefined;
    referenceAudioUrls?: string[] | undefined;
}>;
export type VideoGenRequest = z.infer<typeof VideoGenRequestSchema>;
export interface VideoGenResponse {
    /** Remote URL of the generated video file. */
    readonly videoUrl: string;
    /** Optional thumbnail/poster image URL. */
    readonly thumbnailUrl?: string;
    /** Actual duration of the generated video in seconds. */
    readonly duration: number;
    /** ISO-8601 timestamp of when the video was created. */
    readonly createdAt: string;
}
export declare const VideoClipSchema: z.ZodObject<{
    /** Stable unique identifier for the clip. */
    id: z.ZodString;
    /** Chapter number this clip belongs to. */
    chapterId: z.ZodNumber;
    /** Sequential clip number within the chapter (1-based). */
    clipNumber: z.ZodNumber;
    /** Generation prompt describing the scene/action. */
    prompt: z.ZodString;
    /** Video URL once generation completes. */
    videoUrl: z.ZodOptional<z.ZodString>;
    /** Local file path if the video has been downloaded locally. Preferred over
     *  `videoUrl` when feeding into ffmpeg (avoids re-downloading). */
    localPath: z.ZodOptional<z.ZodString>;
    /** Current status of the clip. */
    status: z.ZodDefault<z.ZodEnum<["pending", "generating", "completed", "failed"]>>;
    /** The config used to generate this clip (provider, model, etc.). */
    generateConfig: z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["seedance", "jimeng", "jimeng-direct", "yunwu", "agnes", "custom"]>>;
        model: z.ZodDefault<z.ZodString>;
        apiKey: z.ZodDefault<z.ZodString>;
        baseUrl: z.ZodDefault<z.ZodString>;
        /** Default clip duration in seconds (4–15 per Seedance spec). */
        duration: z.ZodDefault<z.ZodNumber>;
        resolution: z.ZodDefault<z.ZodEnum<["720p", "1080p", "4k"]>>;
        aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
        /** Jimeng direct mode: sessionid from jimeng.jianying.com (Application → Cookies). */
        jimengSessionId: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        provider: "custom" | "yunwu" | "agnes" | "seedance" | "jimeng" | "jimeng-direct";
        apiKey: string;
        model: string;
        duration: number;
        resolution: "720p" | "1080p" | "4k";
        aspectRatio: "16:9" | "9:16" | "1:1";
        jimengSessionId: string;
    }, {
        baseUrl?: string | undefined;
        provider?: "custom" | "yunwu" | "agnes" | "seedance" | "jimeng" | "jimeng-direct" | undefined;
        apiKey?: string | undefined;
        model?: string | undefined;
        duration?: number | undefined;
        resolution?: "720p" | "1080p" | "4k" | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
        jimengSessionId?: string | undefined;
    }>;
    /** Trim start time in seconds (from frame quality check). */
    trimStart: z.ZodOptional<z.ZodNumber>;
    /** Trim end time in seconds (from frame quality check, null = no trim). */
    trimEnd: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    /** Acting anchors (facial/hand/body cues from storyboard). */
    actingAnchors: z.ZodOptional<z.ZodString>;
    /** Emotion label (e.g. "愤怒", "委屈"). */
    emotionLabel: z.ZodOptional<z.ZodString>;
    /** Voice profile ID from voice-library. */
    voiceId: z.ZodOptional<z.ZodString>;
    /** Voice performance instruction. */
    voiceInstruction: z.ZodOptional<z.ZodString>;
    /** Shot ID from storyboard (for traceability). */
    shotId: z.ZodOptional<z.ZodString>;
    /** Thumbnail URL. */
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    /** ISO-8601 timestamp of clip creation. */
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "pending" | "generating" | "failed";
    id: string;
    createdAt: string;
    prompt: string;
    chapterId: number;
    clipNumber: number;
    generateConfig: {
        baseUrl: string;
        provider: "custom" | "yunwu" | "agnes" | "seedance" | "jimeng" | "jimeng-direct";
        apiKey: string;
        model: string;
        duration: number;
        resolution: "720p" | "1080p" | "4k";
        aspectRatio: "16:9" | "9:16" | "1:1";
        jimengSessionId: string;
    };
    trimEnd?: number | null | undefined;
    trimStart?: number | undefined;
    voiceId?: string | undefined;
    videoUrl?: string | undefined;
    localPath?: string | undefined;
    actingAnchors?: string | undefined;
    emotionLabel?: string | undefined;
    voiceInstruction?: string | undefined;
    shotId?: string | undefined;
    thumbnailUrl?: string | undefined;
}, {
    id: string;
    createdAt: string;
    prompt: string;
    chapterId: number;
    clipNumber: number;
    generateConfig: {
        baseUrl?: string | undefined;
        provider?: "custom" | "yunwu" | "agnes" | "seedance" | "jimeng" | "jimeng-direct" | undefined;
        apiKey?: string | undefined;
        model?: string | undefined;
        duration?: number | undefined;
        resolution?: "720p" | "1080p" | "4k" | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
        jimengSessionId?: string | undefined;
    };
    status?: "completed" | "pending" | "generating" | "failed" | undefined;
    trimEnd?: number | null | undefined;
    trimStart?: number | undefined;
    voiceId?: string | undefined;
    videoUrl?: string | undefined;
    localPath?: string | undefined;
    actingAnchors?: string | undefined;
    emotionLabel?: string | undefined;
    voiceInstruction?: string | undefined;
    shotId?: string | undefined;
    thumbnailUrl?: string | undefined;
}>;
export type VideoClip = z.infer<typeof VideoClipSchema>;
//# sourceMappingURL=types.d.ts.map