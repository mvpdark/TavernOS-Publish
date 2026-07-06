// ---------------------------------------------------------------------------
// Sliding window configuration
// ---------------------------------------------------------------------------
/** Maximum number of recent chapter summaries to render in full. Older
 *  chapters are compressed into a one-line index entry. This keeps the
 *  projection size bounded regardless of novel length. */
const SUMMARY_WINDOW_SIZE = 15;
/** Maximum number of hooks to render. Resolved hooks are excluded first,
 *  then older hooks are truncated. */
const HOOK_RENDER_LIMIT = 20;
/** Hook statuses that are considered "resolved" and should NOT be rendered
 *  in the active projection. They remain in the data file for audit. */
const RESOLVED_HOOK_STATUSES = new Set([
    "resolved", "closed", "已回收", "已解决", "abandoned", "已放弃",
]);
function escapeTableCell(value) {
    return String(value).replace(/\|/g, "\\|").trim();
}
const HOOK_HEADERS_ZH = ["hook_id", "起始章节", "类型", "状态", "最近推进", "预期回收", "回收节奏", "备注"];
const HOOK_HEADERS_EN = ["hook_id", "start_chapter", "type", "status", "last_advanced", "expected_payoff", "payoff_timing", "notes"];
const SUMMARY_HEADERS_ZH = ["章节", "标题", "角色", "事件", "状态变化", "Hook 活动", "情绪", "章节类型"];
const SUMMARY_HEADERS_EN = ["chapter", "title", "characters", "events", "state_changes", "hook_activity", "mood", "chapter_type"];
const STATE_FIELDS_ZH = [
    { field: "Current Location", label: "当前位置" },
    { field: "Protagonist State", label: "主角状态" },
    { field: "Current Goal", label: "当前目标" },
    { field: "Current Constraint", label: "当前约束" },
    { field: "Current Alliances", label: "当前联盟" },
    { field: "Current Conflict", label: "当前冲突" },
];
const STATE_FIELDS_EN = [
    { field: "Current Location", label: "Current Location" },
    { field: "Protagonist State", label: "Protagonist State" },
    { field: "Current Goal", label: "Current Goal" },
    { field: "Current Constraint", label: "Current Constraint" },
    { field: "Current Alliances", label: "Current Alliances" },
    { field: "Current Conflict", label: "Current Conflict" },
];
function findFactValue(facts, field) {
    const fact = facts.find((f) => f.predicate.toLowerCase() === field.toLowerCase());
    return fact?.object ?? "";
}
function localizePayoffTiming(timing, language) {
    if (!timing)
        return "";
    const map = {
        immediate: { zh: "立即", en: "immediate" },
        "near-term": { zh: "近期", en: "near-term" },
        "mid-arc": { zh: "中程", en: "mid-arc" },
        "slow-burn": { zh: "慢烧", en: "slow-burn" },
        endgame: { zh: "终局", en: "endgame" },
    };
    return map[timing]?.[language] ?? timing;
}
export function renderCurrentStateProjection(state, language = "zh") {
    const fields = language === "zh" ? STATE_FIELDS_ZH : STATE_FIELDS_EN;
    const headerLabel = language === "zh" ? "当前状态" : "Current State";
    const fieldLabel = language === "zh" ? "字段" : "Field";
    const valueLabel = language === "zh" ? "值" : "Value";
    const lines = [`## ${headerLabel} (Chapter ${state.chapter})`, "", `| ${fieldLabel} | ${valueLabel} |`, `| --- | --- |`];
    for (const { field, label } of fields) {
        const value = findFactValue(state.facts, field);
        lines.push(`| ${escapeTableCell(label)} | ${escapeTableCell(value)} |`);
    }
    // Render any unknown facts
    const knownFields = new Set(fields.map((f) => f.field.toLowerCase()));
    const extras = state.facts.filter((f) => !knownFields.has(f.predicate.toLowerCase()));
    if (extras.length > 0) {
        const extraLabel = language === "zh" ? "其他状态" : "Additional State";
        lines.push("", `### ${extraLabel}`, "");
        for (const f of extras) {
            lines.push(`- ${f.predicate}: ${f.object}`);
        }
    }
    return lines.join("\n");
}
export function renderPlotThreadsProjection(state, language = "zh") {
    // Filter out resolved hooks — they bloat the projection without adding
    // value for the writer. Resolved hooks remain in the data file.
    const activeHooks = state.hooks.filter((h) => !RESOLVED_HOOK_STATUSES.has(h.status.toLowerCase()));
    if (activeHooks.length === 0) {
        const empty = language === "zh" ? "无活跃 Hook" : "No active hooks";
        return `## ${language === "zh" ? "悬念/伏笔" : "Hooks"}\n\n*${empty}*\n`;
    }
    // Sort by lastAdvancedChapter descending (most recently advanced first),
    // then limit to HOOK_RENDER_LIMIT entries.
    const sorted = [...activeHooks]
        .sort((a, b) => b.lastAdvancedChapter - a.lastAdvancedChapter)
        .slice(0, HOOK_RENDER_LIMIT);
    const headers = language === "zh" ? HOOK_HEADERS_ZH : HOOK_HEADERS_EN;
    const title = language === "zh" ? "悬念/伏笔" : "Hooks";
    const lines = [`## ${title}`, "", `| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
    for (const hook of sorted) {
        lines.push([
            escapeTableCell(hook.hookId),
            escapeTableCell(hook.startChapter),
            escapeTableCell(hook.type),
            escapeTableCell(hook.status),
            escapeTableCell(hook.lastAdvancedChapter),
            escapeTableCell(hook.expectedPayoff),
            escapeTableCell(localizePayoffTiming(hook.payoffTiming, language)),
            escapeTableCell(hook.notes),
        ].map((c) => `| ${c} `).join("") + "|");
    }
    // If some active hooks were truncated, add a count notice.
    if (activeHooks.length > sorted.length) {
        const note = language === "zh"
            ? `\n*（另有 ${activeHooks.length - sorted.length} 个较久未推进的伏笔未显示）*`
            : `\n*(${activeHooks.length - sorted.length} older hooks hidden)*`;
        lines.push(note);
    }
    return lines.join("\n");
}
export function renderChapterSummariesProjection(state, language = "zh") {
    if (state.rows.length === 0) {
        const empty = language === "zh" ? "无章节摘要" : "No chapter summaries";
        return `## ${language === "zh" ? "章节摘要" : "Chapter Summaries"}\n\n*${empty}*\n`;
    }
    const headers = language === "zh" ? SUMMARY_HEADERS_ZH : SUMMARY_HEADERS_EN;
    const title = language === "zh" ? "章节摘要" : "Chapter Summaries";
    const lines = [`## ${title}`, ""];
    // --- Sliding window: full detail for recent chapters, index for older ---
    const total = state.rows.length;
    const windowStart = Math.max(0, total - SUMMARY_WINDOW_SIZE);
    const recentRows = state.rows.slice(windowStart);
    const olderRows = state.rows.slice(0, windowStart);
    // Render older chapters as a compressed index (chapter number + title only).
    if (olderRows.length > 0) {
        const archiveTitle = language === "zh"
            ? `### 前情索引（第1-${olderRows[olderRows.length - 1].chapter}章）`
            : `### Previous Chapters Index (Ch.1-${olderRows[olderRows.length - 1].chapter})`;
        lines.push(archiveTitle, "");
        // Compress each old chapter to a single line: "第N章 标题"
        const indexLabel = language === "zh" ? "章" : "Ch.";
        for (const row of olderRows) {
            const chTitle = escapeTableCell(row.title || `#${row.chapter}`);
            lines.push(`- ${indexLabel}${row.chapter} ${chTitle}`);
        }
        lines.push("");
    }
    // Render recent chapters in full table format.
    const recentTitle = language === "zh"
        ? `### 近期章节详情（第${recentRows[0].chapter}-${recentRows[recentRows.length - 1].chapter}章）`
        : `### Recent Chapters (Ch.${recentRows[0].chapter}-${recentRows[recentRows.length - 1].chapter})`;
    lines.push(recentTitle, "", `| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`);
    for (const row of recentRows) {
        lines.push([
            escapeTableCell(row.chapter),
            escapeTableCell(row.title),
            escapeTableCell(row.characters),
            escapeTableCell(row.events),
            escapeTableCell(row.stateChanges),
            escapeTableCell(row.hookActivity),
            escapeTableCell(row.mood),
            escapeTableCell(row.chapterType),
        ].map((c) => `| ${c} `).join("") + "|");
    }
    return lines.join("\n");
}
//# sourceMappingURL=projection.js.map