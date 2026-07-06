import { z } from "zod";
export declare const SceneTypeSchema: z.ZodEnum<["dialogue", "action", "introspection", "conflict", "revelation", "reunion", "separation", "tenderness", "tragedy", "comedy", "transition"]>;
export type SceneType = z.infer<typeof SceneTypeSchema>;
export declare const SceneSignalSchema: z.ZodObject<{
    type: z.ZodEnum<["dialogue", "action", "introspection", "conflict", "revelation", "reunion", "separation", "tenderness", "tragedy", "comedy", "transition"]>;
    intensity: z.ZodNumber;
    gravity: z.ZodNumber;
    isClimax: z.ZodDefault<z.ZodBoolean>;
    isTurningPoint: z.ZodDefault<z.ZodBoolean>;
    participants: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    location: z.ZodOptional<z.ZodString>;
    chapterIndex: z.ZodNumber;
    sceneIndex: z.ZodNumber;
    textExcerpt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "dialogue" | "conflict" | "action" | "introspection" | "revelation" | "reunion" | "separation" | "tenderness" | "tragedy" | "comedy" | "transition";
    chapterIndex: number;
    intensity: number;
    gravity: number;
    isClimax: boolean;
    isTurningPoint: boolean;
    participants: string[];
    sceneIndex: number;
    textExcerpt: string;
    location?: string | undefined;
}, {
    type: "dialogue" | "conflict" | "action" | "introspection" | "revelation" | "reunion" | "separation" | "tenderness" | "tragedy" | "comedy" | "transition";
    chapterIndex: number;
    intensity: number;
    gravity: number;
    sceneIndex: number;
    location?: string | undefined;
    isClimax?: boolean | undefined;
    isTurningPoint?: boolean | undefined;
    participants?: string[] | undefined;
    textExcerpt?: string | undefined;
}>;
export type SceneSignal = z.infer<typeof SceneSignalSchema>;
export interface SceneClassificationResult {
    readonly scenes: readonly SceneSignal[];
    readonly dominantType: SceneType;
    readonly averageIntensity: number;
    readonly averageGravity: number;
    readonly hasClimax: boolean;
    readonly hasTurningPoint: boolean;
}
export interface SceneImpulse {
    readonly affection: number;
    readonly tension: number;
    readonly energy: number;
    readonly control: number;
}
export declare const SCENE_IMPULSE: ReadonlyRecord<SceneType, SceneImpulse>;
type ReadonlyRecord<K extends string | number, V> = {
    readonly [P in K]: V;
};
export {};
//# sourceMappingURL=types.d.ts.map