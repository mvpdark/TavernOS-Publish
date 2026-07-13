// useCreateTaskWatcher.ts
// ---------------------------------------------------------------------------
// Custom hook extracted from Create.tsx.
//
// Watches the global task store for create-chat / create-autopilot task
// changes. Handles two scenarios:
//   1. Running-task recovery: if an autopilot task is running in the
//      background but the UI doesn't show it (e.g. user navigated away and
//      came back), restore the active state + progress.
//   2. Completion handling: when a background task finishes, update the
//      chat messages with the result (doneFrame) or fall back to refreshing
//      history from the server.
//
// All state setters and refs are passed in from the parent component to
// avoid duplicating state ownership.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useTaskStore } from "../../store/tasks.js";
import { apiGet } from "../../api/client.js";
import { newMessageId, type ChatMessage, type AgentProgressItem } from "./constants.js";

interface UseCreateTaskWatcherParams {
  projectId: string | undefined;
  autopilotActive: boolean;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setStreaming: (v: boolean) => void;
  setAutopilotActive: (v: boolean) => void;
  setAutopilotPanelOpen: (v: boolean) => void;
  setAutopilotProgress: React.Dispatch<React.SetStateAction<{
    current: number;
    total: number;
    instruction: string | null;
  }>>;
  setAgentProgress: React.Dispatch<React.SetStateAction<{
    current: string | null;
    completed: AgentProgressItem[];
  }>>;
  setSaveStatus: (v: string | null) => void;
  autopilotTaskIdRef: React.MutableRefObject<string | null>;
  saveStatusTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useCreateTaskWatcher({
  projectId,
  autopilotActive,
  setMessages,
  setStreaming,
  setAutopilotActive,
  setAutopilotPanelOpen,
  setAutopilotProgress,
  setAgentProgress,
  setSaveStatus,
  autopilotTaskIdRef,
  saveStatusTimerRef,
}: UseCreateTaskWatcherParams): void {
  const taskTasks = useTaskStore((s) => s.tasks);
  const lastTaskCheckRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    if (now - lastTaskCheckRef.current < 3000) return;
    lastTaskCheckRef.current = now;

    // Check for running autopilot tasks (restore state after page switch).
    const runningAutopilot = taskTasks.find(
      (t) =>
        t.type === "create-autopilot" &&
        t.projectId === projectId &&
        t.status === "running",
    );
    if (runningAutopilot && !autopilotActive && !autopilotTaskIdRef.current) {
      autopilotTaskIdRef.current = runningAutopilot.id;
      setAutopilotActive(true);
      setStreaming(true);
      setAutopilotPanelOpen(true);
      setAutopilotProgress({
        current: runningAutopilot.progress.current,
        total: runningAutopilot.progress.total,
        instruction: runningAutopilot.progress.message ?? null,
      });
      if (runningAutopilot.progress.agentStage) {
        setAgentProgress({
          current: runningAutopilot.progress.agentStage,
          completed: runningAutopilot.progress.agentCompleted ?? [],
        });
      }
    }

    // Update progress from running autopilot task (when SSE is disconnected).
    if (runningAutopilot && autopilotActive) {
      setAutopilotProgress((prev) => ({
        current: runningAutopilot.progress.current || prev.current,
        total: runningAutopilot.progress.total || prev.total,
        instruction: runningAutopilot.progress.message ?? prev.instruction,
      }));
      if (runningAutopilot.progress.agentStage) {
        setAgentProgress({
          current: runningAutopilot.progress.agentStage,
          completed: runningAutopilot.progress.agentCompleted ?? [],
        });
      } else if (runningAutopilot.progress.agentCompleted?.length) {
        setAgentProgress({
          current: null,
          completed: runningAutopilot.progress.agentCompleted,
        });
      }
    }

    // Check for completed create-chat or create-autopilot tasks for this project.
    const completed = taskTasks.filter(
      (t) =>
        (t.type === "create-chat" || t.type === "create-autopilot") &&
        t.projectId === projectId &&
        (t.status === "completed" || t.status === "failed" || t.status === "cancelled") &&
        now - t.updatedAt < 10_000,
    );
    if (completed.length === 0) return;

    const taskResult = completed[0].result as {
      doneFrame?: {
        type: string;
        content: string;
        chapterContent?: string | null;
        quickReplies?: string[];
        agents?: string[];
        savedChapter?: { id: string; title: string; order: number };
      };
    } | undefined;
    const doneFrame = taskResult?.doneFrame;

    if (doneFrame && typeof doneFrame.content === "string") {
      const savedChapter = doneFrame.savedChapter;
      const savedInfo = savedChapter ? ` · 已自动保存为${savedChapter.title}` : "";
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const content = doneFrame.content + (savedInfo ? `\n\n✅ ${savedInfo}` : "");
        if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
          copy[lastIdx] = {
            ...copy[lastIdx],
            content,
            quickReplies: doneFrame.quickReplies ?? [],
            chapterContent: doneFrame.chapterContent ?? undefined,
            agents: doneFrame.agents,
            autoSaved: !!savedChapter,
          };
        } else {
          copy.push({
            id: newMessageId(),
            role: "assistant",
            content,
            quickReplies: doneFrame.quickReplies ?? [],
            chapterContent: doneFrame.chapterContent ?? undefined,
            agents: doneFrame.agents,
            autoSaved: !!savedChapter,
          });
        }
        return copy;
      });
      if (savedChapter) {
        setSaveStatus(`已保存：${savedChapter.title}`);
        if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
      }
      setStreaming(false);
      setAutopilotActive(false);
      setAgentProgress({ current: null, completed: [] });
      autopilotTaskIdRef.current = null;
    } else {
      void (async () => {
        try {
          const data = await apiGet<{ history: ChatMessage[] }>(
            `/projects/${projectId}/create/history`,
          );
          if (cancelled) return;
          if (data.history && data.history.length > 0) {
            setMessages(data.history);
          }
          setStreaming(false);
          setAutopilotActive(false);
          setAgentProgress({ current: null, completed: [] });
          autopilotTaskIdRef.current = null;
        } catch {
          // Non-fatal.
        }
      })();
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskTasks, projectId, autopilotActive]);
}
