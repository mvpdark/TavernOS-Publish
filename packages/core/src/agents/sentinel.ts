// packages/core/src/agents/sentinel.ts
import { z } from "zod";
import type { LLMMessage } from "../llm/types.js";
import { loadPrompt } from "../prompts/loader.js";
import { createAgentRuntime, toErrorMessage, type AgentContext, type AgentChatOptions } from "./base.js";
import { parseAndValidateArray, extractPromptMessages } from "./json-utils.js";
import { detectStyle } from "../humanize/detector.js";
import type { StyleIssue, IssueSeverity } from "../humanize/types.js";
import { runGenreRuleChecks, type GenreRuleContext } from "../rules/index.js";
import { runRuleAudit } from "../audit/rule-auditor.js";
import type { AssetCatalog } from "../assets/types.js";

export interface SentinelInput {
  storyBible: string;
  currentState: string;
  activeHooks: string;
  chapterSummaries: string;
  chapterContent: string;
  /**
   * Genre string for genre-rule checking. When provided and genre rules
   * are enabled, the sentinel runs string-based genre rule checks after
   * the LLM audit. The genre is free-form (e.g. "玄幻", "都市异能").
   */
  genre?: string;
  /** 1-based chapter index for rule-based timeline checks. */
  chapter?: number;
  /** Asset catalog from prior chapters for rule-based character presence checks. */
  assetCatalog?: AssetCatalog;
}

export interface SentinelIssue {
  severity: "error" | "warning" | "info";
  scope: "global" | "chapter" | "paragraph";
  dimension: string;
  message: string;
  repairScope: "local" | "structural";
  location: string;
  /** Distinguishes the source of the issue. Rule-based issues use "rule";
   *  LLM-generated issues leave this undefined. */
  label?: string;
  /** Optional suggestion for fixing the issue (used by rule-based audit). */
  suggestion?: string;
}

/** Options for the Sentinel factory. */
export interface SentinelOptions {
  /** Enable AI-style (humanize) detection after LLM audit. Default: true. */
  enableHumanize?: boolean;
  /** Enable three-layer genre rule checks after LLM audit. Default: true.
   *  When enabled, the sentinel runs string-based genre rule checks
   *  (universal + genre-specific) on the chapter content. The genre is
   *  taken from SentinelInput.genre; when no genre is provided, only
   *  universal rules are checked. */
  enableGenreRules?: boolean;
  /** Enable pure rule-based audit (numeric contradictions, power scaling,
   *  timeline, character presence) after LLM audit. Default: true.
   *  This is a zero-LLM-cost detection layer that runs locally. */
  enableRuleAudit?: boolean;
}

/** Result of the consistency checker audit. */
export interface SentinelOutput {
  /** Audit issues found by the LLM + local rule/humanize checks. */
  issues: SentinelIssue[];
  /** Token usage from the LLM audit call (undefined when the LLM call fails). */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/** Consistency checker agent produced by the factory (compose pattern). */
export interface Sentinel {
  readonly name: string;
  audit(input: SentinelInput, options?: AgentChatOptions): Promise<SentinelOutput>;
}

// ---------------------------------------------------------------------------
// Humanize integration — convert StyleIssue to SentinelIssue
// ---------------------------------------------------------------------------

/** Map humanize IssueSeverity to SentinelIssue severity. */
const HUMANIZE_SEVERITY_MAP: Readonly<Record<IssueSeverity, "error" | "warning" | "info">> = {
  high: "error",
  medium: "warning",
  low: "info",
};

/**
 * Convert a StyleIssue (from the humanize detector) into an SentinelIssue
 * so it can be merged into the auditor's output and handled by the Polisher.
 *
 * Mapping rules:
 * - Severity: high → error, medium → warning, low → info
 * - Scope: fatigue terms → "paragraph" (specific word, locatable);
 *          cliche/pattern → "chapter" (structural, full-text revision)
 * - Dimension: always "AI语癖"
 * - repairScope: fatigue → "local" (replace/remove word);
 *                cliche → "structural" (restructure sentence)
 * - Location: fatigue → match text (for paragraph lookup);
 *             cliche → pattern label or match text
 */
export function styleIssueToSentinelIssue(issue: StyleIssue): SentinelIssue {
  const isFatigue = issue.category === "fatigue";
  return {
    severity: HUMANIZE_SEVERITY_MAP[issue.severity],
    scope: isFatigue ? "paragraph" : "chapter",
    dimension: "AI语癖",
    message: `AI语癖：${issue.match} — ${issue.suggestion}`,
    repairScope: isFatigue ? "local" : "structural",
    location: isFatigue ? issue.match : (issue.label ?? issue.match),
  };
}

const SentinelIssueSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  scope: z.enum(["global", "chapter", "paragraph"]),
  dimension: z.string().min(1),
  message: z.string().min(1),
  repairScope: z.enum(["local", "structural"]),
  location: z.string(),
  label: z.string().optional(),
  suggestion: z.string().optional(),
});

/**
 * Factory: build a Sentinel agent by composing a shared runtime.
 * Replaces the former `class Sentinel extends BaseAgent`.
 */
export function createSentinel(
  ctx: AgentContext,
  options?: SentinelOptions,
): Sentinel {
  const runtime = createAgentRuntime(ctx);
  const name = "sentinel";
  const enableHumanize = options?.enableHumanize ?? true;
  const enableGenreRules = options?.enableGenreRules ?? true;
  const enableRuleAudit = options?.enableRuleAudit ?? true;

  async function audit(input: SentinelInput, options?: AgentChatOptions): Promise<SentinelOutput> {
    const promptText = await loadPrompt("sentinel", {
      storyBible: input.storyBible,
      currentState: input.currentState,
      activeHooks: input.activeHooks,
      chapterSummaries: input.chapterSummaries,
      chapterContent: input.chapterContent,
    });

    const { system, user } = extractPromptMessages(promptText);
    const messages: LLMMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    let issues: SentinelIssue[] = [];
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
    try {
      const response = await runtime.chat(messages, options);
      issues = parseAndValidateArray(response.content, SentinelIssueSchema);
      usage = response.usage;
    } catch (err) {
      // LLM call failed — log a warning and add an info-level issue so
      // callers know the audit is incomplete. Continue with humanize
      // detection only (which runs locally and does not need the LLM).
      console.warn(
        `[sentinel] LLM audit call failed — ${toErrorMessage(err)}. ` +
        `Falling back to humanize detection only.`,
      );
      issues.push({
        severity: "info",
        scope: "chapter",
        dimension: "审计",
        message: "自动审计未完成（LLM 调用失败），仅完成基础检测",
        repairScope: "structural",
        location: "",
      });
    }

    // After LLM-based audit, run humanize (AI-style) detection on the
    // chapter content. Detected StyleIssues are converted to SentinelIssue
    // format and merged into the results. When auditMode="auto", the
    // Polisher will handle these alongside other issues.
    if (enableHumanize) {
      const styleReport = detectStyle(input.chapterContent);
      const humanizeIssues = styleReport.issues.map(styleIssueToSentinelIssue);
      issues.push(...humanizeIssues);
    }

    // After LLM-based audit, run three-layer genre rule checks (string-based,
    // NOT LLM calls). Violations are converted to SentinelIssue entries with
    // dimension "genre-rule" so the Polisher can handle them alongside
    // other issues. Checks are conservative — only clear violations are flagged.
    if (enableGenreRules) {
      const genreContext: GenreRuleContext = {
        storyBible: input.storyBible,
        currentState: input.currentState,
        genre: input.genre,
      };
      const genreViolations = runGenreRuleChecks({
        text: input.chapterContent,
        genre: input.genre,
        context: genreContext,
      });
      for (const v of genreViolations) {
        issues.push({
          severity: v.severity,
          scope: "paragraph",
          dimension: "genre-rule",
          message: v.message,
          repairScope: v.severity === "error" ? "local" : "structural",
          location: v.location,
        });
      }
    }

    // After LLM-based audit, run the pure rule-based audit engine
    // (zero-LLM-cost). This detects numeric contradictions (age, distance),
    // power scaling jumps, timeline inconsistencies, and character presence
    // issues via pure string/regex/number analysis. Rule-based issues are
    // tagged with `label: "rule"` to distinguish them from LLM issues.
    if (enableRuleAudit) {
      try {
        const ruleResult = runRuleAudit({
          chapterContent: input.chapterContent,
          chapterIndex: input.chapter,
          currentState: input.currentState,
          chapterSummaries: input.chapterSummaries,
          storyBible: input.storyBible,
          assetCatalog: input.assetCatalog,
        });
        issues.push(...ruleResult.issues);
      } catch (err) {
        // Rule audit failures are non-fatal — the LLM and humanize
        // results are still valid.
        console.warn(
          `[sentinel] Rule-based audit failed — ${toErrorMessage(err)}. ` +
          `Continuing with LLM + humanize results only.`,
        );
      }
    }

    return { issues, usage };
  }

  return { name, audit };
}
