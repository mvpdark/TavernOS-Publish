// useChatStream.ts
// ---------------------------------------------------------------------------
// Custom hook extracted from Create.tsx.
//
// Encapsulates:
//   - sendMessage(): SSE streaming for chat messages (agent progress,
//     delta accumulation, done frame with chapter content/quick replies)
//   - stopStream(): abort in-flight SSE
//   - saveChapter(): save generated chapter content to backend
//
// All state setters and refs are passed in from the parent component.
// ---------------------------------------------------------------------------

import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { apiPost, BASE_URL, streamSsePost } from "../../api/client.js";
import { newMessageId, type ChatMessage, type AgentProgressItem } from "./constants.js";

interface UseChatStreamParams {
  projectId: string | undefined;
  input: string;
  messages: ChatMessage[];
  streaming: boolean;
  xMode: boolean;
  rewriteChapterId: string | null;
  authorNote: string;
  writingPreset: string;
  abortRef: MutableRefObject<AbortController | null>;
  currentTaskIdRef: MutableRefObject<string | null>;
  saveStatusTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setInput: (v: string) => void;
  setError: (v: string | null) => void;
  setStreaming: (v: boolean) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setAgentProgress: Dispatch<SetStateAction<{ current: string | null; completed: AgentProgressItem[] }>>;
  setSaveStatus: (v: string | null) => void;
}

export function useChatStream({
  projectId,
  input,
  messages,
  streaming,
  xMode,
  rewriteChapterId,
  authorNote,
  writingPreset,
  abortRef,
  currentTaskIdRef,
  saveStatusTimerRef,
  setInput,
  setError,
  setStreaming,
  setMessages,
  setAgentProgress,
  setSaveStatus,
}: UseChatStreamParams) {
  const sendMessage = useCallback(async (overrideText?: string) => {
    const userMsg = (overrideText ?? input).trim();
    if (!projectId || !userMsg || streaming) return;

    setInput("");
    setError(null);
    setStreaming(true);
    setAgentProgress({ current: null, completed: [] });

    const userMessage: ChatMessage = { id: newMessageId(), role: "user", content: userMsg };
    const assistantPlaceholder: ChatMessage = { id: newMessageId(), role: "assistant", content: "" };
    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));

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
          if (frame.type === "task_started" && frame.taskId) {
            currentTaskIdRef.current = frame.taskId;
            return;
          }

          if (frame.type === "agent") {
            if (frame.status === "running") {
              setAgentProgress((prev) => ({ current: frame.stage ?? null, completed: prev.completed }));
            } else if (frame.status === "done") {
              setAgentProgress((prev) => ({
                current: null,
                completed: [...prev.completed, { stage: frame.stage ?? "", issues: frame.issues, fixes: frame.fixes }],
              }));
            }
          } else if (frame.type === "agent_retry") {
            setAgentProgress({ current: null, completed: [] });
          } else if (frame.type === "delta" && frame.content) {
            assistantText += frame.content;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], role: "assistant", content: assistantText };
              return copy;
            });
          } else if (frame.type === "done") {
            assistantText = frame.content ?? assistantText;
            const savedInfo = frame.savedChapter ? ` · 已自动保存为${frame.savedChapter.title}` : "";
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

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

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

  return { sendMessage, stopStream, saveChapter };
}
