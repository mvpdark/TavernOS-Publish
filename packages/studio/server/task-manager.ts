// ---------------------------------------------------------------------------
// TaskManager — in-memory background task tracker.
//
// Tracks long-running operations (chapter generation, MJ image generation,
// three-view generation, cover generation, chat) so they survive client
// disconnects. The frontend polls GET /api/tasks to discover progress and
// completion, allowing users to switch pages without interrupting work.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type {
  TaskType,
  TaskStatus,
  AgentProgressItem,
  TaskProgress,
  Task,
} from "../src/shared/types";

// Re-export shared types so existing imports from task-manager still work.
export type { TaskType, TaskStatus, AgentProgressItem, TaskProgress, Task };

// Internal task with AbortController (not exposed to API).
interface InternalTask extends Task {
  controller: AbortController;
}

const MAX_TASKS = 100;
const TASK_TTL_MS = 3_600_000; // 1 hour for completed tasks
const FAILED_TASK_TTL_MS = 3_600_000; // 1 hour for failed tasks (reduced from 24h)
const ORPHAN_TIMEOUT = 3_600_000; // 1 hour — running tasks older than this are orphaned
const PERSIST_PATH = path.join(os.homedir(), ".tavernos", "tasks.json");
const PERSIST_DEBOUNCE_MS = 500;

class TaskManagerImpl {
  private tasks = new Map<string, InternalTask>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Periodic cleanup every 5 minutes — removes expired completed/failed tasks.
    setInterval(() => this.cleanup(), 300_000).unref();
    // More frequent orphan sweep every 60 seconds — catches running tasks
    // left behind by unhandled rejections or other control-flow escapes.
    setInterval(() => this.cleanupOrphans(), 60_000).unref();
    // Restore task state from disk on startup.
    this.loadFromDisk();
  }

  /** Create a new task and return its id + abort signal. */
  create(opts: {
    type: TaskType;
    label: string;
    projectId?: string;
    meta?: Record<string, unknown>;
    total?: number;
  }): { id: string; signal: AbortSignal } {
    this.cleanup();

    const id = `task-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const controller = new AbortController();
    const now = Date.now();

    const task: InternalTask = {
      id,
      type: opts.type,
      label: opts.label,
      status: "running",
      progress: { current: 0, total: opts.total ?? 0 },
      projectId: opts.projectId,
      meta: opts.meta,
      createdAt: now,
      updatedAt: now,
      controller,
    };

    this.tasks.set(id, task);

    // Enforce max task limit (remove oldest completed).
    if (this.tasks.size > MAX_TASKS) {
      const sorted = [...this.tasks.entries()]
        .filter(([, t]) => t.status !== "running")
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      for (let i = 0; i < sorted.length && this.tasks.size > MAX_TASKS; i++) {
        this.tasks.delete(sorted[i][0]);
      }
    }

    this.schedulePersist();
    return { id, signal: controller.signal };
  }

  /** Update task progress. */
  setProgress(id: string, progress: Partial<TaskProgress>): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.progress = { ...task.progress, ...progress };
    task.updatedAt = Date.now();
    this.schedulePersist();
  }

  /** Set the current agent stage. */
  setAgent(id: string, stage: string | undefined): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.progress.agentStage = stage;
    task.updatedAt = Date.now();
    this.schedulePersist();
  }

  /** Mark an agent as completed. */
  addAgentCompleted(id: string, item: AgentProgressItem): void {
    const task = this.tasks.get(id);
    if (!task) return;
    if (!task.progress.agentCompleted) task.progress.agentCompleted = [];
    task.progress.agentCompleted.push(item);
    task.updatedAt = Date.now();
    this.schedulePersist();
  }

  /** Reset agent progress (for retries). */
  resetAgents(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.progress.agentStage = undefined;
    task.progress.agentCompleted = [];
    task.updatedAt = Date.now();
    this.schedulePersist();
  }

  /** Mark task as completed. */
  complete(id: string, result?: unknown): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = "completed";
    task.result = result;
    task.progress.current = task.progress.total || task.progress.current;
    task.updatedAt = Date.now();
    this.schedulePersist();
  }

  /** Mark task as failed. Does not override "cancelled" status. */
  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    if (task.status === "cancelled") return; // Preserve cancelled status.
    task.status = "failed";
    task.error = error;
    task.updatedAt = Date.now();
    this.schedulePersist();
  }

  /** Cancel a task (aborts the AbortController). */
  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.status !== "running") return false;
    task.status = "cancelled";
    task.controller.abort();
    task.updatedAt = Date.now();
    this.schedulePersist();
    return true;
  }

  /** Get a single task (sanitized, no internal fields). */
  get(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    return this.sanitize(task);
  }

  /** List all tasks (sanitized), newest first. */
  list(): Task[] {
    return [...this.tasks.values()]
      .map((t) => this.sanitize(t))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Get tasks for a specific project. */
  listByProject(projectId: string): Task[] {
    return this.list().filter((t) => t.projectId === projectId);
  }

  /** Remove a task from the store. */
  remove(id: string): boolean {
    const deleted = this.tasks.delete(id);
    if (deleted) this.schedulePersist();
    return deleted;
  }

  /** Remove all completed/failed/cancelled tasks. */
  clearFinished(): void {
    let changed = false;
    for (const [id, task] of this.tasks) {
      if (task.status !== "running" && task.status !== "pending") {
        this.tasks.delete(id);
        changed = true;
      }
    }
    if (changed) this.schedulePersist();
  }

  /** Check if any task of a given type is running for a project. */
  hasRunning(type: TaskType, projectId?: string): boolean {
    for (const task of this.tasks.values()) {
      if (task.status === "running" && task.type === type) {
        if (!projectId || task.projectId === projectId) return true;
      }
    }
    return false;
  }

  /** Get the signal for a task (for passing to LLM calls). */
  getSignal(id: string): AbortSignal | undefined {
    return this.tasks.get(id)?.controller.signal;
  }

  /** Remove tasks older than TTL. Failed tasks get the same TTL as completed. */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (task.status !== "running" && task.status !== "pending") {
        const ttl = task.status === "failed" ? FAILED_TASK_TTL_MS : TASK_TTL_MS;
        if (now - task.updatedAt > ttl) {
          this.tasks.delete(id);
        }
      }
    }
  }

  /**
   * Sweep for orphaned running tasks — tasks that have been "running" for
   * longer than ORPHAN_TIMEOUT (1 hour) without any progress updates. These
   * are likely left behind by unhandled rejections or other control-flow
   * escapes. Mark them as failed so they don't linger forever.
   */
  private cleanupOrphans(): void {
    const now = Date.now();
    for (const [, task] of this.tasks) {
      if (task.status === "running" && now - task.createdAt > ORPHAN_TIMEOUT) {
        task.status = "failed";
        task.error = "Task timed out (orphaned)";
        task.updatedAt = now;
      }
    }
  }

  private sanitize(task: InternalTask): Task {
    // Strip the controller; return a plain Task.
    const { controller: _controller, ...rest } = task;
    return rest;
  }

  // -------------------------------------------------------------------------
  // Disk persistence
  // -------------------------------------------------------------------------

  /** Schedule a debounced write to disk (500ms) to avoid frequent IO. */
  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flushPersist();
    }, PERSIST_DEBOUNCE_MS);
  }

  /** Serialize the current tasks Map (stripping AbortController) and write to disk. */
  private flushPersist(): void {
    try {
      const serializable = [...this.tasks.values()].map((t) => {
        // Strip the non-serializable AbortController before persisting.
        const { controller: _controller, ...rest } = t;
        return rest;
      });
      const dir = path.dirname(PERSIST_PATH);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${PERSIST_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(serializable, null, 2), "utf-8");
      fs.renameSync(tmp, PERSIST_PATH);
    } catch {
      // IO failures must not affect in-memory operations.
    }
  }

  /** Load tasks from disk on startup. Running tasks are marked as failed. */
  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(PERSIST_PATH)) return;
      const raw = fs.readFileSync(PERSIST_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Omit<InternalTask, "controller">[];
      if (!Array.isArray(parsed)) return;
      for (const entry of parsed) {
        if (!entry || typeof entry.id !== "string") continue;
        // Running tasks cannot be resumed after a process restart — mark them
        // as failed so the user is aware the task was interrupted.
        if (entry.status === "running" || entry.status === "pending") {
          entry.status = "failed";
          entry.error = "进程重启，任务中断";
          entry.updatedAt = Date.now();
        }
        const task: InternalTask = {
          ...entry,
          controller: new AbortController(),
        };
        this.tasks.set(task.id, task);
      }
    } catch {
      // Corrupted or missing file — start with an empty store.
    }
  }
}

/** Singleton task manager instance. */
export const taskManager = new TaskManagerImpl();
