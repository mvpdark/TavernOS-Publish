import { z } from "zod";
export declare const TimelineAnchorSchema: z.ZodObject<{
    id: z.ZodString;
    chapterIndex: z.ZodNumber;
    label: z.ZodString;
    inStoryTime: z.ZodOptional<z.ZodString>;
    characters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    location: z.ZodOptional<z.ZodString>;
    anchorType: z.ZodDefault<z.ZodEnum<["event", "milestone", "flashback", "flashforward", "timeskip"]>>;
    significance: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    characters: string[];
    label: string;
    chapterIndex: number;
    anchorType: "event" | "milestone" | "flashback" | "flashforward" | "timeskip";
    significance: number;
    location?: string | undefined;
    inStoryTime?: string | undefined;
}, {
    id: string;
    createdAt: string;
    label: string;
    chapterIndex: number;
    characters?: string[] | undefined;
    location?: string | undefined;
    inStoryTime?: string | undefined;
    anchorType?: "event" | "milestone" | "flashback" | "flashforward" | "timeskip" | undefined;
    significance?: number | undefined;
}>;
export type TimelineAnchor = z.infer<typeof TimelineAnchorSchema>;
export interface TemporalContext {
    readonly currentChapter: number;
    readonly recentAnchors: readonly TimelineAnchor[];
    readonly recurringPatterns: readonly string[];
    readonly timeSinceLastAppearance: ReadonlyMap<string, number>;
    readonly chapterDensity: number;
}
export interface AppearanceRecord {
    readonly character: string;
    readonly firstChapter: number;
    readonly lastChapter: number;
    readonly totalChapters: number;
    readonly gapChapters: number;
    readonly chapterList: readonly number[];
}
//# sourceMappingURL=types.d.ts.map