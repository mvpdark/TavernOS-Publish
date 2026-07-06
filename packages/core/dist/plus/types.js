// Plus module types and Zod schemas.
//
// The Plus module silently generates characters on a daily schedule: an LLM
// produces a character setting + image prompt, Midjourney renders a 16:9
// portrait, the image and card JSON are uploaded to a WebDAV folder, and the
// card (with its avatar pointing at the WebDAV URL) is saved to the local
// character library.
import { z } from "zod";
/** MJ bot type — realistic vs. anime. */
export const PlusBotTypeSchema = z.enum(["MID_JOURNEY", "NIJI_JOURNEY"]);
/** Plus module configuration stored in AppSettings. */
export const PlusConfigSchema = z.object({
    /** Master switch. When false the scheduler does nothing. */
    enabled: z.boolean().default(false),
    /** Number of characters to generate per daily run (1–20). */
    dailyCount: z.number().int().min(1).max(20).default(1),
    /** Theme / subject direction, free text (e.g. "赛博朋克酒馆"). */
    theme: z.string().default("奇幻酒馆"),
    /** Visual style, free text (e.g. "电影感写实"). */
    style: z.string().default("电影感写实"),
    /** MJ aspect ratio, e.g. "16:9", "3:4". */
    aspectRatio: z.string().default("16:9"),
    /** MJ bot type. */
    botType: PlusBotTypeSchema.default("MID_JOURNEY"),
    /** MJ version flag appended to the prompt (e.g. "6.1", "8"). */
    mjVersion: z.string().default("6.1"),
    /** Daily trigger time in HH:MM (24h, server local time). */
    scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).default("03:00"),
    /** Target project id whose characters/ folder receives generated cards. */
    targetProjectId: z.string().default(""),
    /** Character card language for generated first_mes / description. */
    language: z.string().default("zh"),
    /** Extra negative-style guidance appended to every image prompt (optional). */
    extraPrompt: z.string().default(""),
});
//# sourceMappingURL=types.js.map