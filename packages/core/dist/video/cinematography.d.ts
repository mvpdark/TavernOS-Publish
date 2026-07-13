import type { Shot } from "../agents/storyboard.js";
/**
 * Shot type / framing mapping table.
 * Both English and Chinese keys are registered for direct lookup.
 * Lookup tries English key first (case-insensitive), then Chinese key.
 *
 * Note: "close-up" maps to 特写 (extreme close-up). For 近景 (standard
 * close-up), use the Chinese key "近景" — the English key "close-up" is
 * shared with 特写 in the spec, so the first registered entry wins.
 */
export declare const SHOT_TYPE_MAP: Record<string, [string, string]>;
/**
 * Camera movement mapping table.
 * Both English and Chinese keys are registered for direct lookup.
 * Lookup tries English key first (case-insensitive), then Chinese key.
 */
export declare const CAMERA_MOVEMENT_MAP: Record<string, [string, string]>;
/**
 * Detect whether a string is predominantly English (ASCII letters)
 * versus Chinese (CJK characters). Used to decide whether lighting
 * text needs a prefix label in English mode.
 */
export declare function isPredominantlyEnglish(text: string): boolean;
/**
 * Build a cinematography description block for a shot.
 *
 * Translates shotType, cameraMovement, and lighting fields into
 * model-understandable text. Returns empty string if all three fields
 * are empty or generic ("auto").
 *
 * @param shot - The Shot object containing cinematography fields
 * @param language - Output language ("zh" for Chinese, "en" for English)
 * @returns Cinematography description string, or empty string if no fields present
 *
 * @example
 * // Chinese mode
 * buildCinematographyBlock(shot, "zh")
 * // => "特写镜头，缓慢推近，光影：柔和的窗外光线"
 *
 * // English mode
 * buildCinematographyBlock(shot, "en")
 * // => "extreme close-up shot, slow push-in, lighting: soft window light"
 */
export declare function buildCinematographyBlock(shot: Shot, language: "zh" | "en"): string;
/**
 * Enhance a shot with default cinematography values based on emotion.
 *
 * If shotType or cameraMovement is empty or a generic value (e.g. "auto"),
 * infers appropriate defaults from the shot's emotionLabel (falling back to
 * keyword detection in the description). Does not modify the original shot
 * object — returns a shallow copy.
 *
 * @param shot - The original Shot object
 * @returns A new Shot object with enhanced cinematography fields
 *
 * @example
 * const enhanced = enhanceShotWithCinematography(shot);
 * // shot.shotType was "" → now "close-up" (inferred from emotionLabel "愤怒")
 */
export declare function enhanceShotWithCinematography(shot: Shot): Shot;
//# sourceMappingURL=cinematography.d.ts.map