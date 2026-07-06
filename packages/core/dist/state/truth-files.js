// packages/core/src/state/truth-files.ts
//
// Truth-file persistence — the "absolute truth" layer for a novel.
//
// Inspired by the InkOS "Truth Files" mechanism: instead of relying on the
// LLM's context window to remember the story across chapters, we persist
// structured truth files to disk. Every pipeline run reads them as canonical
// context and writes them back after the chapter is finalized.
//
// Three truth files live at the project root:
//   story-state.json  — structured world state (temporal facts, hooks, summaries)
//   story-bible.md    — world-building / premise / characters / plot / hooks
//   book-rules.md     — creation rules & style constraints
//
// All files are optional. A novel starts with none and accumulates truth as
// the architect/writer/consolidator agents produce output. Missing files
// degrade gracefully to empty defaults so the pipeline never hard-fails.
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { StoryStateSnapshotSchema, } from "../models/story-state.js";
import { applyStoryStateDelta } from "./reducer.js";
import { renderCurrentStateProjection, renderPlotThreadsProjection, renderChapterSummariesProjection, } from "./projection.js";
// ---------------------------------------------------------------------------
// File names
// ---------------------------------------------------------------------------
export const STORY_STATE_FILE = "story-state.json";
export const STORY_BIBLE_FILE = "story-bible.md";
export const BOOK_RULES_FILE = "book-rules.md";
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
/** Build an empty initial snapshot for a brand-new novel. */
export function emptySnapshot(language = "zh") {
    return {
        manifest: {
            schemaVersion: 2,
            language,
            lastAppliedChapter: 0,
            projectionVersion: 1,
            migrationWarnings: [],
        },
        currentState: { chapter: 0, facts: [] },
        hooks: { hooks: [] },
        chapterSummaries: { rows: [] },
    };
}
// ---------------------------------------------------------------------------
// Story state (story-state.json)
// ---------------------------------------------------------------------------
/** Write a `.corrupt-<timestamp>` backup of an invalid story-state file so the
 *  user can recover data manually. Logs an error describing the situation. */
async function backupCorruptFile(filePath, raw) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${filePath}.corrupt-${timestamp}`;
    try {
        await fs.writeFile(backupPath, raw, "utf8");
        console.error(`[truth-files] Story state file is corrupt (invalid JSON or schema validation failed). ` +
            `A backup has been saved to ${backupPath}. Falling back to an empty snapshot.`);
    }
    catch {
        console.error(`[truth-files] Story state file is corrupt and the backup could not be written to ${backupPath}. ` +
            `Falling back to an empty snapshot.`);
    }
}
/** Load the persisted story-state snapshot, or an empty default if absent.
 *  When the file exists but is corrupt (invalid JSON or fails schema
 *  validation), a `.corrupt-<timestamp>` backup is written and an error is
 *  logged before falling back to an empty snapshot. */
export async function loadStoryState(projectRoot, language = "zh") {
    const filePath = join(projectRoot, STORY_STATE_FILE);
    let raw;
    try {
        raw = await fs.readFile(filePath, "utf8");
    }
    catch {
        // File missing — return empty default (normal for new novels)
        return emptySnapshot(language);
    }
    // File exists — try to parse JSON
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        // Invalid JSON — back up the corrupt file before falling back
        await backupCorruptFile(filePath, raw);
        return emptySnapshot(language);
    }
    const result = StoryStateSnapshotSchema.safeParse(parsed);
    if (result.success)
        return result.data;
    // Schema validation failed — back up before falling back
    await backupCorruptFile(filePath, raw);
    return emptySnapshot(language);
}
/** Persist the story-state snapshot to disk. */
export async function saveStoryState(projectRoot, snapshot) {
    const filePath = join(projectRoot, STORY_STATE_FILE);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}
/**
 * Apply a chapter delta to the persisted snapshot and save the result.
 *
 * Returns the new snapshot. When the delta would regress the chapter order
 * (e.g. rewriting an old chapter after newer ones), the merge is skipped and
 * the existing snapshot is returned unchanged — regressing global truth is
 * dangerous, so we keep the most advanced state on record.
 *
 * @param allowReapply when true, re-applying the same chapter (rewrite) is
 *   permitted; the old summary for that chapter is replaced.
 */
export async function applyAndPersistDelta(params) {
    const language = params.language ?? "zh";
    const snapshot = await loadStoryState(params.projectRoot, language);
    const last = snapshot.manifest.lastAppliedChapter;
    // Permit re-applying the same chapter (rewrite), but reject true regression.
    const isRewrite = params.delta.chapter <= last;
    const isRegression = params.delta.chapter < last;
    // When allowReapply is explicitly set (chapter rewrite), bypass the
    // regression guard so the state updates with the new chapter content.
    if (isRegression && !params.allowReapply) {
        // Keep the more advanced persisted truth; do not overwrite.
        return { snapshot, applied: false };
    }
    try {
        const next = applyStoryStateDelta({
            snapshot,
            delta: params.delta,
            allowReapply: params.allowReapply ?? isRewrite,
        });
        await saveStoryState(params.projectRoot, next);
        return { snapshot: next, applied: true };
    }
    catch (err) {
        // Reducer validation failed — preserve existing truth, but log the reason.
        console.error(`[truth-files] applyAndPersistDelta: reducer failed — ${err instanceof Error ? err.message : String(err)}`);
        return { snapshot, applied: false };
    }
}
// ---------------------------------------------------------------------------
// Story bible (story-bible.md)
// ---------------------------------------------------------------------------
/** Render an ArchitectOutput into a human-readable markdown story bible. */
export function renderStoryBibleMarkdown(arch, language = "zh") {
    const isZh = language === "zh";
    const h = (zh, en) => (isZh ? zh : en);
    const lines = [
        `# ${h("故事圣经", "Story Bible")}`,
        "",
        `## ${h("核心前提", "Premise")}`,
        arch.premise || `*${h("（待生成）", "(to be generated)")}*`,
        "",
        `## ${h("世界观", "World")}`,
        arch.world || `*${h("（待生成）", "(to be generated)")}*`,
        "",
        `## ${h("角色", "Characters")}`,
        arch.characters || `*${h("（待生成）", "(to be generated)")}*`,
        "",
        `## ${h("情节大纲", "Plot Outline")}`,
        arch.plot || `*${h("（待生成）", "(to be generated)")}*`,
        "",
        `## ${h("伏笔设定", "Hooks / Foreshadowing")}`,
        arch.hooks || `*${h("（待生成）", "(to be generated)")}*`,
        "",
    ];
    return lines.join("\n");
}
/** Load the persisted story bible markdown (empty string if absent). */
export async function loadStoryBible(projectRoot) {
    try {
        return await fs.readFile(join(projectRoot, STORY_BIBLE_FILE), "utf8");
    }
    catch {
        return "";
    }
}
/** Persist the story bible markdown to disk. */
export async function saveStoryBible(projectRoot, arch, language = "zh") {
    const filePath = join(projectRoot, STORY_BIBLE_FILE);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, renderStoryBibleMarkdown(arch, language), "utf8");
}
// ---------------------------------------------------------------------------
// Book rules (book-rules.md)
// ---------------------------------------------------------------------------
/** Default book-rules template (creation禁忌 / style constraints). */
export function defaultBookRules(language = "zh") {
    if (language === "en") {
        return [
            "# Book Rules",
            "",
            "## Style",
            "- Show, don't tell; convey emotion through action and detail.",
            "- Avoid AI-flavored clichés and stiff transitions.",
            "- Keep character voices distinct and consistent.",
            "",
            "## Continuity",
            "- Respect the story bible and current state as absolute truth.",
            "- Resolve or advance open hooks; do not drop foreshadowing silently.",
            "- Never contradict established facts without an in-story reason.",
            "",
            "## Pacing",
            "- Each chapter should advance at least one plot thread.",
            "- Balance dialogue, action, and reflection.",
        ].join("\n");
    }
    return [
        "# 创作规则",
        "",
        "## 文风",
        "- 展示而非陈述，用动作和细节传达情感",
        "- 避免AI腔调和生硬过渡",
        "- 保持各角色声音独特且一致",
        "",
        "## 连续性",
        "- 以故事圣经和当前状态为绝对真理",
        "- 推进或回收伏笔，不得无声丢弃",
        "- 不得在无剧情理由下违背既定事实",
        "",
        "## 节奏",
        "- 每章至少推进一条情节线",
        "- 对话、动作、心理描写均衡",
    ].join("\n");
}
/** Load the persisted book-rules markdown (empty string if absent). */
export async function loadBookRules(projectRoot) {
    try {
        return await fs.readFile(join(projectRoot, BOOK_RULES_FILE), "utf8");
    }
    catch {
        return "";
    }
}
/** Ensure book-rules.md exists; create the default if missing. Returns content. */
export async function ensureBookRules(projectRoot, language = "zh") {
    const existing = await loadBookRules(projectRoot);
    if (existing.trim())
        return existing;
    const filePath = join(projectRoot, BOOK_RULES_FILE);
    await fs.mkdir(dirname(filePath), { recursive: true });
    const content = defaultBookRules(language);
    await fs.writeFile(filePath, content, "utf8");
    return content;
}
// ---------------------------------------------------------------------------
// Projection: render the full snapshot as a single context string
// ---------------------------------------------------------------------------
/**
 * Render a snapshot into a single markdown context block suitable for feeding
 * back into the planner/writer/auditor agents as "current truth".
 */
export function renderSnapshotProjection(snapshot, language = "zh") {
    return [
        renderCurrentStateProjection(snapshot.currentState, language),
        "",
        renderPlotThreadsProjection(snapshot.hooks, language),
        "",
        renderChapterSummariesProjection(snapshot.chapterSummaries, language),
    ].join("\n");
}
/**
 * Load all truth files and assemble a complete story-context bundle.
 * Missing files degrade to empty strings / defaults.
 */
export async function loadTruthContext(projectRoot) {
    const snapshot = await loadStoryState(projectRoot);
    const storyBible = await loadStoryBible(projectRoot);
    const bookRules = await ensureBookRules(projectRoot, snapshot.manifest.language);
    const lang = snapshot.manifest.language;
    const currentState = renderSnapshotProjection(snapshot, lang);
    const currentStateOnly = renderCurrentStateProjection(snapshot.currentState, lang);
    const activeHooksOnly = renderPlotThreadsProjection(snapshot.hooks, lang);
    const chapterSummariesOnly = renderChapterSummariesProjection(snapshot.chapterSummaries, lang);
    return { storyBible, bookRules, currentState, currentStateOnly, activeHooksOnly, chapterSummariesOnly, snapshot };
}
//# sourceMappingURL=truth-files.js.map