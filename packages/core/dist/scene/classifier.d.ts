import { type SceneClassificationResult } from "./types.js";
export declare class SceneClassifier {
    /**
     * Classify chapter text into one or more scene segments.
     *
     * @param text         Full chapter text (may contain multiple scenes).
     * @param chapterIndex Zero-based chapter index.
     * @returns            Classification result with per-scene signals and
     *                     aggregate metrics.
     */
    classify(text: string, chapterIndex: number): SceneClassificationResult;
    /**
     * Split chapter text into scene segments.
     *
     * Splits on:
     *   - Scene-break markers (※, ◆, ★, ---, ***, etc.)
     *   - Two or more consecutive blank lines
     */
    private splitIntoSegments;
    /**
     * Detect the dominant SceneType for a text segment by scoring each type's
     * keyword patterns. Ties are broken by the order in which types appear in
     * SCENE_PATTERNS (which roughly corresponds to narrative significance).
     */
    private detectType;
    /**
     * Calculate intensity (0-1) based on action/conflict keyword density,
     * exclamation marks, question marks, and sentence structure.
     */
    private calculateIntensity;
    /**
     * Calculate gravity (0-1) based on the density of death, tragedy,
     * revelation, and separation keywords.
     */
    private calculateGravity;
    /**
     * Determine whether a scene constitutes a turning point.
     *
     * A turning point occurs when:
     *   - The scene type shifts from the previous segment AND
     *   - The new type is "pivotal" (revelation, tragedy, separation, reunion,
     *     conflict), OR the new scene has high intensity or gravity.
     *
     * The first scene can never be a turning point (no previous type).
     */
    private isTurningPoint;
    /**
     * Extract participant names from a text segment.
     *
     * Uses two heuristics:
     *   1. Chinese names: match common-surname + 1-2 CJK characters that
     *      appear 2+ times, optionally followed by a common verb.
     *   2. English names: capitalised words (excluding stopwords) that appear
     *      2+ times.
     */
    private extractParticipants;
    /**
     * Attempt to extract a location from the text.
     *
     * Looks for patterns like:
     *   - "在X里/中/内/上" (in/at X)
     *   - "X殿/院/宫/楼/..." (X + building suffix)
     */
    private extractLocation;
    /**
     * Compute the dominant scene type across all segments.
     * Uses frequency, with ties broken by average intensity.
     */
    private computeDominantType;
    /**
     * Split text into sentences using CJK and Western sentence terminators.
     */
    private splitSentences;
}
//# sourceMappingURL=classifier.d.ts.map