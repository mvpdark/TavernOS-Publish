import type { Transition } from "./edl.js";
export declare const EXTENDED_TRANSITION_TYPES: readonly ["cut", "crossfade", "fade", "fade_white", "wipe_left", "wipe_right", "wipe_up", "slide_left", "slide_right", "zoom_in", "zoom_out", "flash", "glitch", "dissolve"];
export type ExtendedTransitionType = (typeof EXTENDED_TRANSITION_TYPES)[number];
/** Lightweight shot context used for transition decisions. */
export interface ShotEmotionContext {
    shotId: string;
    emotionLabel?: string;
    description?: string;
    duration?: number;
    dialogue?: string;
    speaker?: string;
}
/** A transition chosen by the smart selector, with an explanation. */
export interface SmartTransition {
    from: string;
    to: string;
    type: ExtendedTransitionType;
    duration: number;
    reason: string;
}
/** Configuration for transition durations. */
export interface SmartTransitionConfig {
    /** Default transition duration in seconds */
    defaultDuration: number;
    /** Fast transition duration (cuts, flashes) */
    fastDuration: number;
    /** Slow transition duration (dissolves, fades) */
    slowDuration: number;
}
export declare const DEFAULT_SMART_TRANSITION_CONFIG: SmartTransitionConfig;
/**
 * Generate smart transitions for a sequence of shots.
 *
 * Iterates over adjacent shot pairs and calls {@link selectTransition} for each
 * pair. Returns an array of transitions whose length is `shots.length - 1`.
 *
 * @param shots  Ordered list of shot emotion contexts.
 * @param config Optional duration overrides.
 * @returns Array of smart transitions (empty if fewer than 2 shots).
 */
export declare function generateSmartTransitions(shots: ShotEmotionContext[], config?: Partial<SmartTransitionConfig>): SmartTransition[];
/**
 * Determine the best transition between two adjacent shots.
 *
 * Decision priority (first match wins):
 *   1. Flashback / dream keywords in either description → fade_white
 *   2. Shock emotion in the incoming shot → flash
 *   3. Both shots high-energy (>= 4) → hard cut
 *   4. Romantic context without mood shift → dissolve
 *   5. Mood shift (positive <-> negative) → crossfade
 *   6. Emotion-transition map lookup → mapped type
 *   7. Fallback → cut
 *
 * @param fromShot The outgoing shot.
 * @param toShot   The incoming shot.
 * @param config   Duration configuration.
 * @returns A SmartTransition with type, duration, and reason.
 */
export declare function selectTransition(fromShot: ShotEmotionContext, toShot: ShotEmotionContext, config: SmartTransitionConfig): SmartTransition;
/**
 * Map an ExtendedTransitionType to the corresponding FFmpeg xfade filter name.
 *
 * Note: cut/crossfade/dissolve all map to "fade" — the distinction is the
 * *duration* passed to the xfade filter:
 *   - cut:       "fade" with ~0.05s (effectively instant)
 *   - crossfade: "fade" with ~0.5s
 *   - dissolve:  "fade" with ~1.0s
 *
 * @param type The extended transition type.
 * @returns FFmpeg xfade filter name (e.g. "fade", "fadeblack", "wipeleft").
 */
export declare function toXfadeFilter(type: ExtendedTransitionType): string;
/**
 * Convert a {@link SmartTransition} into a basic EDL {@link Transition}.
 *
 * Extended transition types (fade_white, wipe_*, zoom_*, flash, glitch,
 * dissolve) are narrowed to the closest base type:
 *   - fade_white → fade
 *   - dissolve   → crossfade
 *   - flash, glitch, wipe_*, slide_*, zoom_* → cut
 *
 * The `reason` field is dropped. Hard cuts omit `duration` (the EDL schema
 * treats it as optional).
 *
 * @param st The smart transition to convert.
 * @returns An EDL-compatible Transition.
 */
export declare function toEDLTransition(st: SmartTransition): Transition;
//# sourceMappingURL=smart-transitions.d.ts.map