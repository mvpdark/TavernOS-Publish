// packages/core/src/state/reducer.ts
//
// Story state reduction engine — transforms a StoryStateSnapshot by applying a
// StoryStateDelta through a sequence of named reduction steps. Each step
// operates on a ReductionWorkspace, making data flow explicit and every step
// independently testable.
//
// Reduction steps (executed in order via a step registry):
//   1. prepareReduction     — parse & normalize all inputs through Zod schemas
//   2. enforceChapterProgress — enforce monotonic chapter progression
//   3. applyThreadOps       — apply thread upsert / resolve / defer operations
//   4. patchCurrentState    — apply currentStatePatch as temporal facts
//   5. storeChapterDigest   — record chapter summary
//   6. finalizeSnapshot     — assemble next snapshot & run post-validation
//
// The pipeline uses a named-step registry iterated with a for...of loop rather
// than a functional reduce, so each step carries a descriptive identifier and
// the execution order is driven by the registry declaration.
import { StoryStateDeltaSchema, PlotThreadSchema, PlotThreadsStateSchema, CurrentStateStateSchema, ChapterSummariesStateSchema, StateManifestSchema, } from "../models/story-state.js";
import { validateStoryState } from "./validator.js";
// --- Bilingual alias map for currentState patch fields ---
const STATE_FIELD_ALIASES = {
    currentLocation: ["Current Location", "当前位置"],
    protagonistState: ["Protagonist State", "主角状态"],
    currentGoal: ["Current Goal", "当前目标"],
    currentConstraint: ["Current Constraint", "当前约束"],
    currentAlliances: ["Current Alliances", "当前联盟"],
    currentConflict: ["Current Conflict", "当前冲突"],
};
// --- Pure text utilities ---
/** Return the non-empty string with greater length, preferring the fallback
 *  when it carries more content than the primary. */
function chooseRicherText(primary, fallback) {
    const p = primary.trim();
    const f = fallback.trim();
    if (!p)
        return f;
    if (!f)
        return p;
    return f.length > p.length ? f : p;
}
/** Derive the resulting thread status by considering both old and new values. */
function combineThreadStatus(prev, next, advanced) {
    if (prev === "resolved" || next === "resolved")
        return "resolved";
    // Allow recovery from deferred: when the existing thread is deferred and
    // the incoming status is open or progressing, the thread resumes.
    // deferred + deferred still returns deferred (falls through below).
    if (prev === "deferred" && (next === "open" || next === "progressing")) {
        return next;
    }
    if (advanced || prev === "progressing" || next === "progressing")
        return "progressing";
    return prev;
}
/** Merge two PlotThread records into one, preferring richer text fields. */
function mergeThreadFields(prev, incoming, chapter) {
    const advancedChapter = Math.max(prev.lastAdvancedChapter, incoming.lastAdvancedChapter, chapter);
    const didAdvance = advancedChapter > prev.lastAdvancedChapter;
    return {
        ...prev,
        startChapter: Math.min(prev.startChapter, incoming.startChapter),
        type: chooseRicherText(prev.type, incoming.type),
        status: combineThreadStatus(prev.status, incoming.status, didAdvance),
        lastAdvancedChapter: advancedChapter,
        expectedPayoff: chooseRicherText(prev.expectedPayoff, incoming.expectedPayoff),
        payoffTiming: incoming.payoffTiming ?? prev.payoffTiming,
        notes: chooseRicherText(prev.notes, incoming.notes),
    };
}
// --- Reduction steps ---
/** Step 1: Prepare — parse and normalize all inputs through Zod schemas. */
function prepareReduction(input) {
    const snapshot = {
        manifest: StateManifestSchema.parse(input.snapshot.manifest),
        currentState: CurrentStateStateSchema.parse(input.snapshot.currentState),
        hooks: PlotThreadsStateSchema.parse(input.snapshot.hooks),
        chapterSummaries: ChapterSummariesStateSchema.parse(input.snapshot.chapterSummaries),
    };
    const delta = StoryStateDeltaSchema.parse(input.delta);
    return {
        snapshot,
        delta,
        allowReapply: input.allowReapply ?? false,
        threads: [],
        facts: [],
        summaries: [],
    };
}
/** Step 2: Enforce chapter progression — reject backward chapter deltas. */
function enforceChapterProgress(ws) {
    const lastChapter = ws.snapshot.manifest.lastAppliedChapter;
    // When allowReapply is set (chapter rewrite), skip the backwards check
    // entirely so rewritten earlier chapters can update state.
    if (!ws.allowReapply) {
        const goesBackwards = ws.delta.chapter <= lastChapter;
        if (goesBackwards) {
            throw new Error(`delta chapter ${ws.delta.chapter} goes backwards (last applied: ${lastChapter})`);
        }
    }
    return ws;
}
/** Step 3: Apply thread operations — upsert, resolve, and defer plot threads. */
function applyThreadOps(ws) {
    const threadLookup = new Map();
    for (const t of ws.snapshot.hooks.hooks) {
        threadLookup.set(t.hookId, { ...t });
    }
    // Upsert: merge or insert
    for (const candidate of ws.delta.hookOps.upsert) {
        const validated = PlotThreadSchema.parse(candidate);
        const existing = threadLookup.get(validated.hookId);
        if (existing) {
            threadLookup.set(validated.hookId, mergeThreadFields(existing, validated, ws.delta.chapter));
        }
        else {
            threadLookup.set(validated.hookId, {
                ...validated,
                lastAdvancedChapter: Math.max(validated.lastAdvancedChapter, ws.delta.chapter),
            });
        }
    }
    // Resolve: mark as resolved (gracefully skip missing)
    for (const threadId of ws.delta.hookOps.resolve) {
        const existing = threadLookup.get(threadId);
        if (existing) {
            threadLookup.set(threadId, {
                ...existing,
                status: "resolved",
                lastAdvancedChapter: Math.max(existing.lastAdvancedChapter, ws.delta.chapter),
            });
        }
    }
    // Defer: mark as deferred (gracefully skip missing).
    // Skip threads that are already resolved — deferring a resolved thread
    // would incorrectly overwrite its terminal status.
    for (const threadId of ws.delta.hookOps.defer) {
        const existing = threadLookup.get(threadId);
        if (existing && existing.status !== "resolved") {
            threadLookup.set(threadId, {
                ...existing,
                status: "deferred",
                lastAdvancedChapter: Math.max(existing.lastAdvancedChapter, ws.delta.chapter),
            });
        }
    }
    // Mention: mark thread as progressing (gracefully skip missing)
    // Mention means the hook was referenced/advanced in this chapter
    for (const threadId of ws.delta.hookOps.mention) {
        const existing = threadLookup.get(threadId);
        if (existing && existing.status !== "resolved") {
            threadLookup.set(threadId, {
                ...existing,
                status: "progressing",
                lastAdvancedChapter: Math.max(existing.lastAdvancedChapter, ws.delta.chapter),
                advancedCount: (existing.advancedCount ?? 0) + 1,
            });
        }
    }
    const threads = Array.from(threadLookup.values()).sort((a, b) => a.startChapter - b.startChapter
        || a.lastAdvancedChapter - b.lastAdvancedChapter
        || a.hookId.localeCompare(b.hookId));
    return { ...ws, threads };
}
/** Step 4: Patch current state — apply currentStatePatch as temporal facts. */
function patchCurrentState(ws) {
    const facts = [...ws.snapshot.currentState.facts];
    if (ws.delta.currentStatePatch) {
        for (const [field, value] of Object.entries(ws.delta.currentStatePatch)) {
            // Skip undefined (field not present in the patch). An empty string is
            // intentional: it clears the field by evicting stale facts without
            // injecting a replacement.
            if (value === undefined)
                continue;
            const aliases = STATE_FIELD_ALIASES[field] ?? [field];
            // Evict stale facts matching any alias
            for (let i = facts.length - 1; i >= 0; i--) {
                if (aliases.some((alias) => facts[i].predicate.toLowerCase() === alias.toLowerCase())) {
                    facts.splice(i, 1);
                }
            }
            // Inject fresh fact only when value is non-empty (empty string clears)
            if (value) {
                facts.push({
                    subject: "protagonist",
                    predicate: aliases[0],
                    object: value,
                    validFromChapter: ws.delta.chapter,
                    validUntilChapter: null,
                    sourceChapter: ws.delta.chapter,
                });
            }
        }
    }
    facts.sort((a, b) => a.predicate.localeCompare(b.predicate) || a.object.localeCompare(b.object));
    return { ...ws, facts };
}
/** Step 5: Store chapter digest — record the chapter summary row. */
function storeChapterDigest(ws) {
    let summaries = [...ws.snapshot.chapterSummaries.rows];
    if (ws.delta.chapterSummary) {
        if (ws.delta.chapterSummary.chapter !== ws.delta.chapter) {
            throw new Error(`chapterSummary.chapter (${ws.delta.chapterSummary.chapter}) does not match delta.chapter (${ws.delta.chapter})`);
        }
        if (ws.allowReapply) {
            summaries = summaries.filter((r) => r.chapter !== ws.delta.chapter);
        }
        if (summaries.some((r) => r.chapter === ws.delta.chapter)) {
            throw new Error(`duplicate chapter summary for chapter ${ws.delta.chapter}`);
        }
        summaries.push(ws.delta.chapterSummary);
        summaries.sort((a, b) => a.chapter - b.chapter);
    }
    return { ...ws, summaries };
}
/** Step 6: Finalize — assemble the next snapshot and run post-validation. */
function finalizeSnapshot(ws) {
    const next = {
        manifest: { ...ws.snapshot.manifest, lastAppliedChapter: ws.delta.chapter },
        currentState: { chapter: ws.delta.chapter, facts: ws.facts },
        hooks: { hooks: ws.threads },
        chapterSummaries: { rows: ws.summaries },
    };
    const issues = validateStoryState({
        manifest: next.manifest,
        currentState: next.currentState,
        hooks: next.hooks,
        chapterSummaries: next.chapterSummaries,
    });
    if (issues.length > 0) {
        throw new Error(`Post-apply validation failed: ${issues.map((i) => i.message).join("; ")}`);
    }
    return next;
}
// --- Named step registry (execution order driven by this declaration) ---
const REDUCTION_STEPS = [
    { label: "enforce-chapter-progress", execute: enforceChapterProgress },
    { label: "apply-thread-ops", execute: applyThreadOps },
    { label: "patch-current-state", execute: patchCurrentState },
    { label: "store-chapter-digest", execute: storeChapterDigest },
];
// --- Internal pipeline runner (for...of loop, not reduce) ---
function runReductionSteps(ws) {
    let current = ws;
    for (const step of REDUCTION_STEPS) {
        current = step.execute(current);
    }
    return current;
}
// --- Public API ---
/**
 * Apply a StoryStateDelta to a StoryStateSnapshot through the reduction
 * pipeline. The delta is processed step-by-step: inputs are normalized, chapter
 * order is enforced, threads are reconciled, facts are patched, the summary is
 * stored, and the result is validated and finalized.
 */
export function applyStoryStateDelta(params) {
    const workspace = prepareReduction(params);
    const processed = runReductionSteps(workspace);
    return finalizeSnapshot(processed);
}
//# sourceMappingURL=reducer.js.map