import type { AgentContext } from "./base.js";
import { z } from "zod";
/** Character reference from the asset catalog (lightweight). */
export interface StoryboardCharacter {
    name: string;
    description: string;
    aliases?: string[];
    /** Optional voice hints (gender/age/archetype) for auto-matching. */
    gender?: string;
    age?: number | string;
    archetype?: string;
}
/** Scene reference from the asset catalog (lightweight). */
export interface StoryboardScene {
    name: string;
    description: string;
    aliases?: string[];
}
/** Prop reference from the asset catalog (lightweight). */
export interface StoryboardProp {
    name: string;
    description: string;
    aliases?: string[];
}
/** Asset catalog view passed to the agent (subset of the full AssetCatalog). */
export interface StoryboardAssetCatalog {
    characters: StoryboardCharacter[];
    scenes: StoryboardScene[];
    props: StoryboardProp[];
}
/** A single storyboard scene entry (Phase 1 output). */
export interface StoryboardSceneEntry {
    /** Stable id within the storyboard script (e.g. "S1"). */
    id: string;
    /** Original chapter text covered by this scene. */
    text: string;
    /** Short scene title. */
    title?: string;
    /** Location / setting description. */
    location?: string;
    /** Time of day (day/night/dusk/etc.). */
    timeOfDay?: string;
    /** Characters present in this scene. */
    characters?: string[];
    /** Key props involved. */
    props?: string[];
    /** Mood / emotional tone keyword (e.g. "紧张", "愤怒", "温柔"). */
    mood?: string;
}
/** Storyboard script (Phase 1 output). */
export interface StoryboardScript {
    title: string;
    totalScenes: number;
    estimatedDuration: string;
    style: string;
    scenes: StoryboardSceneEntry[];
}
/** A single production shot (≤15 seconds). V2.0 with acting/voice fields. */
export interface Shot {
    /** Shot number within the scene (e.g. 1, 2, 3). */
    shotNumber: number;
    /** Source scene id from the storyboard script. */
    sceneId: string;
    /** Shot type / framing (e.g. "close-up", "medium shot", "wide shot"). */
    shotType: string;
    /** Camera movement (e.g. "static", "slow push-in", "pan left"). */
    cameraMovement: string;
    /** English visual prompt suitable for image/video generation (subject, action, lighting, composition, style). */
    prompt: string;
    /** Chinese performance prompt with acting anchors and voice direction. */
    promptCn?: string;
    /** V2: Acting anchors — concrete face/hand/body micro-expression cues. */
    actingAnchors?: string;
    /** V2: Emotion label (e.g. "愤怒", "委屈", "温柔"). */
    emotionLabel?: string;
    /** V2: Matched voice profile id for the speaking character (e.g. "M04A", "F03A"). */
    voiceId?: string;
    /** V2: Voice performance direction (tone/pace/breathing), injected after dialogue. */
    voiceInstruction?: string;
    /** Duration in seconds (4–15). */
    duration: number;
    /** On-screen dialogue (if any). */
    dialogue?: string;
    /** Name of the speaking character (if dialogue is present). */
    speaker?: string;
    /** Names of characters visible in this shot. */
    characters: string[];
    /** Names of scenes/locations used. */
    scenes: string[];
    /** Key props visible in this shot. */
    props?: string[];
    /** Lighting / atmosphere description. */
    lighting?: string;
    /** Short Chinese narration/director's note for this shot. */
    description: string;
}
/** Shot list (Phase 2 output). */
export interface ShotList {
    totalShots: number;
    totalDuration: number;
    shots: Shot[];
}
/** Phase 2b review result for a single shot. */
export interface ShotReviewIssue {
    shotNumber: number;
    severity: "low" | "medium" | "high";
    issue: string;
    suggestion: string;
}
/** Phase 2b review output. */
export interface ShotReviewResult {
    feasible: boolean;
    issues: ShotReviewIssue[];
    suggestions: string[];
}
export declare const ShotSchema: z.ZodObject<{
    shotNumber: z.ZodNumber;
    sceneId: z.ZodString;
    shotType: z.ZodString;
    cameraMovement: z.ZodString;
    prompt: z.ZodString;
    actingAnchors: z.ZodDefault<z.ZodString>;
    emotionLabel: z.ZodDefault<z.ZodString>;
    voiceId: z.ZodOptional<z.ZodString>;
    voiceInstruction: z.ZodOptional<z.ZodString>;
    duration: z.ZodNumber;
    dialogue: z.ZodOptional<z.ZodString>;
    speaker: z.ZodOptional<z.ZodString>;
    characters: z.ZodArray<z.ZodString, "many">;
    scenes: z.ZodArray<z.ZodString, "many">;
    props: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    lighting: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characters: string[];
    description: string;
    duration: number;
    scenes: string[];
    prompt: string;
    actingAnchors: string;
    emotionLabel: string;
    shotNumber: number;
    sceneId: string;
    shotType: string;
    cameraMovement: string;
    voiceId?: string | undefined;
    dialogue?: string | undefined;
    props?: string[] | undefined;
    voiceInstruction?: string | undefined;
    speaker?: string | undefined;
    lighting?: string | undefined;
}, {
    characters: string[];
    description: string;
    duration: number;
    scenes: string[];
    prompt: string;
    shotNumber: number;
    sceneId: string;
    shotType: string;
    cameraMovement: string;
    voiceId?: string | undefined;
    dialogue?: string | undefined;
    props?: string[] | undefined;
    actingAnchors?: string | undefined;
    emotionLabel?: string | undefined;
    voiceInstruction?: string | undefined;
    speaker?: string | undefined;
    lighting?: string | undefined;
}>;
export declare const ShotListSchema: z.ZodObject<{
    totalShots: z.ZodNumber;
    totalDuration: z.ZodNumber;
    shots: z.ZodArray<z.ZodObject<{
        shotNumber: z.ZodNumber;
        sceneId: z.ZodString;
        shotType: z.ZodString;
        cameraMovement: z.ZodString;
        prompt: z.ZodString;
        actingAnchors: z.ZodDefault<z.ZodString>;
        emotionLabel: z.ZodDefault<z.ZodString>;
        voiceId: z.ZodOptional<z.ZodString>;
        voiceInstruction: z.ZodOptional<z.ZodString>;
        duration: z.ZodNumber;
        dialogue: z.ZodOptional<z.ZodString>;
        speaker: z.ZodOptional<z.ZodString>;
        characters: z.ZodArray<z.ZodString, "many">;
        scenes: z.ZodArray<z.ZodString, "many">;
        props: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lighting: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        characters: string[];
        description: string;
        duration: number;
        scenes: string[];
        prompt: string;
        actingAnchors: string;
        emotionLabel: string;
        shotNumber: number;
        sceneId: string;
        shotType: string;
        cameraMovement: string;
        voiceId?: string | undefined;
        dialogue?: string | undefined;
        props?: string[] | undefined;
        voiceInstruction?: string | undefined;
        speaker?: string | undefined;
        lighting?: string | undefined;
    }, {
        characters: string[];
        description: string;
        duration: number;
        scenes: string[];
        prompt: string;
        shotNumber: number;
        sceneId: string;
        shotType: string;
        cameraMovement: string;
        voiceId?: string | undefined;
        dialogue?: string | undefined;
        props?: string[] | undefined;
        actingAnchors?: string | undefined;
        emotionLabel?: string | undefined;
        voiceInstruction?: string | undefined;
        speaker?: string | undefined;
        lighting?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalShots: number;
    totalDuration: number;
    shots: {
        characters: string[];
        description: string;
        duration: number;
        scenes: string[];
        prompt: string;
        actingAnchors: string;
        emotionLabel: string;
        shotNumber: number;
        sceneId: string;
        shotType: string;
        cameraMovement: string;
        voiceId?: string | undefined;
        dialogue?: string | undefined;
        props?: string[] | undefined;
        voiceInstruction?: string | undefined;
        speaker?: string | undefined;
        lighting?: string | undefined;
    }[];
}, {
    totalShots: number;
    totalDuration: number;
    shots: {
        characters: string[];
        description: string;
        duration: number;
        scenes: string[];
        prompt: string;
        shotNumber: number;
        sceneId: string;
        shotType: string;
        cameraMovement: string;
        voiceId?: string | undefined;
        dialogue?: string | undefined;
        props?: string[] | undefined;
        actingAnchors?: string | undefined;
        emotionLabel?: string | undefined;
        voiceInstruction?: string | undefined;
        speaker?: string | undefined;
        lighting?: string | undefined;
    }[];
}>;
export declare const ShotAspectRatioSchema: z.ZodEnum<["16:9", "9:16", "1:1"]>;
export interface StoryboardAgent {
    script(params: {
        chapterText: string;
        assets: StoryboardAssetCatalog;
    }): Promise<StoryboardScript>;
    splitShots(params: {
        script: StoryboardScript;
        assets: StoryboardAssetCatalog;
        maxDuration?: number;
    }): Promise<ShotList>;
    reviewShots(params: {
        chapterText: string;
        shots: ShotList;
    }): Promise<ShotReviewResult>;
}
export declare function createStoryboardAgent(ctx: AgentContext): StoryboardAgent;
//# sourceMappingURL=storyboard.d.ts.map