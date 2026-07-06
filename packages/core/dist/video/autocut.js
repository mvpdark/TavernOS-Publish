// AutoCut — intelligent auto-editing engine.
//
// Analyzes the emotion curve of a shot sequence and produces an editing plan:
//   - Emotion curve: maps each shot's emotion to an energy level (1-5)
//   - Rhythm curve: derives pacing from emotion energy + dialogue presence
//   - Segment selection: decides which shots to use full / trim / speed-ramp
//   - Transition placement: uses smart-transitions module
//   - Speed ramping: slow-motion for high-emotion shots, fast for transitions
//   - Output: AutoCutPlan with trim points, transitions, and speed adjustments
import { generateSmartTransitions, } from "./smart-transitions.js";
export const DEFAULT_AUTOCUT_CONFIG = {
    targetDuration: undefined,
    enableSpeedRamping: true,
    enableAutoTrim: true,
    minClipDuration: 3,
    maxClipDuration: 15,
};
// ---------------------------------------------------------------------------
// Emotion → energy / valence mapping (AutoCut spec)
// ---------------------------------------------------------------------------
// These drive the AutoCut emotion/rhythm curves (speed ramping + emphasis).
// smart-transitions.ts has its own internal energy map used for transition
// selection; these intentionally follow the AutoCut spec values so the
// rhythm curve behaves as documented here.
const EMOTION_ENERGY_MAP = {
    愤怒: 5,
    震惊: 5,
    惊恐: 5,
    害怕: 4,
    紧张: 4,
    霸总: 4,
    压迫: 4,
    不屑: 3,
    开心: 3,
    笑: 3,
    坚定: 3,
    哭: 3,
    暧昧: 2,
    撒娇: 2,
    害羞: 2,
    委屈: 2,
    难过: 2,
    温柔: 1,
    冷静: 1,
    疲惫: 1,
};
const EMOTION_VALENCE_MAP = {
    开心: "positive",
    笑: "positive",
    温柔: "positive",
    坚定: "positive",
    暧昧: "positive",
    撒娇: "positive",
    害羞: "positive",
    愤怒: "negative",
    委屈: "negative",
    难过: "negative",
    哭: "negative",
    惊恐: "negative",
    害怕: "negative",
    紧张: "negative",
    疲惫: "negative",
    压迫: "negative",
    不屑: "negative",
    冷静: "neutral",
    霸总: "neutral",
    震惊: "neutral",
};
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Stable shot id for a shot. Matches the scheme used by smart-transitions.ts
 * (which reads `shotId` off the context) so EDL clipId ↔ transition from/to
 * line up. Format: `${sceneId}-S${shotNumber}` (e.g. "S1-S3").
 */
function makeShotId(shot, index) {
    if (shot.sceneId && shot.shotNumber) {
        return `${shot.sceneId}-S${shot.shotNumber}`;
    }
    return `shot-${index + 1}`;
}
// Helper: get valence for an emotion
function getValence(emotion) {
    if (!emotion)
        return "neutral";
    if (emotion in EMOTION_VALENCE_MAP)
        return EMOTION_VALENCE_MAP[emotion];
    // Substring fallback (e.g. "愤怒地" → 愤怒)
    for (const key of Object.keys(EMOTION_VALENCE_MAP)) {
        if (emotion.includes(key))
            return EMOTION_VALENCE_MAP[key];
    }
    return "neutral";
}
// Helper: get energy level for an emotion (1-5)
function getEnergyLevel(emotion) {
    if (!emotion)
        return 2;
    if (emotion in EMOTION_ENERGY_MAP)
        return EMOTION_ENERGY_MAP[emotion];
    // Substring fallback (e.g. "愤怒地" → 愤怒 → 5)
    for (const key of Object.keys(EMOTION_ENERGY_MAP)) {
        if (emotion.includes(key))
            return EMOTION_ENERGY_MAP[key];
    }
    return 2;
}
/**
 * Narrow a smart-transitions {@link ExtendedTransitionType} down to the basic
 * EDL {@link TransitionType} (cut / crossfade / fade). Extended effect types
 * (wipe / slide / zoom / flash / glitch) collapse to "cut" for the EDL model;
 * the composer can still read the extended type from `plan.smartTransitions`
 * and apply the appropriate xfade filter.
 */
function toEDLTransitionType(type) {
    if (type === "cut")
        return "cut";
    if (type === "crossfade" || type === "dissolve")
        return "crossfade";
    if (type === "fade" || type === "fade_white")
        return "fade";
    // wipe_*, slide_*, zoom_*, flash, glitch → cut
    return "cut";
}
/**
 * Resolve the source path/url for a shot from the supplied videoClips.
 * Matches by id first, then by index (clips assumed to be in shot order).
 */
function resolveSourcePath(shotId, shotIndex, videoClips) {
    const byId = videoClips.find((v) => v.id === shotId);
    if (byId) {
        return byId.videoUrl ?? byId.sourcePath ?? "";
    }
    const byIndex = videoClips[shotIndex];
    if (byIndex) {
        return byIndex.videoUrl ?? byIndex.sourcePath ?? "";
    }
    return "";
}
/**
 * Sum of playback durations for a rhythm curve.
 *
 * Playback duration = (source seconds after trim) / speed, because a speed of
 * 0.5 (half-speed slow-mo) makes a 5s source play for 10s.
 */
function computePlaybackDuration(points, shots) {
    let total = 0;
    for (let i = 0; i < points.length; i++) {
        const shot = shots[i];
        const p = points[i];
        const srcDuration = shot.duration - p.trimStart - p.trimEnd;
        total += srcDuration / p.speed;
    }
    return total;
}
// ---------------------------------------------------------------------------
// Curve builders
// ---------------------------------------------------------------------------
// Helper: build emotion curve from shots
function buildEmotionCurve(shots) {
    return shots.map((shot, i) => {
        const emotion = shot.emotionLabel?.trim() || "冷静";
        return {
            shotIndex: i,
            shotId: makeShotId(shot, i),
            emotion,
            energy: getEnergyLevel(emotion),
            valence: getValence(emotion),
            hasDialogue: Boolean(shot.dialogue && shot.dialogue.trim()),
        };
    });
}
// Helper: determine speed for a shot based on emotion energy
function getSpeedForEnergy(energy, hasDialogue, config) {
    if (!config.enableSpeedRamping)
        return 1.0;
    // Very high energy (5) + no dialogue → dramatic slow-mo
    if (energy >= 5 && !hasDialogue)
        return 0.5;
    // High energy (4-5) → slight slow-mo
    if (energy >= 4)
        return 0.75;
    // Low (1-2) / medium (3) energy → normal
    return 1.0;
}
// Helper: determine trim points for a shot
function getTrimPoints(shot, rhythmPoint, config) {
    if (!config.enableAutoTrim) {
        return { trimStart: 0, trimEnd: null };
    }
    const dur = shot.duration;
    let trimStart = 0;
    let trimEnd = null;
    // Trim clips that exceed maxClipDuration
    if (dur > config.maxClipDuration) {
        const excess = dur - config.maxClipDuration;
        if (rhythmPoint.emphasize && !shot.dialogue) {
            // High-emotion, no-dialogue: trim both ends to keep the peak centered
            trimStart = Math.floor(excess / 2);
            trimEnd = Math.round(excess - trimStart);
        }
        else {
            // Otherwise trim from the end (keep the beginning / intro)
            trimEnd = excess;
        }
    }
    // Enforce minClipDuration — relax trimming if we cut too aggressively
    const effective = dur - trimStart - (trimEnd ?? 0);
    if (effective < config.minClipDuration) {
        if (trimEnd !== null) {
            trimEnd = null;
        }
        if (dur - trimStart < config.minClipDuration) {
            trimStart = 0;
        }
    }
    return { trimStart, trimEnd };
}
// Helper: build rhythm curve from emotion curve
function buildRhythmCurve(emotionCurve, shots, config) {
    // First pass: base speed + emphasize + trim points
    const points = emotionCurve.map((ep, i) => {
        const shot = shots[i];
        const speed = getSpeedForEnergy(ep.energy, ep.hasDialogue, config);
        const emphasize = ep.energy >= 4;
        const draft = {
            shotIndex: i,
            shotId: ep.shotId,
            speed,
            trimStart: 0,
            trimEnd: 0,
            emphasize,
        };
        const trim = getTrimPoints(shot, draft, config);
        draft.trimStart = trim.trimStart;
        draft.trimEnd = trim.trimEnd ?? 0;
        return draft;
    });
    // Second pass: if a target duration is set, adjust speeds proportionally.
    // ratio = current / target ; ratio > 1 → speed up, ratio < 1 → slow down.
    // Each speed is multiplied by the ratio and clamped to [0.25, 2.5] so we
    // never produce absurd playback rates.
    if (config.targetDuration && config.targetDuration > 0) {
        const currentTotal = computePlaybackDuration(points, shots);
        if (currentTotal > 0) {
            const ratio = currentTotal / config.targetDuration;
            const clampSpeed = (s) => Math.min(2.5, Math.max(0.25, s * ratio));
            for (const p of points) {
                p.speed = clampSpeed(p.speed);
            }
        }
    }
    return points;
}
/**
 * Build a human-readable editing style summary for director review.
 */
function buildStyleSummary(emotionCurve, rhythmCurve, smartTransitions, estimatedDuration, config) {
    const highEnergy = emotionCurve.filter((e) => e.energy >= 4).length;
    const slowMo = rhythmCurve.filter((r) => r.speed < 1.0).length;
    const emphasized = rhythmCurve.filter((r) => r.emphasize).length;
    const cuts = smartTransitions.filter((t) => toEDLTransitionType(t.type) === "cut").length;
    const crossfades = smartTransitions.filter((t) => toEDLTransitionType(t.type) === "crossfade").length;
    const fades = smartTransitions.filter((t) => toEDLTransitionType(t.type) === "fade").length;
    const parts = [];
    parts.push(`情绪驱动剪辑：共 ${emotionCurve.length} 个镜头`);
    if (slowMo > 0) {
        parts.push(`${slowMo} 个镜头慢动作强调（其中 ${emphasized} 个高情绪特写）`);
    }
    if (highEnergy > 0) {
        parts.push(`${highEnergy} 个高能量情绪节点`);
    }
    parts.push(`转场：${cuts} 硬切 / ${crossfades} 叠化 / ${fades} 淡入淡出`);
    if (config.targetDuration) {
        parts.push(`目标时长 ${config.targetDuration}s`);
    }
    parts.push(`预估总时长 ${estimatedDuration.toFixed(1)}s`);
    return parts.join("；");
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
// Main function: generate an AutoCutPlan from shots
export function generateAutoCutPlan(shots, videoClips, config) {
    const cfg = { ...DEFAULT_AUTOCUT_CONFIG, ...config };
    // 1. Emotion curve — energy + valence per shot
    const emotionCurve = buildEmotionCurve(shots);
    // 2. Rhythm curve — speed + trim points per shot (target-aware)
    const rhythmCurve = buildRhythmCurve(emotionCurve, shots, cfg);
    // 3. Smart transitions — build contexts in the shape expected by
    //    smart-transitions.ts (shotId / emotionLabel / description / duration /
    //    dialogue / speaker) and delegate transition selection to it.
    const contexts = shots.map((shot, i) => ({
        shotId: makeShotId(shot, i),
        emotionLabel: shot.emotionLabel?.trim() || "冷静",
        description: shot.description,
        duration: shot.duration,
        dialogue: shot.dialogue,
        speaker: shot.speaker,
    }));
    const smartTransitions = generateSmartTransitions(contexts);
    // 4. EDL clips with trim points applied
    const clips = rhythmCurve.map((rp, i) => {
        const shot = shots[i];
        const sourcePath = resolveSourcePath(rp.shotId, i, videoClips);
        const clip = {
            clipId: rp.shotId,
            sourcePath,
        };
        if (rp.trimStart > 0) {
            clip.start = rp.trimStart;
        }
        if (rp.trimEnd > 0) {
            clip.end = shot.duration - rp.trimEnd;
        }
        return clip;
    });
    // 5. Transitions in EDL format (narrow extended types → basic EDL types,
    //    drop reasons). Hard cuts omit the duration field.
    const transitions = smartTransitions.map((st) => {
        const edlType = toEDLTransitionType(st.type);
        const t = {
            from: st.from,
            to: st.to,
            type: edlType,
        };
        if (edlType !== "cut" && st.duration > 0) {
            t.duration = st.duration;
        }
        return t;
    });
    // 6. Estimated duration — sum of playback durations minus crossfade overlaps
    let estimatedDuration = computePlaybackDuration(rhythmCurve, shots);
    for (const st of smartTransitions) {
        // A crossfade (incl. dissolve) overlaps two clips, shortening total
        // duration by ~duration. Fades pass through black within the clip;
        // cuts add nothing.
        if (toEDLTransitionType(st.type) === "crossfade" && st.duration > 0) {
            estimatedDuration -= st.duration;
        }
    }
    if (estimatedDuration < 0)
        estimatedDuration = 0;
    // 7. Style summary
    const styleSummary = buildStyleSummary(emotionCurve, rhythmCurve, smartTransitions, estimatedDuration, cfg);
    return {
        emotionCurve,
        rhythmCurve,
        clips,
        transitions,
        smartTransitions,
        estimatedDuration,
        styleSummary,
    };
}
// Helper: convert AutoCutPlan to EDL clips + transitions for composer
export function autocutPlanToEDL(plan, videoClips) {
    // Re-resolve source paths from a (possibly updated) videoClips array while
    // preserving the trim points computed in the plan. This lets you generate a
    // plan before videos exist, then finalize the EDL once URLs are available.
    const clips = plan.clips.map((clip, i) => {
        const sourcePath = resolveSourcePath(clip.clipId, i, videoClips);
        const out = {
            clipId: clip.clipId,
            sourcePath: sourcePath || clip.sourcePath,
        };
        if (clip.start !== undefined)
            out.start = clip.start;
        if (clip.end !== undefined)
            out.end = clip.end;
        return out;
    });
    return { clips, transitions: plan.transitions };
}
//# sourceMappingURL=autocut.js.map