// packages/core/src/pipeline/runner.ts
import { toErrorMessage, type AgentContext } from "../agents/base.js";
import { createOutlinePlanner, type ArchitectOutput } from "../agents/architect.js";
import { createScribe, type ScribeInput } from "../agents/scribe.js";
import { createSentinel, type SentinelInput, type SentinelIssue } from "../agents/sentinel.js";
import { createPolisher, type PolishedParagraph } from "../agents/polisher.js";
import { createChapterAnalyzer } from "../agents/chapter-analyzer.js";
import { createConductor, type ConductorInput, type ConductedContext } from "../agents/conductor.js";
import { createAssetExtractor } from "../agents/asset-extractor.js";
import { humanizeText } from "../humanize/index.js";
import { runGenreRuleChecks } from "../rules/index.js";
import type { AssetCatalog } from "../assets/types.js";
import { buildAssetRosterText } from "../assets/catalog.js";
import type { StoryStateDelta } from "../models/story-state.js";
import type { NarrativeEngine } from "./narrative-engine.js";
import type { Retriever } from "../rag/retriever.js";
import type { LoreEngine } from "../lorebook/engine.js";
import type { InsightPattern } from "../narrative/insight-forge.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Cached dynamic import of the humanize module's `detectStyle`.
 * Avoids re-evaluating the dynamic `import()` on every runChapter call.
 */
type HumanizeModule = typeof import("../humanize/index.js");
let _detectStylePromise: Promise<HumanizeModule> | null = null;
function getDetectStyle(): Promise<HumanizeModule> {
  if (!_detectStylePromise) _detectStylePromise = import("../humanize/index.js");
  return _detectStylePromise;
}

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
export function stripChapterSummaries(projection: string | undefined): string {
  if (!projection) return "";
  // Match either Chinese or English chapter summaries header.
  const idx = projection.search(/\n## (?:章节摘要|Chapter Summaries)/);
  if (idx < 0) return projection;
  return projection.slice(0, idx).trimEnd();
}

// ---------------------------------------------------------------------------
// Book-level async mutex
// ---------------------------------------------------------------------------

/**
 * Module-scoped async mutex registry, keyed by book id.
 *
 * The former implementation used a per-instance `Set<string>` which (a) was
 * not shared across StoryOrchestrator instances and (b) rejected concurrent
 * callers instead of queuing them, so concurrent requests for the same book
 * were not actually mutually excluded. This registry is shared across ALL
 * StoryOrchestrator instances in the process: `acquireBookLock` resolves only
 * once every previous holder for the same book has released, and returns a
 * `release` function that MUST be called (exactly once) to unblock the next
 * waiter. The lock is process-internal — it serializes concurrent in-process
 * requests but does not coordinate across separate processes.
 */
const bookLockChain = new Map<string, Promise<void>>();

/**
 * Acquire the book-level mutex. Returns a release function that must be
 * called to surrender the lock (typically in a `finally` block so the lock
 * is released even when the critical section throws).
 */
async function acquireBookLock(bookId: string): Promise<() => void> {
  // The current tail of the lock chain for this book (resolved if free).
  const previous = bookLockChain.get(bookId) ?? Promise.resolve();
  let release!: () => void;
  // "hold" is resolved only when release() is called.
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Append our hold to the chain BEFORE awaiting so later acquirers queue
  // behind us instead of racing past.
  const ourChain = previous.then(() => hold);
  bookLockChain.set(bookId, ourChain);
  // Wait for the previous holder to release before entering the section.
  await previous;
  return () => {
    release();
    // Clean up: if no one queued behind us, remove the entry to prevent
    // the Map from growing indefinitely across many books.
    if (bookLockChain.get(bookId) === ourChain) {
      bookLockChain.delete(bookId);
    }
  };
}

export interface PipelineInput {
  /** If provided, the architect agent generates a story framework before writing. */
  architectInput?: {
    title: string;
    genre: string;
    language: string;
    additionalRequirements?: string;
  };
  /** If provided, the conductor agent prepares filtered context before writing. */
  conductorInput?: ConductorInput;
  /** Writer input — always required. If conductorInput is provided, its ConductedContext
   *  overrides the corresponding writerInput fields (storyBible, currentState, activeHooks, chapterOutline). */
  writerInput: ScribeInput;
  /** Audit mode: "auto" runs audit + auto-revise, "manual" runs audit only, "off" skips audit. */
  auditMode: "auto" | "manual" | "off";
  /** Story context needed for auditing. Required when auditMode !== "off". */
  storyContext?: {
    storyBible: string;
    currentState: string;
    activeHooks: string;
    chapterSummaries: string;
    /** Genre string for genre-rule checks during audit. When provided,
     *  the sentinel runs string-based genre rule checks (universal +
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
  /** Main character names (NOT IDs) for narrative engine tracking. The
   *  NarrativeEngine subsystems (SceneClassifier, BondTracker, etc.) use
   *  character NAME as the key space, so these must be names. When omitted
   *  and narrativeEngine is set, the pipeline extracts character names from
   *  the asset catalog (existingAssetCatalog pre-write / assetResult.catalog
   *  post-write). */
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
   *  into writerInput.styleProfile so the scribe mimics the target style. */
  styleProfile?: string;
  /** Insights from the previous chapter's post-write analysis (e.g. unresolved
   *  foreshadows, recurring characters, conflict escalation). When provided,
   *  the pipeline injects them into the conductor input so the conductor can
   *  account for narrative patterns detected in prior chapters. */
  previousInsights?: InsightPattern[];
}

export interface ChapterResult {
  architecture?: ArchitectOutput;
  conductedContext?: ConductedContext;
  narrative: string;
  /** The structural skeleton from two-stage writer (when enabled). */
  skeleton?: string;
  delta: StoryStateDelta;
  /** True when StateExtractor could not parse the LLM response. Callers should
   *  skip merging `delta` into global state and flag the chapter as degraded. */
  degraded?: boolean;
  auditIssues?: SentinelIssue[];
  revisedNarrative?: string;
  revisedParagraphs?: PolishedParagraph[];
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
export type PipelineStage =
  | "architect"
  | "conductor"
  | "narrative-pre"
  | "writer"
  | "auditor"
  | "reviser"
  | "consolidator"
  | "asset-extractor"
  | "narrative-post";

export class StoryOrchestrator {
  private readonly ctx: AgentContext;
  private readonly architect: ReturnType<typeof createOutlinePlanner>;
  private readonly conductor: ReturnType<typeof createConductor>;
  private readonly writer: ReturnType<typeof createScribe>;
  private readonly auditor: ReturnType<typeof createSentinel>;
  private readonly reviser: ReturnType<typeof createPolisher>;
  private readonly chapterAnalyzer: ReturnType<typeof createChapterAnalyzer>;
  private readonly assetExtractor: ReturnType<typeof createAssetExtractor>;

  /**
   * @param ctx default agent context (client + model).
   * @param resolveContext optional resolver returning a per-agent context with
   *   its own client/model — enables multi-provider division of labor (e.g.
   *   Kimi for the scribe skeleton, Claude for the flesh). When a resolver is
   *   supplied it takes precedence over modelOverrides for that agent.
   * @param modelOverrides legacy per-agent model overrides on the shared client
   *   (kept for backward compatibility with the CLI).
   */
  constructor(
    ctx: AgentContext,
    resolveContext?: (agentName: string) => AgentContext | undefined,
    modelOverrides?: Record<string, string>,
  ) {
    this.ctx = ctx;

    // Resolve an agent's context: prefer the new per-agent resolver (different
    // client/provider), then fall back to a legacy model-only override on the
    // shared client, then the default context.
    const resolve = (agentName: string): AgentContext => {
      const perAgent = resolveContext?.(agentName);
      if (perAgent) return perAgent;
      const model = modelOverrides?.[agentName];
      return model ? { ...ctx, model } : ctx;
    };
    // Like resolve(), but returns undefined when the agent has no override
    // (neither a per-agent context nor a model override). Used for the optional
    // skeleton stage: undefined → single-stage writer.
    const resolveOptional = (agentName: string): AgentContext | undefined => {
      const perAgent = resolveContext?.(agentName);
      if (perAgent) return perAgent;
      const model = modelOverrides?.[agentName];
      return model ? { ...ctx, model } : undefined;
    };

    // Agents are now produced by factory functions (compose pattern)
    // instead of `new XxxAgent(override(...))`.
    this.architect = createOutlinePlanner(resolve("architect"));
    this.conductor = createConductor(resolve("conductor"));
    // Two-stage writer: the flesh stage uses the "writerFlesh" context (or
    // falls back to "writer"); the skeleton stage uses "writerSkeleton" when
    // configured (per-agent context or model override), otherwise the writer
    // runs single-stage.
    const fleshCtx = resolveOptional("writerFlesh") ?? resolve("writer");
    const skeletonCtx = resolveOptional("writerSkeleton");
    this.writer = createScribe(fleshCtx, skeletonCtx);
    this.auditor = createSentinel(resolve("auditor"));
    this.reviser = createPolisher(resolve("reviser"));
    this.chapterAnalyzer = createChapterAnalyzer(resolve("consolidator"));
    this.assetExtractor = createAssetExtractor(resolve("asset-extractor"));
  }

  /**
   * Run the multi-agent pipeline for a single chapter.
   *
   * Flow:
   * 1. (Optional) Architect generates story framework
   * 2. (Optional) Conductor prepares filtered context (overrides writerInput fields)
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
  async runChapter(
    input: PipelineInput,
    signal?: AbortSignal,
    onProgress?: (stage: PipelineStage) => void,
  ): Promise<ChapterResult> {
    const bookId = this.ctx.bookId ?? "default";
    /** Emit a progress event (no-op when no callback is supplied). */
    const p = (stage: PipelineStage): void => {
      try {
        onProgress?.(stage);
      } catch {
        // Progress callback failures must never break the pipeline.
      }
    };

    // Book-level async mutex: serialize concurrent runs on the same book
    // across all StoryOrchestrator instances in this process. acquireBookLock
    // resolves once any previous holder has released and returns a release
    // function that must be called to unblock the next waiter.
    const releaseLock = await acquireBookLock(bookId);

    try {
      // Step 1: Architecture (optional)
      let architecture: ArchitectOutput | undefined;
      if (input.architectInput) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        p("architect");
        architecture = await this.architect.generate(input.architectInput, { signal });
      }

      // Step 2: Conductor (optional) — prepares filtered context for the Scribe
      let conductedContext: ConductedContext | undefined;
      let writerInput = input.writerInput;

      // Inject InsightForge patterns from the previous chapter into the planner
      // input so the conductor can account for unresolved foreshadows, recurring
      // characters, conflict escalation, etc. Appended to storyState as context.
      let conductorInput = input.conductorInput;
      if (conductorInput && input.previousInsights && input.previousInsights.length > 0) {
        const insightsBlock = input.previousInsights
          .map(i => `  - [${i.type}] ${i.description}${i.severity === "critical" ? " (高优先级)" : ""}`)
          .join("\n");
        conductorInput = {
          ...conductorInput,
          storyState: conductorInput.storyState +
            `\n\n## 叙事模式洞察（来自前文分析）\n${insightsBlock}`,
        };
      }

      if (conductorInput) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        p("conductor");
        conductedContext = await this.conductor.plan(conductorInput, { signal });
        // Override writerInput fields with conductor output (non-empty values take precedence)
        writerInput = {
          ...writerInput,
          storyBible: conductedContext.storyBible || writerInput.storyBible,
          currentState: conductedContext.currentState || writerInput.currentState,
          activeHooks: conductedContext.activeHooks || writerInput.activeHooks,
          chapterOutline: conductedContext.chapterOutline || writerInput.chapterOutline,
        };
      }

      // Step 2.5: Narrative pre-write context assembly (optional)
      // When a NarrativeEngine is provided, gather story facts, character
      // inner voices, timeline context, and pacing recommendations into a
      // single narrativeContext string injected into the writer input.
      if (input.narrativeEngine) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        p("narrative-pre");
        try {
          // Determine main characters: explicit list, or extract from
          // existing asset catalog. Uses character NAME (not ID) because
          // NarrativeEngine's SceneClassifier and BondTracker extract
          // participant names from chapter text, and all subsystems
          // (mood, bonds, epiphany, motive) must share the same key space.
          const chars = input.mainCharacters
            ?? (input.existingAssetCatalog?.characters.map(c => c.name).filter(Boolean) ?? []);

          const preWrite = await input.narrativeEngine.assemblePreWriteContext({
            chapterIndex: writerInput.chapter,
            chapterOutline: writerInput.chapterOutline,
            mainCharacters: chars,
          });
          // Inject the assembled narrative context into writerInput.
          writerInput = {
            ...writerInput,
            narrativeContext: preWrite.narrativeContext,
          };
        } catch (err) {
          // Narrative engine failures must never block the writing pipeline.
          console.warn(`[runner] Narrative pre-write assembly failed — ${toErrorMessage(err)}. Continuing without narrative context.`);
        }
      }

      // Step 2.6: RAG / Lorebook / StyleGuide injection (optional)
      // These modules were previously only called by the server layer (create.ts)
      // but NOT by the core StoryOrchestrator, causing CLI and pipeline.ts paths
      // to miss vector retrieval, lorebook triggers, and style cloning. This step
      // bridges that gap by populating writerInput fields from the modules.
      {
        // Style profile passthrough
        if (input.styleProfile && !writerInput.styleProfile) {
          writerInput = { ...writerInput, styleProfile: input.styleProfile };
        }

        // Asset roster injection — bridge the CLI/Server gap (same as
        // Step 2.6's purpose for RAG/lorebook/style). The server layer
        // (create.ts) builds this from the catalog and passes it to
        // writer.generate() directly, but the CLI path goes through
        // runChapter() which must do the same.
        if (input.existingAssetCatalog && !writerInput.assetRoster) {
          const roster = buildAssetRosterText(input.existingAssetCatalog);
          if (roster) {
            writerInput = { ...writerInput, assetRoster: roster };
          }
        }

        // RAG vector retrieval — query relevant excerpts from earlier chapters
        if (input.ragRetriever && input.projectId && !writerInput.vectorContext) {
          try {
            const query = writerInput.chapterOutline || writerInput.storyBible.slice(0, 500) || "";
            if (query) {
              const ragResult = await input.ragRetriever.retrieve({
                query,
                scope: "project",
                scopeId: input.projectId,
                topK: 3,
                minScore: 0.3,
              });
              if (ragResult.results.length > 0) {
                const vectorContext = ragResult.results
                  .map(r => `[第${r.document.metadata?.chapter ?? "未知"}章] ${r.document.content}`)
                  .join("\n---\n");
                writerInput = { ...writerInput, vectorContext };
              }
            }
          } catch (err) {
            console.warn(`[runner] RAG retrieval failed — ${toErrorMessage(err)}. Continuing without vector context.`);
          }
        }

        // Lorebook keyword-triggered world-building injection
        if (input.loreEngine && input.lorebookEntries && input.lorebookEntries.length > 0 && !writerInput.lorebook) {
          try {
            // Scan story bible + chapter outline for keyword-triggered entries
            // (matching the documented behavior in PipelineInput.loreEngine).
            const loreHaystack = [writerInput.storyBible, writerInput.chapterOutline]
              .filter(Boolean).join("\n");
            const loreResult = input.loreEngine.scan({
              entries: input.lorebookEntries,
              messages: [loreHaystack],
              // Note: LoreEngine.scan() uses the engine's constructor config,
              // not this field. This config is required by ScanInput type but
              // has no runtime effect — the engine ignores it.
              config: { recursionEnabled: false, maxRecursionSteps: 0, scanDepth: 2, recursionDepth: 0, budgetPercentage: 25, budgetCap: 0, minActivations: 0, sortFn: "order" },
              maxContextTokens: 2000,
            });
            if (loreResult.activatedEntries.length > 0) {
              const lorebook = loreResult.activatedEntries
                .map(e => `### ${e.comment || e.key.join(", ")}\n${e.content}`)
                .join("\n\n");
              writerInput = { ...writerInput, lorebook };
            }
          } catch (err) {
            console.warn(`[runner] Lorebook scan failed — ${toErrorMessage(err)}. Continuing without lorebook context.`);
          }
        }
      }

      // Step 3: Writer — produces narrative only (no state delta)
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      p("writer");
      const writerOutput = await this.writer.generate(writerInput, { signal });
      let narrative = writerOutput.narrative;
      const skeleton = writerOutput.skeleton;

      // Step 3.5: Anti-AI cleanup — mechanical humanize + genre rule enforcement
      // Catches AI fatigue words, meta-commentary leakage, English words in Chinese,
      // chapter-end markers, etc. Runs BEFORE Auditor so consistency checks see clean text.
      let pendingStyleIssues: import("../humanize/types.js").StyleIssue[] = [];
      try {
        // Detect once, reuse the report for both rewriting and residual checking.
        // Previously humanizeText() was called without the report, causing a redundant
        // second detectStyle() pass internally.
        const { detectStyle } = await getDetectStyle();
        const styleReport = detectStyle(narrative);

        const hz = humanizeText(narrative, styleReport);
        if (hz.fixedCount > 0) {
          narrative = hz.text;
          console.log(`[runner] humanize: auto-fixed ${hz.fixedCount} AI-style issues`);
        }

        // Collect issues that mechanical rewriting did NOT fix.
        // Use the rewriter's own `remaining` list (authoritative) instead of
        // fragile `narrative.includes(issue.match)` exact-string matching,
        // which fails when humanizeText partially modifies the matched text.
        // Only retain them when the Sentinel will consume them; when audit is
        // off, log the count so the information is not silently discarded.
        if (input.auditMode !== "off") {
          pendingStyleIssues = [...hz.remaining];
        } else if (hz.remaining.length > 0) {
          console.log(
            `[runner] humanize: ${hz.remaining.length} residual AI-style issues skipped (audit off)`,
          );
        }

        // Run genre rule checks and auto-remove hard-error violations (meta-commentary).
        // Instead of blindly regex-deleting the matched text (which can leave
        // broken sentences), replace the violation with an empty string but
        // then run a smarter cleanup pass that removes orphaned punctuation
        // and collapsed whitespace.
        if (input.storyContext?.genre) {
          const violations = runGenreRuleChecks({
            text: narrative,
            genre: input.storyContext.genre,
            context: { storyBible: writerInput.storyBible },
          });
          const errorV = violations.filter(v => v.severity === "error");
          if (errorV.length > 0) {
            for (const v of errorV) {
              if (v.location && v.location.length >= 4 && v.location.length < 50) {
                // Replace violation with empty string, then clean surrounding artifacts.
                narrative = narrative.replaceAll(v.location, "");
              }
            }
            // Smart cleanup: remove orphaned punctuation, collapsed whitespace,
            // and broken sentence fragments left by violation removal.
            narrative = narrative
              .replace(/，{2,}/g, "，")
              .replace(/([。！？])，/g, "$1")
              .replace(/(^|\n)，/g, "$1")
              .replace(/，([。！？])/g, "$1")
              .replace(/[，、]\s*([。！？])/g, "$1")   // trailing comma before period
              .replace(/\s+([。！？，、])/g, "$1")       // space before punctuation
              .replace(/([。！？])\s+([^\n])/g, "$1\n$2") // period followed by text → newline
              .replace(/\n{3,}/g, "\n\n")
              .replace(/^\s+|\s+$/gm, "")               // trim each line
              .trim();
            console.log(`[runner] genre-rules: removed ${errorV.length} hard-error violations`);
          }
        }
      } catch (hzErr) {
        console.warn(`[runner] humanize/genre-check failed: ${toErrorMessage(hzErr)}. Continuing with original text.`);
      }

      // Step 4: Audit (if not off and story context provided)
      let auditIssues: SentinelIssue[] | undefined;
      let revisedNarrative: string | undefined;
      let revisedParagraphs: PolishedParagraph[] | undefined;

      if (input.auditMode !== "off" && input.storyContext) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        p("auditor");
        const auditInput: SentinelInput = {
          storyBible: input.storyContext.storyBible,
          currentState: input.storyContext.currentState,
          activeHooks: input.storyContext.activeHooks,
          chapterSummaries: input.storyContext.chapterSummaries,
          chapterContent: narrative,
          genre: input.storyContext.genre,
          chapter: writerInput.chapter,
          assetCatalog: input.existingAssetCatalog,
        };

        auditIssues = (await this.auditor.audit(auditInput, { signal })).issues;

        // Step 5: Auto-revise if there are errors OR pending style issues.
        // Wrap in try/catch so a reviser failure does not discard the
        // entire chapter — the original narrative is preserved.
        // Convert pending humanize style issues to SentinelIssue format for Polisher.
        // Use the same severity mapping as the auditor for consistency.
        const HUMANIZE_SEVERITY_MAP = { high: "error", medium: "warning", low: "info" } as const;
        const styleSentinelIssues: SentinelIssue[] = pendingStyleIssues.slice(0, 15).map((issue) => ({
          severity: HUMANIZE_SEVERITY_MAP[issue.severity] ?? "warning",
          scope: "paragraph" as const,
          dimension: "AI语癖",
          message: `AI腔"${issue.match}"需要改写：${issue.suggestion}` +
            (issue.context ? `（上下文：…${issue.context}…）` : ""),
          location: issue.match,
          repairScope: "local" as const,
        }));
        // Filter out AI语癖 issues from auditIssues to avoid sending
        // duplicate style issues to the Polisher (the auditor also runs
        // detectStyle on the humanized text, which may re-detect issues
        // already captured in styleSentinelIssues).
        const nonStyleSentinelIssues = auditIssues.filter(
          (issue) => issue.dimension !== "AI语癖",
        );
        const hasErrors = nonStyleSentinelIssues.some((issue) => issue.severity === "error");
        if (
          input.auditMode === "auto" &&
          (hasErrors || styleSentinelIssues.length > 0)
        ) {
          if (signal?.aborted) throw new DOMException("aborted", "AbortError");
          p("reviser");
          try {
            const reviseResult = await this.reviser.revise(
              {
                chapterContent: narrative,
                auditIssues: [...nonStyleSentinelIssues, ...styleSentinelIssues],
              },
              { signal },
            );
            revisedNarrative = reviseResult.revisedContent;
            revisedParagraphs = reviseResult.revisedParagraphs;
          } catch (err) {
            console.warn(
              `[runner] Reviser failed — ${toErrorMessage(err)}. ` +
              `Keeping original narrative without revision.`,
            );
            revisedNarrative = undefined;
          }
        }
      }

      // Step 6: ChapterAnalyzer — unified LLM call that extracts BOTH the
      // story state delta (for Truth Files) AND story facts (for FactVault)
      // in a single response. This replaces the former separate Consolidator
      // + FactExtractor pattern, saving one LLM call per chapter.
      const finalContent = revisedNarrative ?? narrative;
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      p("consolidator");

      // Strip chapter summaries from the state passed to ChapterAnalyzer.
      // The analyzer only needs current state fields + hooks to compute the
      // delta — the full chapter history (summaries table) is wasted tokens.
      // FactVault handles cross-chapter memory via trigger/FTS/link retrieval.
      const analyzerState = stripChapterSummaries(writerInput.currentState);

      // Prepare existing facts summary for dedup awareness.
      // Wrapped in try/catch to match create-helpers.ts — a vault DB error
      // (lock, corruption, closed) should not crash the entire chapter.
      let existingFactsSummary = "";
      if (input.narrativeEngine) {
        try {
          existingFactsSummary = input.narrativeEngine.vault.getActive()
            .slice(0, 30)
            .map(f => `- ${f.label}: ${f.content}`)
            .join("\n");
        } catch {
          // Vault read failure is non-fatal — analyze without dedup hints.
        }
      }

      const analysisResult = await this.chapterAnalyzer.analyze(
        {
          chapterContent: finalContent,
          chapter: writerInput.chapter,
          storyBible: writerInput.storyBible,
          currentState: analyzerState,
          activeHooks: writerInput.activeHooks,
          existingFactsSummary,
        },
        { signal },
      );
      const delta = analysisResult.delta;
      const degraded = analysisResult.deltaDegraded;

      // Step 7: AssetExtractor — extract characters/scenes/props from the
      // finalized chapter content. This runs in all modes so assets are
      // captured even in draft mode.
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      p("asset-extractor");
      const assetResult = await this.assetExtractor.extract(
        {
          chapterContent: finalContent,
          chapter: writerInput.chapter,
          existingCatalog: input.existingAssetCatalog,
        },
        { signal },
      );

      // Merge degraded flags: the chapter is degraded if any LLM-based
      // extraction (delta, facts, or assets) failed to parse.
      const chapterDegraded = degraded || analysisResult.factsDegraded || assetResult.degraded;

      // Step 8: Narrative post-write analysis (optional, zero-LLM)
      // When a NarrativeEngine is provided, run the deterministic analysis
      // (scene classification, mood/bond/epiphany updates, pace, timeline)
      // and ingest the facts extracted by ChapterAnalyzer into the FactVault.
      let narrativeAnalysis: import("./narrative-engine.js").PostWriteResult | undefined;
      if (input.narrativeEngine) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        p("narrative-post");
        try {
          // Uses character NAME (not ID) — same key space as pre-write path
          // and NarrativeEngine subsystems (SceneClassifier, BondTracker, etc.).
          // Source: freshly-extracted catalog (post-extraction), unlike
          // pre-write which uses the pre-existing catalog.
          const chars = input.mainCharacters
            ?? (assetResult.catalog.characters?.map(c => c.name).filter(Boolean) ?? []);

          // Run the post-write analysis. The engine ingests facts extracted
          // by ChapterAnalyzer (passed via preExtractedFacts) into the FactVault
          // WITHOUT another LLM call — avoiding the redundant double-extraction
          // that would occur if the engine ran its own FactExtractor here.
          narrativeAnalysis = await input.narrativeEngine.analyzePostWrite({
            chapterIndex: writerInput.chapter,
            narrative: finalContent,
            mainCharacters: chars,
            wordCount: finalContent.length,
            storyBible: writerInput.storyBible,
            preExtractedFacts: analysisResult.factsDegraded ? [] : analysisResult.facts,
            // The ChapterAnalyzer already ran fact extraction (even when it
            // returned zero facts or degraded), so the engine must NOT run
            // its own FactExtractor fallback — that would be a redundant LLM call.
            preExtractedFactsProvided: true,
          });
        } catch (err) {
          console.warn(`[runner] Narrative post-write analysis failed — ${toErrorMessage(err)}. Continuing without analysis.`);
        }
      }

      return {
        architecture,
        conductedContext,
        narrative,
        skeleton,
        delta,
        degraded: chapterDegraded,
        auditIssues,
        revisedNarrative,
        revisedParagraphs,
        assetCatalog: assetResult.catalog,
        narrativeAnalysis,
      };
    } finally {
      releaseLock();
    }
  }
}
