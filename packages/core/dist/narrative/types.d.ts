import { z } from "zod";
export declare const StoryDomainSchema: z.ZodEnum<["character", "world", "location", "plot_thread", "timeline", "theme"]>;
export type StoryDomain = z.infer<typeof StoryDomainSchema>;
export declare const StoryCategorySchema: z.ZodEnum<["identity", "personality", "appearance", "ability", "background", "relation", "rule", "faction", "history", "system", "geography", "venue", "region", "foreshadow", "task", "mystery", "causality", "event", "milestone", "season", "motif", "symbol", "conflict"]>;
export type StoryCategory = z.infer<typeof StoryCategorySchema>;
export declare const FactTierSchema: z.ZodEnum<["pinned", "ambient"]>;
export type FactTier = z.infer<typeof FactTierSchema>;
export declare const FactStatusSchema: z.ZodEnum<["active", "archived", "voided"]>;
export type FactStatus = z.infer<typeof FactStatusSchema>;
export declare const StoryFactSchema: z.ZodObject<{
    id: z.ZodString;
    domain: z.ZodEnum<["character", "world", "location", "plot_thread", "timeline", "theme"]>;
    category: z.ZodEnum<["identity", "personality", "appearance", "ability", "background", "relation", "rule", "faction", "history", "system", "geography", "venue", "region", "foreshadow", "task", "mystery", "causality", "event", "milestone", "season", "motif", "symbol", "conflict"]>;
    label: z.ZodString;
    content: z.ZodString;
    weight: z.ZodNumber;
    certainty: z.ZodNumber;
    tier: z.ZodDefault<z.ZodEnum<["pinned", "ambient"]>>;
    status: z.ZodDefault<z.ZodEnum<["active", "archived", "voided"]>>;
    triggers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    emotionalWeight: z.ZodDefault<z.ZodNumber>;
    narrativeRelevance: z.ZodDefault<z.ZodNumber>;
    chapterOrigin: z.ZodDefault<z.ZodNumber>;
    derivedFrom: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    accessCount: z.ZodDefault<z.ZodNumber>;
    lastAccessAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "archived" | "voided";
    id: string;
    createdAt: string;
    updatedAt: string;
    content: string;
    label: string;
    category: "symbol" | "system" | "personality" | "mystery" | "rule" | "identity" | "appearance" | "ability" | "background" | "relation" | "faction" | "history" | "geography" | "venue" | "region" | "foreshadow" | "task" | "causality" | "event" | "milestone" | "season" | "motif" | "conflict";
    domain: "location" | "world" | "character" | "plot_thread" | "timeline" | "theme";
    triggers: string[];
    weight: number;
    certainty: number;
    emotionalWeight: number;
    tier: "pinned" | "ambient";
    narrativeRelevance: number;
    chapterOrigin: number;
    accessCount: number;
    derivedFrom?: string[] | undefined;
    lastAccessAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    content: string;
    label: string;
    category: "symbol" | "system" | "personality" | "mystery" | "rule" | "identity" | "appearance" | "ability" | "background" | "relation" | "faction" | "history" | "geography" | "venue" | "region" | "foreshadow" | "task" | "causality" | "event" | "milestone" | "season" | "motif" | "conflict";
    domain: "location" | "world" | "character" | "plot_thread" | "timeline" | "theme";
    weight: number;
    certainty: number;
    status?: "active" | "archived" | "voided" | undefined;
    triggers?: string[] | undefined;
    emotionalWeight?: number | undefined;
    tier?: "pinned" | "ambient" | undefined;
    narrativeRelevance?: number | undefined;
    chapterOrigin?: number | undefined;
    derivedFrom?: string[] | undefined;
    accessCount?: number | undefined;
    lastAccessAt?: string | undefined;
}>;
export type StoryFact = z.infer<typeof StoryFactSchema>;
export interface FetchPath {
    readonly path: "trigger" | "fts" | "semantic" | "pinned" | "link" | "timeline";
    readonly factId: string;
}
export interface ScoredFact {
    readonly fact: StoryFact;
    readonly score: number;
    readonly paths: readonly FetchPath[];
}
export interface FetchResult {
    readonly contextBlock: string;
    readonly facts: readonly ScoredFact[];
    readonly pinnedTruncated: boolean;
    readonly trace: {
        readonly totalCandidates: number;
        readonly pinned: number;
        readonly triggerHits: number;
        readonly ftsHits: number;
        readonly semanticHits: number;
        readonly linkHits: number;
    };
}
export interface CategoryMeta {
    readonly defaultWeight: number;
    readonly defaultCertainty: number;
    readonly decayLambda: number;
    readonly narrativeRelevance: number;
    readonly autoArchiveChapters?: number;
}
export interface WriteResult {
    readonly fact: StoryFact;
    readonly isNew: boolean;
    readonly mergedWith?: string;
}
//# sourceMappingURL=types.d.ts.map