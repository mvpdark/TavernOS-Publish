import { z } from "zod";
/** MJ bot type — realistic vs. anime. */
export declare const PlusBotTypeSchema: z.ZodEnum<["MID_JOURNEY", "NIJI_JOURNEY"]>;
export type PlusBotType = z.infer<typeof PlusBotTypeSchema>;
/** Plus module configuration stored in AppSettings. */
export declare const PlusConfigSchema: z.ZodObject<{
    /** Master switch. When false the scheduler does nothing. */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Number of characters to generate per daily run (1–20). */
    dailyCount: z.ZodDefault<z.ZodNumber>;
    /** Theme / subject direction, free text (e.g. "赛博朋克酒馆"). */
    theme: z.ZodDefault<z.ZodString>;
    /** Visual style, free text (e.g. "电影感写实"). */
    style: z.ZodDefault<z.ZodString>;
    /** MJ aspect ratio, e.g. "16:9", "3:4". */
    aspectRatio: z.ZodDefault<z.ZodString>;
    /** MJ bot type. */
    botType: z.ZodDefault<z.ZodEnum<["MID_JOURNEY", "NIJI_JOURNEY"]>>;
    /** MJ version flag appended to the prompt (e.g. "6.1", "8"). */
    mjVersion: z.ZodDefault<z.ZodString>;
    /** Daily trigger time in HH:MM (24h, server local time). */
    scheduleTime: z.ZodDefault<z.ZodString>;
    /** Target project id whose characters/ folder receives generated cards. */
    targetProjectId: z.ZodDefault<z.ZodString>;
    /** Character card language for generated first_mes / description. */
    language: z.ZodDefault<z.ZodString>;
    /** Extra negative-style guidance appended to every image prompt (optional). */
    extraPrompt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    language: string;
    enabled: boolean;
    theme: string;
    aspectRatio: string;
    style: string;
    dailyCount: number;
    botType: "MID_JOURNEY" | "NIJI_JOURNEY";
    mjVersion: string;
    scheduleTime: string;
    targetProjectId: string;
    extraPrompt: string;
}, {
    language?: string | undefined;
    enabled?: boolean | undefined;
    theme?: string | undefined;
    aspectRatio?: string | undefined;
    style?: string | undefined;
    dailyCount?: number | undefined;
    botType?: "MID_JOURNEY" | "NIJI_JOURNEY" | undefined;
    mjVersion?: string | undefined;
    scheduleTime?: string | undefined;
    targetProjectId?: string | undefined;
    extraPrompt?: string | undefined;
}>;
export type PlusConfig = z.infer<typeof PlusConfigSchema>;
/** A single character generation record within one run. */
export interface PlusGenerationItem {
    /** Character name. */
    readonly name: string;
    /** Whether this item succeeded. */
    readonly ok: boolean;
    /** Local character card filename (on success). */
    readonly filename?: string;
    /** WebDAV image URL used as the avatar (on success). */
    readonly avatarUrl?: string;
    /** Error message (on failure). */
    readonly error?: string;
    /** MJ image prompt that was submitted. */
    readonly imagePrompt?: string;
}
/** Result of one Plus generation run (one or more characters). */
export interface PlusGenerationLog {
    /** ISO timestamp of the run. */
    readonly timestamp: string;
    /** Trigger source: "schedule" (cron) or "manual" (button). */
    readonly trigger: "schedule" | "manual";
    /** Per-character outcomes. */
    readonly items: readonly PlusGenerationItem[];
    /** Run-level error (e.g. WebDAV not configured), if any.
     *  Mutable so the generator can set it on early-return failure paths. */
    error?: string;
}
//# sourceMappingURL=types.d.ts.map