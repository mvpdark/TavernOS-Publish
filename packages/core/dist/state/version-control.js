// packages/core/src/state/version-control.ts
//
// Chapter-level Git version control — tracks truth-file snapshots per chapter
// so authors can review history, diff changes, and roll back to any point.
//
// Competing tools (InkOS, AI_NovelGenerator, AI-Novel-Writing-Assistant) all
// layer Git on top of their state files. TavernOS follows the same pattern:
// every committed chapter produces a Git commit over the three truth files
// (story-state.json, story-bible.md, book-rules.md), plus any extra files the
// caller specifies.
//
// All Git operations go through `child_process.execFile` with argument arrays
// (never shell strings) to avoid injection. The module adds no new runtime
// dependencies — it only shells out to the system `git` binary.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { STORY_STATE_FILE, STORY_BIBLE_FILE, BOOK_RULES_FILE } from "./truth-files.js";
const execFileAsync = promisify(execFile);
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** .gitignore template written during init(). */
const GITIGNORE_CONTENT = [
    "node_modules/",
    "*.log",
    ".env",
    "dist/",
    "build/",
    ".tavernos/",
    "*.db",
    "*.db-journal",
    "*.db-wal",
    "*.db-shm",
    "",
].join("\n");
/** Marker prefix used to reliably identify commit-header lines in log output. */
const COMMIT_MARKER = "___COMMIT___";
// ---------------------------------------------------------------------------
// VersionControl
// ---------------------------------------------------------------------------
export class VersionControl {
    config;
    constructor(config) {
        this.config = config;
    }
    // --- Private helpers ---
    /** Run a git command in the project root and return trimmed stdout.
     *  Author/committer env vars are injected from config so every command
     *  uses the configured identity without relying on global git config. */
    async git(args) {
        const env = { ...process.env };
        if (this.config.authorName) {
            env.GIT_AUTHOR_NAME = this.config.authorName;
            env.GIT_COMMITTER_NAME = this.config.authorName;
        }
        if (this.config.authorEmail) {
            env.GIT_AUTHOR_EMAIL = this.config.authorEmail;
            env.GIT_COMMITTER_EMAIL = this.config.authorEmail;
        }
        const { stdout } = await execFileAsync("git", args, {
            cwd: this.config.projectRoot,
            maxBuffer: 10 * 1024 * 1024,
            env,
        });
        return stdout.trim();
    }
    /** Parse a chapter index from a commit message like "Chapter 12: ...". */
    parseChapterIndex(message) {
        const match = message.match(/^Chapter (\d+):/);
        return match ? parseInt(match[1], 10) : undefined;
    }
    /** Default truth files to track when no explicit file list is given. */
    getDefaultFiles() {
        return [STORY_STATE_FILE, STORY_BIBLE_FILE, BOOK_RULES_FILE];
    }
    // --- Public API ---
    /**
     * Initialize a git repository in the project root if one doesn't exist.
     * Creates a .gitignore that excludes common non-versioned files.
     */
    async init() {
        // Check if .git already exists
        let repoExists = false;
        try {
            await fs.access(join(this.config.projectRoot, ".git"));
            repoExists = true;
        }
        catch {
            repoExists = false;
        }
        if (!repoExists) {
            await this.git(["init"]);
        }
        // Create .gitignore if it doesn't exist (don't overwrite user customisations)
        const gitignorePath = join(this.config.projectRoot, ".gitignore");
        try {
            await fs.access(gitignorePath);
        }
        catch {
            await fs.writeFile(gitignorePath, GITIGNORE_CONTENT, "utf8");
        }
        // Set local git config if author info is provided
        if (this.config.authorName) {
            try {
                await this.git(["config", "user.name", this.config.authorName]);
            }
            catch (err) {
                console.error(`[version-control] Failed to set git user.name: ` +
                    `${err instanceof Error ? err.message : String(err)}`);
            }
        }
        if (this.config.authorEmail) {
            try {
                await this.git(["config", "user.email", this.config.authorEmail]);
            }
            catch (err) {
                console.error(`[version-control] Failed to set git user.email: ` +
                    `${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }
    /** Check if git is available and the project has a git repo. */
    async isAvailable() {
        try {
            await this.git(["--version"]);
            await fs.access(join(this.config.projectRoot, ".git"));
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Commit the current state of truth files for a specific chapter.
     *
     * @param chapterIndex The chapter number being committed.
     * @param message      Optional custom commit message.
     * @param files        Specific files to stage (defaults to truth files).
     * @returns A VersionSnapshot, or null when there is nothing to commit.
     */
    async commitChapter(chapterIndex, message, files) {
        const filesToStage = files ?? this.getDefaultFiles();
        const commitMessage = `Chapter ${chapterIndex}: ${message ?? "auto-commit"}`;
        try {
            // Stage the specified files
            await this.git(["add", ...filesToStage]);
            // Check whether anything is actually staged
            const staged = await this.git(["diff", "--cached", "--name-only"]);
            if (!staged) {
                return null; // Nothing to commit
            }
            // Create the commit
            await this.git(["commit", "-m", commitMessage]);
            // Gather metadata for the snapshot
            const commitHash = await this.git(["rev-parse", "HEAD"]);
            const filesChanged = (await this.git([
                "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD",
            ])).split("\n").filter(Boolean);
            const logLine = await this.git([
                "log", "-1", "--format=%an|%ad", "--date=iso",
            ]);
            const [author, timestamp] = logLine.split("|");
            return {
                commitHash,
                chapterIndex,
                message: commitMessage,
                timestamp: timestamp ?? "",
                author: author ?? "",
                filesChanged,
            };
        }
        catch (err) {
            throw new Error(`[version-control] commitChapter failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** Get the commit log for chapter commits. */
    async getLog(options) {
        try {
            const maxCount = options?.maxCount ?? 1000;
            const output = await this.git([
                "log",
                `--format=${COMMIT_MARKER}%H|%an|%ad|%s`,
                "--date=iso",
                "--name-only",
                `--max-count=${maxCount}`,
            ]);
            // Parse commit blocks: each starts with COMMIT_MARKER, followed by
            // file-name lines until the next marker or end of output.
            const snapshots = [];
            let current = null;
            for (const line of output.split("\n")) {
                if (line.startsWith(COMMIT_MARKER)) {
                    if (current)
                        snapshots.push(current);
                    const data = line.slice(COMMIT_MARKER.length);
                    const parts = data.split("|");
                    const commitHash = parts[0] ?? "";
                    const author = parts[1] ?? "";
                    const timestamp = parts[2] ?? "";
                    const message = parts.slice(3).join("|");
                    const chapterIndex = this.parseChapterIndex(message) ?? 0;
                    current = {
                        commitHash,
                        chapterIndex,
                        message,
                        timestamp,
                        author,
                        filesChanged: [],
                    };
                }
                else if (line.trim() && current) {
                    current.filesChanged.push(line.trim());
                }
            }
            if (current)
                snapshots.push(current);
            // Filter by chapter range
            let filtered = snapshots;
            if (options?.sinceChapter !== undefined) {
                const since = options.sinceChapter;
                filtered = filtered.filter((s) => s.chapterIndex >= since);
            }
            if (options?.untilChapter !== undefined) {
                const until = options.untilChapter;
                filtered = filtered.filter((s) => s.chapterIndex <= until);
            }
            return filtered;
        }
        catch (err) {
            // No commits yet — return empty array instead of throwing
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("does not have any commits") || msg.includes("unknown revision")) {
                return [];
            }
            throw new Error(`[version-control] getLog failed: ${msg}`);
        }
    }
    /** Get the diff for a specific commit. */
    async getDiff(commitHash) {
        try {
            // Get commit subject (for chapter index) and numstat in one call
            const statOutput = await this.git([
                "show", commitHash,
                "--format=%s",
                "--numstat",
            ]);
            // Get the full patch text
            const diff = await this.git([
                "show", commitHash,
                "--patch",
                "--format=",
            ]);
            // Parse subject (first line) and numstat lines (remaining non-blank)
            const lines = statOutput.split("\n");
            const subject = lines[0] ?? "";
            const chapterIndex = this.parseChapterIndex(subject) ?? 0;
            let additions = 0;
            let deletions = 0;
            const filesChanged = [];
            // Numstat format: "additions\tdeletions\tfilename"
            // Binary files show "-" for additions/deletions.
            for (const line of lines.slice(1)) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const parts = trimmed.split("\t");
                if (parts.length >= 3) {
                    const added = parts[0] ?? "0";
                    const deleted = parts[1] ?? "0";
                    const file = parts.slice(2).join("\t");
                    filesChanged.push(file);
                    additions += added === "-" ? 0 : parseInt(added, 10) || 0;
                    deletions += deleted === "-" ? 0 : parseInt(deleted, 10) || 0;
                }
            }
            return {
                commitHash,
                chapterIndex,
                diff,
                filesChanged,
                additions,
                deletions,
            };
        }
        catch (err) {
            throw new Error(`[version-control] getDiff failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /**
     * Rollback to a specific chapter commit.
     * This creates a new commit that reverts the state.
     */
    async rollback(commitHash, reason) {
        try {
            await this.git(["revert", "--no-edit", commitHash]);
            // If a reason was provided, amend the revert commit message
            if (reason) {
                await this.git(["commit", "--amend", "-m", `Revert: ${reason}`]);
            }
            // Build a snapshot for the new revert commit
            const newHash = await this.git(["rev-parse", "HEAD"]);
            const logLine = await this.git([
                "log", "-1", "--format=%an|%ad|%s", "--date=iso",
            ]);
            const parts = logLine.split("|");
            const author = parts[0] ?? "";
            const timestamp = parts[1] ?? "";
            const message = parts.slice(2).join("|");
            const chapterIndex = this.parseChapterIndex(message) ?? 0;
            const filesChanged = (await this.git([
                "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD",
            ])).split("\n").filter(Boolean);
            return {
                commitHash: newHash,
                chapterIndex,
                message,
                timestamp,
                author,
                filesChanged,
            };
        }
        catch (err) {
            // Abort any in-progress revert to leave the working tree clean
            try {
                await this.git(["revert", "--abort"]);
            }
            catch {
                // Ignore abort failures — the original error is more important
            }
            console.error(`[version-control] rollback failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    /** Create a branch for experimental writing (e.g., alternative plot). */
    async createBranch(branchName) {
        try {
            await this.git(["branch", branchName]);
        }
        catch (err) {
            throw new Error(`[version-control] createBranch failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** Switch to a branch. */
    async switchBranch(branchName) {
        try {
            await this.git(["checkout", branchName]);
        }
        catch (err) {
            throw new Error(`[version-control] switchBranch failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** List all branches. */
    async listBranches() {
        try {
            const output = await this.git(["branch", "--list"]);
            return output
                .split("\n")
                .map((line) => line.replace(/^\* /, "").trim())
                .filter(Boolean);
        }
        catch (err) {
            throw new Error(`[version-control] listBranches failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** Merge a branch back into the current branch. */
    async mergeBranch(branchName) {
        try {
            await this.git(["merge", "--no-ff", branchName]);
        }
        catch (err) {
            throw new Error(`[version-control] mergeBranch failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** Get the current branch name. */
    async getCurrentBranch() {
        try {
            return await this.git(["branch", "--show-current"]);
        }
        catch (err) {
            throw new Error(`[version-control] getCurrentBranch failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** Tag a specific chapter for easy reference. */
    async tagChapter(chapterIndex, tagName) {
        const tag = tagName ?? `chapter-${chapterIndex}`;
        try {
            await this.git(["tag", tag]);
        }
        catch (err) {
            throw new Error(`[version-control] tagChapter failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
    /** List all chapter tags. */
    async listTags() {
        try {
            const output = await this.git(["tag", "--list"]);
            return output.split("\n").filter(Boolean);
        }
        catch (err) {
            throw new Error(`[version-control] listTags failed: ` +
                `${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
/**
 * Create an auto-commit hook bound to a VersionControl instance.
 * The hook commits truth files after each chapter, with intelligent
 * commit messages based on the chapter info.
 *
 * The hook can be wired into a writing pipeline so that every finalized
 * chapter is automatically version-controlled without manual intervention.
 *
 * @param vc      The VersionControl instance to bind to.
 * @param options Optional configuration for commit message and empty-skip.
 */
export function createAutoCommitHook(vc, options) {
    const messageTemplate = options?.messageTemplate ?? "Chapter {n}: {title}";
    const skipEmpty = options?.skipEmpty ?? true;
    return {
        /**
         * Commit truth files after a chapter is finalized.
         *
         * Steps:
         *   1. Check git availability via `vc.isAvailable()`.
         *   2. Build a commit message from the template, substituting `{n}`
         *      with the chapter index and `{title}` with the chapter title
         *      (or a fallback string).
         *   3. Delegate to `vc.commitChapter()` which stages truth files and
         *      creates the git commit.
         *   4. Return the resulting VersionSnapshot, or null when git is
         *      unavailable or there is nothing to commit.
         */
        async afterChapterFinalize(params) {
            // 1. Check if git is available
            const available = await vc.isAvailable();
            if (!available) {
                return null;
            }
            // 2. Build the commit message from the template
            const title = params.chapterTitle ?? "chapter finalized";
            const message = messageTemplate
                .replace(/\{n\}/g, String(params.chapterIndex))
                .replace(/\{title\}/g, title);
            // 3. Commit the chapter truth files
            const snapshot = await vc.commitChapter(params.chapterIndex, message);
            // 4. Respect skipEmpty — commitChapter already returns null when
            //    nothing is staged, so we simply pass it through.
            if (skipEmpty && snapshot === null) {
                return null;
            }
            return snapshot;
        },
    };
}
//# sourceMappingURL=version-control.js.map