import { z } from "zod";
import type { VideoClip } from "./types.js";
export declare const TransitionTypeSchema: z.ZodEnum<["cut", "crossfade", "fade"]>;
export type TransitionType = z.infer<typeof TransitionTypeSchema>;
export declare const TransitionSchema: z.ZodObject<{
    /** Source clip ID (the clip before the transition). */
    from: z.ZodString;
    /** Target clip ID (the clip after the transition). */
    to: z.ZodString;
    /** Transition type: cut (hard cut), crossfade (dissolve), fade (fade through black). */
    type: z.ZodEnum<["cut", "crossfade", "fade"]>;
    /** Duration of the transition in seconds (for crossfade/fade). */
    duration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "cut" | "crossfade" | "fade";
    from: string;
    to: string;
    duration?: number | undefined;
}, {
    type: "cut" | "crossfade" | "fade";
    from: string;
    to: string;
    duration?: number | undefined;
}>;
export type Transition = z.infer<typeof TransitionSchema>;
export declare const EDLClipSchema: z.ZodObject<{
    /** Reference to the source VideoClip ID. */
    clipId: z.ZodString;
    /** File path or URL of the source video. */
    sourcePath: z.ZodString;
    /** Trim start time in seconds (optional, defaults to 0). */
    start: z.ZodOptional<z.ZodNumber>;
    /** Trim end time in seconds (optional, defaults to full duration). */
    end: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    clipId: string;
    sourcePath: string;
    end?: number | undefined;
    start?: number | undefined;
}, {
    clipId: string;
    sourcePath: string;
    end?: number | undefined;
    start?: number | undefined;
}>;
export type EDLClip = z.infer<typeof EDLClipSchema>;
export declare const EDLSchema: z.ZodObject<{
    clips: z.ZodArray<z.ZodObject<{
        /** Reference to the source VideoClip ID. */
        clipId: z.ZodString;
        /** File path or URL of the source video. */
        sourcePath: z.ZodString;
        /** Trim start time in seconds (optional, defaults to 0). */
        start: z.ZodOptional<z.ZodNumber>;
        /** Trim end time in seconds (optional, defaults to full duration). */
        end: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        clipId: string;
        sourcePath: string;
        end?: number | undefined;
        start?: number | undefined;
    }, {
        clipId: string;
        sourcePath: string;
        end?: number | undefined;
        start?: number | undefined;
    }>, "many">;
    transitions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Source clip ID (the clip before the transition). */
        from: z.ZodString;
        /** Target clip ID (the clip after the transition). */
        to: z.ZodString;
        /** Transition type: cut (hard cut), crossfade (dissolve), fade (fade through black). */
        type: z.ZodEnum<["cut", "crossfade", "fade"]>;
        /** Duration of the transition in seconds (for crossfade/fade). */
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "cut" | "crossfade" | "fade";
        from: string;
        to: string;
        duration?: number | undefined;
    }, {
        type: "cut" | "crossfade" | "fade";
        from: string;
        to: string;
        duration?: number | undefined;
    }>, "many">>;
    outputPath: z.ZodString;
    /** Optional composition configuration overrides. */
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    fps: z.ZodOptional<z.ZodNumber>;
    preset: z.ZodOptional<z.ZodString>;
    crf: z.ZodOptional<z.ZodNumber>;
    minDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    clips: {
        clipId: string;
        sourcePath: string;
        end?: number | undefined;
        start?: number | undefined;
    }[];
    transitions: {
        type: "cut" | "crossfade" | "fade";
        from: string;
        to: string;
        duration?: number | undefined;
    }[];
    outputPath: string;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    preset?: string | undefined;
    crf?: number | undefined;
    minDuration?: number | undefined;
}, {
    clips: {
        clipId: string;
        sourcePath: string;
        end?: number | undefined;
        start?: number | undefined;
    }[];
    outputPath: string;
    transitions?: {
        type: "cut" | "crossfade" | "fade";
        from: string;
        to: string;
        duration?: number | undefined;
    }[] | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    preset?: string | undefined;
    crf?: number | undefined;
    minDuration?: number | undefined;
}>;
export type EDL = z.infer<typeof EDLSchema>;
export interface EDLValidationResult {
    ok: boolean;
    errors: string[];
    warnings: string[];
}
export declare function parseEDL(json: string): EDL;
export declare function buildEDL(clips: VideoClip[], transitions: Transition[], outputPath: string, config?: {
    width?: number;
    height?: number;
    fps?: number;
    preset?: string;
    crf?: number;
    minDuration?: number;
}): EDL;
export declare function validateEDL(edl: EDL, config?: {
    minDuration?: number;
}): EDLValidationResult;
//# sourceMappingURL=edl.d.ts.map