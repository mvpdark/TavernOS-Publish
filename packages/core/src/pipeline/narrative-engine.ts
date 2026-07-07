// packages/core/src/pipeline/narrative-engine.ts
// NarrativeEngine — top-level container for all narrative subsystems.
//
// This class is the single entry point for the TavernOS narrative pipeline.
// It owns the lifecycle of 13 modules (8 SQLite-backed, 5 stateless/wrapping)
// and orchestrates the two main pipeline phases:
//
//   1. Pre-write context assembly  — gathers facts, timeline, mood, motives,
//      and pace recommendations into a single LLM prompt.
//   2. Post-write analysis          — classifies scenes, updates bonds, shifts
//      moods, detects epiphanies, records pacing metrics, and logs timeline
//      anchors.
//
// Design principles:
//   • All SQLite databases live under <projectRoot>/narrative/
//   • The engine is disposable via `using` syntax (Symbol.dispose)
//   • InsightForge.detectPatterns() is wired into analyzePostWrite; the
//     other InsightForge methods are not yet wired into the pipeline
//   • All user-facing strings are Chinese; all code comments are English

import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

// --- Narrative memory modules ---
import { FactVault } from "../narrative/fact-vault.js";
import { ContextFetcher } from "../narrative/context-fetcher.js";
import { LinkGraph } from "../narrative/link-graph.js";
import { InsightForge, type InsightPattern } from "../narrative/insight-forge.js";
import { StoryDomainSchema, StoryCategorySchema, type FetchResult, type StoryFact } from "../narrative/types.js";

// --- Scene analysis ---
import { SceneClassifier } from "../scene/classifier.js";
import type {
  SceneType,
  SceneSignal,
  SceneClassificationResult,
} from "../scene/types.js";

// --- Character engine modules ---
import { MoodEngine } from "../character-engine/mood-engine.js";
import { BondTracker } from "../character-engine/bond-tracker.js";
import { InnerVoice } from "../character-engine/inner-voice.js";
import { EpiphanyDetector } from "../character-engine/epiphany.js";
import { MotiveStack } from "../character-engine/motive-stack.js";
import { PaceDirector } from "../character-engine/pace-director.js";
import type {
  MoodVector,
  BondState,
  Motive,
  EpiphanySignal,
  InnerVoiceBlock,
  PaceMetrics,
} from "../character-engine/types.js";

// --- Timeline ---
import { TimelineSense } from "../timeline/sense.js";
import type { TemporalContext } from "../timeline/types.js";

// --- Pipeline ---
import { InjectionPolicy } from "./injection-policy.js";
import type { AssembledPrompt } from "./injection-policy.js";

// --- Fact extraction (LLM-based, integrated into post-write analysis) ---
import { createFactExtractor, type ExtractedFact } from "../agents/fact-extractor.js";
import type { AgentContext } from "../agents/base.js";

// ---------------------------------------------------------------------------
// Public interfaces — parameters and return types
// ---------------------------------------------------------------------------

/** Parameters for the pre-write context assembly phase. */
export interface PreWriteParams {
  /** 1-based chapter index about to be written (first chapter = 1). */
  readonly chapterIndex: number;
  /** The chapter outline / brief, used as the retrieval query. */
  readonly chapterOutline: string;
  /** Character names (NOT IDs) to generate inner voice and retrieve top motives for.
   *  The NarrativeEngine subsystems (SceneClassifier, BondTracker, etc.) extract
   *  participant names from chapter text, so all subsystems share the same
   *  NAME-based key space. Optional — when omitted, inner voice and motive
   *  tracking are skipped. */
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
  /** Character names (NOT IDs) to track moods, epiphanies, and bonds for.
   *  The NarrativeEngine subsystems use character NAME as the key space.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Character budget for the ContextFetcher's assembled context block. */
const FETCHER_CHAR_BUDGET = 4000;

/** Reserved character budget for pinned facts within the context block. */
const FETCHER_PINNED_BUDGET = 1500;

/** Total character budget for the InjectionPolicy assembled prompt. */
const INJECTION_TOTAL_BUDGET = 6000;

/** Scene types that always represent a negative (hostile) interaction. */
const NEGATIVE_SCENE_TYPES: readonly SceneType[] = ["conflict", "separation", "tragedy"];

/** Scene types that always represent a positive (warm) interaction. */
const POSITIVE_SCENE_TYPES: readonly SceneType[] = ["tenderness", "reunion"];

// ---------------------------------------------------------------------------
// NarrativeEngine
// ---------------------------------------------------------------------------

export class NarrativeEngine {
  // -------------------------------------------------------------------------
  // Module instances — exposed as readonly properties for direct access
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Private state
  // -------------------------------------------------------------------------

  /** Directory containing all SQLite database files. */
  private readonly narrativeDir: string;

  /** Whether the engine has been closed (prevents double-close). */
  private closed = false;

  /** Optional LLM agent context for LLM-based post-write fact extraction.
   *  When set, analyzePostWrite uses it to create a FactExtractor that scans
   *  each chapter for structured StoryFacts and persists them to the vault. */
  private readonly agentContext?: AgentContext;

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

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
  constructor(projectRoot: string, agentContext?: AgentContext) {
    this.narrativeDir = join(projectRoot, "narrative");
    mkdirSync(this.narrativeDir, { recursive: true });
    this.agentContext = agentContext;

    // --- SQLite-backed modules (8 databases) ---
    this.vault = new FactVault(join(this.narrativeDir, "facts.db"));
    this.linkGraph = new LinkGraph(join(this.narrativeDir, "links.db"));
    this.moodEngine = new MoodEngine(join(this.narrativeDir, "mood.db"));
    this.bondTracker = new BondTracker(join(this.narrativeDir, "bonds.db"));
    this.epiphanyDetector = new EpiphanyDetector(join(this.narrativeDir, "epiphany.db"));
    this.motiveStack = new MotiveStack(join(this.narrativeDir, "motives.db"));
    this.paceDirector = new PaceDirector(join(this.narrativeDir, "pace.db"));
    this.timeline = new TimelineSense(join(this.narrativeDir, "timeline.db"));

    // --- FactVault-wrapping modules (no own database) ---
    // Note: a chapter-aware ContextFetcher is created per call in
    // assemblePreWriteContext (it needs the current chapter index for decay
    // scoring and the LinkGraph for link diffusion), so no instance-level
    // fetcher is kept here.
    this.insightForge = new InsightForge(this.vault);

    // --- Stateless modules ---
    this.sceneClassifier = new SceneClassifier();
    this.innerVoice = new InnerVoice();
    this.injectionPolicy = new InjectionPolicy();
  }

  // -------------------------------------------------------------------------
  // Construction verification
  // -------------------------------------------------------------------------

  /**
   * Verify that all 8 SQLite database files exist on disk.
   *
   * The constructor calls `mkdirSync` before creating the databases, so the
   * `narrative/` directory always exists — but if any `new Database(dbPath)`
   * call throws (e.g. stale dist, native-module load failure, permission
   * error), the directory will be empty and the engine is in a broken state.
   *
   * Callers should invoke this immediately after `new NarrativeEngine(...)`
   * and treat a non-empty `missing` array as a fatal construction failure.
   *
   * @returns `{ allExist, missing }` — `allExist` is true when every expected
   *  `.db` file is present.
   */
  verifyDatabases(): { allExist: boolean; missing: string[] } {
    const expected = [
      "facts.db",
      "links.db",
      "mood.db",
      "bonds.db",
      "epiphany.db",
      "motives.db",
      "pace.db",
      "timeline.db",
    ];
    const missing = expected.filter(
      (f) => !existsSync(join(this.narrativeDir, f)),
    );
    return { allExist: missing.length === 0, missing };
  }

  // -------------------------------------------------------------------------
  // Method 1: Pre-write context assembly
  // -------------------------------------------------------------------------

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
  async assemblePreWriteContext(params: PreWriteParams): Promise<PreWriteContext> {
    // Guard: if the engine has been closed, return a safe empty default
    // instead of attempting to use closed SQLite connections.
    if (this.closed) {
      return {
        narrativeContext: "",
        facts: {
          contextBlock: "",
          facts: [],
          pinnedTruncated: false,
          trace: { totalCandidates: 0, pinned: 0, triggerHits: 0, ftsHits: 0, semanticHits: 0, linkHits: 0 },
        },
        innerVoices: [],
        topMotives: new Map(),
        timelineContext: {
          currentChapter: params.chapterIndex,
          recentAnchors: [],
          recurringPatterns: [],
          timeSinceLastAppearance: new Map(),
          chapterDensity: 0,
        },
        paceMetrics: undefined,
        assembled: { prompt: "", sections: [], truncated: false, totalChars: 0 },
      };
    }
    const { chapterIndex, chapterOutline, mainCharacters: mc } = params;
    const mainCharacters = mc ?? [];

    // --- 1. Fetch relevant facts via a chapter-aware ContextFetcher ---
    // We create a fresh fetcher per call so that decay scoring uses the
    // correct currentChapter value. Pass the LinkGraph so Path 4 (link
    // diffusion) can expand the candidate set with related facts.
    const fetcher = new ContextFetcher(this.vault, {
      charBudget: FETCHER_CHAR_BUDGET,
      pinnedBudget: FETCHER_PINNED_BUDGET,
      currentChapter: chapterIndex,
    }, this.linkGraph);
    const fetchResult = fetcher.fetch(chapterOutline);

    // --- 2. Extract pinned facts block directly from the vault ---
    const pinnedFactsBlock = this.formatPinnedFacts(this.vault.getPinned());

    // --- 3. Build timeline context block ---
    const timelineContext = this.timeline.getTemporalContext(chapterIndex);
    const timelineBlock = this.formatTimelineBlock(timelineContext);

    // --- 4. Pace recommendation from the previous chapter ---
    // chapterIndex is 1-based (first chapter = 1), so only look up the
    // previous chapter's pace metrics when we are past the first chapter.
    const prevPace = chapterIndex > 1
      ? this.paceDirector.getMetrics(chapterIndex - 1)
      : undefined;
    const paceRecommendation = prevPace?.recommendation ?? "";

    // --- 5. Inner voices and top motives for main characters ---
    const innerVoices: InnerVoiceBlock[] = [];
    const topMotives = new Map<string, Motive | undefined>();

    for (const characterId of mainCharacters) {
      // Only generate inner voice if a mood exists (skips first chapter
      // or characters with no prior mood data).
      const mood = this.moodEngine.getMood(characterId);
      if (mood) {
        const bondNames = this.formatBondContext(characterId);
        const voice = this.innerVoice.generate(
          characterId,
          mood,
          bondNames,
          chapterIndex,
        );
        innerVoices.push(voice);
      }

      // Collect top motive (may be undefined for new characters).
      topMotives.set(characterId, this.motiveStack.getTopMotive(characterId));
    }

    // Combine all inner voice texts into a single block.
    const innerVoiceBlock = innerVoices
      .map((v) => `[${v.characterId}] ${v.text}`)
      .join("\n");

    // --- 6. Assemble the final prompt via InjectionPolicy ---
    const assembled = this.injectionPolicy.assemble({
      pinnedFactsBlock,
      innerVoiceBlock,
      contextBlock: fetchResult.contextBlock,
      timelineBlock,
      paceRecommendation,
      totalBudget: INJECTION_TOTAL_BUDGET,
    });

    return {
      narrativeContext: assembled.prompt,
      facts: fetchResult,
      innerVoices,
      topMotives,
      timelineContext,
      paceMetrics: prevPace,
      assembled,
    };
  }

  // -------------------------------------------------------------------------
  // Method 2: Post-write analysis
  // -------------------------------------------------------------------------

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
  async analyzePostWrite(params: PostWriteParams): Promise<PostWriteResult> {
    // Guard: if the engine has been closed, return a safe empty default
    // instead of attempting to use closed SQLite connections.
    if (this.closed) {
      return {
        scenes: {
          scenes: [],
          dominantType: "transition",
          averageIntensity: 0,
          averageGravity: 0,
          hasClimax: false,
          hasTurningPoint: false,
        },
        moods: new Map(),
        bonds: [],
        epiphanies: new Map(),
        paceMetrics: {
          chapterIndex: params.chapterIndex,
          tension: 0,
          relaxation: 0,
          rhythm: "flat",
          sceneCount: 0,
          dialogueRatio: 0,
          actionRatio: 0,
          wordCount: params.wordCount,
          tensionTrend: 0,
          recommendation: "",
        },
        timelineContext: {
          currentChapter: params.chapterIndex,
          recentAnchors: [],
          recurringPatterns: [],
          timeSinceLastAppearance: new Map(),
          chapterDensity: 0,
        },
        insights: [],
        extractedFacts: 0,
      };
    }
    const { chapterIndex, narrative, mainCharacters: mc2, wordCount } = params;
    const mainCharacters = mc2 ?? [];

    // --- 1. Classify scenes ---
    const sceneResult = this.sceneClassifier.classify(narrative, chapterIndex);
    const scenes = sceneResult.scenes;

    // --- 2. Record bond interactions for participant pairs ---
    const bonds: BondState[] = [];
    for (const scene of scenes) {
      const participants = scene.participants;
      // Record an interaction for every unique pair of participants.
      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const isPositive = this.isPositiveInteraction(scene.type, scene.intensity);
          const bond = this.bondTracker.recordInteraction({
            characterA: participants[i],
            characterB: participants[j],
            sceneType: scene.type,
            intensity: scene.intensity,
            isPositive,
            description: `第${chapterIndex}章 场景${scene.sceneIndex}：${scene.type}`,
            chapterIndex,
          });
          bonds.push(bond);
        }
      }
    }

    // --- 3. Shift moods and detect epiphanies for main characters ---
    // Only update mood for characters who actually appear in this chapter's
    // scenes. Characters who didn't appear should not have their mood shifted
    // by a scene they weren't part of.
    const moods = new Map<string, MoodVector>();
    const epiphanies = new Map<string, EpiphanySignal | null>();

    const dominantSceneType = sceneResult.dominantType;
    const avgIntensity = sceneResult.averageIntensity;

    // Collect all participant names from this chapter's scenes.
    const appearedCharacters = new Set<string>();
    for (const scene of scenes) {
      for (const participant of scene.participants) {
        appearedCharacters.add(participant);
      }
    }

    for (const characterId of mainCharacters) {
      // Skip mood shift for characters not present in any scene this chapter.
      if (!appearedCharacters.has(characterId)) {
        // Still record current mood if it exists (for reporting), but don't
        // shift it — the character wasn't in any scene.
        const currentMood = this.moodEngine.getMood(characterId);
        if (currentMood) moods.set(characterId, currentMood);
        continue;
      }
      // Capture the mood BEFORE the shift (for epiphany detection).
      const beforeMood = this.moodEngine.getMood(characterId);

      // Derive bond modifier from the bond tracker.
      const bondModifier = this.deriveBondModifier(characterId, scenes);

      // Shift the mood using the dominant scene type and average intensity.
      const afterMood = this.moodEngine.shift({
        characterId,
        sceneType: dominantSceneType,
        sceneIntensity: avgIntensity,
        bondModifier,
        chapterIndex,
        sceneIndex: 0,
      });

      moods.set(characterId, afterMood);

      // Check for epiphany (returns null if no previous mood or no trigger).
      const epiphany = this.epiphanyDetector.check(
        characterId,
        afterMood,
        beforeMood,
        dominantSceneType,
        avgIntensity,
        chapterIndex,
        `第${chapterIndex}章 ${dominantSceneType}场景`,
      );
      epiphanies.set(characterId, epiphany);
    }

    // --- 4. Analyze pacing ---
    const paceMetrics = this.paceDirector.analyze(
      chapterIndex,
      scenes,
      wordCount,
    );

    // --- 5. Record timeline anchors and appearances ---
    for (const scene of scenes) {
      this.timeline.addAnchor({
        chapterIndex,
        label: `${scene.type}场景：${scene.textExcerpt.slice(0, 30)}`,
        characters: scene.participants,
        location: scene.location,
        anchorType: scene.isClimax ? "milestone" : "event",
        significance: scene.intensity,
      });

      for (const participant of scene.participants) {
        this.timeline.recordAppearance(participant, chapterIndex);
      }
    }

    // --- 5.5. Auto-build LinkGraph edges from shared triggers ---
    // When two active facts share trigger keywords, they are thematically
    // related. We add "character" edges for shared character names and
    // "thematic" edges for other shared triggers. This populates the
    // LinkGraph so ContextFetcher's Path 4 (link diffusion) has data.
    // NOTE: addEdge is idempotent (UPSERT with max weight), so re-running
    // this on every chapter is safe — existing edges just keep their weight.
    // The O(n²) scan is acceptable for typical vault sizes (< 200 active
    // facts); for larger vaults, a trigger-to-facts inverted index would
    // reduce this to O(n * k) where k is the average trigger count.
    try {
      const activeFacts = this.vault.getActive();
      // Build a trigger → fact-ids inverted index for O(n*k) edge building
      // instead of O(n²) pairwise comparison.
      const triggerIndex = new Map<string, string[]>();
      for (const f of activeFacts) {
        for (const t of f.triggers) {
          const ids = triggerIndex.get(t);
          if (ids) ids.push(f.id);
          else triggerIndex.set(t, [f.id]);
        }
      }
      // For each trigger with 2+ facts, add edges between all pairs.
      for (const [trigger, ids] of triggerIndex) {
        if (ids.length < 2) continue;
        const isCharacter = trigger.length >= 2 && !trigger.includes(" ");
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            this.linkGraph.addEdge(ids[i], ids[j], isCharacter ? "character" : "thematic", 0.3);
          }
        }
      }
    } catch (e) {
      // LinkGraph edge building is non-fatal.
      console.warn("[narrative-engine] linkGraph edge building failed: ", e);
    }

    // --- 6. Get the updated temporal context ---
    const timelineContext = this.timeline.getTemporalContext(chapterIndex);

    // --- 7. Run InsightForge for offline pattern detection ---
    // Detects recurring characters, unresolved foreshadows, conflict
    // escalation, relationship clusters, and thematic patterns. Results
    // are returned to the caller (and could be surfaced to the Conductor
    // or UI in future iterations).
    let insights: InsightPattern[] = [];
    try {
      insights = this.insightForge.detectPatterns();
    } catch (e) {
      // InsightForge failures are non-fatal.
      console.warn("[narrative-engine] insight detection failed: ", e);
    }

    // --- 8. StoryFact ingestion ---
    // Two sources of facts, mutually exclusive to avoid redundant LLM calls:
    //
    // (a) preExtractedFacts — when the caller already ran a unified agent
    //     (ChapterAnalyzer in StoryOrchestrator) that produced both delta and
    //     facts in a single LLM call, those facts are passed in here. We
    //     ingest them directly — NO extra LLM call. This is the pipeline.ts
    //     path.
    //
    // (b) FactExtractor — when no pre-extracted facts are supplied (the
    //     create.ts path, which uses the legacy StateExtractor that only
    //     produces delta), AND an agentContext + storyBible are available,
    //     we run the standalone FactExtractor here. This is the only path
    //     that makes a new LLM call for facts.
    //
    // Both paths persist to the same FactVault; the vault's dedup/merge logic
    // handles any accidental overlap gracefully.
    let extractedFacts = 0;
    const preFacts = params.preExtractedFacts;
    // When the caller asserts fact extraction already ran
    // (preExtractedFactsProvided === true), we ingest whatever
    // preExtractedFacts holds — even an empty array — and NEVER fall back to
    // the standalone FactExtractor. This distinguishes "extraction ran but
    // yielded zero facts" from "no extraction was attempted". When the flag
    // is false/undefined, we preserve the original behavior: ingest
    // pre-extracted facts if any, otherwise run FactExtractor as a fallback.
    if (params.preExtractedFactsProvided || (preFacts && preFacts.length > 0)) {
      // (a) Ingest pre-extracted facts — no LLM call.
      for (const fact of preFacts ?? []) {
        try {
          // Runtime-validate domain/category before the `as` cast: external
          // callers supply preExtractedFacts and a bad enum value would
          // otherwise slip straight into the vault. Skip invalid facts.
          const domainResult = StoryDomainSchema.safeParse(fact.domain);
          const categoryResult = StoryCategorySchema.safeParse(fact.category);
          if (!domainResult.success || !categoryResult.success) continue;
          this.vault.addFact({
            domain: domainResult.data,
            category: categoryResult.data,
            label: fact.label,
            content: fact.content,
            weight: fact.weight,
            certainty: fact.certainty,
            triggers: fact.triggers,
            emotionalWeight: fact.emotionalWeight,
            chapterOrigin: chapterIndex,
          });
          extractedFacts++;
        } catch (e) {
          // addFact may reject on validation/dedup — skip individual failures.
          console.warn("[narrative-engine] pre-extracted fact ingestion failed: ", e);
        }
      }
    } else if (this.agentContext && params.storyBible && narrative.trim().length > 0) {
      // (b) Standalone FactExtractor fallback — makes one LLM call.
      // ⚠️ DEPRECATED: This path is never triggered in the main StoryOrchestrator
      // pipeline because the runner always sets preExtractedFactsProvided=true
      // (ChapterAnalyzer unifies delta+facts extraction). This fallback only
      // activates when NarrativeEngine.analyzePostWrite() is called directly
      // without pre-extracted facts (e.g. legacy callers). It will be removed
      // in a future version once all callers migrate to the unified path.
      console.warn("[narrative-engine] Using deprecated standalone FactExtractor fallback. Consider passing preExtractedFacts from ChapterAnalyzer instead.");
      try {
        const extractor = createFactExtractor(this.agentContext);
        // Build a brief summary of existing facts so the LLM avoids
        // re-extracting duplicates already in the vault.
        let existingSummary = "";
        try {
          const active = this.vault.getActive();
          existingSummary = active
            .slice(0, 30)
            .map((f) => `- ${f.label}: ${f.content.slice(0, 60)}`)
            .join("\n");
        } catch (e) {
          // Vault read failure is non-fatal — extract without dedup hints.
          console.warn("[narrative-engine] vault active-facts read failed: ", e);
        }
        const result = await extractor.extract({
          chapterContent: narrative,
          chapter: chapterIndex,
          storyBible: params.storyBible,
          existingFactsSummary: existingSummary,
        });
        if (!result.degraded) {
          for (const fact of result.facts) {
            try {
              // Runtime-validate domain/category before the `as` cast so a
              // malformed extractor output can't bypass the enum constraint.
              const domainResult = StoryDomainSchema.safeParse(fact.domain);
              const categoryResult = StoryCategorySchema.safeParse(fact.category);
              if (!domainResult.success || !categoryResult.success) continue;
              this.vault.addFact({
                domain: domainResult.data,
                category: categoryResult.data,
                label: fact.label,
                content: fact.content,
                weight: fact.weight,
                certainty: fact.certainty,
                triggers: fact.triggers,
                emotionalWeight: fact.emotionalWeight,
                chapterOrigin: chapterIndex,
              });
              extractedFacts++;
            } catch (e) {
              // addFact may reject on validation/dedup — skip individual failures.
              console.warn("[narrative-engine] extracted fact ingestion failed: ", e);
            }
          }
        }
      } catch (e) {
        // Fact extraction is non-fatal — the pipeline still returns
        // scene/mood/bond/timeline analysis results.
        console.warn("[narrative-engine] fact extraction failed: ", e);
      }
    }

    return {
      scenes: sceneResult,
      moods,
      bonds,
      epiphanies,
      paceMetrics,
      timelineContext,
      insights,
      extractedFacts,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle: close and dispose
  // -------------------------------------------------------------------------

  /**
   * Close all SQLite database connections.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   * The FactVault exports its JSON backup before closing.
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;

    // Close all SQLite-backed modules. Order does not matter since each
    // manages its own independent database file.
    this.vault.close();
    this.linkGraph.close();
    this.moodEngine.close();
    this.bondTracker.close();
    this.epiphanyDetector.close();
    this.motiveStack.close();
    this.paceDirector.close();
    this.timeline.close();
  }

  /** Support `using engine = new NarrativeEngine(...)` syntax. */
  [Symbol.dispose](): void {
    this.close();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

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
  private isPositiveInteraction(sceneType: SceneType, intensity: number): boolean {
    if (NEGATIVE_SCENE_TYPES.includes(sceneType)) return false;
    if (POSITIVE_SCENE_TYPES.includes(sceneType)) return true;
    return intensity < 0.5;
  }

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
  private deriveBondModifier(
    characterId: string,
    scenes: readonly SceneSignal[],
  ): number {
    // Collect all other participants in scenes where this character appears.
    const otherParticipants = new Set<string>();
    for (const scene of scenes) {
      if (scene.participants.includes(characterId)) {
        for (const p of scene.participants) {
          if (p !== characterId) {
            otherParticipants.add(p);
          }
        }
      }
    }

    if (otherParticipants.size === 0) return 0;

    // Find bonds between this character and the other participants.
    const allBonds = this.bondTracker.getBondsForCharacter(characterId);
    const relevantBonds = allBonds.filter((b) => {
      const parts = b.pairKey.split("\u0000");
      return parts.some((p) => otherParticipants.has(p));
    });

    if (relevantBonds.length === 0) return 0;

    // Average warmth * 0.5, clamped to [-0.5, 0.5].
    const avgWarmth =
      relevantBonds.reduce((sum, b) => sum + b.warmth, 0) / relevantBonds.length;
    return Math.max(-0.5, Math.min(0.5, avgWarmth * 0.5));
  }

  /**
   * Format pinned facts as a human-readable Chinese text block.
   *
   * @param facts The pinned (core) facts from the vault.
   * @returns A formatted string, or empty string if no pinned facts.
   */
  private formatPinnedFacts(facts: readonly StoryFact[]): string {
    if (facts.length === 0) return "";
    const lines: string[] = [];
    for (const f of facts) {
      lines.push(`· [${f.domain}/${f.category}] ${f.label}：${f.content}`);
    }
    return lines.join("\n");
  }

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
  private formatTimelineBlock(ctx: TemporalContext): string {
    const lines: string[] = [];

    // --- Recent anchors ---
    if (ctx.recentAnchors.length > 0) {
      lines.push("近期事件：");
      for (const anchor of ctx.recentAnchors) {
        const charStr =
          anchor.characters.length > 0
            ? `（${anchor.characters.join("、")}）`
            : "";
        const locStr = anchor.location ? ` @${anchor.location}` : "";
        lines.push(
          `· 第${anchor.chapterIndex}章 ${anchor.label}${charStr}${locStr}`,
        );
      }
    }

    // --- Appearance gaps ---
    if (ctx.timeSinceLastAppearance.size > 0) {
      lines.push("");
      lines.push("角色出场间隔：");
      for (const [char, gap] of ctx.timeSinceLastAppearance) {
        const gapStr = gap === 0 ? "本章出场" : `距上次出场 ${gap} 章`;
        lines.push(`· ${char}：${gapStr}`);
      }
    }

    // --- Recurring patterns ---
    if (ctx.recurringPatterns.length > 0) {
      lines.push("");
      lines.push("重复模式：");
      for (const pattern of ctx.recurringPatterns) {
        lines.push(`· ${pattern}`);
      }
    }

    // --- Chapter density ---
    lines.push("");
    lines.push(`本章事件密度：${(ctx.chapterDensity * 100).toFixed(0)}%`);

    return lines.join("\n");
  }

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
  private formatBondContext(characterId: string): string[] {
    const bonds = this.bondTracker.getBondsForCharacter(characterId);
    const result: string[] = [];
    for (const bond of bonds) {
      // Extract the other character's name from the pair key.
      const parts = bond.pairKey.split("\u0000");
      const otherChar = parts.find((p) => p !== characterId) ?? bond.pairKey;
      result.push(`${otherChar}（${bond.phase}）`);
    }
    return result;
  }
}
