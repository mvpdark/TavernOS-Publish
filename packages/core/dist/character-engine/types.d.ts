import { z } from "zod";
import type { SceneType } from "../scene/types.js";
export declare const MoodLabelSchema: z.ZodEnum<["furious", "fearful", "defiant", "wounded", "tender", "serene", "smitten", "withdrawn", "composed"]>;
export type MoodLabel = z.infer<typeof MoodLabelSchema>;
export declare const MoodVectorSchema: z.ZodObject<{
    characterId: z.ZodString;
    affection: z.ZodNumber;
    tension: z.ZodNumber;
    energy: z.ZodNumber;
    control: z.ZodNumber;
    label: z.ZodEnum<["furious", "fearful", "defiant", "wounded", "tender", "serene", "smitten", "withdrawn", "composed"]>;
    locked: z.ZodDefault<z.ZodBoolean>;
    updatedAt: z.ZodString;
    chapterIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    label: "furious" | "fearful" | "defiant" | "wounded" | "tender" | "serene" | "smitten" | "withdrawn" | "composed";
    chapterIndex: number;
    characterId: string;
    affection: number;
    tension: number;
    energy: number;
    control: number;
    locked: boolean;
}, {
    updatedAt: string;
    label: "furious" | "fearful" | "defiant" | "wounded" | "tender" | "serene" | "smitten" | "withdrawn" | "composed";
    chapterIndex: number;
    characterId: string;
    affection: number;
    tension: number;
    energy: number;
    control: number;
    locked?: boolean | undefined;
}>;
export type MoodVector = z.infer<typeof MoodVectorSchema>;
export declare const BondPhaseSchema: z.ZodEnum<["stranger", "acquaintance", "ally", "confidant", "rival", "lover", "enemy", "mentor", "family"]>;
export type BondPhase = z.infer<typeof BondPhaseSchema>;
export declare const BondStateSchema: z.ZodObject<{
    pairKey: z.ZodString;
    phase: z.ZodEnum<["stranger", "acquaintance", "ally", "confidant", "rival", "lover", "enemy", "mentor", "family"]>;
    trust: z.ZodNumber;
    tensions: z.ZodNumber;
    warmth: z.ZodNumber;
    mood: z.ZodDefault<z.ZodEnum<["warm", "neutral", "hostile"]>>;
    positiveStreak: z.ZodDefault<z.ZodNumber>;
    sharedScenes: z.ZodDefault<z.ZodNumber>;
    lastInteractionChapter: z.ZodDefault<z.ZodNumber>;
    history: z.ZodDefault<z.ZodArray<z.ZodObject<{
        chapter: z.ZodNumber;
        fromPhase: z.ZodEnum<["stranger", "acquaintance", "ally", "confidant", "rival", "lover", "enemy", "mentor", "family"]>;
        toPhase: z.ZodEnum<["stranger", "acquaintance", "ally", "confidant", "rival", "lover", "enemy", "mentor", "family"]>;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        chapter: number;
        fromPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        toPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        reason: string;
    }, {
        chapter: number;
        fromPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        toPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        reason: string;
    }>, "many">>;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    mood: "warm" | "neutral" | "hostile";
    history: {
        chapter: number;
        fromPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        toPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        reason: string;
    }[];
    pairKey: string;
    phase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
    trust: number;
    tensions: number;
    warmth: number;
    positiveStreak: number;
    sharedScenes: number;
    lastInteractionChapter: number;
}, {
    updatedAt: string;
    pairKey: string;
    phase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
    trust: number;
    tensions: number;
    warmth: number;
    mood?: "warm" | "neutral" | "hostile" | undefined;
    history?: {
        chapter: number;
        fromPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        toPhase: "enemy" | "stranger" | "acquaintance" | "ally" | "confidant" | "rival" | "lover" | "mentor" | "family";
        reason: string;
    }[] | undefined;
    positiveStreak?: number | undefined;
    sharedScenes?: number | undefined;
    lastInteractionChapter?: number | undefined;
}>;
export type BondState = z.infer<typeof BondStateSchema>;
export interface BondInteraction {
    readonly characterA: string;
    readonly characterB: string;
    readonly sceneType: SceneType;
    readonly intensity: number;
    readonly isPositive: boolean;
    readonly description: string;
    readonly chapterIndex: number;
}
export declare const MotiveSchema: z.ZodObject<{
    id: z.ZodString;
    characterId: z.ZodString;
    description: z.ZodString;
    priority: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["active", "satisfied", "abandoned", "suppressed"]>>;
    source: z.ZodDefault<z.ZodEnum<["internal", "external", "event"]>>;
    chapterOrigin: z.ZodNumber;
    chapterResolved: z.ZodOptional<z.ZodNumber>;
    relatedCharacters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "abandoned" | "satisfied" | "suppressed";
    id: string;
    createdAt: string;
    updatedAt: string;
    priority: number;
    description: string;
    source: "event" | "internal" | "external";
    chapterOrigin: number;
    characterId: string;
    relatedCharacters: string[];
    chapterResolved?: number | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    priority: number;
    description: string;
    chapterOrigin: number;
    characterId: string;
    status?: "active" | "abandoned" | "satisfied" | "suppressed" | undefined;
    source?: "event" | "internal" | "external" | undefined;
    chapterResolved?: number | undefined;
    relatedCharacters?: string[] | undefined;
}>;
export type Motive = z.infer<typeof MotiveSchema>;
export declare const PaceMetricsSchema: z.ZodObject<{
    chapterIndex: z.ZodNumber;
    tension: z.ZodNumber;
    relaxation: z.ZodNumber;
    rhythm: z.ZodDefault<z.ZodEnum<["rising", "peak", "falling", "flat", "valley"]>>;
    sceneCount: z.ZodNumber;
    dialogueRatio: z.ZodNumber;
    actionRatio: z.ZodNumber;
    wordCount: z.ZodNumber;
    tensionTrend: z.ZodNumber;
    recommendation: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    wordCount: number;
    chapterIndex: number;
    tension: number;
    relaxation: number;
    rhythm: "flat" | "rising" | "peak" | "falling" | "valley";
    sceneCount: number;
    dialogueRatio: number;
    actionRatio: number;
    tensionTrend: number;
    recommendation: string;
}, {
    wordCount: number;
    chapterIndex: number;
    tension: number;
    relaxation: number;
    sceneCount: number;
    dialogueRatio: number;
    actionRatio: number;
    tensionTrend: number;
    rhythm?: "flat" | "rising" | "peak" | "falling" | "valley" | undefined;
    recommendation?: string | undefined;
}>;
export type PaceMetrics = z.infer<typeof PaceMetricsSchema>;
export declare const RetentionMetricsSchema: z.ZodObject<{
    chapterIndex: z.ZodNumber;
    hookDensity: z.ZodNumber;
    coolPointDensity: z.ZodNumber;
    readerFatigue: z.ZodNumber;
    retentionPower: z.ZodNumber;
    engagementScore: z.ZodNumber;
    cliffhangerStrength: z.ZodNumber;
    pacingBalance: z.ZodNumber;
    recommendation: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    chapterIndex: number;
    recommendation: string;
    hookDensity: number;
    coolPointDensity: number;
    readerFatigue: number;
    retentionPower: number;
    engagementScore: number;
    cliffhangerStrength: number;
    pacingBalance: number;
}, {
    chapterIndex: number;
    hookDensity: number;
    coolPointDensity: number;
    readerFatigue: number;
    retentionPower: number;
    engagementScore: number;
    cliffhangerStrength: number;
    pacingBalance: number;
    recommendation?: string | undefined;
}>;
export type RetentionMetrics = z.infer<typeof RetentionMetricsSchema>;
export declare const RetentionDashboardSchema: z.ZodObject<{
    totalChapters: z.ZodNumber;
    averageRetention: z.ZodNumber;
    retentionTrend: z.ZodDefault<z.ZodEnum<["improving", "stable", "declining"]>>;
    fatigueWarning: z.ZodDefault<z.ZodBoolean>;
    weakestChapters: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    strongestChapters: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    overallRecommendation: z.ZodDefault<z.ZodString>;
    chapterMetrics: z.ZodDefault<z.ZodArray<z.ZodObject<{
        chapterIndex: z.ZodNumber;
        hookDensity: z.ZodNumber;
        coolPointDensity: z.ZodNumber;
        readerFatigue: z.ZodNumber;
        retentionPower: z.ZodNumber;
        engagementScore: z.ZodNumber;
        cliffhangerStrength: z.ZodNumber;
        pacingBalance: z.ZodNumber;
        recommendation: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chapterIndex: number;
        recommendation: string;
        hookDensity: number;
        coolPointDensity: number;
        readerFatigue: number;
        retentionPower: number;
        engagementScore: number;
        cliffhangerStrength: number;
        pacingBalance: number;
    }, {
        chapterIndex: number;
        hookDensity: number;
        coolPointDensity: number;
        readerFatigue: number;
        retentionPower: number;
        engagementScore: number;
        cliffhangerStrength: number;
        pacingBalance: number;
        recommendation?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    totalChapters: number;
    averageRetention: number;
    retentionTrend: "improving" | "stable" | "declining";
    fatigueWarning: boolean;
    weakestChapters: number[];
    strongestChapters: number[];
    overallRecommendation: string;
    chapterMetrics: {
        chapterIndex: number;
        recommendation: string;
        hookDensity: number;
        coolPointDensity: number;
        readerFatigue: number;
        retentionPower: number;
        engagementScore: number;
        cliffhangerStrength: number;
        pacingBalance: number;
    }[];
}, {
    totalChapters: number;
    averageRetention: number;
    retentionTrend?: "improving" | "stable" | "declining" | undefined;
    fatigueWarning?: boolean | undefined;
    weakestChapters?: number[] | undefined;
    strongestChapters?: number[] | undefined;
    overallRecommendation?: string | undefined;
    chapterMetrics?: {
        chapterIndex: number;
        hookDensity: number;
        coolPointDensity: number;
        readerFatigue: number;
        retentionPower: number;
        engagementScore: number;
        cliffhangerStrength: number;
        pacingBalance: number;
        recommendation?: string | undefined;
    }[] | undefined;
}>;
export type RetentionDashboard = z.infer<typeof RetentionDashboardSchema>;
export declare const EpiphanySignalSchema: z.ZodObject<{
    id: z.ZodString;
    characterId: z.ZodString;
    chapterIndex: z.ZodNumber;
    type: z.ZodEnum<["emotional_breakthrough", "perspective_shift", "resolve_awakened", "bond_catalyst", "trauma_release"]>;
    intensity: z.ZodNumber;
    triggerScene: z.ZodString;
    beforeMood: z.ZodEnum<["furious", "fearful", "defiant", "wounded", "tender", "serene", "smitten", "withdrawn", "composed"]>;
    afterMood: z.ZodEnum<["furious", "fearful", "defiant", "wounded", "tender", "serene", "smitten", "withdrawn", "composed"]>;
    description: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "emotional_breakthrough" | "perspective_shift" | "resolve_awakened" | "bond_catalyst" | "trauma_release";
    id: string;
    createdAt: string;
    description: string;
    chapterIndex: number;
    intensity: number;
    characterId: string;
    triggerScene: string;
    beforeMood: "furious" | "fearful" | "defiant" | "wounded" | "tender" | "serene" | "smitten" | "withdrawn" | "composed";
    afterMood: "furious" | "fearful" | "defiant" | "wounded" | "tender" | "serene" | "smitten" | "withdrawn" | "composed";
}, {
    type: "emotional_breakthrough" | "perspective_shift" | "resolve_awakened" | "bond_catalyst" | "trauma_release";
    id: string;
    createdAt: string;
    description: string;
    chapterIndex: number;
    intensity: number;
    characterId: string;
    triggerScene: string;
    beforeMood: "furious" | "fearful" | "defiant" | "wounded" | "tender" | "serene" | "smitten" | "withdrawn" | "composed";
    afterMood: "furious" | "fearful" | "defiant" | "wounded" | "tender" | "serene" | "smitten" | "withdrawn" | "composed";
}>;
export type EpiphanySignal = z.infer<typeof EpiphanySignalSchema>;
export interface InnerVoiceBlock {
    readonly characterId: string;
    readonly text: string;
    readonly moodLabel: MoodLabel;
    readonly intensity: number;
    readonly chapterIndex: number;
}
export interface MoodShiftInput {
    readonly characterId: string;
    readonly sceneType: SceneType;
    readonly sceneIntensity: number;
    readonly bondModifier: number;
    readonly chapterIndex: number;
    readonly sceneIndex: number;
}
//# sourceMappingURL=types.d.ts.map