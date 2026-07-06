import { type AgentContext } from "../agents/base.js";
import { type ArchitectOutput } from "../agents/architect.js";
import { type WriterInput } from "../agents/writer.js";
import { type AuditIssue } from "../agents/auditor.js";
import { type RevisedParagraph } from "../agents/reviser.js";
import { type PlannerInput, type PlannedContext } from "../agents/planner.js";
import type { AssetCatalog } from "../assets/types.js";
import type { StoryStateDelta } from "../models/story-state.js";
import type { NarrativeEngine } from "./narrative-engine.js";
import type { Retriever } from "../rag/retriever.js";
import type { LoreEngine } from "../lorebook/engine.js";
import type { InsightPattern } from "../narrative/insight-forge.js";
/**
 * Strip the chapter summaries section from a full state projection string.
 *
 * The projection format is:
 *   ## 当前状态 (Chapter N)
 *   ...
 *   ## 悬念/伏笔
 *   ...
 *   ## 章节摘要        ← everything from here on is stripped
 *   ...
 *
 * The ChapterAnalyzer only needs the current state fields and active hooks
 * to compute the delta — the chapter summaries table is wasted tokens that
 * FactVault already compensates for via trigger/FTS/link retrieval.
 */
export declare function stripChapterSummaries(projection: string | undefined): string;
export interface PipelineInput {
    /** If provided, the architect agent generates a story framework before writing. */
    architectInput?: {
        title: string;
        genre: string;
        language: string;
        additionalRequirements?: string;
    };
    /** If provided, the planner agent prepares filtered context before writing. */
    plannerInput?: PlannerInput;
    /** Writer input — always required. If plannerInput is provided, its PlannedContext
     *  overrides the corresponding writerInput fields (storyBible, currentState, activeHooks, chapterOutline). */
    writerInput: WriterInput;
    /** Audit mode: "auto" runs audit + auto-revise, "manual" runs audit only, "off" skips audit. */
    auditMode: "auto" | "manual" | "off";
    /** Story context needed for auditing. Required when auditMode !== "off". */
    storyContext?: {
        storyBible: string;
        currentState: string;
        activeHooks: string;
        chapterSummaries: string;
        /** Genre string for genre-rule checks during audit. When provided,
         *  the auditor runs string-based genre rule checks (universal +
         *  genre-specific) after the LLM audit. */
        genre?: string;
    };
    /** Existing asset catalog from prior chapters. When provided, the asset
     *  extractor uses it to mark new vs. updated assets and preserve IDs. */
    existingAssetCatalog?: AssetCatalog;
    /** Optional NarrativeEngine instance. When provided, the pipeline:
     *  - Before Step 3 (Writer): calls assemblePreWriteContext() and injects
     *    the assembled narrative context into writerInput.narrativeContext.
     *  - After Step 7 (AssetExtractor): calls analyzePostWrite() for scene
     *    classification, mood/bond/epiphany updates, pace analysis, timeline
     *    tracking, and fact extraction (FactExtractor agent → vault.addFact).
     *  - The chapter index is taken from writerInput.chapter.
     *  Main character names for tracking are extracted from assetCatalog or
     *  the story bible when not explicitly provided. */
    narrativeEngine?: NarrativeEngine;
    /** Main character IDs for narrative engine tracking. When omitted and
     *  narrativeEngine is set, the pipeline will attempt to extract character
     *  names from the story bible or chapter outline. */
    mainCharacters?: string[];
    /** Optional RAG retriever for vector-based previous-chapter retrieval.
     *  When provided (along with projectId), the pipeline queries relevant
     *  excerpts from earlier chapters and injects them into
     *  writerInput.vectorContext before writing. */
    ragRetriever?: Retriever;
    /** Optional lorebook engine for keyword-triggered world-building injection.
     *  When provided (along with lorebookEntries), the pipeline scans the story
     *  bible + chapter outline for matching lorebook entries and injects them
     *  into writerInput.lorebook. */
    loreEngine?: LoreEngine;
    /** Lorebook entries to scan (required when loreEngine is provided). */
    lorebookEntries?: import("../lorebook/types.js").LoreEntry[];
    /** Project ID — used as scopeId for RAG retrieval and lorebook scanning.
     *  Required when ragRetriever or loreEngine is provided. */
    projectId?: string;
    /** Optional style profile string for style cloning. When provided, injected
     *  into writerInput.styleProfile so the writer mimics the target style. */
    styleProfile?: string;
    /** Insights from the previous chapter's post-write analysis (e.g. unresolved
     *  foreshadows, recurring characters, conflict escalation). When provided,
     *  the pipeline injects them into the planner input so the planner can
     *  account for narrative patterns detected in prior chapters. */
    previousInsights?: InsightPattern[];
}
export interface ChapterResult {
    architecture?: ArchitectOutput;
    plannedContext?: PlannedContext;
    narrative: string;
    /** The structural skeleton from two-stage writer (when enabled). */
    skeleton?: string;
    delta: StoryStateDelta;
    /** True when StateExtractor could not parse the LLM response. Callers should
     *  skip merging `delta` into global state and flag the chapter as degraded. */
    degraded?: boolean;
    auditIssues?: AuditIssue[];
    revisedNarrative?: string;
    revisedParagraphs?: RevisedParagraph[];
    /** Asset catalog extracted from the finalized chapter content (after revision). */
    assetCatalog?: AssetCatalog;
    /** Post-write narrative analysis result (when narrativeEngine is enabled).
     *  Contains scene classification, mood updates, bond states, epiphany
     *  signals, pace metrics, and timeline context. */
    narrativeAnalysis?: import("./narrative-engine.js").PostWriteResult;
}
/**
 * Pipeline stage identifiers emitted via the onProgress callback so callers
 * (e.g. an SSE route) can report real-time progress to the UI.
 */
export type PipelineStage = "architect" | "planner" | "narrative-pre" | "writer" | "auditor" | "reviser" | "consolidator" | "asset-extractor" | "narrative-post";
export declare class StoryOrchestrator {
    private readonly ctx;
    private readonly architect;
    private readonly planner;
    private readonly writer;
    private readonly auditor;
    private readonly reviser;
    private readonly chapterAnalyzer;
    private readonly assetExtractor;
    /**
     * @param ctx default agent context (client + model).
     * @param resolveContext optional resolver returning a per-agent context with
     *   its own client/model — enables multi-provider division of labor (e.g.
     *   Kimi for the writer skeleton, Claude for the flesh). When a resolver is
     *   supplied it takes precedence over modelOverrides for that agent.
     * @param modelOverrides legacy per-agent model overrides on the shared client
     *   (kept for backward compatibility with the CLI).
     */
    constructor(ctx: AgentContext, resolveContext?: (agentName: string) => AgentContext | undefined, modelOverrides?: Record<string, string>);
    /**
     * Run the multi-agent pipeline for a single chapter.
     *
     * Flow:
     * 1. (Optional) Architect generates story framework
     * 2. (Optional) Planner prepares filtered context (overrides writerInput fields)
     * 2.5. (If narrativeEngine provided) NarrativeEngine.assemblePreWriteContext
     * 3. Writer generates narrative (pure text, no state delta)
     * 4. (If auditMode !== "off" and storyContext provided) Auditor checks continuity
     * 5. (If auditMode === "auto" and errors found) Reviser fixes issues
     * 6. ChapterAnalyzer extracts state delta + facts from the finalized content
     * 7. AssetExtractor extracts characters/scenes/props from finalized content
     * 8. (If narrativeEngine provided) NarrativeEngine.analyzePostWrite
     * 9. Return ChapterResult
     *
     * @param signal optional AbortSignal — when aborted, throws "aborted" before
     *   each agent call and propagates the signal to the LLM layer.
     */
    runChapter(input: PipelineInput, signal?: AbortSignal, onProgress?: (stage: PipelineStage) => void): Promise<ChapterResult>;
}
//# sourceMappingURL=runner.d.ts.map