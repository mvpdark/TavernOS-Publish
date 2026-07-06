// packages/core/src/state/validator.ts
import { StateManifestSchema, CurrentStateStateSchema, PlotThreadsStateSchema, ChapterSummariesStateSchema, } from "../models/story-state.js";
function parseOrIssue(schema, value, issues, code, path) {
    try {
        return schema.parse(value);
    }
    catch (error) {
        issues.push({ code, message: String(error), path });
        return undefined;
    }
}
export function validateStoryState(input) {
    try {
        const issues = [];
        const manifest = parseOrIssue(StateManifestSchema, input.manifest, issues, "invalid_manifest", "manifest");
        const currentState = parseOrIssue(CurrentStateStateSchema, input.currentState, issues, "invalid_current_state", "currentState");
        const hooks = parseOrIssue(PlotThreadsStateSchema, input.hooks, issues, "invalid_hooks_state", "hooks");
        const chapterSummaries = parseOrIssue(ChapterSummariesStateSchema, input.chapterSummaries, issues, "invalid_chapter_summaries_state", "chapterSummaries");
        // Cross-field: duplicate hook IDs
        if (hooks) {
            const seen = new Set();
            for (const h of hooks.hooks) {
                if (seen.has(h.hookId)) {
                    issues.push({ code: "duplicate_hook_id", message: `Duplicate hook ID: ${h.hookId}`, path: "hooks.hooks" });
                }
                seen.add(h.hookId);
            }
        }
        // Cross-field: duplicate summary chapters
        if (chapterSummaries) {
            const seen = new Set();
            for (const r of chapterSummaries.rows) {
                if (seen.has(r.chapter)) {
                    issues.push({ code: "duplicate_summary_chapter", message: `Duplicate summary chapter: ${r.chapter}`, path: "chapterSummaries.rows" });
                }
                seen.add(r.chapter);
            }
        }
        // Cross-field: currentState ahead of manifest
        if (manifest && currentState && currentState.chapter > manifest.lastAppliedChapter) {
            issues.push({
                code: "current_state_ahead_of_manifest",
                message: `current state chapter ${currentState.chapter} exceeds manifest ${manifest.lastAppliedChapter}`,
                path: "currentState.chapter",
            });
        }
        return issues;
    }
    catch (error) {
        return [{ code: "validator_crash", message: String(error), path: "" }];
    }
}
//# sourceMappingURL=validator.js.map