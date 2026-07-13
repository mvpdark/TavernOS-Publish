import {
  useState,
  useEffect,
  useRef,
  type JSX,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiDelete } from "../api/client.js";
import { ConfirmDialog } from "../components/ui.tsx";
import Live2DPanel from "./create/Live2DPanel.js";
import ChatMessageList from "./create/ChatMessageList.js";
import AutopilotPanel from "./create/AutopilotPanel.js";
import CreateHeader from "./create/CreateHeader.js";
import ChatInputBar from "./create/ChatInputBar.js";
import { useCreateTaskWatcher } from "./create/useCreateTaskWatcher.js";
import { useChatStream } from "./create/useChatStream.js";
import { useAutopilot } from "./create/useAutopilot.js";
import {
  type ChatMessage,
  type AgentProgressItem,
  QUICK_ACTIONS,
} from "./create/constants.js";

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

  // Live2D panel state (emotion detection is handled inside Live2DPanel)
  const [live2dOpen, setLive2dOpen] = useState(false);
  const [live2dModelUrl, setLive2dModelUrl] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const loadedProjectRef = useRef<string | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const autopilotTaskIdRef = useRef<string | null>(null);
  // Timer for auto-clearing the save-status toast. Tracked in a ref so it
  // can be cleared on unmount / before scheduling a new one, preventing
  // overlapping timers and setState-after-unmount warnings.
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Watch for background task changes (completion + running state recovery) ---
  useCreateTaskWatcher({
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
  });

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

  // --- Chat streaming (sendMessage, stopStream, saveChapter) ---
  const { sendMessage, stopStream, saveChapter } = useChatStream({
    projectId, input, messages, streaming, xMode, rewriteChapterId, authorNote, writingPreset,
    abortRef, currentTaskIdRef, saveStatusTimerRef,
    setInput, setError, setStreaming, setMessages, setAgentProgress, setSaveStatus,
  });

  // --- Autopilot (startAutopilot, stopAutopilot) ---
  const { startAutopilot, stopAutopilot } = useAutopilot({
    projectId, autopilotActive, autopilotTarget, autopilotDirection, xMode, authorNote, writingPreset,
    abortRef, autopilotTaskIdRef, saveStatusTimerRef,
    setError, setStreaming, setAutopilotActive, setAutopilotProgress, setAgentProgress, setSaveStatus,
  });

  // --- Quick action buttons ---
  const quickActions = QUICK_ACTIONS;

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
    <div className="flex h-screen bg-[#0A0A0A] text-[#E8E8E8]">
     <div className="flex flex-1 flex-col min-w-0">
      <CreateHeader
        projectName={currentProject?.name ?? projectId}
        saveStatus={saveStatus}
        autopilotActive={autopilotActive}
        streaming={streaming}
        xMode={xMode}
        live2dOpen={live2dOpen}
        onBack={() => navigate("/write")}
        onClearAll={() => setConfirmClearAll(true)}
        onToggleAutopilot={() => setAutopilotPanelOpen((v) => !v)}
        onToggleXMode={() => setXMode((v) => !v)}
        onToggleLive2D={() => setLive2dOpen((v) => !v)}
      />

      <AutopilotPanel
        panelOpen={autopilotPanelOpen}
        active={autopilotActive}
        streaming={streaming}
        target={autopilotTarget}
        direction={autopilotDirection}
        progress={autopilotProgress}
        agentProgress={agentProgress}
        onTargetChange={setAutopilotTarget}
        onDirectionChange={setAutopilotDirection}
        onStart={() => void startAutopilot()}
        onStop={stopAutopilot}
        onClosePanel={() => setAutopilotPanelOpen(false)}
      />

      {/* --- Chat area --- */}
      <ChatMessageList
        messages={messages}
        streaming={streaming}
        loadingHistory={loadingHistory}
        agentProgress={agentProgress}
        error={error}
        quickActions={quickActions}
        onSendMessage={(text) => void sendMessage(text)}
        onSaveChapter={(content) => void saveChapter(content)}
      />

      <ChatInputBar
        input={input}
        onInputChange={setInput}
        onSend={() => void sendMessage()}
        streaming={streaming}
        onStop={stopStream}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        writingPreset={writingPreset}
        onWritingPresetChange={setWritingPreset}
        authorNote={authorNote}
        onAuthorNoteChange={setAuthorNote}
      />

      {confirmClearAll && (
        <ConfirmDialog
          message="确认清空所有已生成的章节？此操作不可撤销，故事设定和角色数据不受影响。"
          onCancel={() => setConfirmClearAll(false)}
          onConfirm={handleClearAll}
        />
      )}
     </div>

     {/* --- Live2D right panel --- */}
     <Live2DPanel
       messages={messages}
       open={live2dOpen}
       onClose={() => setLive2dOpen(false)}
       modelUrl={live2dModelUrl}
       onModelUrlChange={setLive2dModelUrl}
     />
    </div>
  );
}
