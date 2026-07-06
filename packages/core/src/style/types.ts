// packages/core/src/style/types.ts
// Style fingerprint types & Zod schemas for writing style cloning.

import { z } from "zod";

/** Statistical style profile extracted from a reference text. */
export const StyleProfileSchema = z.object({
  /** Average sentence length (chars for Chinese, words for English). */
  avgSentenceLength: z.number(),
  /** Standard deviation of sentence lengths (rhythm indicator). */
  sentenceLengthStdDev: z.number(),
  /** Average paragraph length. */
  avgParagraphLength: z.number(),
  /** Min/max paragraph length. */
  paragraphLengthRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  /** Type-Token Ratio — vocabulary diversity (0-1). */
  vocabularyDiversity: z.number(),
  /** Top sentence-opening patterns with frequency. */
  topPatterns: z.array(z.string()),
  /** Rhetorical features detected (metaphor, parallelism, etc.). */
  rhetoricalFeatures: z.array(z.string()),
  /** Language of the analyzed text. */
  language: z.enum(["zh", "en"]),
  /** Name of the source file or author. */
  sourceName: z.string().optional(),
  /** ISO timestamp of analysis. */
  analyzedAt: z.string().optional(),
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;

/** A cloned style entry in the style library. */
export const StyleEntrySchema = z.object({
  /** Unique identifier (slug). */
  id: z.string(),
  /** Display name (e.g., "余华风格", "Cyberpunk Noir"). */
  name: z.string(),
  /** Short description. */
  description: z.string().optional(),
  /** The statistical profile. */
  profile: StyleProfileSchema,
  /** LLM-generated qualitative style guide (markdown). */
  guide: z.string(),
  /** A short sample of the original text (for preview). */
  sample: z.string().optional(),
  /** ISO timestamp of creation. */
  createdAt: z.string(),
});

export type StyleEntry = z.infer<typeof StyleEntrySchema>;

/** Response from style analysis (before saving to library). */
export const StyleAnalysisResultSchema = z.object({
  profile: StyleProfileSchema,
  /** A short excerpt for preview. */
  sample: z.string(),
  /** Character count of the analyzed text. */
  totalChars: z.number(),
});

export type StyleAnalysisResult = z.infer<typeof StyleAnalysisResultSchema>;

/** Request body for creating a new style entry. */
export const CreateStyleEntrySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  /** The reference text to analyze. */
  text: z.string().min(500),
  /** Language override (auto-detected if omitted). */
  language: z.enum(["zh", "en"]).optional(),
  /** Skip LLM guide generation (stats only). */
  statsOnly: z.boolean().optional(),
});

export type CreateStyleEntry = z.infer<typeof CreateStyleEntrySchema>;
