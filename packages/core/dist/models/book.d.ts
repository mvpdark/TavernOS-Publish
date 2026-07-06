import { z } from "zod";
export declare const GenreSchema: z.ZodString;
export type Genre = z.infer<typeof GenreSchema>;
export declare const PlatformSchema: z.ZodEnum<["tomato", "feilu", "qidian", "other"]>;
export type Platform = z.infer<typeof PlatformSchema>;
export declare const BookStatusSchema: z.ZodEnum<["incubating", "outlining", "active", "paused", "completed", "dropped"]>;
export type BookStatus = z.infer<typeof BookStatusSchema>;
export declare const FanficModeSchema: z.ZodEnum<["canon", "au", "ooc", "cp"]>;
export type FanficMode = z.infer<typeof FanficModeSchema>;
export declare const BookConfigSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    platform: z.ZodDefault<z.ZodEnum<["tomato", "feilu", "qidian", "other"]>>;
    genre: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["incubating", "outlining", "active", "paused", "completed", "dropped"]>>;
    targetChapters: z.ZodDefault<z.ZodNumber>;
    chapterWordCount: z.ZodDefault<z.ZodNumber>;
    language: z.ZodDefault<z.ZodEnum<["zh", "en"]>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    parentBookId: z.ZodOptional<z.ZodString>;
    fanficMode: z.ZodOptional<z.ZodEnum<["canon", "au", "ooc", "cp"]>>;
    writing: z.ZodDefault<z.ZodObject<{
        reviewMode: z.ZodDefault<z.ZodEnum<["auto", "manual"]>>;
        reviewRetries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reviewMode: "auto" | "manual";
        reviewRetries: number;
    }, {
        reviewMode?: "auto" | "manual" | undefined;
        reviewRetries?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped";
    id: string;
    title: string;
    platform: "tomato" | "feilu" | "qidian" | "other";
    genre: string;
    targetChapters: number;
    chapterWordCount: number;
    language: "zh" | "en";
    createdAt: string;
    updatedAt: string;
    writing: {
        reviewMode: "auto" | "manual";
        reviewRetries: number;
    };
    parentBookId?: string | undefined;
    fanficMode?: "canon" | "au" | "ooc" | "cp" | undefined;
}, {
    id: string;
    title: string;
    genre: string;
    createdAt: string;
    updatedAt: string;
    status?: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped" | undefined;
    platform?: "tomato" | "feilu" | "qidian" | "other" | undefined;
    targetChapters?: number | undefined;
    chapterWordCount?: number | undefined;
    language?: "zh" | "en" | undefined;
    parentBookId?: string | undefined;
    fanficMode?: "canon" | "au" | "ooc" | "cp" | undefined;
    writing?: {
        reviewMode?: "auto" | "manual" | undefined;
        reviewRetries?: number | undefined;
    } | undefined;
}>;
export type BookConfig = z.infer<typeof BookConfigSchema>;
export declare const BookMetaSchema: z.ZodObject<{
    config: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        platform: z.ZodDefault<z.ZodEnum<["tomato", "feilu", "qidian", "other"]>>;
        genre: z.ZodString;
        status: z.ZodDefault<z.ZodEnum<["incubating", "outlining", "active", "paused", "completed", "dropped"]>>;
        targetChapters: z.ZodDefault<z.ZodNumber>;
        chapterWordCount: z.ZodDefault<z.ZodNumber>;
        language: z.ZodDefault<z.ZodEnum<["zh", "en"]>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        parentBookId: z.ZodOptional<z.ZodString>;
        fanficMode: z.ZodOptional<z.ZodEnum<["canon", "au", "ooc", "cp"]>>;
        writing: z.ZodDefault<z.ZodObject<{
            reviewMode: z.ZodDefault<z.ZodEnum<["auto", "manual"]>>;
            reviewRetries: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            reviewMode: "auto" | "manual";
            reviewRetries: number;
        }, {
            reviewMode?: "auto" | "manual" | undefined;
            reviewRetries?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped";
        id: string;
        title: string;
        platform: "tomato" | "feilu" | "qidian" | "other";
        genre: string;
        targetChapters: number;
        chapterWordCount: number;
        language: "zh" | "en";
        createdAt: string;
        updatedAt: string;
        writing: {
            reviewMode: "auto" | "manual";
            reviewRetries: number;
        };
        parentBookId?: string | undefined;
        fanficMode?: "canon" | "au" | "ooc" | "cp" | undefined;
    }, {
        id: string;
        title: string;
        genre: string;
        createdAt: string;
        updatedAt: string;
        status?: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped" | undefined;
        platform?: "tomato" | "feilu" | "qidian" | "other" | undefined;
        targetChapters?: number | undefined;
        chapterWordCount?: number | undefined;
        language?: "zh" | "en" | undefined;
        parentBookId?: string | undefined;
        fanficMode?: "canon" | "au" | "ooc" | "cp" | undefined;
        writing?: {
            reviewMode?: "auto" | "manual" | undefined;
            reviewRetries?: number | undefined;
        } | undefined;
    }>;
    chapterCount: z.ZodDefault<z.ZodNumber>;
    totalWords: z.ZodDefault<z.ZodNumber>;
    lastChapterAt: z.ZodOptional<z.ZodString>;
    coverPath: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    config: {
        status: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped";
        id: string;
        title: string;
        platform: "tomato" | "feilu" | "qidian" | "other";
        genre: string;
        targetChapters: number;
        chapterWordCount: number;
        language: "zh" | "en";
        createdAt: string;
        updatedAt: string;
        writing: {
            reviewMode: "auto" | "manual";
            reviewRetries: number;
        };
        parentBookId?: string | undefined;
        fanficMode?: "canon" | "au" | "ooc" | "cp" | undefined;
    };
    chapterCount: number;
    totalWords: number;
    tags: string[];
    lastChapterAt?: string | undefined;
    coverPath?: string | undefined;
}, {
    config: {
        id: string;
        title: string;
        genre: string;
        createdAt: string;
        updatedAt: string;
        status?: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped" | undefined;
        platform?: "tomato" | "feilu" | "qidian" | "other" | undefined;
        targetChapters?: number | undefined;
        chapterWordCount?: number | undefined;
        language?: "zh" | "en" | undefined;
        parentBookId?: string | undefined;
        fanficMode?: "canon" | "au" | "ooc" | "cp" | undefined;
        writing?: {
            reviewMode?: "auto" | "manual" | undefined;
            reviewRetries?: number | undefined;
        } | undefined;
    };
    chapterCount?: number | undefined;
    totalWords?: number | undefined;
    lastChapterAt?: string | undefined;
    coverPath?: string | undefined;
    tags?: string[] | undefined;
}>;
export type BookMeta = z.infer<typeof BookMetaSchema>;
//# sourceMappingURL=book.d.ts.map