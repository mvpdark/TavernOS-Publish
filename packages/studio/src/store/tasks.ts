// ---------------------------------------------------------------------------
// Global task store — polls /api/tasks every 3 seconds.
//
// Tracks all background tasks (chapter generation, image generation, etc.)
// so they survive page navigation. Components can subscribe to task updates
// and check for completion when they mount.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { apiGet, apiPost, apiDelete } from "../api/client.js";
import type {
  TaskType,
  TaskStatus,
  AgentProgressItem,
  TaskProgress,
  Task,
} from "../shared/types.js";

// Re-export shared types so existing imports from store/tasks still work.
export type { TaskType, TaskStatus, AgentProgressItem, TaskProgress, Task };

interface TaskStore {
  tasks: Task[];
  polling: boolean;
  pollTimer: ReturnType<typeof setTimeout> | null;
  // Track which task IDs we've already notified about (for completion callbacks).
  notifiedIds: Set<string>;

  /** Start polling /api/tasks every 3 seconds. */
  startPolling: () => void;
  /** Stop polling. */
  stopPolling: () => void;
  /** Force refresh from server. */
  refresh: () => Promise<void>;
  /** Cancel a running task. */
  cancelTask: (id: string) => Promise<void>;
  /** Remove a finished task from the list. */
  removeTask: (id: string) => Promise<void>;
  /** Get running tasks for a project. */
  getRunningByProject: (projectId: string) => Task[];
  /** Get running tasks of a specific type. */
  getRunningByType: (type: TaskType, projectId?: string) => Task[];
  /** Mark a task as notified (for completion callbacks). */
  markNotified: (id: string) => void;
  /** Check if a task was completed since last check (returns the task if so). */
  checkCompleted: (id: string) => Task | null;
}

// Reference count for polling — multiple components may call startPolling.
// Only clear the interval when the count drops to 0, so a component unmounting
// doesn't stop polling that another component still relies on.
let pollingCount = 0;

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  polling: false,
  pollTimer: null,
  notifiedIds: new Set<string>(),

  startPolling: () => {
    pollingCount++;
    if (pollingCount > 1) return; // Already polling — just bump the ref count
    set({ polling: true });

    // Initial fetch.
    void get().refresh();

    // Recursive setTimeout: schedules the next poll only after the current
    // refresh resolves, preventing request pile-up when the server is slow
    // (setInterval would keep firing every 3s regardless of pending requests).
    const schedulePoll = (): void => {
      const timer = setTimeout(async () => {
        await get().refresh();
        if (get().polling) schedulePoll();
      }, 3000);
      set({ pollTimer: timer });
    };
    schedulePoll();
  },

  stopPolling: () => {
    pollingCount = Math.max(0, pollingCount - 1);
    if (pollingCount > 0) return; // Other components still need polling
    const timer = get().pollTimer;
    if (timer) clearTimeout(timer);
    set({ polling: false, pollTimer: null });
  },

  refresh: async () => {
    try {
      const data = await apiGet<{ tasks: Task[] }>("/tasks");
      set({ tasks: data.tasks ?? [] });
    } catch (e) {
      // Network error — keep existing tasks, will retry next poll.
      console.warn("[tasks] refresh failed:", e);
    }
  },

  cancelTask: async (id: string) => {
    try {
      await apiPost(`/tasks/${id}/cancel`, {});
      void get().refresh();
    } catch {
      // Ignore — task may already be finished.
    }
  },

  removeTask: async (id: string) => {
    try {
      await apiDelete(`/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        notifiedIds: (() => {
          const s = new Set(state.notifiedIds);
          s.delete(id);
          return s;
        })(),
      }));
    } catch {
      // Ignore.
    }
  },

  getRunningByProject: (projectId: string) => {
    return get().tasks.filter(
      (t) => t.projectId === projectId && t.status === "running",
    );
  },

  getRunningByType: (type: TaskType, projectId?: string) => {
    return get().tasks.filter(
      (t) => t.type === type && t.status === "running" && (!projectId || t.projectId === projectId),
    );
  },

  markNotified: (id: string) => {
    set((state) => {
      const s = new Set(state.notifiedIds);
      s.add(id);
      // Prevent unbounded growth: if the set exceeds 1000 entries,
      // trim to the most recent 500 to bound memory usage.
      if (s.size > 1000) {
        return { notifiedIds: new Set([...s].slice(-500)) };
      }
      return { notifiedIds: s };
    });
  },

  checkCompleted: (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return null;
    // Only report tasks that have reached a terminal state.
    // Using `!== "running"` would incorrectly include "pending" tasks.
    const isTerminal =
      task.status === "completed" ||
      task.status === "failed" ||
      task.status === "cancelled";
    if (isTerminal && !get().notifiedIds.has(id)) {
      get().markNotified(id);
      return task;
    }
    return null;
  },
}));
