import { CharacterLibrary, type CharacterAsset, type CharacterReferenceImage } from "./character-asset-library.js";
/** Severity of a single consistency issue. */
export type ConsistencyIssueSeverity = "critical" | "major" | "minor";
/** Category of a consistency issue. */
export type ConsistencyIssueType = "face_mismatch" | "clothing_change" | "hair_change" | "body_type" | "accessory";
/** A single detected inconsistency between a frame and the reference. */
export interface ConsistencyIssue {
    /** How severe the issue is. */
    readonly severity: ConsistencyIssueSeverity;
    /** Category of the mismatch. */
    readonly type: ConsistencyIssueType;
    /** Human-readable description of the issue. */
    readonly description: string;
    /** Optional instruction for fixing the issue (e.g. reroll prompt). */
    readonly fixInstruction?: string;
}
/** Result of a consistency check. */
export interface ConsistencyCheckResult {
    /** Consistency score, 0–100 (higher is better). */
    readonly score: number;
    /** `true` when `score >= threshold`. */
    readonly passed: boolean;
    /** All detected issues (empty if the character is fully consistent). */
    readonly issues: readonly ConsistencyIssue[];
    /** Optional human-readable suggestion for improving consistency. */
    readonly suggestion?: string;
}
/** Configuration for the consistency checker. */
export interface ConsistencyCheckerConfig {
    /** Minimum score (0–100) for a frame to pass. Default 80. */
    readonly threshold: number;
    /** Whether to use feature-vector comparison. Default true. */
    readonly useFeatureVector: boolean;
    /** Cosine-similarity threshold above which two vectors are "the same". Default 0.85. */
    readonly vectorSimilarityThreshold: number;
}
/** Default configuration values. */
export declare const DEFAULT_CONSISTENCY_CONFIG: ConsistencyCheckerConfig;
/**
 * Abstraction over a face-embedding service.
 *
 * A real implementation calls an external API (InsightFace, ArcFace, a custom
 * microservice) to convert an image URL into a fixed-length numeric vector.
 * The vector is then compared via cosine similarity.
 */
export interface FaceEmbeddingProvider {
    /**
     * Extract a face-embedding feature vector from an image.
     *
     * @param imageUrl URL or local path of the input image.
     * @returns A numeric feature vector, or an empty array if no face is
     *   detected / the service is unavailable.
     */
    extract(imageUrl: string): Promise<number[]>;
}
/**
 * Default stub face-embedding provider.
 *
 * Returns an empty vector, which causes the consistency checker to skip
 * feature-vector comparison. This keeps the module usable out-of-the-box
 * without an external face-embedding service; production deployments inject
 * a real provider via the checker constructor.
 */
export declare class StubFaceEmbeddingProvider implements FaceEmbeddingProvider {
    private readonly dimension;
    /**
     * @param dimension If > 0, returns a zero-vector of this length instead of
     *   an empty array. Useful for unit tests that need a non-empty vector.
     *   Defaults to 0 (empty array).
     */
    constructor(dimension?: number);
    extract(_imageUrl: string): Promise<number[]>;
}
/**
 * Checks whether generated video frames are visually consistent with the
 * canonical character assets stored in a {@link CharacterLibrary}.
 *
 * The primary path compares face-embedding feature vectors via cosine
 * similarity. When feature vectors are unavailable the check is skipped
 * (returns a skip result) rather than failing.
 *
 * This class also provides static prompt-generation helpers for creating
 * three-view reference sheets and individual reference images.
 */
export declare class CharacterConsistencyChecker {
    private readonly library;
    private readonly config;
    private readonly provider;
    /**
     * @param library The character asset library to compare against.
     * @param config Partial configuration overrides (merged with defaults).
     * @param provider Face-embedding provider. Defaults to
     *   {@link StubFaceEmbeddingProvider} (which returns empty vectors).
     */
    constructor(library: CharacterLibrary, config?: Partial<ConsistencyCheckerConfig>, provider?: FaceEmbeddingProvider);
    /**
     * Check a single video frame against a character's reference assets.
     *
     * Flow:
     *   1. Look up the character in the library. If not found, return a
     *      critical failure.
     *   2. If `useFeatureVector` is disabled, return a skip result.
     *   3. If the character has no stored feature vector, return a skip result
     *      with a suggestion to extract one first.
     *   4. Extract a feature vector from the frame via the provider. If the
     *      provider returns an empty vector (e.g. stub or no face detected),
     *      return a skip result.
     *   5. Compute cosine similarity between the frame vector and the stored
     *      vector. Map to a 0–100 score.
     *   6. If similarity is below the threshold, add a `face_mismatch` issue.
     *
     * @param frameUrl URL or local path of the video frame image.
     * @param characterId The character to compare against.
     * @returns Consistency check result.
     */
    checkFrame(frameUrl: string, characterId: string): Promise<ConsistencyCheckResult>;
    /**
     * Batch-check multiple frames against the same character.
     *
     * Each frame is checked individually via {@link checkFrame}. The aggregate
     * result uses the **minimum** frame score (the worst frame determines the
     * overall pass/fail), and collects all issues from all frames.
     *
     * @param frameUrls Array of frame image URLs / paths.
     * @param characterId The character to compare against.
     * @returns Aggregate consistency check result.
     */
    checkFrames(frameUrls: string[], characterId: string): Promise<ConsistencyCheckResult>;
    /**
     * Extract a face-embedding feature vector from an image.
     *
     * Delegates to the injected {@link FaceEmbeddingProvider}. With the default
     * {@link StubFaceEmbeddingProvider} this returns an empty array.
     *
     * @param imageUrl URL or local path of the input image.
     * @returns A numeric feature vector (may be empty).
     */
    extractFeatureVector(imageUrl: string): Promise<number[]>;
    /**
     * Compute the cosine similarity between two equal-length vectors.
     *
     * cos(a, b) = (a · b) / (‖a‖ * ‖b‖)
     *
     * Returns 0 if either vector is empty or has zero magnitude (avoids
     * division by zero).
     *
     * @param a First vector.
     * @param b Second vector.
     * @returns Cosine similarity in [-1, 1].
     */
    static cosineSimilarity(a: number[], b: number[]): number;
    /**
     * Generate English prompts for a character's three-view reference sheet.
     *
     * Produces three prompts (front / side / back) that share the same
     * appearance, clothing, and style tokens so the generated views are
     * visually consistent. The prompts are designed for image-generation
     * models (Seedream, SDXL, etc.) and use the "character sheet" idiom.
     *
     * The `appearance` and `clothing` fields are injected verbatim — store
     * English descriptions in the asset for best results with English-only
     * image models.
     *
     * @param character The character to generate prompts for.
     * @returns An object with front, side, and back prompt strings.
     */
    static generateThreeViewPrompt(character: CharacterAsset): {
        front: string;
        side: string;
        back: string;
    };
    /**
     * Generate an English prompt for a single character reference image.
     *
     * The prompt varies by image type:
     *   - portrait: head-and-shoulders close-up for face detail.
     *   - full_body: full-body standing shot for proportions / clothing.
     *   - action: dynamic mid-motion shot for pose reference.
     *   - expression: close-up with a specific facial expression.
     *
     * @param character The character to generate a prompt for.
     * @param type The reference-image type.
     * @returns A single English prompt string.
     */
    static generateReferenceImagePrompt(character: CharacterAsset, type: CharacterReferenceImage["type"]): string;
    /**
     * Build a "skipped" result — the check could not be performed but should
     * not be treated as a hard failure. Score is 0 and `passed` follows the
     * `score >= threshold` invariant (so a skip is technically a non-pass;
     * callers can distinguish skips by the empty issues array + suggestion).
     */
    private skip;
    /**
     * Build a hard-failure result (e.g. character not found, no frames).
     */
    private failure;
}
//# sourceMappingURL=character-consistency.d.ts.map