// packages/core/src/pipeline/injection-policy.ts
// InjectionPolicy — context injection strategy arbitrator.
//
// Decides how to allocate a character budget across the various context
// sources that feed into the LLM prompt for chapter generation. Each source
// (pinned facts, inner voice, retrieved context, timeline, pace) is given a
// fixed percentage of the total budget. Sections that exceed their allocation
// are truncated at the character level.
//
// The assembled prompt uses Chinese section markers so the LLM can clearly
// distinguish each block:
//   【核心设定】 — pinned (core) facts
//   【角色心声】 — inner voice
//   【相关记忆】 — retrieved context block
//   【时间线】   — timeline context
//   【节奏建议】 — pace recommendation
//
// Design principles:
//   • Pure function over InjectionContext — no side effects, no I/O.
//   • Budget allocation is configurable via constants.
//   • Truncation is character-level (not token-level) for simplicity and
//     determinism. The full budget is distributed across sections (no reserved
//     buffer); any small character-vs-token gap is absorbed by the LLM.
//   • Every section reports whether it was truncated and its original length.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
/** Input context from various pipeline stages. */
export const InjectionContextSchema = z.object({
    pinnedFactsBlock: z.string(), // from ContextFetcher
    innerVoiceBlock: z.string(), // from InnerVoice
    contextBlock: z.string(), // from ContextFetcher
    timelineBlock: z.string(), // from TimelineSense
    paceRecommendation: z.string(), // from PaceDirector
    totalBudget: z.number().int().min(0), // total character budget
});
/** The fully assembled prompt with metadata. */
export const AssembledPromptSchema = z.object({
    prompt: z.string(),
    sections: z.array(z.object({
        name: z.string(),
        content: z.string(),
        originalLength: z.number().int().min(0),
        truncated: z.boolean(),
    })),
    truncated: z.boolean(),
    totalChars: z.number().int().min(0),
});
// ---------------------------------------------------------------------------
// Budget allocation constants (percentages of totalBudget)
// ---------------------------------------------------------------------------
/** Pinned (core) facts get 35% of the total budget (was 30%, absorbed reserved). */
const BUDGET_PINNED = 0.35;
/** Inner voice gets 10% of the total budget. */
const BUDGET_INNER_VOICE = 0.10;
/** Retrieved context block gets 38% of the total budget (was 35%, absorbed reserved). */
const BUDGET_CONTEXT = 0.38;
/** Timeline context gets 10% of the total budget. */
const BUDGET_TIMELINE = 0.10;
/** Pace recommendation gets 7% of the total budget (was 5%, absorbed reserved). */
const BUDGET_PACE = 0.07;
// Sanity check: all allocations must sum to 1.0.
// Previously 10% was "reserved" but never used — now fully distributed
// to the sections that need it most (pinned facts, context, pace).
const _ALLOC_SUM = BUDGET_PINNED +
    BUDGET_INNER_VOICE +
    BUDGET_CONTEXT +
    BUDGET_TIMELINE +
    BUDGET_PACE;
if (Math.abs(_ALLOC_SUM - 1.0) > 0.0001) {
    throw new Error(`InjectionPolicy budget allocation must sum to 1.0, got ${_ALLOC_SUM}`);
}
// ---------------------------------------------------------------------------
// Section markers (Chinese)
// ---------------------------------------------------------------------------
const MARKER_PINNED = "【核心设定】";
const MARKER_INNER_VOICE = "【角色心声】";
const MARKER_CONTEXT = "【相关记忆】";
const MARKER_TIMELINE = "【时间线】";
const MARKER_PACE = "【节奏建议】";
// ---------------------------------------------------------------------------
// InjectionPolicy
// ---------------------------------------------------------------------------
export class InjectionPolicy {
    /**
     * Assemble the final LLM prompt from the injection context.
     *
     * Allocates the character budget across sections according to the fixed
     * percentages, truncates each section to fit, and concatenates them with
     * Chinese section markers.
     *
     * @param context the injection context from various pipeline stages.
     * @returns the assembled prompt with per-section metadata.
     */
    assemble(context) {
        // Validate the input at runtime.
        const ctx = InjectionContextSchema.parse(context);
        const total = ctx.totalBudget;
        // Compute per-section budgets (character-level).
        const pinnedBudget = Math.floor(total * BUDGET_PINNED);
        const innerVoiceBudget = Math.floor(total * BUDGET_INNER_VOICE);
        const contextBudget = Math.floor(total * BUDGET_CONTEXT);
        const timelineBudget = Math.floor(total * BUDGET_TIMELINE);
        const paceBudget = Math.floor(total * BUDGET_PACE);
        // Truncate each section to its budget.
        const pinnedSection = this.truncateSection(MARKER_PINNED, ctx.pinnedFactsBlock, pinnedBudget);
        const innerVoiceSection = this.truncateSection(MARKER_INNER_VOICE, ctx.innerVoiceBlock, innerVoiceBudget);
        const contextSection = this.truncateSection(MARKER_CONTEXT, ctx.contextBlock, contextBudget);
        const timelineSection = this.truncateSection(MARKER_TIMELINE, ctx.timelineBlock, timelineBudget);
        const paceSection = this.truncateSection(MARKER_PACE, ctx.paceRecommendation, paceBudget);
        const sections = [
            pinnedSection,
            innerVoiceSection,
            contextSection,
            timelineSection,
            paceSection,
        ];
        // Assemble the final prompt string. Each section is prefixed with its
        // marker and separated by double newlines. Empty sections (no content
        // after truncation) are omitted entirely to avoid cluttering the prompt.
        const parts = [];
        for (const section of sections) {
            if (section.content.length === 0)
                continue;
            parts.push(`${section.name}\n${section.content}`);
        }
        const prompt = parts.join("\n\n");
        const truncated = sections.some((s) => s.truncated);
        const totalChars = prompt.length;
        return {
            prompt,
            sections,
            truncated,
            totalChars,
        };
    }
    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------
    /**
     * Truncate a section's content to fit within its character budget.
     *
     * If the content exceeds the budget, it is cut at the budget boundary and
     * an ellipsis ("…") is appended (if there is room for it) to signal
     * truncation to the LLM.
     *
     * @param name       the section name (marker).
     * @param content    the raw content string.
     * @param budget     the maximum number of characters allowed.
     * @returns a PromptSection with the (possibly truncated) content.
     */
    truncateSection(name, content, budget) {
        const originalLength = content.length;
        // If content fits within budget, no truncation needed.
        if (originalLength <= budget) {
            return {
                name,
                content,
                originalLength,
                truncated: false,
            };
        }
        // Budget is zero or negative — return empty.
        if (budget <= 0) {
            return {
                name,
                content: "",
                originalLength,
                truncated: originalLength > 0,
            };
        }
        // Truncate, leaving room for the ellipsis if possible.
        const ellipsis = "…";
        const cutPoint = budget >= ellipsis.length ? budget - ellipsis.length : budget;
        const truncatedContent = content.slice(0, cutPoint) + (budget >= ellipsis.length ? ellipsis : "");
        return {
            name,
            content: truncatedContent,
            originalLength,
            truncated: true,
        };
    }
}
//# sourceMappingURL=injection-policy.js.map