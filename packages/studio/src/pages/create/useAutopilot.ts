// useAutopilot.ts
// ---------------------------------------------------------------------------
// Custom hook extracted from Create.tsx.
//
// Encapsulates:
//   - startAutopilot(): SSE streaming for AI auto-writing chapters
//     (instruction frames, agent progress, chapter_saved, autopilot_done)
//   - stopAutopilot(): abort SSE + cancel backend task
//
// All state setters and refs are passed in from the parent component.
// ---------------------------------------------------------------------------

import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { useTaskStore } from "../../store/tasks.js";
import { BASE_URL, streamSsePost } from "../../api/client.js";
import type { AgentProgressItem } from "./constants.js";

interface AutopilotProgress {
  current: number;
  total: number;
  instruction: string | null;
}

interface UseAutopilotParams {
  projectId: string | undefined;
  autopilotActive: boolean;
  autopilotTarget: number;
  autopilotDirection: string;
  xMode: boolean;
  authorNote: string;
  writingPreset: string;
  abortRef: MutableRefObject<AbortController | null>;
  autopilotTaskIdRef: MutableRefObject<string | null>;
  saveStatusTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setError: (v: string | null) => void;
  setStreaming: (v: boolean) => void;
  setAutopilotActive: (v: boolean) => void;
  setAutopilotProgress: Dispatch<SetStateAction<AutopilotProgress>>;
  setAgentProgress: Dispatch<SetStateAction<{ current: string | null; completed: AgentProgressItem[] }>>;
  setSaveStatus: (v: string | null) => void;
}

export function useAutopilot({
  projectId,
  autopilotActive,
  autopilotTarget,
  autopilotDirection,
  xMode,
  authorNote,
  writingPreset,
  abortRef,
  autopilotTaskIdRef,
  saveStatusTimerRef,
  setError,
  setStreaming,
  setAutopilotActive,
  setAutopilotProgress,
  setAgentProgress,
  setSaveStatus,
}: UseAutopilotParams) {
  const cancelTask = useTaskStore((s) => s.cancelTask);

  const startAutopilot = useCallback(async () => {
    if (!projectId || autopilotActive) return;

    setAutopilotActive(true);
    setStreaming(true);
    setError(null);
    setAutopilotProgress({ current: 0, total: autopilotTarget, instruction: null });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamSsePost<{
        type: string;
        instruction?: string;
        chapter?: number;
        stage?: string;
        status?: string;
        issues?: number;
        fixes?: number;
        savedChapter?: { id: string; title: string; order: number } | null;
        totalChapters?: number;
        error?: string;
        taskId?: string;
      }>(
        `${BASE_URL}/projects/${projectId}/create/autopilot`,
        {
          targetChapters: autopilotTarget,
          direction: autopilotDirection || undefined,
          xMode,
          authorNote: authorNote || undefined,
          writingPreset: writingPreset !== "default" ? writingPreset : undefined,
        },
        (frame) => {
          if (frame.type === "task_started" && frame.taskId) {
            autopilotTaskIdRef.current = frame.taskId;
            return;
          }

          if (frame.type === "autopilot_instruction") {
            setAutopilotProgress((prev) => ({
              ...prev,
              current: frame.chapter ?? prev.current + 1,
              instruction: frame.instruction ?? null,
            }));
            setAgentProgress({ current: null, completed: [] });
          } else if (frame.type === "agent") {
            if (frame.status === "running") {
              setAgentProgress((prev) => ({ current: frame.stage ?? null, completed: prev.completed }));
            } else if (frame.status === "done") {
              setAgentProgress((prev) => ({
                current: null,
                completed: [...prev.completed, { stage: frame.stage ?? "", issues: frame.issues, fixes: frame.fixes }],
              }));
            }
          } else if (frame.type === "chapter_saved") {
            setSaveStatus(`已保存：${frame.savedChapter?.title ?? ""}`);
            if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
            saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
          } else if (frame.type === "autopilot_done") {
            setSaveStatus(`托管完成，共生成 ${frame.totalChapters} 章`);
            if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
            saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 5000);
          } else if (frame.type === "error") {
            setError(frame.error ?? "未知错误");
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      const taskId = autopilotTaskIdRef.current;
      const stillRunning =
        !!taskId &&
        useTaskStore.getState().tasks.some((t) => t.id === taskId && t.status === "running");
      if (!stillRunning) {
        setAutopilotActive(false);
        setAutopilotProgress({ current: 0, total: 0, instruction: null });
        setAgentProgress({ current: null, completed: [] });
        autopilotTaskIdRef.current = null;
      }
      setStreaming(false);
      abortRef.current = null;
    }
  }, [projectId, autopilotActive, autopilotTarget, autopilotDirection, xMode, authorNote, writingPreset]);

  const stopAutopilot = useCallback(async () => {
    abortRef.current?.abort();
    if (autopilotTaskIdRef.current) {
      try {
        await cancelTask(autopilotTaskIdRef.current);
      } catch {
        // Task may already be finished.
      }
      autopilotTaskIdRef.current = null;
    }
    setAutopilotActive(false);
    setStreaming(false);
    setAgentProgress({ current: null, completed: [] });
  }, [cancelTask]);

  return { startAutopilot, stopAutopilot };
}
