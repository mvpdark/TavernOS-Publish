import { z } from "zod";
/** Statistical style profile extracted from a reference text. */
export declare const StyleProfileSchema: z.ZodObject<{
    /** Average sentence length (chars for Chinese, words for English). */
    avgSentenceLength: z.ZodNumber;
    /** Standard deviation of sentence lengths (rhythm indicator). */
    sentenceLengthStdDev: z.ZodNumber;
    /** Average paragraph length. */
    avgParagraphLength: z.ZodNumber;
    /** Min/max paragraph length. */
    paragraphLengthRange: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>;
    /** Type-Token Ratio — vocabulary diversity (0-1). */
    vocabularyDiversity: z.ZodNumber;
    /** Top sentence-opening patterns with frequency. */
    topPatterns: z.ZodArray<z.ZodString, "many">;
    /** Rhetorical features detected (metaphor, parallelism, etc.). */
    rhetoricalFeatures: z.ZodArray<z.ZodString, "many">;
    /** Language of the analyzed text. */
    language: z.ZodEnum<["zh", "en"]>;
    /** Name of the source file or author. */
    sourceName: z.ZodOptional<z.ZodString>;
    /** ISO timestamp of analysis. */
    analyzedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    language: "zh" | "en";
    avgSentenceLength: number;
    sentenceLengthStdDev: number;
    avgParagraphLength: number;
    paragraphLengthRange: {
        min: number;
        max: number;
    };
    vocabularyDiversity: number;
    topPatterns: string[];
    rhetoricalFeatures: string[];
    sourceName?: string | undefined;
    analyzedAt?: string | undefined;
}, {
    language: "zh" | "en";
    avgSentenceLength: number;
    sentenceLengthStdDev: number;
    avgParagraphLength: number;
    paragraphLengthRange: {
        min: number;
        max: number;
    };
    vocabularyDiversity: number;
    topPatterns: string[];
    rhetoricalFeatures: string[];
    sourceName?: string | undefined;
    analyzedAt?: string | undefined;
}>;
export type StyleProfile = z.infer<typeof StyleProfileSchema>;
/** A cloned style entry in the style library. */
export declare const StyleEntrySchema: z.ZodObject<{
    /** Unique identifier (slug). */
    id: z.ZodString;
    /** Display name (e.g., "余华风格", "Cyberpunk Noir"). */
    name: z.ZodString;
    /** Short description. */
    description: z.ZodOptional<z.ZodString>;
    /** The statistical profile. */
    profile: z.ZodObject<{
        /** Average sentence length (chars for Chinese, words for English). */
        avgSentenceLength: z.ZodNumber;
        /** Standard deviation of sentence lengths (rhythm indicator). */
        sentenceLengthStdDev: z.ZodNumber;
        /** Average paragraph length. */
        avgParagraphLength: z.ZodNumber;
        /** Min/max paragraph length. */
        paragraphLengthRange: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>;
        /** Type-Token Ratio — vocabulary diversity (0-1). */
        vocabularyDiversity: z.ZodNumber;
        /** Top sentence-opening patterns with frequency. */
        topPatterns: z.ZodArray<z.ZodString, "many">;
        /** Rhetorical features detected (metaphor, parallelism, etc.). */
        rhetoricalFeatures: z.ZodArray<z.ZodString, "many">;
        /** Language of the analyzed text. */
        language: z.ZodEnum<["zh", "en"]>;
        /** Name of the source file or author. */
        sourceName: z.ZodOptional<z.ZodString>;
        /** ISO timestamp of analysis. */
        analyzedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    }, {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    }>;
    /** LLM-generated qualitative style guide (markdown). */
    guide: z.ZodString;
    /** A short sample of the original text (for preview). */
    sample: z.ZodOptional<z.ZodString>;
    /** ISO timestamp of creation. */
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    name: string;
    profile: {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    };
    guide: string;
    description?: string | undefined;
    sample?: string | undefined;
}, {
    id: string;
    createdAt: string;
    name: string;
    profile: {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    };
    guide: string;
    description?: string | undefined;
    sample?: string | undefined;
}>;
export type StyleEntry = z.infer<typeof StyleEntrySchema>;
/** Response from style analysis (before saving to library). */
export declare const StyleAnalysisResultSchema: z.ZodObject<{
    profile: z.ZodObject<{
        /** Average sentence length (chars for Chinese, words for English). */
        avgSentenceLength: z.ZodNumber;
        /** Standard deviation of sentence lengths (rhythm indicator). */
        sentenceLengthStdDev: z.ZodNumber;
        /** Average paragraph length. */
        avgParagraphLength: z.ZodNumber;
        /** Min/max paragraph length. */
        paragraphLengthRange: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>;
        /** Type-Token Ratio — vocabulary diversity (0-1). */
        vocabularyDiversity: z.ZodNumber;
        /** Top sentence-opening patterns with frequency. */
        topPatterns: z.ZodArray<z.ZodString, "many">;
        /** Rhetorical features detected (metaphor, parallelism, etc.). */
        rhetoricalFeatures: z.ZodArray<z.ZodString, "many">;
        /** Language of the analyzed text. */
        language: z.ZodEnum<["zh", "en"]>;
        /** Name of the source file or author. */
        sourceName: z.ZodOptional<z.ZodString>;
        /** ISO timestamp of analysis. */
        analyzedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    }, {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    }>;
    /** A short excerpt for preview. */
    sample: z.ZodString;
    /** Character count of the analyzed text. */
    totalChars: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    profile: {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    };
    totalChars: number;
    sample: string;
}, {
    profile: {
        language: "zh" | "en";
        avgSentenceLength: number;
        sentenceLengthStdDev: number;
        avgParagraphLength: number;
        paragraphLengthRange: {
            min: number;
            max: number;
        };
        vocabularyDiversity: number;
        topPatterns: string[];
        rhetoricalFeatures: string[];
        sourceName?: string | undefined;
        analyzedAt?: string | undefined;
    };
    totalChars: number;
    sample: string;
}>;
export type StyleAnalysisResult = z.infer<typeof StyleAnalysisResultSchema>;
/** Request body for creating a new style entry. */
export declare const CreateStyleEntrySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    /** The reference text to analyze. */
    text: z.ZodString;
    /** Language override (auto-detected if omitted). */
    language: z.ZodOptional<z.ZodEnum<["zh", "en"]>>;
    /** Skip LLM guide generation (stats only). */
    statsOnly: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    text: string;
    language?: "zh" | "en" | undefined;
    description?: string | undefined;
    statsOnly?: boolean | undefined;
}, {
    name: string;
    text: string;
    language?: "zh" | "en" | undefined;
    description?: string | undefined;
    statsOnly?: boolean | undefined;
}>;
export type CreateStyleEntry = z.infer<typeof CreateStyleEntrySchema>;
//# sourceMappingURL=types.d.ts.map