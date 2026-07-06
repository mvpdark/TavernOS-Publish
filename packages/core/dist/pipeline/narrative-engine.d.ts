import { FactVault } from "../narrative/fact-vault.js";
import { LinkGraph } from "../narrative/link-graph.js";
import { InsightForge, type InsightPattern } from "../narrative/insight-forge.js";
import { type FetchResult } from "../narrative/types.js";
import { SceneClassifier } from "../scene/classifier.js";
import type { SceneClassificationResult } from "../scene/types.js";
import { MoodEngine } from "../character-engine/mood-engine.js";
import { BondTracker } from "../character-engine/bond-tracker.js";
import { InnerVoice } from "../character-engine/inner-voice.js";
import { EpiphanyDetector } from "../character-engine/epiphany.js";
import { MotiveStack } from "../character-engine/motive-stack.js";
import { PaceDirector } from "../character-engine/pace-director.js";
import type { MoodVector, BondState, Motive, EpiphanySignal, InnerVoiceBlock, PaceMetrics } from "../character-engine/types.js";
import { TimelineSense } from "../timeline/sense.js";
import type { TemporalContext } from "../timeline/types.js";
import { InjectionPolicy } from "./injection-policy.js";
import type { AssembledPrompt } from "./injection-policy.js";
import { type ExtractedFact } from "../agents/fact-extractor.js";
import type { AgentContext } from "../agents/base.js";
/** Parameters for the pre-write context assembly phase. */
export interface PreWriteParams {
    /** 1-based chapter index about to be written (first chapter = 1). */
    readonly chapterIndex: number;
    /** The chapter outline / brief, used as the retrieval query. */
    readonly chapterOutline: string;
    /** Character IDs to generate inner voice and retrieve top motives for.
     *  Optional — when omitted, inner voice and motive tracking are skipped. */
    readonly mainCharacters?: readonly string[];
}
/** The assembled context returned before writing a chapter. */
export interface PreWriteContext {
    /** The fully assembled narrative context string for LLM injection. */
    readonly narrativeContext: string;
    /** The raw fetch result from ContextFetcher. */
    readonly facts: FetchResult;
    /** Inner voice blocks generated for each main character (skips characters with no prior mood). */
    readonly innerVoices: readonly InnerVoiceBlock[];
    /** Map of characterId → top active motive (may be undefined). */
    readonly topMotives: ReadonlyMap<string, Motive | undefined>;
    /** The temporal context from TimelineSense. */
    readonly timelineContext: TemporalContext;
    /** Pace metrics from the previous chapter (undefined if chapter 0). */
    readonly paceMetrics: PaceMetrics | undefined;
    /** Metadata from the injection policy assembly. */
    readonly assembled: AssembledPrompt;
}
/** Parameters for the post-write analysis phase. */
export interface PostWriteParams {
    /** 1-based chapter index that was just written (first chapter = 1). */
    readonly chapterIndex: number;
    /** The full written chapter text. */
    readonly narrative: string;
    /** Character IDs to track moods, epiphanies, and bonds for.
     *  Optional — when omitted, per-character tracking is skipped. */
    readonly mainCharacters?: readonly string[];
    /** Total word count of the chapter. */
    readonly wordCount: number;
    /** Story bible / setting context used to ground LLM fact extraction.
     *  When provided alongside an agentContext in the constructor, the engine
     *  extracts structured StoryFacts from the chapter and persists them to
     *  the FactVault (and thus story-facts.json on close). */
    readonly storyBible?: string;
    /** Facts already extracted by an upstream unified agent (e.g. ChapterAnalyzer
     *  in the StoryOrchestrator pipeline). When provided, the engine ingests
     *  these directly into the FactVault WITHOUT making another LLM call —
     *  avoiding a redundant double-extraction. When omitted AND an agentContext
     *  + storyBible are available, the engine runs its own FactExtractor. */
    readonly preExtractedFacts?: readonly ExtractedFact[];
    /** When true, the caller asserts that fact extraction already ran (even if
     *  it returned zero facts), so the engine must NOT run the standalone
     *  FactExtractor fallback. When false/undefined, the engine may run
     *  FactExtractor as a fallback. */
    readonly preExtractedFactsProvided?: boolean;
}
/** The analysis result returned after writing a chapter. */
export interface PostWriteResult {
    /** Scene classification result (scenes, dominant type, averages, flags). */
    readonly scenes: SceneClassificationResult;
    /** Map of characterId → updated mood vector. */
    readonly moods: ReadonlyMap<string, MoodVector>;
    /** All bond states touched during this chapter's interactions. */
    readonly bonds: readonly BondState[];
    /** Map of characterId → epiphany signal (null if none triggered). */
    readonly epiphanies: ReadonlyMap<string, EpiphanySignal | null>;
    /** Pace metrics computed for this chapter. */
    readonly paceMetrics: PaceMetrics;
    /** Updated temporal context after recording anchors and appearances. */
    readonly timelineContext: TemporalContext;
    /** Insight patterns detected by InsightForge (unresolved foreshadows,
     *  recurring characters, conflict escalation, etc.). May be empty if
     *  the vault has insufficient data. */
    readonly insights: readonly InsightPattern[];
    /** Number of new StoryFacts extracted and persisted to the vault by the
     *  LLM FactExtractor during this post-write pass. Zero when no agentContext
     *  was supplied, no storyBible was provided, or extraction degraded. */
    readonly extractedFacts: number;
}
export declare class NarrativeEngine {
    /** Persistent fact storage with CRUD, dedup/merge, and relevance scoring. */
    readonly vault: FactVault;
    /** Fact relationship graph for one-hop diffusion in retrieval. */
    readonly linkGraph: LinkGraph;
    /** Zero-LLM 4D emotion engine using mathematical recursion. */
    readonly moodEngine: MoodEngine;
    /** Relationship FSM tracker for character pairs. */
    readonly bondTracker: BondTracker;
    /** Emotional breakthrough and perspective-shift detector. */
    readonly epiphanyDetector: EpiphanyDetector;
    /** Per-character motivation stack with priority ordering. */
    readonly motiveStack: MotiveStack;
    /** Narrative pacing analysis engine. */
    readonly paceDirector: PaceDirector;
    /** Persistent temporal tracking for the narrative timeline. */
    readonly timeline: TimelineSense;
    /** Pattern detection and insight consolidation engine (wraps FactVault). */
    readonly insightForge: InsightForge;
    /** Rule-based scene type detection (stateless). */
    readonly sceneClassifier: SceneClassifier;
    /** Template-based inner monologue generator (stateless). */
    readonly innerVoice: InnerVoice;
    /** Context injection strategy arbitrator (stateless). */
    readonly injectionPolicy: InjectionPolicy;
    /** Directory containing all SQLite database files. */
    private readonly narrativeDir;
    /** Whether the engine has been closed (prevents double-close). */
    private closed;
    /** Optional LLM agent context for LLM-based post-write fact extraction.
     *  When set, analyzePostWrite uses it to create a FactExtractor that scans
     *  each chapter for structured StoryFacts and persists them to the vault. */
    private readonly agentContext?;
    /**
     * Create a new NarrativeEngine.
     *
     * All SQLite databases are created under `<projectRoot>/narrative/`.
     * The directory is created recursively if it does not exist.
     *
     * @param projectRoot The root directory of the writing project.
     * @param agentContext Optional LLM context enabling LLM-based fact extraction
     *  during post-write analysis. When omitted, the engine runs in deterministic
     *  (zero-LLM) mode and story-facts.json stays empty.
     */
    constructor(projectRoot: string, agentContext?: AgentContext);
    /**
     * Assemble the narrative context for a chapter about to be written.
     *
     * This method gathers facts, timeline context, pace recommendations,
     * inner voices, and top motives, then assembles them into a single
     * LLM prompt via the InjectionPolicy.
     *
     * @param params Chapter index, outline, and main characters.
     * @returns The assembled pre-write context.
     */
    assemblePreWriteContext(params: PreWriteParams): Promise<PreWriteContext>;
    /**
     * Analyze a chapter that has just been written.
     *
     * This method classifies scenes, records bond interactions for participant
     * pairs, shifts character moods, detects epiphanies, computes pace metrics,
     * and logs timeline anchors and appearances.
     *
     * @param params Chapter index, narrative text, characters, and word count.
     * @returns The full post-write analysis result.
     */
    analyzePostWrite(params: PostWriteParams): Promise<PostWriteResult>;
    /**
     * Close all SQLite database connections.
     *
     * Safe to call multiple times — subsequent calls are no-ops.
     * The FactVault exports its JSON backup before closing.
     */
    close(): void;
    /** Support `using engine = new NarrativeEngine(...)` syntax. */
    [Symbol.dispose](): void;
    /**
     * Determine whether a scene interaction between two characters is positive.
     *
     * - conflict / separation / tragedy → always negative
     * - tenderness / reunion            → always positive
     * - all other types                  → positive if intensity < 0.5
     *
     * @param sceneType  The type of the scene.
     * @param intensity  The scene intensity (0-1).
     * @returns True if the interaction is positive.
     */
    private isPositiveInteraction;
    /**
     * Derive the bond modifier for a character from the bond tracker.
     *
     * Looks at all scenes where the character appears, finds other participants,
     * retrieves bonds between the character and those participants, and computes
     * the average of `bond.warmth * 0.5` (clamped to [-0.5, 0.5]).
     * Returns 0 if no relevant bonds exist.
     *
     * @param characterId  The character to derive the modifier for.
     * @param scenes       All scenes in the current chapter.
     * @returns A bond modifier in the range [-0.5, 0.5].
     */
    private deriveBondModifier;
    /**
     * Format pinned facts as a human-readable Chinese text block.
     *
     * @param facts The pinned (core) facts from the vault.
     * @returns A formatted string, or empty string if no pinned facts.
     */
    private formatPinnedFacts;
    /**
     * Format the temporal context as a human-readable Chinese string.
     *
     * Includes:
     *   - Recent timeline anchors (up to 5)
     *   - Character appearance gaps (chapters since last appearance)
     *   - Recurring patterns detected by TimelineSense
     *   - Current chapter event density
     *
     * @param ctx The temporal context from TimelineSense.
     * @returns A formatted Chinese string for prompt injection.
     */
    private formatTimelineBlock;
    /**
     * Format bond context strings for a character's inner voice generation.
     *
     * Returns an array of strings like "角色B（ally）" describing the
     * character's current relationships, which the InnerVoice module weaves
     * into the generated monologue.
     *
     * @param characterId  The character to look up bonds for.
     * @returns An array of bond context strings.
     */
    private formatBondContext;
}
//# sourceMappingURL=narrative-engine.d.ts.map