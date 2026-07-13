// live2d-emotions.ts
// ---------------------------------------------------------------------------
// Shared emotion → Live2D expression/motion mapping.
//
// Single source of truth for all Live2D emotion mappings in the app.
// Prevents drift between different consumers of the emotion system.
// ---------------------------------------------------------------------------

/** Emotion keys matching the VisualNovelOverlay emotion system. */
export type Live2DEmotion =
  | "happy"
  | "sad"
  | "angry"
  | "fear"
  | "love"
  | "confident"
  | "tired"
  | "neutral";

/** Mapping from emotion key to Live2D expression/motion group names. */
export const EMOTION_MAP: Record<Live2DEmotion, { expression?: string; motion?: string }> = {
  happy: { expression: "happy", motion: "tap_body" },
  sad: { expression: "sad", motion: "tap_shake" },
  angry: { expression: "angry", motion: "tap_angry" },
  fear: { expression: "fear", motion: "tap_fear" },
  love: { expression: "love", motion: "tap_love" },
  confident: { expression: "confident", motion: "tap_confident" },
  tired: { expression: "tired", motion: "tap_tired" },
  neutral: { expression: "neutral", motion: "idle" },
};

/**
 * Safely cast a string to Live2DEmotion, falling back to "neutral".
 *
 * Use this when receiving emotion from external systems (e.g. VisualNovelOverlay's
 * string-based emotion keys) to avoid unsafe `as` casts.
 */
export function toLive2DEmotion(key: string): Live2DEmotion {
  if (key in EMOTION_MAP) return key as Live2DEmotion;
  return "neutral";
}

/**
 * Apply an emotion to a Live2D model (expression + motion).
 * Silently ignores models that don't have the specified expression/motion.
 */
export function applyEmotion(
  model: { expression: (name: string | number) => Promise<unknown>; motion: (group: string, index?: number) => Promise<unknown> },
  emotion: Live2DEmotion,
): void {
  const mapping = EMOTION_MAP[emotion];
  if (!mapping) return;
  if (mapping.expression) {
    model.expression(mapping.expression).catch(() => {});
  }
  if (mapping.motion) {
    model.motion(mapping.motion).catch(() => {});
  }
}
