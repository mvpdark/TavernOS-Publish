import { type StoryStateSnapshot, type StoryStateLanguage } from "../models/story-state.js";
import type { ArchitectOutput } from "../agents/architect.js";
export declare const STORY_STATE_FILE = "story-state.json";
export declare const STORY_BIBLE_FILE = "story-bible.md";
export declare const BOOK_RULES_FILE = "book-rules.md";
/** Build an empty initial snapshot for a brand-new novel. */
export declare function emptySnapshot(language?: StoryStateLanguage): StoryStateSnapshot;
/** Load the persisted story-state snapshot, or an empty default if absent.
 *  When the file exists but is corrupt (invalid JSON or fails schema
 *  validation), a `.corrupt-<timestamp>` backup is written and an error is
 *  logged before falling back to an empty snapshot. */
export declare function loadStoryState(projectRoot: string, language?: StoryStateLanguage): Promise<StoryStateSnapshot>;
/** Persist the story-state snapshot to disk. */
export declare function saveStoryState(projectRoot: string, snapshot: StoryStateSnapshot): Promise<void>;
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
export declare function applyAndPersistDelta(params: {
    projectRoot: string;
    delta: import("../models/story-state.js").StoryStateDelta;
    language?: StoryStateLanguage;
    allowReapply?: boolean;
}): Promise<{
    snapshot: StoryStateSnapshot;
    applied: boolean;
}>;
/** Render an ArchitectOutput into a human-readable markdown story bible. */
export declare function renderStoryBibleMarkdown(arch: ArchitectOutput, language?: StoryStateLanguage): string;
/** Load the persisted story bible markdown (empty string if absent). */
export declare function loadStoryBible(projectRoot: string): Promise<string>;
/** Persist the story bible markdown to disk. */
export declare function saveStoryBible(projectRoot: string, arch: ArchitectOutput, language?: StoryStateLanguage): Promise<void>;
/** Default book-rules template (creation禁忌 / style constraints). */
export declare function defaultBookRules(language?: StoryStateLanguage): string;
/** Load the persisted book-rules markdown (empty string if absent). */
export declare function loadBookRules(projectRoot: string): Promise<string>;
/** Ensure book-rules.md exists; create the default if missing. Returns content. */
export declare function ensureBookRules(projectRoot: string, language?: StoryStateLanguage): Promise<string>;
/**
 * Render a snapshot into a single markdown context block suitable for feeding
 * back into the planner/writer/sentinel agents as "current truth".
 */
export declare function renderSnapshotProjection(snapshot: StoryStateSnapshot, language?: StoryStateLanguage): string;
/**
 * Load all truth files and assemble a complete story-context bundle.
 * Missing files degrade to empty strings / defaults.
 */
export declare function loadTruthContext(projectRoot: string): Promise<{
    storyBible: string;
    bookRules: string;
    /** Full projection (current state + hooks + chapter summaries). Used by
     *  the writer which needs the complete picture for chapter continuity. */
    currentState: string;
    /** Current-state fields only (location, goal, etc.). Used by the auditor
     *  and chapter analyzer which don't need the full chapter history. */
    currentStateOnly: string;
    /** Hooks / plot-threads projection only. */
    activeHooksOnly: string;
    /** Chapter summaries projection only (sliding window). */
    chapterSummariesOnly: string;
    snapshot: StoryStateSnapshot;
}>;
//# sourceMappingURL=truth-files.d.ts.map