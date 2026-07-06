/** A single chapter commit snapshot in the version history. */
export interface VersionSnapshot {
    commitHash: string;
    chapterIndex: number;
    message: string;
    timestamp: string;
    author: string;
    filesChanged: string[];
}
/** The diff for a specific commit. */
export interface VersionDiff {
    commitHash: string;
    chapterIndex: number;
    diff: string;
    filesChanged: string[];
    additions: number;
    deletions: number;
}
/** Configuration for the VersionControl instance. */
export interface VersionControlConfig {
    projectRoot: string;
    autoCommit: boolean;
    authorName: string;
    authorEmail: string;
}
/** Options for filtering the version log. */
export interface VersionLogOptions {
    maxCount?: number;
    sinceChapter?: number;
    untilChapter?: number;
}
export declare class VersionControl {
    private readonly config;
    constructor(config: VersionControlConfig);
    /** Run a git command in the project root and return trimmed stdout.
     *  Author/committer env vars are injected from config so every command
     *  uses the configured identity without relying on global git config. */
    private git;
    /** Parse a chapter index from a commit message like "Chapter 12: ...". */
    private parseChapterIndex;
    /** Default truth files to track when no explicit file list is given. */
    private getDefaultFiles;
    /**
     * Initialize a git repository in the project root if one doesn't exist.
     * Creates a .gitignore that excludes common non-versioned files.
     */
    init(): Promise<void>;
    /** Check if git is available and the project has a git repo. */
    isAvailable(): Promise<boolean>;
    /**
     * Commit the current state of truth files for a specific chapter.
     *
     * @param chapterIndex The chapter number being committed.
     * @param message      Optional custom commit message.
     * @param files        Specific files to stage (defaults to truth files).
     * @returns A VersionSnapshot, or null when there is nothing to commit.
     */
    commitChapter(chapterIndex: number, message?: string, files?: string[]): Promise<VersionSnapshot | null>;
    /** Get the commit log for chapter commits. */
    getLog(options?: VersionLogOptions): Promise<VersionSnapshot[]>;
    /** Get the diff for a specific commit. */
    getDiff(commitHash: string): Promise<VersionDiff>;
    /**
     * Rollback to a specific chapter commit.
     * This creates a new commit that reverts the state.
     */
    rollback(commitHash: string, reason?: string): Promise<VersionSnapshot | null>;
    /** Create a branch for experimental writing (e.g., alternative plot). */
    createBranch(branchName: string): Promise<void>;
    /** Switch to a branch. */
    switchBranch(branchName: string): Promise<void>;
    /** List all branches. */
    listBranches(): Promise<string[]>;
    /** Merge a branch back into the current branch. */
    mergeBranch(branchName: string): Promise<void>;
    /** Get the current branch name. */
    getCurrentBranch(): Promise<string>;
    /** Tag a specific chapter for easy reference. */
    tagChapter(chapterIndex: number, tagName?: string): Promise<void>;
    /** List all chapter tags. */
    listTags(): Promise<string[]>;
}
/**
 * Auto-commit hook for pipeline integration.
 * Called after each chapter is finalized to automatically commit
 * the truth files to git.
 */
export interface AutoCommitHook {
    /** Called after a chapter is finalized. */
    afterChapterFinalize(params: {
        chapterIndex: number;
        projectRoot: string;
        chapterTitle?: string;
    }): Promise<VersionSnapshot | null>;
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
export declare function createAutoCommitHook(vc: VersionControl, options?: {
    /** Custom commit message template. Defaults to "Chapter {n}: {title}". */
    messageTemplate?: string;
    /** Whether to skip commits when there are no changes (default: true). */
    skipEmpty?: boolean;
}): AutoCommitHook;
//# sourceMappingURL=version-control.d.ts.map