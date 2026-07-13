import type { StyleProfile } from "./types.js";
export interface StyleFingerprint {
    /** Unique fingerprint hash (short FNV-1a hash of key metrics). */
    hash: string;
    /** Sentence length distribution buckets [0-10, 11-20, 21-40, 41-60, 60+] (proportions 0-1). */
    sentenceLengthBuckets: [number, number, number, number, number];
    /** Paragraph length avg and std. */
    paragraphLength: {
        avg: number;
        std: number;
    };
    /** Dialogue ratio (0-1). */
    dialogueRatio: number;
    /** Top 10 most frequent rhetorical devices with counts. */
    topRhetorical: {
        name: string;
        count: number;
    }[];
    /** Vocabulary richness (unique words / total words). */
    vocabularyRichness: number;
    /** Average dialogue length. */
    avgDialogueLength: number;
    /** Narrative-to-dialogue ratio. */
    narrativeToDialogue: number;
    /** Punctuation density (punctuation chars / total chars). */
    punctuationDensity: number;
    /** Sensory word density (sight/sound/touch/smell/taste words per 1000 chars). */
    sensoryDensity: number;
    /** Emotional word density per 1000 chars. */
    emotionalDensity: number;
}
/**
 * Generate a style fingerprint from text.
 * Pure statistics, zero LLM cost.
 *
 * @param text The text to fingerprint.
 * @param profile Optional pre-computed style profile (used for language hint).
 */
export declare function generateFingerprint(text: string, profile?: StyleProfile): StyleFingerprint;
/**
 * Compute similarity between two style fingerprints (0-1).
 * Uses weighted Euclidean distance across normalized dimensions.
 *
 * Weights:
 * - sentenceLengthBuckets: 20%
 * - dialogueRatio:         20%
 * - rhetorical:            15%
 * - vocabularyRichness:    15%
 * - sensoryDensity:        15%
 * - emotionalDensity:      15%
 */
export declare function fingerprintSimilarity(a: StyleFingerprint, b: StyleFingerprint): number;
/**
 * Generate a style matching guide for the scribe.
 * Compares target fingerprint with current text fingerprint,
 * produces actionable Chinese recommendations.
 *
 * @param target The desired style fingerprint (from reference text).
 * @param current The current text's fingerprint.
 * @returns Array of Chinese recommendation strings.
 */
export declare function generateStyleGuide(target: StyleFingerprint, current: StyleFingerprint): string[];
//# sourceMappingURL=style-fingerprint.d.ts.map