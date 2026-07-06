// packages/core/src/agents/auditor.ts
import { z } from "zod";
import { loadPrompt } from "../prompts/loader.js";
import { createAgentRuntime, toErrorMessage } from "./base.js";
import { parseAndValidateArray, extractPromptMessages } from "./json-utils.js";
import { detectStyle } from "../humanize/detector.js";
import { runGenreRuleChecks } from "../rules/index.js";
import { runRuleAudit } from "../audit/rule-auditor.js";
// ---------------------------------------------------------------------------
// Humanize integration — convert StyleIssue to AuditIssue
// ---------------------------------------------------------------------------
/** Map humanize IssueSeverity to AuditIssue severity. */
const HUMANIZE_SEVERITY_MAP = {
    high: "error",
    medium: "warning",
    low: "info",
};
/**
 * Convert a StyleIssue (from the humanize detector) into an AuditIssue
 * so it can be merged into the auditor's output and handled by the EditorAgent.
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
export function styleIssueToAuditIssue(issue) {
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
const AuditIssueSchema = z.object({
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
 * Factory: build a ConsistencyChecker agent by composing a shared runtime.
 * Replaces the former `class ConsistencyChecker extends BaseAgent`.
 */
export function createConsistencyChecker(ctx, options) {
    const runtime = createAgentRuntime(ctx);
    const name = "auditor";
    const enableHumanize = options?.enableHumanize ?? true;
    const enableGenreRules = options?.enableGenreRules ?? true;
    const enableRuleAudit = options?.enableRuleAudit ?? true;
    async function audit(input, options) {
        const promptText = await loadPrompt("auditor", {
            storyBible: input.storyBible,
            currentState: input.currentState,
            activeHooks: input.activeHooks,
            chapterSummaries: input.chapterSummaries,
            chapterContent: input.chapterContent,
        });
        const { system, user } = extractPromptMessages(promptText);
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        let issues = [];
        try {
            const response = await runtime.chat(messages, options);
            issues = parseAndValidateArray(response.content, AuditIssueSchema);
        }
        catch (err) {
            // LLM call failed — log a warning and add an info-level issue so
            // callers know the audit is incomplete. Continue with humanize
            // detection only (which runs locally and does not need the LLM).
            console.warn(`[auditor] LLM audit call failed — ${toErrorMessage(err)}. ` +
                `Falling back to humanize detection only.`);
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
        // chapter content. Detected StyleIssues are converted to AuditIssue
        // format and merged into the results. When auditMode="auto", the
        // EditorAgent will handle these alongside other issues.
        if (enableHumanize) {
            const styleReport = detectStyle(input.chapterContent);
            const humanizeIssues = styleReport.issues.map(styleIssueToAuditIssue);
            issues.push(...humanizeIssues);
        }
        // After LLM-based audit, run three-layer genre rule checks (string-based,
        // NOT LLM calls). Violations are converted to AuditIssue entries with
        // dimension "genre-rule" so the EditorAgent can handle them alongside
        // other issues. Checks are conservative — only clear violations are flagged.
        if (enableGenreRules) {
            const genreContext = {
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
            }
            catch (err) {
                // Rule audit failures are non-fatal — the LLM and humanize
                // results are still valid.
                console.warn(`[auditor] Rule-based audit failed — ${toErrorMessage(err)}. ` +
                    `Continuing with LLM + humanize results only.`);
            }
        }
        return issues;
    }
    return { name, audit };
}
//# sourceMappingURL=auditor.js.map