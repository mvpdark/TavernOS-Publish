import { z } from "zod";

// ---------------------------------------------------------------------------
// Genre & Platform
// ---------------------------------------------------------------------------

export const GenreSchema = z.string().min(1);
export type Genre = z.infer<typeof GenreSchema>;

export const PlatformSchema = z.enum(["tomato", "feilu", "qidian", "other"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const BookStatusSchema = z.enum([
  "incubating",
  "outlining",
  "active",
  "paused",
  "completed",
  "dropped",
]);
export type BookStatus = z.infer<typeof BookStatusSchema>;

export const FanficModeSchema = z.enum(["canon", "au", "ooc", "cp"]);
export type FanficMode = z.infer<typeof FanficModeSchema>;

// ---------------------------------------------------------------------------
// Book Config
// ---------------------------------------------------------------------------

export const BookConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  platform: PlatformSchema.default("other"),
  genre: GenreSchema,
  status: BookStatusSchema.default("incubating"),
  targetChapters: z.number().int().min(1).default(200),
  chapterWordCount: z.number().int().min(1000).default(2000),
  language: z.enum(["zh", "en"]).default("zh"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  parentBookId: z.string().optional(),
  fanficMode: FanficModeSchema.optional(),
  writing: z.object({
    reviewMode: z.enum(["auto", "manual"]).default("auto"),
    reviewRetries: z.number().int().min(0).max(10).default(1),
  }).default({ reviewMode: "auto", reviewRetries: 1 }),
});
export type BookConfig = z.infer<typeof BookConfigSchema>;

// ---------------------------------------------------------------------------
// Book Metadata (extended info)
// ---------------------------------------------------------------------------

export const BookMetaSchema = z.object({
  config: BookConfigSchema,
  chapterCount: z.number().int().min(0).default(0),
  totalWords: z.number().int().min(0).default(0),
  lastChapterAt: z.string().datetime().optional(),
  coverPath: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type BookMeta = z.infer<typeof BookMetaSchema>;
