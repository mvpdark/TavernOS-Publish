// Character Consistency Checker module — compares generated video frames
// against canonical character reference assets to quantify how faithfully a
// character's appearance is preserved.
//
// TavernOS targets ≥95% character consistency (parity with competitors like
// 星月梦AI). This module provides the measurement half of that goal:
//
//   1. Feature-vector comparison: extracts a face embedding from a generated
//      frame and computes cosine similarity against the character's stored
//      feature vector. This is the fast, deterministic path.
//   2. Three-view prompt generation: produces English prompts for generating
//      front / side / back reference sheets that the asset library stores.
//   3. Reference-image prompt generation: produces prompts for portrait /
//      full-body / action / expression reference images.
//
// Design notes:
//   - extractFeatureVector delegates to an injectable FaceEmbeddingProvider.
//     A StubFaceEmbeddingProvider is provided by default (returns an empty
//     vector, causing checks to be skipped). Production deployments inject a
//     real provider backed by a face-embedding service (e.g. InsightFace,
//     ArcFace, or a custom API).
//   - When no feature vector is available (character has none, or the
//     provider returns an empty vector), checkFrame returns a "skipped"
//     result rather than a hard failure, so the pipeline is not blocked by
//     missing infrastructure.
//   - The LLM-based visual consistency path (calling a reviewer agent) is
//     intentionally left as a future extension point; the current
//     implementation is feature-vector-only for simplicity.
/** Default configuration values. */
export const DEFAULT_CONSISTENCY_CONFIG = {
    threshold: 80,
    useFeatureVector: true,
    vectorSimilarityThreshold: 0.85,
};
/**
 * Default stub face-embedding provider.
 *
 * Returns an empty vector, which causes the consistency checker to skip
 * feature-vector comparison. This keeps the module usable out-of-the-box
 * without an external face-embedding service; production deployments inject
 * a real provider via the checker constructor.
 */
export class StubFaceEmbeddingProvider {
    dimension;
    /**
     * @param dimension If > 0, returns a zero-vector of this length instead of
     *   an empty array. Useful for unit tests that need a non-empty vector.
     *   Defaults to 0 (empty array).
     */
    constructor(dimension = 0) {
        this.dimension = dimension;
    }
    async extract(_imageUrl) {
        if (this.dimension > 0) {
            return new Array(this.dimension).fill(0);
        }
        return [];
    }
}
// ---------------------------------------------------------------------------
// CharacterConsistencyChecker
// ---------------------------------------------------------------------------
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
export class CharacterConsistencyChecker {
    library;
    config;
    provider;
    /**
     * @param library The character asset library to compare against.
     * @param config Partial configuration overrides (merged with defaults).
     * @param provider Face-embedding provider. Defaults to
     *   {@link StubFaceEmbeddingProvider} (which returns empty vectors).
     */
    constructor(library, config, provider) {
        this.library = library;
        this.config = { ...DEFAULT_CONSISTENCY_CONFIG, ...config };
        this.provider = provider ?? new StubFaceEmbeddingProvider();
    }
    // -------------------------------------------------------------------------
    // Frame checking
    // -------------------------------------------------------------------------
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
    async checkFrame(frameUrl, characterId) {
        const character = this.library.getCharacter(characterId);
        if (!character) {
            return this.failure(0, `Character not found: ${characterId}`);
        }
        if (!this.config.useFeatureVector) {
            return this.skip(character, "Feature-vector comparison is disabled in the current configuration.");
        }
        const referenceVector = character.featureVector;
        if (!referenceVector || referenceVector.length === 0) {
            return this.skip(character, `Character "${character.name}" has no feature vector. ` +
                "Call extractFeatureVector and setFeatureVector first to enable consistency checking.");
        }
        const frameVector = await this.extractFeatureVector(frameUrl);
        if (frameVector.length === 0) {
            return this.skip(character, `Face-embedding provider returned an empty vector for the frame. ` +
                "This usually means no face was detected or no real provider is configured.");
        }
        const similarity = CharacterConsistencyChecker.cosineSimilarity(frameVector, referenceVector);
        const score = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
        const issues = [];
        if (similarity < this.config.vectorSimilarityThreshold) {
            issues.push({
                severity: similarity < 0.5 ? "critical" : "major",
                type: "face_mismatch",
                description: `Face embedding similarity (${similarity.toFixed(4)}) is below ` +
                    `the threshold (${this.config.vectorSimilarityThreshold}).`,
                fixInstruction: "Reroll the clip with the character's reference image as the " +
                    "first/last frame, or tighten the prompt's appearance description.",
            });
        }
        const passed = score >= this.config.threshold;
        const suggestion = passed
            ? undefined
            : `Frame score ${score}/100 is below the threshold ${this.config.threshold}. ` +
                "Consider rerolling with a stronger reference-image anchor.";
        return { score, passed, issues, suggestion };
    }
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
    async checkFrames(frameUrls, characterId) {
        if (frameUrls.length === 0) {
            return this.failure(0, "No frames provided for consistency check.");
        }
        const results = await Promise.all(frameUrls.map((url) => this.checkFrame(url, characterId)));
        let minScore = Infinity;
        const allIssues = [];
        const suggestions = [];
        for (const r of results) {
            if (r.score < minScore)
                minScore = r.score;
            allIssues.push(...r.issues);
            if (r.suggestion)
                suggestions.push(r.suggestion);
        }
        const score = minScore === Infinity ? 0 : minScore;
        const passed = score >= this.config.threshold;
        const suggestion = suggestions.length > 0
            ? `${suggestions.length} frame(s) flagged: ${suggestions[0]}`
            : undefined;
        return { score, passed, issues: allIssues, suggestion };
    }
    // -------------------------------------------------------------------------
    // Feature-vector extraction
    // -------------------------------------------------------------------------
    /**
     * Extract a face-embedding feature vector from an image.
     *
     * Delegates to the injected {@link FaceEmbeddingProvider}. With the default
     * {@link StubFaceEmbeddingProvider} this returns an empty array.
     *
     * @param imageUrl URL or local path of the input image.
     * @returns A numeric feature vector (may be empty).
     */
    async extractFeatureVector(imageUrl) {
        return this.provider.extract(imageUrl);
    }
    // -------------------------------------------------------------------------
    // Static utilities
    // -------------------------------------------------------------------------
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
    static cosineSimilarity(a, b) {
        if (a.length === 0 || a.length !== b.length)
            return 0;
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        if (denom === 0)
            return 0;
        return dot / denom;
    }
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
    static generateThreeViewPrompt(character) {
        const age = character.ageRange || "25";
        const gender = character.gender;
        const appearance = character.appearance || "average build";
        const clothing = character.clothing || "casual clothing";
        const styleSuffix = "studio lighting, white background, high detail, consistent character " +
            "design, concept art style, character reference sheet, sharp focus, " +
            "anatomically correct";
        return {
            front: `Character sheet, front view, full body portrait of a ${age} year old ` +
                `${gender}, ${appearance}, wearing ${clothing}, neutral expression, ` +
                `facing forward, standing pose, ${styleSuffix}`,
            side: `Character sheet, side profile view, full body portrait of a ${age} ` +
                `year old ${gender}, ${appearance}, wearing ${clothing}, neutral ` +
                `expression, exact 90-degree side profile, standing pose, ${styleSuffix}`,
            back: `Character sheet, back view, full body portrait of a ${age} year old ` +
                `${gender}, ${appearance}, wearing ${clothing}, standing pose, viewed ` +
                `from directly behind, ${styleSuffix}`,
        };
    }
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
    static generateReferenceImagePrompt(character, type) {
        const age = character.ageRange || "25";
        const gender = character.gender;
        const appearance = character.appearance || "average build";
        const clothing = character.clothing || "casual clothing";
        const styleSuffix = "studio lighting, high detail, consistent character design, " +
            "concept art style, sharp focus";
        switch (type) {
            case "portrait":
                return (`Portrait headshot of a ${age} year old ${gender}, ${appearance}, ` +
                    `wearing ${clothing}, neutral expression, looking at camera, ` +
                    `head and shoulders framing, ${styleSuffix}`);
            case "full_body":
                return (`Full body standing portrait of a ${age} year old ${gender}, ` +
                    `${appearance}, wearing ${clothing}, neutral expression, front-facing, ` +
                    `full body visible head to toe, white background, ${styleSuffix}`);
            case "action":
                return (`Action shot of a ${age} year old ${gender}, ${appearance}, ` +
                    `wearing ${clothing}, dynamic mid-motion pose, dramatic lighting, ` +
                    `motion blur on extremities, cinematic composition, ${styleSuffix}`);
            case "expression":
                return (`Facial expression close-up of a ${age} year old ${gender}, ` +
                    `${appearance}, wearing ${clothing}, expressive emotion, face fills ` +
                    `the frame, detailed facial features, ${styleSuffix}`);
            default:
                return (`Reference image of a ${age} year old ${gender}, ${appearance}, ` +
                    `wearing ${clothing}, ${styleSuffix}`);
        }
    }
    // -------------------------------------------------------------------------
    // Private result factories
    // -------------------------------------------------------------------------
    /**
     * Build a "skipped" result — the check could not be performed but should
     * not be treated as a hard failure. Score is 0 and `passed` follows the
     * `score >= threshold` invariant (so a skip is technically a non-pass;
     * callers can distinguish skips by the empty issues array + suggestion).
     */
    skip(character, reason) {
        return {
            score: 0,
            passed: 0 >= this.config.threshold,
            issues: [],
            suggestion: `[Skipped] Character "${character.name}": ${reason}`,
        };
    }
    /**
     * Build a hard-failure result (e.g. character not found, no frames).
     */
    failure(score, reason) {
        return {
            score,
            passed: score >= this.config.threshold,
            issues: [
                {
                    severity: "critical",
                    type: "face_mismatch",
                    description: reason,
                },
            ],
            suggestion: reason,
        };
    }
}
//# sourceMappingURL=character-consistency.js.map