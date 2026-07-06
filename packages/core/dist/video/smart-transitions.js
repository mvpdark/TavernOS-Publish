// Smart transition selector — automatically chooses transition type and duration
// based on the emotional context and pacing of adjacent shots.
//
// Instead of manually specifying transitions in the EDL, this module analyzes
// the emotion labels of adjacent shots and selects the most cinematic transition:
//   - High energy → fast cut or wipe
//   - Emotional shift → crossfade
//   - Tension → quick cut
//   - Calm → slow crossfade
//   - Memory/flashback → fade through white
//   - Shock → flash cut
//
// Emotion labels align with the 30-emotion taxonomy defined in emotion-anchors.ts
// (愤怒/委屈/开心/温柔/暧昧/霸总/震惊/紧张/害怕/哭/…).
// ---------------------------------------------------------------------------
// Extended transition types
// ---------------------------------------------------------------------------
export const EXTENDED_TRANSITION_TYPES = [
    "cut",
    "crossfade",
    "fade", // fade through black
    "fade_white", // fade through white (flashback/dream)
    "wipe_left",
    "wipe_right",
    "wipe_up",
    "slide_left",
    "slide_right",
    "zoom_in",
    "zoom_out",
    "flash", // quick white flash (shock/tension)
    "glitch", // digital glitch effect
    "dissolve", // slow dissolve (romance/dream)
];
export const DEFAULT_SMART_TRANSITION_CONFIG = {
    defaultDuration: 0.5,
    fastDuration: 0.2,
    slowDuration: 1.0,
};
// ---------------------------------------------------------------------------
// Emotion → transition preference mapping
// ---------------------------------------------------------------------------
const EMOTION_TRANSITION_MAP = {
    // High energy emotions → fast cuts
    愤怒: "cut",
    怒: "cut",
    恨: "cut",
    震惊: "flash",
    惊恐: "flash",
    害怕: "cut",
    紧张: "cut",
    质问: "cut",
    // Emotional shifts → crossfade / dissolve
    委屈: "crossfade",
    难过: "crossfade",
    隐忍: "dissolve",
    哭: "dissolve",
    温柔: "dissolve",
    害羞: "crossfade",
    不甘: "cut",
    心虚: "crossfade",
    压抑: "dissolve",
    // Calm / positive → slow transitions
    开心: "wipe_left",
    笑: "dissolve",
    兴奋: "wipe_left",
    轻快: "wipe_left",
    冷静: "crossfade",
    坚定: "cut",
    冷淡: "cut",
    疲惫: "dissolve",
    // Power dynamics
    霸总: "zoom_in",
    压迫: "zoom_in",
    不屑: "cut",
    讽刺: "cut",
    // Romance
    暧昧: "dissolve",
    撒娇: "crossfade",
};
// ---------------------------------------------------------------------------
// Keyword sets for context-aware transition selection
// ---------------------------------------------------------------------------
/** Keywords in shot descriptions that indicate a flashback or dream sequence. */
const FLASHBACK_KEYWORDS = [
    "回忆",
    "闪回",
    "梦",
    "梦境",
    "幻觉",
    "往事",
    "从前",
    "记忆",
    "曾经",
    "那年",
    "童年",
    "小时候",
    "多年前",
    "多年后",
    "过去",
];
/** Keywords that indicate a romantic / intimate atmosphere. */
const ROMANCE_KEYWORDS = [
    "暧昧",
    "浪漫",
    "心动",
    "喜欢",
    "爱",
    "吻",
    "牵手",
    "拥抱",
    "深情",
    "告白",
    "甜蜜",
];
/** Emotions considered "romantic" for dissolve selection. */
const ROMANCE_EMOTIONS = new Set(["暧昧", "温柔", "撒娇", "害羞"]);
/** Emotions that trigger a flash transition (shock value). */
const SHOCK_EMOTIONS = new Set(["震惊", "惊恐"]);
// ---------------------------------------------------------------------------
// Emotion energy levels (1-5, 5 = highest intensity)
// ---------------------------------------------------------------------------
const EMOTION_ENERGY = {
    // 5 — explosive intensity
    愤怒: 5,
    怒: 5,
    恨: 5,
    震惊: 5,
    惊恐: 5,
    // 4 — high intensity
    害怕: 4,
    紧张: 4,
    压迫: 4,
    霸总: 4,
    兴奋: 4,
    质问: 4,
    不甘: 4,
    压抑: 4,
    // 3 — moderate intensity
    不屑: 3,
    讽刺: 3,
    开心: 3,
    坚定: 3,
    哭: 3,
    隐忍: 3,
    // 2 — low intensity
    委屈: 2,
    难过: 2,
    撒娇: 2,
    暧昧: 2,
    心虚: 2,
    轻快: 2,
    冷淡: 2,
    // 1 — very calm
    温柔: 1,
    害羞: 1,
    冷静: 1,
    疲惫: 1,
    笑: 1,
};
/** Default energy level for unrecognised emotions. */
const DEFAULT_ENERGY = 3;
// ---------------------------------------------------------------------------
// Emotion valence categories (for mood-shift detection)
// ---------------------------------------------------------------------------
const POSITIVE_EMOTIONS = new Set([
    "开心",
    "笑",
    "温柔",
    "害羞",
    "撒娇",
    "暧昧",
    "兴奋",
    "轻快",
    "坚定",
]);
const NEGATIVE_EMOTIONS = new Set([
    "愤怒",
    "怒",
    "恨",
    "震惊",
    "惊恐",
    "紧张",
    "害怕",
    "委屈",
    "难过",
    "哭",
    "压迫",
    "不甘",
    "压抑",
    "隐忍",
    "心虚",
]);
// ---------------------------------------------------------------------------
// generateSmartTransitions
// ---------------------------------------------------------------------------
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
export function generateSmartTransitions(shots, config) {
    if (shots.length < 2) {
        return [];
    }
    const mergedConfig = {
        ...DEFAULT_SMART_TRANSITION_CONFIG,
        ...config,
    };
    const transitions = [];
    for (let i = 0; i < shots.length - 1; i++) {
        const fromShot = shots[i];
        const toShot = shots[i + 1];
        transitions.push(selectTransition(fromShot, toShot, mergedConfig));
    }
    return transitions;
}
// ---------------------------------------------------------------------------
// selectTransition
// ---------------------------------------------------------------------------
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
export function selectTransition(fromShot, toShot, config) {
    const fromEmotion = fromShot.emotionLabel ?? "";
    const toEmotion = toShot.emotionLabel ?? "";
    const combinedDescription = `${fromShot.description ?? ""} ${toShot.description ?? ""}`;
    // 1. Flashback / dream → fade through white
    if (containsAnyKeyword(combinedDescription, FLASHBACK_KEYWORDS)) {
        return {
            from: fromShot.shotId,
            to: toShot.shotId,
            type: "fade_white",
            duration: config.slowDuration,
            reason: `检测到回忆/梦境关键词，使用白色淡入淡出（fade_white）营造闪回感`,
        };
    }
    // 2. Shock emotion in the incoming shot → flash cut
    if (SHOCK_EMOTIONS.has(toEmotion)) {
        return {
            from: fromShot.shotId,
            to: toShot.shotId,
            type: "flash",
            duration: config.fastDuration,
            reason: `入镜镜头情绪为"${toEmotion}"（震惊/惊恐），使用闪光转场（flash）制造冲击感`,
        };
    }
    // 3. Both high energy → hard cut (maintain fast pacing)
    const fromEnergy = getEnergyLevel(fromEmotion);
    const toEnergy = getEnergyLevel(toEmotion);
    if (fromEnergy >= 4 && toEnergy >= 4) {
        return {
            from: fromShot.shotId,
            to: toShot.shotId,
            type: "cut",
            duration: config.fastDuration,
            reason: `相邻镜头均为高能量情绪（${fromEmotion || "未知"}=${fromEnergy}，${toEmotion || "未知"}=${toEnergy}），使用硬切保持快节奏`,
        };
    }
    // 4. Romantic context (no mood shift) → slow dissolve
    const isRomantic = containsAnyKeyword(combinedDescription, ROMANCE_KEYWORDS) ||
        ROMANCE_EMOTIONS.has(toEmotion) ||
        ROMANCE_EMOTIONS.has(fromEmotion);
    if (isRomantic && !isMoodShift(fromEmotion, toEmotion)) {
        return {
            from: fromShot.shotId,
            to: toShot.shotId,
            type: "dissolve",
            duration: config.slowDuration,
            reason: `检测到浪漫/温柔氛围，使用慢溶解（dissolve）营造梦幻感`,
        };
    }
    // 5. Mood shift (positive <-> negative) → crossfade
    if (isMoodShift(fromEmotion, toEmotion)) {
        return {
            from: fromShot.shotId,
            to: toShot.shotId,
            type: "crossfade",
            duration: config.defaultDuration,
            reason: `情绪发生转变（${fromEmotion || "未知"} → ${toEmotion || "未知"}），使用交叉淡入淡出平滑过渡`,
        };
    }
    // 6. Emotion → transition map lookup (based on incoming shot's emotion)
    const mapped = toEmotion ? EMOTION_TRANSITION_MAP[toEmotion] : undefined;
    if (mapped) {
        return {
            from: fromShot.shotId,
            to: toShot.shotId,
            type: mapped,
            duration: getDurationForType(mapped, config),
            reason: `根据情绪"${toEmotion}"的映射规则选择 ${mapped} 转场`,
        };
    }
    // 7. Default → hard cut
    return {
        from: fromShot.shotId,
        to: toShot.shotId,
        type: "cut",
        duration: config.fastDuration,
        reason: `无特殊情绪线索，使用默认硬切`,
    };
}
// ---------------------------------------------------------------------------
// toXfadeFilter
// ---------------------------------------------------------------------------
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
export function toXfadeFilter(type) {
    switch (type) {
        case "cut":
            return "fade"; // very short duration → acts as a hard cut
        case "crossfade":
            return "fade";
        case "fade":
            return "fadeblack";
        case "fade_white":
            return "fadewhite";
        case "wipe_left":
            return "wipeleft";
        case "wipe_right":
            return "wiperight";
        case "wipe_up":
            return "wipeup";
        case "slide_left":
            return "slideleft";
        case "slide_right":
            return "slideright";
        case "zoom_in":
            return "zoomin"; // alternative: "circleopen" (older FFmpeg)
        case "zoom_out":
            return "circleclose"; // "zoomout" is not in standard xfade; circleclose is equivalent
        case "flash":
            return "fadewhite"; // very short duration → acts as a flash
        case "glitch":
            return "pixelize";
        case "dissolve":
            return "fade"; // long duration → acts as a slow dissolve
        default: {
            // Exhaustiveness check — if a new type is added without a case, this
            // helps surface the issue at compile time.
            const _exhaustive = type;
            void _exhaustive;
            return "fade";
        }
    }
}
// ---------------------------------------------------------------------------
// toEDLTransition — convert SmartTransition to EDL-compatible Transition
// ---------------------------------------------------------------------------
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
export function toEDLTransition(st) {
    const baseType = narrowToEDLType(st.type);
    const t = {
        from: st.from,
        to: st.to,
        type: baseType,
    };
    if (baseType !== "cut" && st.duration > 0) {
        t.duration = st.duration;
    }
    return t;
}
/**
 * Narrow an ExtendedTransitionType to a basic TransitionType.
 *
 * @param type The extended transition type.
 * @returns The closest EDL-compatible transition type.
 */
function narrowToEDLType(type) {
    switch (type) {
        case "cut":
        case "crossfade":
        case "fade":
            return type;
        case "fade_white":
            return "fade";
        case "dissolve":
            return "crossfade";
        default:
            // wipe_*, slide_*, zoom_*, flash, glitch → cut
            return "cut";
    }
}
// ---------------------------------------------------------------------------
// isMoodShift (internal)
// ---------------------------------------------------------------------------
/**
 * Check whether two emotions represent a mood shift — i.e. one is positive and
 * the other is negative (in either order).
 *
 * Neutral emotions (冷淡, 冷静, 疲惫, 霸总, 不屑, 讽刺, 质问) do not trigger a
 * mood shift on their own.
 *
 * @param emotion1 Emotion label of the outgoing shot.
 * @param emotion2 Emotion label of the incoming shot.
 * @returns `true` if the valence flips between the two shots.
 */
function isMoodShift(emotion1, emotion2) {
    if (!emotion1 || !emotion2) {
        return false;
    }
    const pos1 = POSITIVE_EMOTIONS.has(emotion1);
    const neg1 = NEGATIVE_EMOTIONS.has(emotion1);
    const pos2 = POSITIVE_EMOTIONS.has(emotion2);
    const neg2 = NEGATIVE_EMOTIONS.has(emotion2);
    // Shift = one positive + one negative, in either direction
    return (pos1 && neg2) || (neg1 && pos2);
}
// ---------------------------------------------------------------------------
// getEnergyLevel (internal)
// ---------------------------------------------------------------------------
/**
 * Get the energy level of an emotion on a 1-5 scale (5 = highest intensity).
 *
 * Unknown / empty emotions default to 3 (moderate).
 *
 * @param emotion Emotion label (e.g. "愤怒", "温柔").
 * @returns Energy level 1-5.
 */
function getEnergyLevel(emotion) {
    if (!emotion) {
        return DEFAULT_ENERGY;
    }
    return EMOTION_ENERGY[emotion] ?? DEFAULT_ENERGY;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Determine the appropriate duration for a transition type.
 *
 * @param type   Extended transition type.
 * @param config Duration configuration.
 * @returns Duration in seconds.
 */
function getDurationForType(type, config) {
    switch (type) {
        case "cut":
        case "flash":
            return config.fastDuration;
        case "fade":
        case "fade_white":
        case "dissolve":
            return config.slowDuration;
        default:
            return config.defaultDuration;
    }
}
/**
 * Check whether `text` contains any of the given keywords.
 *
 * @param text     The haystack.
 * @param keywords Keywords to search for.
 * @returns `true` if any keyword is found.
 */
function containsAnyKeyword(text, keywords) {
    return keywords.some((kw) => text.includes(kw));
}
//# sourceMappingURL=smart-transitions.js.map