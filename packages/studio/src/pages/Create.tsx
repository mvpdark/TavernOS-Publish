import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type JSX,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjectStore } from "../store/project.js";
import { useTaskStore } from "../store/tasks.js";
import { apiGet, apiPost, apiDelete, BASE_URL, streamSsePost } from "../api/client.js";
import { ConfirmDialog } from "../components/ui.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // Stable unique id used as the React list key. Backend-loaded messages may
  // not include one, in which case a positional fallback is used at render.
  id?: string;
  quickReplies?: string[];
  chapterContent?: string;
  agents?: string[];
  autoSaved?: boolean;
}

/** Generate a unique id for a locally-created chat message. */
function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AgentProgressItem {
  stage: string;
  issues?: number;
  fixes?: number;
}

const AGENT_LABELS: Record<string, string> = {
  writer: "Writer",
  auditor: "Auditor",
  reviser: "Reviser",
  consolidator: "Consolidator",
  conductor: "Conductor",
  architect: "Architect",
};

const WRITING_PRESETS = [
  { value: "default", label: "默认" },
  { value: "fast", label: "快节奏" },
  { value: "slow", label: "慢节奏" },
  { value: "memory", label: "回忆" },
  { value: "emotion", label: "情感" },
  { value: "dialogue", label: "对话驱动" },
  { value: "suspense", label: "悬疑" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Create(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [agentProgress, setAgentProgress] = useState<{
    current: string | null;
    completed: AgentProgressItem[];
  }>({ current: null, completed: [] });

  // Autopilot state
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [autopilotPanelOpen, setAutopilotPanelOpen] = useState(false);
  const [autopilotTarget, setAutopilotTarget] = useState(3);
  const [autopilotDirection, setAutopilotDirection] = useState("");
  const [autopilotProgress, setAutopilotProgress] = useState<{
    current: number;
    total: number;
    instruction: string | null;
  }>({ current: 0, total: 0, instruction: null });

  // X mode state — when enabled, ALL agents use Grok 4.3
  const [xMode, setXMode] = useState(false);

  // Author's note & writing preset — passed as separate fields in request body
  const [authorNote, setAuthorNote] = useState("");
  const [writingPreset, setWritingPreset] = useState("default");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedProjectRef = useRef<string | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const autopilotTaskIdRef = useRef<string | null>(null);
  // Timer for auto-clearing the save-status toast. Tracked in a ref so it
  // can be cleared on unmount / before scheduling a new one, preventing
  // overlapping timers and setState-after-unmount warnings.
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Watch for background task changes (completion + running state recovery) ---
  const taskTasks = useTaskStore((s) => s.tasks);
  const cancelTask = useTaskStore((s) => s.cancelTask);
  const lastTaskCheckRef = useRef(0);
  useEffect(() => {
    // Cancel flag: if the effect re-runs (or the component unmounts) before the
    // async history refresh resolves, skip the setState calls to avoid
    // overwriting state for a different project / stale task snapshot.
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
      // Autopilot is running in the background but UI doesn't show it — restore.
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

    // A background task just completed. If the task result contains a
    // doneFrame (stored server-side when the SSE done frame was sent), use
    // it to update the messages directly — no history refresh needed. This
    // handles the case where the SSE stream was closed (client disconnect,
    // idle timeout) before the done frame arrived.
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
      // No doneFrame — fall back to refreshing chat history from the server.
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
    // Dependencies: `taskTasks` drives re-runs on poll updates, `projectId`
    // scopes to the current project, `autopilotActive` gates the restore logic.
    // `streaming` is set within this effect but never read, so it is not a
    // dependency (adding it would cause unnecessary re-runs).
  }, [taskTasks, projectId, autopilotActive]);

  // --- Abort in-flight SSE streams on unmount (but NOT autopilot — it runs in background) ---
  useEffect(() => {
    return () => {
      // Only abort regular chat streams. Autopilot tasks survive page switches
      // via the TaskManager — the SSE stream will disconnect but the task
      // continues, and progress is restored from the task store on return.
      if (!autopilotTaskIdRef.current) {
        abortRef.current?.abort();
      }
      // Clear any pending save-status toast timer to avoid setState-after-unmount.
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  // --- Load chat history on mount / project switch ---
  useEffect(() => {
    if (!projectId || loadedProjectRef.current === projectId) return;
    loadedProjectRef.current = projectId;
    let cancelled = false;
    setLoadingHistory(true);
    void (async () => {
      try {
        const data = await apiGet<{ history: ChatMessage[] }>(
          `/projects/${projectId}/create/history`,
        );
        if (!cancelled && data.history && data.history.length > 0) {
          setMessages(data.history);
        }
      } catch {
        // New project — no history yet.
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // --- Rewrite mode: detect ?rewrite=chapterId and preload chapter ---
  const rewriteChapterId = searchParams.get("rewrite");
  const rewriteChapterNum = searchParams.get("chapter");
  useEffect(() => {
    if (!projectId || !rewriteChapterId) return;
    void (async () => {
      try {
        const ch = await apiGet<{ title: string; content: string; order: number }>(
          `/projects/${projectId}/story/${rewriteChapterId}`,
        );
        const chNum = rewriteChapterNum ?? String(ch.order + 1);
        const rewriteMsg = `请重写第${chNum}章「${ch.title}」。\n\n以下是旧版内容，请在保持核心情节的基础上重新创作，提升文笔和细节：\n\n${ch.content.slice(0, 2000)}${ch.content.length > 2000 ? "..." : ""}`;
        setInput(rewriteMsg);
      } catch {
        setError("无法加载原章节内容，请手动输入重写指令。");
      }
    })();
  }, [projectId, rewriteChapterId, rewriteChapterNum]);

  // --- Auto-scroll to bottom on new messages ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Send a chat message via SSE ---
  // NOTE: `messages` is a dependency because the current history is sent to
  // the backend on each request (historyForApi). This is intentional — the
  // server needs the up-to-date conversation context. Re-creating the callback
  // on every new message is acceptable here and avoids stale-history bugs.
  const sendMessage = useCallback(async (overrideText?: string) => {
    const userMsg = (overrideText ?? input).trim();
    if (!projectId || !userMsg || streaming) return;

    setInput("");
    setError(null);
    setStreaming(true);
    setAgentProgress({ current: null, completed: [] });

    const userMessage: ChatMessage = { id: newMessageId(), role: "user", content: userMsg };
    const assistantPlaceholder: ChatMessage = { id: newMessageId(), role: "assistant", content: "" };
    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let assistantText = "";

      await streamSsePost<{
        type: string;
        content?: string;
        chapterContent?: string | null;
        quickReplies?: string[];
        error?: string;
        stage?: string;
        status?: string;
        issues?: number;
        fixes?: number;
        agents?: string[];
        message?: string;
        savedChapter?: { id: string; title: string; order: number } | null;
        instruction?: string;
        chapter?: number;
        totalChapters?: number;
        taskId?: string;
      }>(
        `${BASE_URL}/projects/${projectId}/create/chat`,
        { message: userMsg, history: historyForApi, xMode, rewriteChapterId: rewriteChapterId ?? undefined, authorNote: authorNote || undefined, writingPreset: writingPreset !== "default" ? writingPreset : undefined },
        (frame) => {
          // First frame: register the task ID for background tracking.
          if (frame.type === "task_started" && frame.taskId) {
            currentTaskIdRef.current = frame.taskId;
            return;
          }

          if (frame.type === "agent") {
            if (frame.status === "running") {
              setAgentProgress((prev) => ({
                current: frame.stage ?? null,
                completed: prev.completed,
              }));
            } else if (frame.status === "done") {
              setAgentProgress((prev) => ({
                current: null,
                completed: [
                  ...prev.completed,
                  {
                    stage: frame.stage ?? "",
                    issues: frame.issues,
                    fixes: frame.fixes,
                  },
                ],
              }));
            }
          } else if (frame.type === "agent_retry") {
            // Per-agent models failed — reset progress for the retry
            // attempt with the default model.
            setAgentProgress({ current: null, completed: [] });
          } else if (frame.type === "delta" && frame.content) {
            assistantText += frame.content;
            setMessages((prev) => {
              const copy = [...prev];
              // Preserve the placeholder message's id to maintain React
              // key stability across streaming updates.
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                role: "assistant",
                content: assistantText,
              };
              return copy;
            });
          } else if (frame.type === "done") {
            assistantText = frame.content ?? assistantText;
            const savedInfo = frame.savedChapter
              ? ` · 已自动保存为${frame.savedChapter.title}`
              : "";
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                role: "assistant",
                content: assistantText + (savedInfo ? `\n\n✅ ${savedInfo}` : ""),
                quickReplies: frame.quickReplies ?? [],
                chapterContent: frame.chapterContent ?? undefined,
                agents: frame.agents,
                autoSaved: !!frame.savedChapter,
              };
              return copy;
            });
            if (frame.savedChapter) {
              setSaveStatus(`已保存：${frame.savedChapter.title}`);
              if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
              saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
            }
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
      setStreaming(false);
      abortRef.current = null;
    }
  }, [projectId, input, messages, streaming, xMode, rewriteChapterId, authorNote, writingPreset]);

  // --- Stop streaming ---
  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  // --- Start autopilot mode (AI auto-writes chapters) ---
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
          // First frame: register the task ID for background tracking + cancellation.
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
              setAgentProgress((prev) => ({
                current: frame.stage ?? null,
                completed: prev.completed,
              }));
            } else if (frame.status === "done") {
              setAgentProgress((prev) => ({
                current: null,
                completed: [
                  ...prev.completed,
                  { stage: frame.stage ?? "", issues: frame.issues, fixes: frame.fixes },
                ],
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
      // Determine whether the backend task is still running. If the SSE stream
      // dropped but the task continues server-side, preserve the task id and UI
      // state so the task-listener effect can keep tracking progress (and the
      // user can still cancel via stopAutopilot). Only reset when the task has
      // truly finished, otherwise we'd lose the ability to recover/cancel.
      const stillRunning =
        !!taskId &&
        useTaskStore
          .getState()
          .tasks.some((t) => t.id === taskId && t.status === "running");
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

  // --- Stop autopilot ---
  const stopAutopilot = useCallback(async () => {
    // 1. Abort the SSE stream (stops receiving updates).
    abortRef.current?.abort();
    // 2. Cancel the backend task (aborts LLM calls and breaks the loop).
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

  // --- Save chapter content ---
  const saveChapter = useCallback(async (content: string, title?: string) => {
    if (!projectId || !content.trim()) return;
    setSaveStatus("保存中…");
    try {
      const res = await apiPost<{ title: string }>(
        `/projects/${projectId}/create/save`,
        { content, title: title || `第${messages.filter((m) => m.chapterContent).length + 1}章` },
      );
      setSaveStatus(`已保存：${res.title}`);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("保存失败");
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [projectId, messages]);

  // --- Quick action buttons ---
  const quickActions = [
    "续写下一段",
    "改写最后一段",
    "脑暴下个情节",
    "生成角色对话",
  ];

  // --- Clear all chapters ---
  const handleClearAll = async (): Promise<void> => {
    if (!projectId) return;
    try {
      await apiDelete<{ success: boolean; deleted: number }>(
        `/projects/${projectId}/story`,
      );
      setConfirmClearAll(false);
      setMessages([]);
      setSaveStatus("已清空所有章节");
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfirmClearAll(false);
    }
  };

  // --- No project selected ---
  if (!projectId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#666]">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-light text-[#C9A86C]">创作</h1>
          <p className="text-sm">请先在创作库中选择一个项目</p>
          <button
            onClick={() => navigate("/write/library")}
            className="mt-4 rounded-lg border border-[#C9A86C]/30 px-4 py-2 text-sm text-[#C9A86C] hover:bg-[#C9A86C]/10"
          >
            前往创作库
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0A0A0A] text-[#E8E8E8]">
      {/* --- Header --- */}
      <div className="flex items-center justify-between border-b border-[#C9A86C]/10 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/write")}
            className="text-sm text-[#666] hover:text-[#C9A86C]"
          >
            ← 返回
          </button>
          <h1 className="text-lg font-light text-[#C9A86C]">对话式创作</h1>
          <span className="text-xs text-[#666]">
            {currentProject?.name ?? projectId}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs text-[#C9A86C]">{saveStatus}</span>
          )}
          {/* Clear all chapters */}
          {!autopilotActive && !streaming && (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="rounded-lg border border-[rgba(201,104,90,0.2)] px-3 py-1.5 text-xs text-[#C9685A] hover:bg-[rgba(201,104,90,0.08)]"
              title="删除所有已生成的章节"
            >
              清空章节
            </button>
          )}
          {/* Autopilot toggle */}
            {!autopilotActive && !streaming && (
              <button
                onClick={() => setAutopilotPanelOpen((v) => !v)}
                className="rounded-lg border border-[#C9A86C]/30 px-3 py-1.5 text-xs text-[#C9A86C] hover:bg-[#C9A86C]/10"
              >
                托管模式
              </button>
            )}
            {/* X mode toggle */}
            <button
              onClick={() => setXMode((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                xMode
                  ? "border-black/60 bg-black text-white"
                  : "border-[#333] text-[#666] hover:bg-[#1A1A1A]"
              }`}
              title="X 模式：所有 Agent 使用 Grok 4.3"
            >
              <span className="font-bold">𝕏</span>
              {xMode ? "Grok 模式" : "X 模式"}
            </button>
        </div>
      </div>

      {/* --- Autopilot panel --- */}
      <div id="autopilot-panel" className={`${autopilotPanelOpen ? "" : "hidden"} border-b border-[#C9A86C]/10 bg-[#0F0F0F] px-6 py-3`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">目标章数</label>
            <input
              type="number"
              min={1}
              max={50}
              value={autopilotTarget}
              onChange={(e) => setAutopilotTarget(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-1.5 text-sm text-[#E8E8E8] outline-none focus:border-[#C9A86C]/40"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-[#888]">创作方向（可选）</label>
            <input
              type="text"
              value={autopilotDirection}
              onChange={(e) => setAutopilotDirection(e.target.value)}
              placeholder="如：悬疑推理，主角是侦探，逐步揭开阴谋"
              className="flex-1 rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-1.5 text-sm text-[#E8E8E8] placeholder-[#555] outline-none focus:border-[#C9A86C]/40"
            />
          </div>
          <button
            onClick={() => void startAutopilot()}
            disabled={streaming}
            className="rounded-lg bg-[#C9A86C]/15 px-4 py-2 text-sm text-[#C9A86C] hover:bg-[#C9A86C]/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            启动托管
          </button>
          <button
            onClick={() => setAutopilotPanelOpen(false)}
            className="rounded-lg border border-[#333] px-3 py-2 text-sm text-[#666] hover:bg-[#1A1A1A]"
          >
            取消
          </button>
        </div>
      </div>

      {/* --- Autopilot progress bar --- */}
      {autopilotActive && autopilotProgress.total > 0 && (
        <div className="border-b border-[#C9A86C]/10 bg-[#0F0F0F] px-6 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#C9A86C]">
              托管创作中 · 第 {autopilotProgress.current}/{autopilotProgress.total} 章
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A1A1A]">
              <div
                className="h-full w-full origin-left rounded-full bg-[#C9A86C]/60 transition-transform"
                style={{ transform: `scaleX(${autopilotProgress.current / autopilotProgress.total})` }}
              />
            </div>
            {autopilotProgress.instruction && (
              <span className="max-w-[40%] truncate text-xs text-[#888]">
                指令：{autopilotProgress.instruction}
              </span>
            )}
            {agentProgress.current && (
              <span className="text-xs text-[#C9A86C]/70">
                {AGENT_LABELS[agentProgress.current] ?? agentProgress.current}…
              </span>
            )}
            <button
              onClick={stopAutopilot}
              className="btn-press rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-1 text-xs text-[var(--color-danger)] hover:bg-[rgba(201,104,90,0.15)]"
            >
              停止托管
            </button>
          </div>
        </div>
      )}

      {/* --- Chat area --- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {loadingHistory ? (
              <p className="text-sm text-[#888]">加载中...</p>
            ) : (
            <>
            <h2 className="mb-2 text-2xl font-light text-[#C9A86C]">
              对话式创作
            </h2>
            <p className="mb-1 text-sm text-[#888]">
              跟创作助手聊聊，AI 会记住你的故事设定
            </p>
            <p className="mb-6 text-xs text-[#555]">
              续写、改写、脑暴剧情、生成角色对话 — 生成的内容可以一键保存为章节
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => void sendMessage(action)}
                  disabled={streaming}
                  className="rounded-full border border-[#C9A86C]/30 bg-[#C9A86C]/5 px-4 py-2 text-sm text-[#C9A86C] transition-colors hover:border-[#C9A86C]/60 hover:bg-[#C9A86C]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {action}
                </button>
              ))}
            </div>
            </>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={m.id || `msg-${i}`}
            className={
              m.role === "user"
                ? "flex justify-end"
                : "flex flex-col items-start gap-2"
            }
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-[#1C1C1E] px-4 py-2.5 text-sm text-[#E8E8E8]"
                  : "max-w-[85%] rounded-2xl rounded-tl-sm bg-[#141414] px-4 py-2.5 text-sm leading-loose text-[#E8E8E8] [text-align:justify] [text-justify:inter-character] [word-break:break-word]"
              }
            >
              {m.content || (
                streaming && i === messages.length - 1 && agentProgress.current ? (
                  <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#C9A86C]"></span>
                      <span className="text-xs text-[#C9A86C]">
                        {AGENT_LABELS[agentProgress.current] ?? agentProgress.current} Agent 工作中…
                      </span>
                    </div>
                    {agentProgress.completed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {agentProgress.completed.map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-[#C9A86C]/10 px-2 py-0.5 text-[10px] text-[#C9A86C]/70"
                          >
                            ✓ {AGENT_LABELS[item.stage] ?? item.stage}
                            {item.issues != null ? ` (${item.issues} issues)` : ""}
                            {item.fixes != null ? ` (${item.fixes} fixes)` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce text-[#C9A86C]">·</span>
                    <span className="animate-bounce text-[#C9A86C]" style={{ animationDelay: "0.15s" }}>·</span>
                    <span className="animate-bounce text-[#C9A86C]" style={{ animationDelay: "0.3s" }}>·</span>
                  </span>
                )
              )}
            </div>

            {/* Agent badges */}
            {m.role === "assistant" && m.agents && m.agents.length > 0 && m.content && (
              <div className="flex flex-wrap gap-1.5">
                {m.agents.map((agent) => (
                  <span
                    key={agent}
                    className="rounded-full bg-[#C9A86C]/10 px-2 py-0.5 text-[10px] text-[#C9A86C]/70"
                  >
                    {AGENT_LABELS[agent] ?? agent}
                  </span>
                ))}
              </div>
            )}

            {/* Chapter content preview + save button */}
            {m.role === "assistant" && m.chapterContent && m.content && (
              <div className="max-w-[85%] rounded-xl border border-[#C9A86C]/20 bg-[#C9A86C]/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-[#C9A86C]/60">正文内容</span>
                  {/* 已自动保存的章节不显示手动保存按钮，避免重复保存 */}
                  {!m.autoSaved && (
                    <button
                      onClick={() => void saveChapter(m.chapterContent!)}
                      disabled={streaming}
                      className="rounded-md bg-[#C9A86C]/15 px-3 py-1 text-xs text-[#C9A86C] transition-colors hover:bg-[#C9A86C]/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      保存为章节
                    </button>
                  )}
                  {m.autoSaved && (
                    <span className="text-xs text-[#C9A86C]/40">已自动保存</span>
                  )}
                </div>
                <div className="text-sm leading-loose text-[#CCC] [text-align:justify] [text-justify:inter-character] [word-break:break-word] whitespace-pre-wrap">
                  {m.chapterContent}
                </div>
              </div>
            )}

            {/* Quick replies */}
            {m.role === "assistant" && m.quickReplies && m.quickReplies.length > 0 && m.content && (
              <div className="flex flex-wrap gap-2">
                {m.quickReplies.map((qr, qIdx) => (
                  <button
                    key={`qr-${i}-${qIdx}`}
                    disabled={streaming}
                    onClick={() => void sendMessage(qr)}
                    className="rounded-full border border-[#C9A86C]/30 bg-[#C9A86C]/5 px-3 py-1.5 text-xs text-[#C9A86C] transition-colors hover:border-[#C9A86C]/60 hover:bg-[#C9A86C]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="mt-4 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
      </div>

      {/* --- Settings panel (collapsible) --- */}
      {settingsOpen && (
        <div className="border-t border-[#C9A86C]/10 bg-[#0F0F0F] px-6 py-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {/* 叙事节奏 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#888]">叙事节奏</label>
              <select
                value={writingPreset}
                onChange={(e) => setWritingPreset(e.target.value)}
                className="w-full rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-2 text-sm text-[#E8E8E8] outline-none focus:border-[#C9A86C]/40"
              >
                {WRITING_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value} className="bg-[#141414] text-[#E8E8E8]">
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            {/* 作者批注 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#888]">作者批注</label>
              <textarea
                value={authorNote}
                onChange={(e) => setAuthorNote(e.target.value)}
                placeholder="例：增加紧张感、聚焦角色内心冲突、结尾留悬念…"
                rows={3}
                className="w-full resize-none rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] outline-none focus:border-[#C9A86C]/40"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#666] hover:bg-[#1A1A1A]"
              >
                收起
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Input area --- */}
      <div className="border-t border-[#C9A86C]/10 px-6 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="跟创作助手聊聊…（Enter 发送）"
            className="flex-1 rounded-xl border border-[#C9A86C]/20 bg-[#141414] px-4 py-2.5 text-sm text-[#E8E8E8] placeholder-[#555] outline-none focus:border-[#C9A86C]/40"
          />
          {/* Settings toggle (gear icon) */}
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              settingsOpen || authorNote || writingPreset !== "default"
                ? "border-[#C9A86C]/40 bg-[#C9A86C]/10 text-[#C9A86C]"
                : "border-[#333] text-[#666] hover:bg-[#1A1A1A]"
            }`}
            title="作者批注 & 叙事节奏"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {streaming ? (
            <button
              onClick={stopStream}
              className="btn-press rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[rgba(201,104,90,0.15)]"
            >
              停止
            </button>
          ) : (
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim()}
              className="rounded-xl bg-[#C9A86C]/15 px-4 py-2.5 text-sm text-[#C9A86C] hover:bg-[#C9A86C]/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              发送
            </button>
          )}
        </div>
      </div>

      {confirmClearAll && (
        <ConfirmDialog
          message="确认清空所有已生成的章节？此操作不可撤销，故事设定和角色数据不受影响。"
          onCancel={() => setConfirmClearAll(false)}
          onConfirm={handleClearAll}
        />
      )}
    </div>
  );
}
