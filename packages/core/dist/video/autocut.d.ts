import type { Shot } from "../agents/storyboard.js";
import type { EDLClip, Transition } from "./edl.js";
import { type SmartTransition } from "./smart-transitions.js";
export interface EmotionPoint {
    shotIndex: number;
    shotId: string;
    emotion: string;
    energy: number;
    valence: "positive" | "negative" | "neutral";
    hasDialogue: boolean;
}
export interface RhythmPoint {
    shotIndex: number;
    shotId: string;
    /** Recommended playback speed (0.5 = half speed slow-mo, 1.0 = normal, 1.5 = fast) */
    speed: number;
    /** Recommended trim: start offset within the shot (seconds) */
    trimStart: number;
    /** Recommended trim: end offset from the shot end (seconds, e.g. 1.0 = trim last 1s) */
    trimEnd: number;
    /** Whether this shot should be emphasized (close-up, slow-mo) */
    emphasize: boolean;
}
export interface AutoCutPlan {
    /** Emotion curve data points */
    emotionCurve: EmotionPoint[];
    /** Rhythm/pacing data points */
    rhythmCurve: RhythmPoint[];
    /** EDL clips with trim points applied */
    clips: EDLClip[];
    /** Transitions between clips */
    transitions: Transition[];
    /** Smart transition details with reasons */
    smartTransitions: SmartTransition[];
    /** Total estimated duration after editing (seconds) */
    estimatedDuration: number;
    /** Editing style summary */
    styleSummary: string;
}
export interface AutoCutConfig {
    /** Target total duration in seconds (null = use all shots as-is) */
    targetDuration?: number;
    /** Whether to use slow-motion for high-emotion shots */
    enableSpeedRamping: boolean;
    /** Whether to auto-trim bad frames from start/end of each clip */
    enableAutoTrim: boolean;
    /** Minimum clip duration after trimming (seconds) */
    minClipDuration: number;
    /** Maximum clip duration (longer clips will be trimmed) */
    maxClipDuration: number;
}
export declare const DEFAULT_AUTOCUT_CONFIG: AutoCutConfig;
export declare function generateAutoCutPlan(shots: Shot[], videoClips: Array<{
    id: string;
    videoUrl?: string;
    sourcePath?: string;
}>, config?: Partial<AutoCutConfig>): AutoCutPlan;
export declare function autocutPlanToEDL(plan: AutoCutPlan, videoClips: Array<{
    id: string;
    videoUrl?: string;
    sourcePath?: string;
}>): {
    clips: EDLClip[];
    transitions: Transition[];
};
//# sourceMappingURL=autocut.d.ts.map