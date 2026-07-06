// ---------------------------------------------------------------------------
// TaskIndicator — fixed-position global task progress display.
//
// Shows active background tasks (chapter generation, image generation, etc.)
// in a compact panel at the bottom-right corner. Persists across page
// navigation. Users can see progress and cancel tasks.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useTaskStore, type Task } from "../store/tasks.js";
import type { JSX } from "react";
import {
  IconPen,
  IconBook,
  IconMessageSquare,
  IconUser,
  IconPalette,
  IconFileText,
  IconSettings,
  IconChevron,
  IconX,
  IconCheck,
  IconXCircle,
} from "./Icons.js";

const TASK_ICONS: Record<string, (props: { size?: number; className?: string }) => JSX.Element> = {
  "create-chat": IconPen,
  "create-autopilot": IconBook,
  "chat-stream": IconMessageSquare,
  "generate-three-view": IconUser,
  "generate-mj-avatar": IconPalette,
  "generate-cover": IconFileText,
};

function TaskRow({ task }: { task: Task }): JSX.Element {
  const { cancelTask, removeTask } = useTaskStore();
  const IconComp = TASK_ICONS[task.type] ?? IconSettings;
  const isRunning = task.status === "running";
  const hasProgress = task.progress.total > 0;

  const pct = hasProgress
    ? Math.min(100, Math.round((task.progress.current / task.progress.total) * 100))
    : 0;

  const progressLabel = hasProgress ? `${task.label} ${pct}%` : task.label;

  return (
    <div
      className="transition-colors hover:bg-[var(--color-surface-hover)] flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2.5"
      style={{ minWidth: 240 }}
    >
      <div className="flex items-center gap-2">
        <IconComp size={14} className="shrink-0 text-[var(--color-primary)]" />
        <span className="flex-1 truncate text-xs text-[var(--color-text-muted)]">{task.label}</span>
        {isRunning ? (
          <button
            onClick={() => void cancelTask(task.id)}
            className="text-[10px] text-[var(--color-danger)] hover:underline"
            aria-label={`取消任务: ${task.label}`}
          >
            取消
          </button>
        ) : (
          <button
            onClick={() => void removeTask(task.id)}
            className="text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-text)]"
            aria-label={`关闭任务: ${task.label}`}
          >
            <IconX size={12} />
          </button>
        )}
      </div>

      {hasProgress && (
        <div
          className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressLabel}
        >
          <div
            className="h-full w-full origin-left rounded-full bg-[var(--color-primary)]/60 transition-transform"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        {isRunning ? (
          <>
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
            <span className="truncate text-[10px] text-[var(--color-text-faint)]">
              {task.progress.message ?? task.progress.agentStage ?? "处理中…"}
            </span>
          </>
        ) : task.status === "completed" ? (
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-success)]">
            <IconCheck size={10} /> 完成
          </span>
        ) : task.status === "failed" ? (
          <span className="flex items-center gap-1 truncate text-[10px] text-[var(--color-danger)]">
            <IconXCircle size={10} /> {task.error ?? "失败"}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--color-text-faint)]">已取消</span>
        )}
      </div>
    </div>
  );
}

export default function TaskIndicator(): JSX.Element | null {
  const { tasks, startPolling, stopPolling } = useTaskStore();
  const [expanded, setExpanded] = useState(true);
  const listId = "task-indicator-list";

  // Start polling on mount, stop on unmount.
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Show running + recently completed (last 30s) tasks.
  const now = Date.now();
  const visibleTasks = tasks.filter(
    (t) => t.status === "running" || (now - t.updatedAt < 30_000),
  );

  if (visibleTasks.length === 0) return null;

  const runningCount = visibleTasks.filter((t) => t.status === "running").length;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Header toggle */}
      <button
        type="button"
        className="animate-fade-in-up flex cursor-pointer items-center gap-2 self-end rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={listId}
        role="button"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
        <span className="text-xs text-[var(--color-primary)]">
          {runningCount > 0 ? `${runningCount} 个任务进行中` : "任务完成"}
        </span>
        <IconChevron
          size={10}
          direction={expanded ? "down" : "up"}
          className="text-[var(--color-text-faint)] transition-transform duration-200"
        />
      </button>

      {/* Task list */}
      {expanded && (
        <div id={listId} className="animate-fade-in-down flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
          {visibleTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
