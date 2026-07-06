import type { AgentContext } from "./base.js";
import type { VideoClip } from "../video/types.js";
export type VideoVerdict = "pass" | "borderline" | "fail";
export type VideoGrade = "A" | "B" | "C" | "D" | "F";
export interface VideoReviewIssue {
    severity: "critical" | "major" | "minor";
    dimension: "visual_quality" | "character_consistency" | "motion_naturalness" | "scene_compliance" | "face_expr" | "body_lang" | "voice_visual_sync" | "technical" | "compliance";
    description: string;
    /** Concrete fix instruction (for reroll prompt), never vague. */
    fixInstruction?: string;
}
export interface VideoReviewResult {
    verdict: VideoVerdict;
    score: number;
    grade: VideoGrade;
    issues: VideoReviewIssue[];
    /** If present, this issue can be fixed in post-production (crop/color/stabilize). */
    postFixSuggestion?: string;
    /** If verdict is fail/borderline, concrete reroll prompt appended to original. */
    rerollPrompt?: string;
    summary: string;
}
export interface VideoReviewer {
    review(params: {
        videoClip: VideoClip;
        scriptContext?: string;
        referenceImages?: string[];
    }): Promise<VideoReviewResult>;
}
export declare function createVideoReviewer(ctx: AgentContext): VideoReviewer;
export declare const VIDEO_REVIEW_DIMENSIONS: readonly ["visual_quality", "character_consistency", "motion_naturalness", "scene_compliance", "face_expr", "body_lang", "voice_visual_sync", "technical", "compliance"];
//# sourceMappingURL=video-reviewer.d.ts.map