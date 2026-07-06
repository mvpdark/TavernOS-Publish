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
import { mkdirSync } from "node:fs";
// --- Narrative memory modules ---
import { FactVault } from "../narrative/fact-vault.js";
import { ContextFetcher } from "../narrative/context-fetcher.js";
import { LinkGraph } from "../narrative/link-graph.js";
import { InsightForge } from "../narrative/insight-forge.js";
import { StoryDomainSchema, StoryCategorySchema } from "../narrative/types.js";
// --- Scene analysis ---
import { SceneClassifier } from "../scene/classifier.js";
// --- Character engine modules ---
import { MoodEngine } from "../character-engine/mood-engine.js";
import { BondTracker } from "../character-engine/bond-tracker.js";
import { InnerVoice } from "../character-engine/inner-voice.js";
import { EpiphanyDetector } from "../character-engine/epiphany.js";
import { MotiveStack } from "../character-engine/motive-stack.js";
import { PaceDirector } from "../character-engine/pace-director.js";
// --- Timeline ---
import { TimelineSense } from "../timeline/sense.js";
// --- Pipeline ---
import { InjectionPolicy } from "./injection-policy.js";
// --- Fact extraction (LLM-based, integrated into post-write analysis) ---
import { createFactExtractor } from "../agents/fact-extractor.js";
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
const NEGATIVE_SCENE_TYPES = ["conflict", "separation", "tragedy"];
/** Scene types that always represent a positive (warm) interaction. */
const POSITIVE_SCENE_TYPES = ["tenderness", "reunion"];
// ---------------------------------------------------------------------------
// NarrativeEngine
// ---------------------------------------------------------------------------
export class NarrativeEngine {
    // -------------------------------------------------------------------------
    // Module instances — exposed as readonly properties for direct access
    // -------------------------------------------------------------------------
    /** Persistent fact storage with CRUD, dedup/merge, and relevance scoring. */
    vault;
    /** Fact relationship graph for one-hop diffusion in retrieval. */
    linkGraph;
    /** Zero-LLM 4D emotion engine using mathematical recursion. */
    moodEngine;
    /** Relationship FSM tracker for character pairs. */
    bondTracker;
    /** Emotional breakthrough and perspective-shift detector. */
    epiphanyDetector;
    /** Per-character motivation stack with priority ordering. */
    motiveStack;
    /** Narrative pacing analysis engine. */
    paceDirector;
    /** Persistent temporal tracking for the narrative timeline. */
    timeline;
    /** Pattern detection and insight consolidation engine (wraps FactVault). */
    insightForge;
    /** Rule-based scene type detection (stateless). */
    sceneClassifier;
    /** Template-based inner monologue generator (stateless). */
    innerVoice;
    /** Context injection strategy arbitrator (stateless). */
    injectionPolicy;
    // -------------------------------------------------------------------------
    // Private state
    // -------------------------------------------------------------------------
    /** Directory containing all SQLite database files. */
    narrativeDir;
    /** Whether the engine has been closed (prevents double-close). */
    closed = false;
    /** Optional LLM agent context for LLM-based post-write fact extraction.
     *  When set, analyzePostWrite uses it to create a FactExtractor that scans
     *  each chapter for structured StoryFacts and persists them to the vault. */
    agentContext;
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
    constructor(projectRoot, agentContext) {
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
    async assemblePreWriteContext(params) {
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
        const innerVoices = [];
        const topMotives = new Map();
        for (const characterId of mainCharacters) {
            // Only generate inner voice if a mood exists (skips first chapter
            // or characters with no prior mood data).
            const mood = this.moodEngine.getMood(characterId);
            if (mood) {
                const bondNames = this.formatBondContext(characterId);
                const voice = this.innerVoice.generate(characterId, mood, bondNames, chapterIndex);
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
    async analyzePostWrite(params) {
        const { chapterIndex, narrative, mainCharacters: mc2, wordCount } = params;
        const mainCharacters = mc2 ?? [];
        // --- 1. Classify scenes ---
        const sceneResult = this.sceneClassifier.classify(narrative, chapterIndex);
        const scenes = sceneResult.scenes;
        // --- 2. Record bond interactions for participant pairs ---
        const bonds = [];
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
        const moods = new Map();
        const epiphanies = new Map();
        const dominantSceneType = sceneResult.dominantType;
        const avgIntensity = sceneResult.averageIntensity;
        for (const characterId of mainCharacters) {
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
            const epiphany = this.epiphanyDetector.check(characterId, afterMood, beforeMood, dominantSceneType, avgIntensity, chapterIndex, `第${chapterIndex}章 ${dominantSceneType}场景`);
            epiphanies.set(characterId, epiphany);
        }
        // --- 4. Analyze pacing ---
        const paceMetrics = this.paceDirector.analyze(chapterIndex, scenes, wordCount);
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
            const triggerIndex = new Map();
            for (const f of activeFacts) {
                for (const t of f.triggers) {
                    const ids = triggerIndex.get(t);
                    if (ids)
                        ids.push(f.id);
                    else
                        triggerIndex.set(t, [f.id]);
                }
            }
            // For each trigger with 2+ facts, add edges between all pairs.
            for (const [trigger, ids] of triggerIndex) {
                if (ids.length < 2)
                    continue;
                const isCharacter = trigger.length >= 2 && !trigger.includes(" ");
                for (let i = 0; i < ids.length; i++) {
                    for (let j = i + 1; j < ids.length; j++) {
                        this.linkGraph.addEdge(ids[i], ids[j], isCharacter ? "character" : "thematic", 0.3);
                    }
                }
            }
        }
        catch (e) {
            // LinkGraph edge building is non-fatal.
            console.warn("[narrative-engine] linkGraph edge building failed: ", e);
        }
        // --- 6. Get the updated temporal context ---
        const timelineContext = this.timeline.getTemporalContext(chapterIndex);
        // --- 7. Run InsightForge for offline pattern detection ---
        // Detects recurring characters, unresolved foreshadows, conflict
        // escalation, relationship clusters, and thematic patterns. Results
        // are returned to the caller (and could be surfaced to the Planner
        // or UI in future iterations).
        let insights = [];
        try {
            insights = this.insightForge.detectPatterns();
        }
        catch (e) {
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
                    if (!domainResult.success || !categoryResult.success)
                        continue;
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
                }
                catch (e) {
                    // addFact may reject on validation/dedup — skip individual failures.
                    console.warn("[narrative-engine] pre-extracted fact ingestion failed: ", e);
                }
            }
        }
        else if (this.agentContext && params.storyBible && narrative.trim().length > 0) {
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
                }
                catch (e) {
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
                            if (!domainResult.success || !categoryResult.success)
                                continue;
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
                        }
                        catch (e) {
                            // addFact may reject on validation/dedup — skip individual failures.
                            console.warn("[narrative-engine] extracted fact ingestion failed: ", e);
                        }
                    }
                }
            }
            catch (e) {
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
    close() {
        if (this.closed)
            return;
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
    [Symbol.dispose]() {
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
    isPositiveInteraction(sceneType, intensity) {
        if (NEGATIVE_SCENE_TYPES.includes(sceneType))
            return false;
        if (POSITIVE_SCENE_TYPES.includes(sceneType))
            return true;
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
    deriveBondModifier(characterId, scenes) {
        // Collect all other participants in scenes where this character appears.
        const otherParticipants = new Set();
        for (const scene of scenes) {
            if (scene.participants.includes(characterId)) {
                for (const p of scene.participants) {
                    if (p !== characterId) {
                        otherParticipants.add(p);
                    }
                }
            }
        }
        if (otherParticipants.size === 0)
            return 0;
        // Find bonds between this character and the other participants.
        const allBonds = this.bondTracker.getBondsForCharacter(characterId);
        const relevantBonds = allBonds.filter((b) => {
            const parts = b.pairKey.split("\u0000");
            return parts.some((p) => otherParticipants.has(p));
        });
        if (relevantBonds.length === 0)
            return 0;
        // Average warmth * 0.5, clamped to [-0.5, 0.5].
        const avgWarmth = relevantBonds.reduce((sum, b) => sum + b.warmth, 0) / relevantBonds.length;
        return Math.max(-0.5, Math.min(0.5, avgWarmth * 0.5));
    }
    /**
     * Format pinned facts as a human-readable Chinese text block.
     *
     * @param facts The pinned (core) facts from the vault.
     * @returns A formatted string, or empty string if no pinned facts.
     */
    formatPinnedFacts(facts) {
        if (facts.length === 0)
            return "";
        const lines = [];
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
    formatTimelineBlock(ctx) {
        const lines = [];
        // --- Recent anchors ---
        if (ctx.recentAnchors.length > 0) {
            lines.push("近期事件：");
            for (const anchor of ctx.recentAnchors) {
                const charStr = anchor.characters.length > 0
                    ? `（${anchor.characters.join("、")}）`
                    : "";
                const locStr = anchor.location ? ` @${anchor.location}` : "";
                lines.push(`· 第${anchor.chapterIndex}章 ${anchor.label}${charStr}${locStr}`);
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
    formatBondContext(characterId) {
        const bonds = this.bondTracker.getBondsForCharacter(characterId);
        const result = [];
        for (const bond of bonds) {
            // Extract the other character's name from the pair key.
            const parts = bond.pairKey.split("\u0000");
            const otherChar = parts.find((p) => p !== characterId) ?? bond.pairKey;
            result.push(`${otherChar}（${bond.phase}）`);
        }
        return result;
    }
}
//# sourceMappingURL=narrative-engine.js.map