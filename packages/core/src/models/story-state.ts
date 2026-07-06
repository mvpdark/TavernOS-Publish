import { z } from "zod";

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export const StoryStateLanguageSchema = z.enum(["zh", "en"]);
export type StoryStateLanguage = z.infer<typeof StoryStateLanguageSchema>;

// ---------------------------------------------------------------------------
// State Manifest
// ---------------------------------------------------------------------------

export const StateManifestSchema = z.object({
  schemaVersion: z.literal(2),
  language: StoryStateLanguageSchema,
  lastAppliedChapter: z.number().int().min(0),
  projectionVersion: z.number().int().min(1),
  migrationWarnings: z.array(z.string()).default([]),
});
export type StateManifest = z.infer<typeof StateManifestSchema>;

// ---------------------------------------------------------------------------
// Plot Thread (Foreshadowing / Narrative Hook)
// ---------------------------------------------------------------------------

export const ThreadStatusSchema = z.enum(["open", "progressing", "deferred", "resolved"]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const ThreadPayoffTimingSchema = z.enum([
  "immediate",
  "near-term",
  "mid-arc",
  "slow-burn",
  "endgame",
]);
export type ThreadPayoffTiming = z.infer<typeof ThreadPayoffTimingSchema>;

export const PlotThreadSchema = z.object({
  hookId: z.string().min(1),
  startChapter: z.number().int().min(0),
  type: z.string().min(1),
  status: ThreadStatusSchema,
  lastAdvancedChapter: z.number().int().min(0),
  expectedPayoff: z.string().default(""),
  payoffTiming: ThreadPayoffTimingSchema.optional(),
  notes: z.string().default(""),
  dependsOn: z.array(z.string().min(1)).optional(),
  paysOffInArc: z.string().optional(),
  coreHook: z.boolean().optional(),
  halfLifeChapters: z.number().int().positive().optional(),
  advancedCount: z.number().int().min(0).optional(),
  promoted: z.boolean().optional(),
});
export type PlotThread = z.infer<typeof PlotThreadSchema>;

export const PlotThreadsStateSchema = z.object({
  hooks: z.array(PlotThreadSchema).default([]),
});
export type PlotThreadsState = z.infer<typeof PlotThreadsStateSchema>;

// ---------------------------------------------------------------------------
// Chapter Summary
// ---------------------------------------------------------------------------

export const ChapterSummaryRowSchema = z.object({
  chapter: z.number().int().min(1),
  title: z.string().min(1),
  characters: z.string().default(""),
  events: z.string().default(""),
  stateChanges: z.string().default(""),
  hookActivity: z.string().default(""),
  mood: z.string().default(""),
  chapterType: z.string().default(""),
});
export type ChapterSummaryRow = z.infer<typeof ChapterSummaryRowSchema>;

export const ChapterSummariesStateSchema = z.object({
  rows: z.array(ChapterSummaryRowSchema).default([]),
});
export type ChapterSummariesState = z.infer<typeof ChapterSummariesStateSchema>;

// ---------------------------------------------------------------------------
// Current State (temporal facts)
// ---------------------------------------------------------------------------

export const CurrentStateFactSchema = z.object({
  subject: z.string().min(1),
  predicate: z.string().min(1),
  object: z.string().min(1),
  validFromChapter: z.number().int().min(0),
  validUntilChapter: z.number().int().min(0).nullable(),
  sourceChapter: z.number().int().min(0),
});
export type CurrentStateFact = z.infer<typeof CurrentStateFactSchema>;

export const CurrentStateStateSchema = z.object({
  chapter: z.number().int().min(0),
  facts: z.array(CurrentStateFactSchema).default([]),
});
export type CurrentStateState = z.infer<typeof CurrentStateStateSchema>;

// ---------------------------------------------------------------------------
// Current State Patch (delta operations)
// ---------------------------------------------------------------------------

export const CurrentStatePatchSchema = z.object({
  currentLocation: z.string().optional(),
  protagonistState: z.string().optional(),
  currentGoal: z.string().optional(),
  currentConstraint: z.string().optional(),
  currentAlliances: z.string().optional(),
  currentConflict: z.string().optional(),
});
export type CurrentStatePatch = z.infer<typeof CurrentStatePatchSchema>;

// ---------------------------------------------------------------------------
// Thread Operations (delta)
// ---------------------------------------------------------------------------

export const ThreadOpsSchema = z.object({
  upsert: z.array(PlotThreadSchema).default([]),
  mention: z.array(z.string().min(1)).default([]),
  resolve: z.array(z.string().min(1)).default([]),
  defer: z.array(z.string().min(1)).default([]),
});
export type ThreadOps = z.infer<typeof ThreadOpsSchema>;

// ---------------------------------------------------------------------------
// New Thread Candidate
// ---------------------------------------------------------------------------

export const NewThreadCandidateSchema = z.object({
  type: z.string().min(1),
  expectedPayoff: z.string().default(""),
  payoffTiming: ThreadPayoffTimingSchema.optional(),
  notes: z.string().default(""),
});
export type NewThreadCandidate = z.infer<typeof NewThreadCandidateSchema>;

// ---------------------------------------------------------------------------
// Story State Delta (chapter completion output)
// ---------------------------------------------------------------------------

const LooseOpSchema = z.record(z.string(), z.unknown());

export const StoryStateDeltaSchema = z.object({
  chapter: z.number().int().min(1),
  currentStatePatch: CurrentStatePatchSchema.optional(),
  hookOps: ThreadOpsSchema.default({ upsert: [], mention: [], resolve: [], defer: [] }),
  newHookCandidates: z.array(NewThreadCandidateSchema).default([]),
  chapterSummary: ChapterSummaryRowSchema.optional(),
  subplotOps: z.array(LooseOpSchema).default([]),
  emotionalArcOps: z.array(LooseOpSchema).default([]),
  characterMatrixOps: z.array(LooseOpSchema).default([]),
  notes: z.array(z.string()).default([]),
});
export type StoryStateDelta = z.infer<typeof StoryStateDeltaSchema>;

// ---------------------------------------------------------------------------
// Story State Snapshot (full state at a point in time)
// ---------------------------------------------------------------------------

export const StoryStateSnapshotSchema = z.object({
  manifest: StateManifestSchema,
  currentState: CurrentStateStateSchema,
  hooks: PlotThreadsStateSchema,
  chapterSummaries: ChapterSummariesStateSchema,
});
export type StoryStateSnapshot = z.infer<typeof StoryStateSnapshotSchema>;
