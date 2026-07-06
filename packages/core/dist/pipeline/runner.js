// packages/core/src/pipeline/runner.ts
import { toErrorMessage } from "../agents/base.js";
import { createOutlinePlanner } from "../agents/architect.js";
import { createNarrativeWriter } from "../agents/writer.js";
import { createConsistencyChecker } from "../agents/auditor.js";
import { createEditorAgent } from "../agents/reviser.js";
import { createChapterAnalyzer } from "../agents/chapter-analyzer.js";
import { createPlanner } from "../agents/planner.js";
import { createAssetExtractor } from "../agents/asset-extractor.js";
import { humanizeText } from "../humanize/index.js";
import { runGenreRuleChecks } from "../rules/index.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
export function stripChapterSummaries(projection) {
    if (!projection)
        return "";
    // Match either Chinese or English chapter summaries header.
    const idx = projection.search(/\n## (?:章节摘要|Chapter Summaries)/);
    if (idx < 0)
        return projection;
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
const bookLockChain = new Map();
/**
 * Acquire the book-level mutex. Returns a release function that must be
 * called to surrender the lock (typically in a `finally` block so the lock
 * is released even when the critical section throws).
 */
async function acquireBookLock(bookId) {
    // The current tail of the lock chain for this book (resolved if free).
    const previous = bookLockChain.get(bookId) ?? Promise.resolve();
    let release;
    // "hold" is resolved only when release() is called.
    const hold = new Promise((resolve) => {
        release = resolve;
    });
    // Append our hold to the chain BEFORE awaiting so later acquirers queue
    // behind us instead of racing past.
    bookLockChain.set(bookId, previous.then(() => hold));
    // Wait for the previous holder to release before entering the section.
    await previous;
    return release;
}
export class StoryOrchestrator {
    ctx;
    architect;
    planner;
    writer;
    auditor;
    reviser;
    chapterAnalyzer;
    assetExtractor;
    /**
     * @param ctx default agent context (client + model).
     * @param resolveContext optional resolver returning a per-agent context with
     *   its own client/model — enables multi-provider division of labor (e.g.
     *   Kimi for the writer skeleton, Claude for the flesh). When a resolver is
     *   supplied it takes precedence over modelOverrides for that agent.
     * @param modelOverrides legacy per-agent model overrides on the shared client
     *   (kept for backward compatibility with the CLI).
     */
    constructor(ctx, resolveContext, modelOverrides) {
        this.ctx = ctx;
        // Resolve an agent's context: prefer the new per-agent resolver (different
        // client/provider), then fall back to a legacy model-only override on the
        // shared client, then the default context.
        const resolve = (agentName) => {
            const perAgent = resolveContext?.(agentName);
            if (perAgent)
                return perAgent;
            const model = modelOverrides?.[agentName];
            return model ? { ...ctx, model } : ctx;
        };
        // Like resolve(), but returns undefined when the agent has no override
        // (neither a per-agent context nor a model override). Used for the optional
        // skeleton stage: undefined → single-stage writer.
        const resolveOptional = (agentName) => {
            const perAgent = resolveContext?.(agentName);
            if (perAgent)
                return perAgent;
            const model = modelOverrides?.[agentName];
            return model ? { ...ctx, model } : undefined;
        };
        // Agents are now produced by factory functions (compose pattern)
        // instead of `new XxxAgent(override(...))`.
        this.architect = createOutlinePlanner(resolve("architect"));
        this.planner = createPlanner(resolve("planner"));
        // Two-stage writer: the flesh stage uses the "writerFlesh" context (or
        // falls back to "writer"); the skeleton stage uses "writerSkeleton" when
        // configured (per-agent context or model override), otherwise the writer
        // runs single-stage.
        const fleshCtx = resolveOptional("writerFlesh") ?? resolve("writer");
        const skeletonCtx = resolveOptional("writerSkeleton");
        this.writer = createNarrativeWriter(fleshCtx, skeletonCtx);
        this.auditor = createConsistencyChecker(resolve("auditor"));
        this.reviser = createEditorAgent(resolve("reviser"));
        this.chapterAnalyzer = createChapterAnalyzer(resolve("consolidator"));
        this.assetExtractor = createAssetExtractor(resolve("asset-extractor"));
    }
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
    async runChapter(input, signal, onProgress) {
        const bookId = this.ctx.bookId ?? "default";
        /** Emit a progress event (no-op when no callback is supplied). */
        const p = (stage) => {
            try {
                onProgress?.(stage);
            }
            catch {
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
            let architecture;
            if (input.architectInput) {
                if (signal?.aborted)
                    throw new Error("aborted");
                p("architect");
                architecture = await this.architect.generate(input.architectInput, { signal });
            }
            // Step 2: Planner (optional) — prepares filtered context for the Writer
            let plannedContext;
            let writerInput = input.writerInput;
            // Inject InsightForge patterns from the previous chapter into the planner
            // input so the planner can account for unresolved foreshadows, recurring
            // characters, conflict escalation, etc. Appended to storyState as context.
            if (input.plannerInput && input.previousInsights && input.previousInsights.length > 0) {
                const insightsBlock = input.previousInsights
                    .map(i => `  - [${i.type}] ${i.description}${i.severity === "critical" ? " (高优先级)" : ""}`)
                    .join("\n");
                input.plannerInput = {
                    ...input.plannerInput,
                    storyState: input.plannerInput.storyState +
                        `\n\n## 叙事模式洞察（来自前文分析）\n${insightsBlock}`,
                };
            }
            if (input.plannerInput) {
                if (signal?.aborted)
                    throw new Error("aborted");
                p("planner");
                plannedContext = await this.planner.plan(input.plannerInput, { signal });
                // Override writerInput fields with planner output (non-empty values take precedence)
                writerInput = {
                    ...writerInput,
                    storyBible: plannedContext.storyBible || writerInput.storyBible,
                    currentState: plannedContext.currentState || writerInput.currentState,
                    activeHooks: plannedContext.activeHooks || writerInput.activeHooks,
                    chapterOutline: plannedContext.chapterOutline || writerInput.chapterOutline,
                };
            }
            // Step 2.5: Narrative pre-write context assembly (optional)
            // When a NarrativeEngine is provided, gather story facts, character
            // inner voices, timeline context, and pacing recommendations into a
            // single narrativeContext string injected into the writer input.
            if (input.narrativeEngine) {
                if (signal?.aborted)
                    throw new Error("aborted");
                p("narrative-pre");
                try {
                    // Determine main characters: explicit list, or extract from
                    // existing asset catalog, or fall back to empty (first chapter).
                    const chars = input.mainCharacters
                        ?? (input.existingAssetCatalog?.characters?.map(c => c.name).filter(Boolean) ?? []);
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
                }
                catch (err) {
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
                // RAG vector retrieval — query relevant excerpts from earlier chapters
                if (input.ragRetriever && input.projectId) {
                    try {
                        const query = writerInput.chapterOutline || writerInput.storyBible?.slice(0, 500) || "";
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
                                    .map(r => `[第${r.document.metadata?.chapter ?? "?"}章] ${r.document.content}`)
                                    .join("\n---\n");
                                writerInput = { ...writerInput, vectorContext };
                            }
                        }
                    }
                    catch (err) {
                        console.warn(`[runner] RAG retrieval failed — ${toErrorMessage(err)}. Continuing without vector context.`);
                    }
                }
                // Lorebook keyword-triggered world-building injection
                if (input.loreEngine && input.lorebookEntries && input.lorebookEntries.length > 0) {
                    try {
                        const loreResult = input.loreEngine.scan({
                            entries: input.lorebookEntries,
                            messages: [],
                            config: { recursionEnabled: false, maxRecursionSteps: 0, scanDepth: 2, recursionDepth: 1, budgetPercentage: 25, budgetCap: 0, minActivations: 0, sortFn: "order" },
                            maxContextTokens: 2000,
                        });
                        if (loreResult.activatedEntries.length > 0) {
                            const lorebook = loreResult.activatedEntries
                                .map(e => `### ${e.comment || e.key.join(", ")}\n${e.content}`)
                                .join("\n\n");
                            writerInput = { ...writerInput, lorebook };
                        }
                    }
                    catch (err) {
                        console.warn(`[runner] Lorebook scan failed — ${toErrorMessage(err)}. Continuing without lorebook context.`);
                    }
                }
            }
            // Step 3: Writer — produces narrative only (no state delta)
            if (signal?.aborted)
                throw new Error("aborted");
            p("writer");
            const writerOutput = await this.writer.generate(writerInput, { signal });
            let narrative = writerOutput.narrative;
            const skeleton = writerOutput.skeleton;
            // Step 3.5: Anti-AI cleanup — mechanical humanize + genre rule enforcement
            // Catches AI fatigue words, meta-commentary leakage, English words in Chinese,
            // chapter-end markers, etc. Runs BEFORE Auditor so consistency checks see clean text.
            let pendingStyleIssues = [];
            try {
                // Detect once, reuse the report for both rewriting and residual checking.
                // Previously humanizeText() was called without the report, causing a redundant
                // second detectStyle() pass internally.
                const { detectStyle } = await import("../humanize/index.js");
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
                // Only retain them when the Auditor will consume them; when audit is
                // off, log the count so the information is not silently discarded.
                if (input.auditMode !== "off") {
                    pendingStyleIssues = [...hz.remaining];
                }
                else if (hz.remaining.length > 0) {
                    console.log(`[runner] humanize: ${hz.remaining.length} residual AI-style issues skipped (audit off)`);
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
                            if (v.location && v.location.length < 50) {
                                const locEscaped = v.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                // Replace violation with empty string, then clean surrounding artifacts.
                                narrative = narrative.replace(new RegExp(locEscaped, "g"), "");
                            }
                        }
                        // Smart cleanup: remove orphaned punctuation, collapsed whitespace,
                        // and broken sentence fragments left by violation removal.
                        narrative = narrative
                            .replace(/，{2,}/g, "，")
                            .replace(/([。！？])，/g, "$1")
                            .replace(/(^|\n)，/g, "$1")
                            .replace(/，([。！？])/g, "$1")
                            .replace(/[，、]\s*([。！？])/g, "$1") // trailing comma before period
                            .replace(/\s+([。！？，、])/g, "$1") // space before punctuation
                            .replace(/([。！？])\s+([^\n])/g, "$1\n$2") // period followed by text → newline
                            .replace(/\n{3,}/g, "\n\n")
                            .replace(/^\s+|\s+$/gm, "") // trim each line
                            .trim();
                        console.log(`[runner] genre-rules: removed ${errorV.length} hard-error violations`);
                    }
                }
            }
            catch (hzErr) {
                console.warn(`[runner] humanize/genre-check failed: ${toErrorMessage(hzErr)}. Continuing with original text.`);
            }
            // Step 4: Audit (if not off and story context provided)
            let auditIssues;
            let revisedNarrative;
            let revisedParagraphs;
            if (input.auditMode !== "off" && input.storyContext) {
                if (signal?.aborted)
                    throw new Error("aborted");
                p("auditor");
                const auditInput = {
                    storyBible: input.storyContext.storyBible,
                    currentState: input.storyContext.currentState,
                    activeHooks: input.storyContext.activeHooks,
                    chapterSummaries: input.storyContext.chapterSummaries,
                    chapterContent: narrative,
                    genre: input.storyContext.genre,
                    chapter: writerInput.chapter,
                    assetCatalog: input.existingAssetCatalog,
                };
                auditIssues = await this.auditor.audit(auditInput, { signal });
                // Step 5: Auto-revise if there are errors OR pending style issues.
                // Wrap in try/catch so a reviser failure does not discard the
                // entire chapter — the original narrative is preserved.
                // Convert pending humanize style issues to AuditIssue format for Reviser
                const styleAuditIssues = pendingStyleIssues.slice(0, 15).map((issue) => ({
                    severity: issue.severity === "high" ? "error" : "warning",
                    scope: "paragraph",
                    dimension: "AI语癖",
                    message: `AI腔"${issue.match}"需要改写：${issue.suggestion}` +
                        (issue.context ? `（上下文：…${issue.context}…）` : ""),
                    location: issue.match,
                    repairScope: "local",
                }));
                const hasErrors = auditIssues.some((issue) => issue.severity === "error");
                if (input.auditMode === "auto" &&
                    (hasErrors || styleAuditIssues.length > 0)) {
                    if (signal?.aborted)
                        throw new Error("aborted");
                    p("reviser");
                    try {
                        const reviseResult = await this.reviser.revise({
                            chapterContent: narrative,
                            auditIssues: [...auditIssues, ...styleAuditIssues],
                        }, { signal });
                        revisedNarrative = reviseResult.revisedContent;
                        revisedParagraphs = reviseResult.revisedParagraphs;
                    }
                    catch (err) {
                        console.warn(`[runner] Reviser failed — ${toErrorMessage(err)}. ` +
                            `Keeping original narrative without revision.`);
                        revisedNarrative = undefined;
                    }
                }
            }
            // Step 6: ChapterAnalyzer — unified LLM call that extracts BOTH the
            // story state delta (for Truth Files) AND story facts (for FactVault)
            // in a single response. This replaces the former separate Consolidator
            // + FactExtractor pattern, saving one LLM call per chapter.
            const finalContent = revisedNarrative ?? narrative;
            if (signal?.aborted)
                throw new Error("aborted");
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
                }
                catch {
                    // Vault read failure is non-fatal — analyze without dedup hints.
                }
            }
            const analysisResult = await this.chapterAnalyzer.analyze({
                chapterContent: finalContent,
                chapter: writerInput.chapter,
                storyBible: writerInput.storyBible,
                currentState: analyzerState,
                activeHooks: writerInput.activeHooks,
                existingFactsSummary,
            }, { signal });
            const delta = analysisResult.delta;
            const degraded = analysisResult.deltaDegraded;
            // Step 7: AssetExtractor — extract characters/scenes/props from the
            // finalized chapter content. This runs in all modes so assets are
            // captured even in draft mode.
            if (signal?.aborted)
                throw new Error("aborted");
            p("asset-extractor");
            const assetResult = await this.assetExtractor.extract({
                chapterContent: finalContent,
                chapter: writerInput.chapter,
                existingCatalog: input.existingAssetCatalog,
            }, { signal });
            // Merge degraded flags: the chapter is degraded if any LLM-based
            // extraction (delta, facts, or assets) failed to parse.
            const chapterDegraded = degraded || analysisResult.factsDegraded || assetResult.degraded;
            // Step 8: Narrative post-write analysis (optional, zero-LLM)
            // When a NarrativeEngine is provided, run the deterministic analysis
            // (scene classification, mood/bond/epiphany updates, pace, timeline)
            // and ingest the facts extracted by ChapterAnalyzer into the FactVault.
            let narrativeAnalysis;
            if (input.narrativeEngine) {
                if (signal?.aborted)
                    throw new Error("aborted");
                p("narrative-post");
                try {
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
                }
                catch (err) {
                    console.warn(`[runner] Narrative post-write analysis failed — ${toErrorMessage(err)}. Continuing without analysis.`);
                }
            }
            return {
                architecture,
                plannedContext,
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
        }
        finally {
            releaseLock();
        }
    }
}
//# sourceMappingURL=runner.js.map