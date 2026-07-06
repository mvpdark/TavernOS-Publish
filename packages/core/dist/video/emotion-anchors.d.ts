export interface EmotionAnchors {
    /** Short Chinese phrase describing facial micro-expressions. */
    face: string;
    /** Short Chinese phrase describing hand gestures. */
    hand: string;
    /** Short Chinese phrase describing body posture/movement. */
    body: string;
}
export declare const EMOTION_ANCHOR_MAP: Record<string, EmotionAnchors>;
export declare const EMOTION_LABELS: string[];
/**
 * Detect up to `maxCount` primary emotions from a text snippet (dialogue,
 * narration, or mood label). Returns an array of emotion keys that can be
 * passed to `getAnchors()`.
 */
export declare function detectEmotions(text: string, maxCount?: number): string[];
/**
 * Return the 3-anchor acting instruction set for a given emotion key.
 * Returns a neutral-default when the emotion is not in the map.
 */
export declare function getAnchors(emotion: string): EmotionAnchors;
/**
 * Build a single Chinese acting instruction string (≤90 chars) suitable for
 * direct injection into a video prompt. Format:
 *   "面部：[face]；手部：[hand]；肢体：[body]"
 *
 * When no emotion is detected, returns a neutral "natural acting" cue so the
 * model doesn't produce deadpan faces even in non-emotional scenes.
 */
export declare function buildActingAnchors(text: string, opts?: {
    maxEmotions?: number;
    includeSuffix?: boolean;
}): string;
/**
 * Build a Grok-specific emotion performance cue. Grok single-shot clips have
 * no audio track, so every emotion must be conveyed 100% through visuals.
 * Returns a ready-to-append block starting with "人物情绪表演：".
 */
export declare function buildGrokEmotionCue(routeText: string, sourceText?: string): string;
/**
 * For a given dialogue line and emotion, return the voice performance
 * direction text (tone / pace / breathing / emphasis) that can be appended
 * after the dialogue in the prompt. This is used for Seedance clips with
 * dialogue so the model knows HOW the line is delivered, not just WHAT is said.
 */
export declare function buildVoicePerformanceCue(emotion: string): string;
//# sourceMappingURL=emotion-anchors.d.ts.map