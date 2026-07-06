import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiPut, proxyImageUrl, BASE_URL, streamSsePost } from "../api/client.js";
import { useTaskStore } from "../store/tasks.js";
import { SkeletonList } from "../components/Skeleton.tsx";
import { RetryButton } from "../components/RetryButton.tsx";
import type {
  CharactersResponse,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  PersonaCard,
  SSEEvent,
  TokenUsage,
} from "./chat/types.js";
import MessageList from "./chat/MessageList.js";
import ChatInput from "./chat/ChatInput.js";
import { CJK_FONT } from "./chat/constants.js";
import VisualNovelOverlay from "../components/VisualNovelOverlay.js";
import { coverColor } from "../lib/theme.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlobalCharacter {
  filename: string;
  projectId: string;
  name: string;
  description: string;
  arc: string;
  roleType: string;
  avatar: string;
  pendingSelection: boolean;
}

interface Project {
  id: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract appearance count from the arc string.
 * arc format: "出场3次（第1-5章）" → returns 3.
 */
function parseAppearanceCount(arc: string): number {
  const m = arc.match(/出场(\d+)次/);
  return m ? parseInt(m[1]!, 10) : 0;
}

/**
 * Build a fully-formed ChatMessage (with swipes + metadata) from a plain
 * role/content pair. Keeps `content` in sync with `swipes[0]`.
 */
function makeMessage(
  role: "user" | "assistant",
  content: string,
  parentId: string | null = null,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    swipes: [content],
    swipeIndex: 0,
    timestamp: Date.now(),
    parentId,
  };
}

// ---------------------------------------------------------------------------
// Main Chat page — two-layer navigation (folder → character → chat)
// ---------------------------------------------------------------------------

export default function Chat(): JSX.Element {
  const [searchParams] = useSearchParams();
  const pendingProjectId = searchParams.get("projectId");
  const pendingChar = searchParams.get("char");

  const [projects, setProjects] = useState<Project[]>([]);
  const [globalCharacters, setGlobalCharacters] = useState<GlobalCharacter[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Layer 2: characters for the selected project
  const [characters, setCharacters] = useState<PersonaCard[]>([]);
  const [selectedChar, setSelectedChar] = useState<string>("");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charError, setCharError] = useState<string | null>(null);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [vnMode, setVnMode] = useState(false);
  // Session persistence state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsList, setSessionsList] = useState<ChatSessionMeta[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  // Author's Note — persisted on the session and injected into LLM context.
  const [authorNote, setAuthorNote] = useState("");
  const [authorNoteDepth, setAuthorNoteDepth] = useState(4);
  const [showAuthorNote, setShowAuthorNote] = useState(false);
  const authorNoteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);
  const mountedRef = useRef(true);
  const currentTaskIdRef = useRef<string | null>(null);
  // Debounced session-save timer. Edits/deletes/swipes trigger a deferred PUT
  // so we don't hammer the backend on every keystroke during editing.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref mirror of messages so the debounced save always reads the latest.
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // --- Watch for completed background chat tasks (when user navigates back) ---
  const taskTasks = useTaskStore((s) => s.tasks);
  const lastTaskCheckRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastTaskCheckRef.current < 3000) return;
    lastTaskCheckRef.current = now;
    const completed = taskTasks.filter(
      (t) =>
        t.type === "chat-stream" &&
        t.projectId === selectedProjectId &&
        (t.status === "completed" || t.status === "failed") &&
        now - t.updatedAt < 10_000,
    );
    if (completed.length === 0 || !currentSessionId) return;
    // A background chat task just completed — reload the session to pick up
    // the persisted messages instead of hitting the old dangling endpoint.
    void (async () => {
      try {
        const data = await apiGet<{ session: ChatSession | null }>(
          `/projects/${selectedProjectId}/chat/sessions/${currentSessionId}`,
        );
        if (data.session?.messages && mountedRef.current) {
          setMessages(data.session.messages);
        }
        if (mountedRef.current) {
          setSending(false);
          setStreaming(false);
        }
      } catch {
        // Non-fatal.
      }
    })();
  }, [taskTasks, selectedProjectId, currentSessionId]);

  // --- Session persistence helpers ---

  /** Refresh the session list for the currently selected character. */
  const refreshSessions = useCallback(async (filename: string) => {
    if (!selectedProjectId || !filename) return;
    try {
      const data = await apiGet<{ sessions: ChatSessionMeta[] }>(
        `/projects/${selectedProjectId}/chat/sessions?characterFilename=${encodeURIComponent(filename)}`,
      );
      setSessionsList(data.sessions ?? []);
    } catch {
      setSessionsList([]);
    }
  }, [selectedProjectId]);

  /** Load the most recent session for a character, or create a new one.
   *  Sets currentSessionId and messages. Returns the session id (or null). */
  const loadOrCreateSession = useCallback(async (filename: string): Promise<string | null> => {
    if (!selectedProjectId || !filename) return null;
    try {
      const listData = await apiGet<{ sessions: ChatSessionMeta[] }>(
        `/projects/${selectedProjectId}/chat/sessions?characterFilename=${encodeURIComponent(filename)}`,
      );
      const sessions = listData.sessions ?? [];
      setSessionsList(sessions);
      if (sessions.length > 0) {
        // Load the most recently updated session.
        const sid = sessions[0].id;
        const data = await apiGet<{ session: ChatSession | null }>(
          `/projects/${selectedProjectId}/chat/sessions/${sid}`,
        );
        if (data.session) {
          setCurrentSessionId(sid);
          setMessages(data.session.messages);
          setAuthorNote(data.session.authorNote ?? "");
          setAuthorNoteDepth(data.session.authorNoteDepth ?? 4);
          return sid;
        }
      }
      // No existing session — create one (backend seeds first_mes).
      const char = characters.find((c) => c.filename === filename);
      const created = await apiPost<{ session: ChatSession }>(
        `/projects/${selectedProjectId}/chat/sessions`,
        {
          characterFilename: filename,
          characterName: char?.data.name,
        },
      );
      setCurrentSessionId(created.session.id);
      setMessages(created.session.messages);
      setAuthorNote(created.session.authorNote ?? "");
      setAuthorNoteDepth(created.session.authorNoteDepth ?? 4);
      setSessionsList((prev) => [{
        id: created.session.id,
        characterFilename: created.session.characterFilename,
        characterName: created.session.characterName,
        title: created.session.title,
        messageCount: created.session.messages.length,
        createdAt: created.session.createdAt,
        updatedAt: created.session.updatedAt,
      }, ...prev]);
      return created.session.id;
    } catch (e) {
      console.error("[chat] loadOrCreateSession failed:", e);
      return null;
    }
  }, [selectedProjectId, characters]);

  /** Debounced save of the current messages to the backend session. Called
   *  after local edits/deletes/swipe navigation. Streaming sends and
   *  regeneration are saved server-side directly, so they skip this. */
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const sid = currentSessionId;
      if (!sid || !selectedProjectId) return;
      try {
        await apiPut(
          `/projects/${selectedProjectId}/chat/sessions/${sid}`,
          { messages: messagesRef.current },
        );
      } catch (e) {
        console.error("[chat] debounced save failed:", e);
      }
    }, 800);
  }, [currentSessionId, selectedProjectId]);

  /** Debounced save of the Author's Note text and depth to the session. */
  const scheduleAuthorNoteSave = useCallback(() => {
    if (authorNoteSaveTimerRef.current) clearTimeout(authorNoteSaveTimerRef.current);
    authorNoteSaveTimerRef.current = setTimeout(async () => {
      const sid = currentSessionId;
      if (!sid || !selectedProjectId) return;
      try {
        await apiPut(
          `/projects/${selectedProjectId}/chat/sessions/${sid}`,
          { authorNote, authorNoteDepth },
        );
      } catch (e) {
        console.error("[chat] author note save failed:", e);
      }
    }, 600);
  }, [currentSessionId, selectedProjectId, authorNote, authorNoteDepth]);

  // --- Fetch projects + all characters on mount ---
  useEffect(() => {
    void (async () => {
      try {
        const [projData, charData] = await Promise.all([
          apiGet<{ projects: Project[] }>("/projects"),
          apiGet<{ characters: GlobalCharacter[] }>("/characters/all"),
        ]);
        setProjects(projData.projects ?? []);
        setGlobalCharacters(charData.characters ?? []);
        // Auto-select project from URL params.
        if (pendingProjectId && (projData.projects ?? []).some((p) => p.id === pendingProjectId)) {
          setSelectedProjectId(pendingProjectId);
        }
      } catch {
        // Non-fatal
      }
    })();
  }, []);

  // --- Fetch characters when a project is selected ---
  const loadCharacters = useCallback(() => {
    if (!selectedProjectId) {
      setCharacters([]);
      return;
    }
    setCharactersLoading(true);
    setCharError(null);
    apiGet<CharactersResponse>(`/projects/${selectedProjectId}/characters`)
      .then((d) => {
        // Sort by appearance count (weight) descending
        const sorted = [...(d.characters ?? [])].sort((a, b) => {
          const arcA = (a.data.extensions?.tavernos as Record<string, unknown> | undefined)?.arc as string ?? "";
          const arcB = (b.data.extensions?.tavernos as Record<string, unknown> | undefined)?.arc as string ?? "";
          return parseAppearanceCount(arcB) - parseAppearanceCount(arcA);
        });
        setCharacters(sorted);
        // Auto-select character from URL params.
        if (pendingChar) {
          const decoded = decodeURIComponent(pendingChar);
          const found = sorted.find((c) => c.filename === decoded);
          if (found) {
            // Session loading is handled by the selectedChar effect below.
            setSelectedChar(decoded);
            setUsage(null);
            setError(null);
            setQuickReplies([]);
          }
        }
      })
      .catch((e) => {
        setCharacters([]);
        setCharError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setCharactersLoading(false);
      });
  }, [selectedProjectId, pendingChar]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // --- Scroll tracking ---
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = (): void => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isNearBottomRef.current = distFromBottom < 100;
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [selectedChar]);

  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (authorNoteSaveTimerRef.current) clearTimeout(authorNoteSaveTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const handleSelectChar = (filename: string): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeakingIndex(null);
    setSelectedChar(filename);
    setMessages([]);
    setUsage(null);
    setError(null);
    setQuickReplies([]);
    setCurrentSessionId(null);
    setAuthorNote("");
    setAuthorNoteDepth(4);
    // Session loading is handled by the selectedChar effect below.
  };

  // --- Load (or create) a chat session whenever the selected character changes ---
  useEffect(() => {
    if (!selectedChar) {
      setMessages([]);
      setCurrentSessionId(null);
      setSessionsList([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      await loadOrCreateSession(selectedChar);
      if (cancelled) return;
      void refreshSessions(selectedChar);
    })();
    return () => { cancelled = true; };
  }, [selectedChar, loadOrCreateSession, refreshSessions]);

  const handleStop = (): void => {
    abortRef.current?.abort();
  };

  const handleSpeak = async (index: number, text: string): Promise<void> => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (speakingIndex === index) {
      setSpeakingIndex(null);
      return;
    }
    setSpeakingIndex(index);
    setTtsError(null);
    try {
      const response = await fetch(`${BASE_URL}/projects/${selectedProjectId}/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          characterFilename: selectedChar || undefined,
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: `TTS error: ${response.status}` }));
        throw new Error(errBody.error ?? `TTS error: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (!mountedRef.current) return;
        setSpeakingIndex(null);
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        audioRef.current = null;
      };
      audio.onerror = () => {
        if (!mountedRef.current) return;
        setSpeakingIndex(null);
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        audioRef.current = null;
        setTtsError("音频播放失败");
      };
      await audio.play();
    } catch (e) {
      setSpeakingIndex(null);
      setTtsError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStopSpeak = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeakingIndex(null);
  };

  // --- Swipes / edit / delete -------------------------------------------
  // Local state operations backed by the `messages` array. Swipe navigation
  // and inline edits keep `content` in sync with `swipes[swipeIndex]`.
  // Each mutation schedules a debounced PUT to persist the change.

  const handleSwipePrev = (index: number): void => {
    setMessages((prev) => {
      const msg = prev[index];
      if (!msg || msg.swipeIndex <= 0) return prev;
      const swipeIndex = msg.swipeIndex - 1;
      const next = prev.slice();
      next[index] = { ...msg, swipeIndex, content: msg.swipes[swipeIndex] ?? msg.content };
      return next;
    });
    scheduleSave();
  };

  const handleSwipeNext = (index: number): void => {
    setMessages((prev) => {
      const msg = prev[index];
      if (!msg || msg.swipeIndex >= msg.swipes.length - 1) return prev;
      const swipeIndex = msg.swipeIndex + 1;
      const next = prev.slice();
      next[index] = { ...msg, swipeIndex, content: msg.swipes[swipeIndex] ?? msg.content };
      return next;
    });
    scheduleSave();
  };

  const handleEditMessage = (index: number, newContent: string): void => {
    setMessages((prev) => {
      const msg = prev[index];
      if (!msg) return prev;
      const swipes = msg.swipes.slice();
      swipes[msg.swipeIndex] = newContent;
      const next = prev.slice();
      next[index] = { ...msg, swipes, content: newContent, edited: true };
      return next;
    });
    scheduleSave();
  };

  const handleDeleteMessage = (index: number): void => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
    if (speakingIndex === index) handleStopSpeak();
    scheduleSave();
  };

  /** Regenerate an assistant message by streaming a new swipe from the
   *  backend `/regenerate` SSE endpoint. The new generation is appended as
   *  a swipe both locally and server-side. */
  const handleRegenerate = async (index: number): Promise<void> => {
    if (!selectedProjectId || !currentSessionId || sending || regeneratingIndex !== null) return;
    const target = messages[index];
    if (!target || target.role !== "assistant") return;

    setRegeneratingIndex(index);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let regenContent = "";

      // Seed a new empty swipe on the target message for streaming display.
      setMessages((prev) => {
        const msg = prev[index];
        if (!msg) return prev;
        const swipes = [...msg.swipes, ""];
        const swipeIndex = swipes.length - 1;
        const next = prev.slice();
        next[index] = { ...msg, swipes, swipeIndex, content: "", isStreaming: true };
        return next;
      });

      await streamSsePost<SSEEvent>(
        `${BASE_URL}/projects/${selectedProjectId}/chat/sessions/${currentSessionId}/regenerate`,
        { messageIndex: index },
        (evt) => {
          if (controller.signal.aborted) return;
          if (evt.type === "delta") {
            regenContent += evt.content;
            setMessages((prev) => {
              const msg = prev[index];
              if (!msg) return prev;
              const swipes = msg.swipes.slice();
              swipes[msg.swipeIndex] = regenContent;
              const next = prev.slice();
              next[index] = { ...msg, swipes, content: regenContent, isStreaming: true };
              return next;
            });
          } else if (evt.type === "done") {
            const finalContent = evt.content || regenContent;
            setMessages((prev) => {
              const msg = prev[index];
              if (!msg) return prev;
              const swipes = msg.swipes.slice();
              swipes[msg.swipeIndex] = finalContent;
              const next = prev.slice();
              next[index] = { ...msg, swipes, content: finalContent, isStreaming: false };
              return next;
            });
            if (evt.usage) setUsage(evt.usage);
          } else if (evt.type === "error") {
            setError(evt.error);
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled — keep whatever was streamed so far.
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      // Clear streaming flag on the target message.
      setMessages((prev) => {
        const msg = prev[index];
        if (!msg) return prev;
        const next = prev.slice();
        next[index] = { ...msg, isStreaming: false };
        return next;
      });
      if (mountedRef.current) setRegeneratingIndex(null);
      abortRef.current = null;
    }
  };

  /** Start a brand-new chat session for the current character. */
  const handleNewSession = async (): Promise<void> => {
    if (!selectedProjectId || !selectedChar) return;
    const char = characters.find((c) => c.filename === selectedChar);
    try {
      const created = await apiPost<{ session: ChatSession }>(
        `/projects/${selectedProjectId}/chat/sessions`,
        { characterFilename: selectedChar, characterName: char?.data.name },
      );
      setCurrentSessionId(created.session.id);
      setMessages(created.session.messages);
      setAuthorNote(created.session.authorNote ?? "");
      setAuthorNoteDepth(created.session.authorNoteDepth ?? 4);
      setUsage(null);
      setError(null);
      setQuickReplies([]);
      setSessionsList((prev) => [{
        id: created.session.id,
        characterFilename: created.session.characterFilename,
        characterName: created.session.characterName,
        title: created.session.title,
        messageCount: created.session.messages.length,
        createdAt: created.session.createdAt,
        updatedAt: created.session.updatedAt,
      }, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  /** Switch to a different existing session. */
  const handleSelectSession = async (sessionId: string): Promise<void> => {
    if (!selectedProjectId) return;
    try {
      const data = await apiGet<{ session: ChatSession | null }>(
        `/projects/${selectedProjectId}/chat/sessions/${sessionId}`,
      );
      if (data.session) {
        setCurrentSessionId(sessionId);
        setMessages(data.session.messages);
        setAuthorNote(data.session.authorNote ?? "");
        setAuthorNoteDepth(data.session.authorNoteDepth ?? 4);
        setUsage(null);
        setError(null);
        setQuickReplies([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  /** Export the current session as a downloadable JSON file. */
  const handleExportSession = (): void => {
    if (!selectedProjectId || !currentSessionId) return;
    const url = `${BASE_URL}/projects/${encodeURIComponent(selectedProjectId)}/chat/sessions/${currentSessionId}/export`;
    // Trigger a browser download without navigating away.
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /** Import a session from a JSON file. Opens a file picker, reads the file,
   *  and POSTs it to the import endpoint under the current character. */
  const handleImportSession = (): void => {
    if (!selectedProjectId || !selectedChar) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (): Promise<void> => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const char = characters.find((c) => c.filename === selectedChar);
        const imported = await apiPost<{ session: ChatSession }>(
          `/projects/${selectedProjectId}/chat/sessions/import`,
          {
            characterFilename: parsed.characterFilename || selectedChar,
            characterName: parsed.characterName || char?.data.name,
            title: parsed.title || `导入的对话`,
            messages: Array.isArray(parsed.messages) ? parsed.messages : [],
            authorNote: parsed.authorNote,
            authorNoteDepth: parsed.authorNoteDepth,
          },
        );
        setCurrentSessionId(imported.session.id);
        setMessages(imported.session.messages);
        setAuthorNote(imported.session.authorNote ?? "");
        setAuthorNoteDepth(imported.session.authorNoteDepth ?? 4);
        setUsage(null);
        setError(null);
        setQuickReplies([]);
        // Refresh the session list so the imported session appears.
        void refreshSessions(selectedChar);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    };
    input.click();
  };

  const handleQuickReply = (text: string): void => {
    setInput(text);
    setQuickReplies([]);
  };

  const handleSend = async (overrideText?: string): Promise<void> => {
    const text = (overrideText ?? input).trim();
    if (!selectedProjectId || !selectedChar || !text || sending) return;

    // Ensure a session exists before sending so the turn is persisted.
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await loadOrCreateSession(selectedChar);
    }

    const userMsg = text;
    const sentHistory = [...messages, makeMessage("user", userMsg)];
    setMessages(sentHistory);
    setInput("");
    setSending(true);
    setStreaming(true);
    setError(null);
    setUsage(null);
    setQuickReplies([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setMessages((prev) => [
        ...prev,
        makeMessage("assistant", "", prev.length > 0 ? prev[prev.length - 1].id : null),
      ]);

      let assistantContent = "";

      await streamSsePost<SSEEvent>(
        `${BASE_URL}/projects/${selectedProjectId}/chat/stream`,
        {
          characterFilename: selectedChar,
          message: userMsg,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          sessionId: sessionId ?? undefined,
        },
        (evt) => {
          if (controller.signal.aborted) return;

          // First frame: register the task ID for background tracking.
          if (evt.type === "task_started" && (evt as { taskId?: string }).taskId) {
            currentTaskIdRef.current = (evt as { taskId: string }).taskId;
            return;
          }

          if (evt.type === "delta") {
            assistantContent += evt.content;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1];
              const swipes = last.swipes.slice();
              swipes[last.swipeIndex] = assistantContent;
              const updated = prev.slice();
              updated[updated.length - 1] = {
                ...last,
                content: assistantContent,
                swipes,
                isStreaming: true,
              };
              return updated;
            });
          } else if (evt.type === "done") {
            const finalContent = evt.content || assistantContent;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1];
              const swipes = last.swipes.slice();
              swipes[last.swipeIndex] = finalContent;
              const updated = prev.slice();
              updated[updated.length - 1] = {
                ...last,
                content: finalContent,
                swipes,
                isStreaming: false,
              };
              return updated;
            });
            if (evt.usage) {
              setUsage(evt.usage);
            }
          } else if (evt.type === "quick_replies") {
            setQuickReplies(evt.replies);
          } else if (evt.type === "error") {
            setError(evt.error);
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (mountedRef.current) {
        setSending(false);
        setStreaming(false);
      }
      abortRef.current = null;
    }
  };

  // ===========================================================================
  // Layer 1: Novel folder selection
  // ===========================================================================
  if (!selectedProjectId) {
    // Group characters by projectId
    const charsByProject: Record<string, GlobalCharacter[]> = {};
    for (const gc of globalCharacters) {
      if (!charsByProject[gc.projectId]) charsByProject[gc.projectId] = [];
      charsByProject[gc.projectId].push(gc);
    }
    const allProjectIds = Array.from(new Set([
      ...projects.map((p) => p.id),
      ...Object.keys(charsByProject),
    ]));

    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-light">对话</h1>
          <p className="mt-0.5 text-sm text-gray-500">选择小说，与角色对话</p>
        </div>

        {allProjectIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] p-12 text-center text-gray-500">
            暂无小说项目
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allProjectIds.map((pid) => {
              const proj = projects.find((p) => p.id === pid);
              const displayName = proj?.name ?? pid;
              const colors = coverColor(displayName);
              const projChars = charsByProject[pid] ?? [];
              return (
                <div
                  key={pid}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/20 hover:shadow-xl"
                  onClick={() => setSelectedProjectId(pid)}
                >
                  <div className={`relative h-28 bg-gradient-to-br ${colors.bg}`}>
                    <div className="absolute inset-0 flex items-end p-4">
                      <h3 className="text-lg font-light text-white/95 line-clamp-2">{displayName}</h3>
                    </div>
                    {projChars.length > 0 && (
                      <div className="absolute right-3 top-3 flex -space-x-2">
                        {projChars.slice(0, 3).map((gc) => (
                          <div key={gc.filename} className="h-8 w-8 overflow-hidden rounded-full border-2 border-[#0F0F0F] bg-[#1A1A1A]">
                            {gc.avatar && (
                              <img
                                src={proxyImageUrl(gc.avatar)}
                                alt={gc.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500">
                      <span className="text-gray-300">{projChars.length}</span> 个角色
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // Layer 2: Character list + Chat (split view)
  // ===========================================================================
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const lastMsgIndex = messages.length - 1;
  const showCursor = streaming && lastMsgIndex >= 0 && messages[lastMsgIndex].role === "assistant";

  // Active character details (used by both the chat header and VN overlay).
  const activeChar = characters.find((c) => c.filename === selectedChar);
  const activeCharName = activeChar?.data.name ?? selectedChar;
  const activeCharExt = activeChar?.data.extensions?.tavernos as { avatar?: string } | undefined;
  const activeCharAvatar = activeCharExt?.avatar;

  return (
    <div className="flex h-full flex-col">
      {/* Project header bar */}
      <div className="flex items-center gap-3 border-b border-[#1A1A1A] px-4 py-2.5">
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setSelectedChar("");
            setMessages([]);
          }}
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          ← 返回
        </button>
        <span className="text-sm text-gray-600">|</span>
        <span className="text-sm font-medium text-[#C9A86C]">
          {selectedProject?.name ?? selectedProjectId}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Character sidebar — sorted by appearance weight */}
        <div className="w-60 shrink-0 border-r border-[#1A1A1A] bg-[#0A0A0A]">
          <div className="px-4 py-3 text-xs font-medium text-gray-500">
            选择角色 · {characters.length} 个
          </div>
          <div className="overflow-y-auto">
            {charactersLoading ? (
              <div className="px-4 py-2">
                <SkeletonList count={6} itemClassName="h-14" />
              </div>
            ) : charError ? (
              <div className="px-4 py-2">
                <RetryButton message={charError} onRetry={loadCharacters} />
              </div>
            ) : characters.length === 0 ? (
              <div className="px-4 py-2 text-xs text-gray-600">暂无角色</div>
            ) : (
              characters.map((c, idx) => {
                const ext = c.data.extensions?.tavernos as Record<string, unknown> | undefined;
                const arc = (ext?.arc as string) ?? "";
                const appCount = parseAppearanceCount(arc);
                const avatar = (ext?.avatar as string) ?? "";
                const roleType = (ext?.roleType as string) ?? "";
                const roleLabel = roleType.startsWith("protagonist") ? "主角" : roleType.startsWith("supporting") ? "配角" : roleType ? "NPC" : "";
                return (
                  <button
                    key={c.filename}
                    onClick={() => handleSelectChar(c.filename)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selectedChar === c.filename
                        ? "bg-[rgba(201,168,108,0.08)]"
                        : "hover:bg-[#141414]"
                    }`}
                  >
                    {/* Rank number */}
                    <span className={`w-5 text-center text-xs font-medium ${
                      idx === 0 ? "text-[#C9A86C]" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-[#8B6F47]" : "text-gray-600"
                    }`}>
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#1A1A1A]">
                      {avatar ? (
                        <img
                          src={proxyImageUrl(avatar)}
                          alt={c.data.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                          {c.data.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Name + info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`truncate text-sm ${selectedChar === c.filename ? "text-[#C9A86C]" : "text-gray-300"}`}>
                          {c.data.name}
                        </span>
                        {roleLabel && (
                          <span className="shrink-0 rounded bg-[#1A1A1A] px-1 py-0.5 text-[9px] text-gray-500">
                            {roleLabel}
                          </span>
                        )}
                      </div>
                      {appCount > 0 && (
                        <span className="text-[10px] text-gray-600">出场 {appCount} 次</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          {!selectedChar ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-3 text-[#333333]"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-[#555555]">选择左侧角色开始对话</p>
                <p className="mt-1 text-xs text-[#3A3A3A]">角色按出场权重排序</p>
              </div>
            </div>
          ) : (
            <>
              {/* Character header bar with VN mode toggle + session switcher */}
              <div className="flex items-center justify-between border-b border-[#1A1A1A] px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#1A1A1A]">
                    {activeCharAvatar ? (
                      <img
                        src={proxyImageUrl(activeCharAvatar)}
                        alt={activeCharName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                        {activeCharName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#C9A86C]">{activeCharName}</span>
                  {sessionsList.length > 0 && (
                    <select
                      value={currentSessionId ?? ""}
                      onChange={(e) => void handleSelectSession(e.target.value)}
                      className="ml-2 rounded border border-[#2A2A2A] bg-[#0F0F0F] px-1.5 py-0.5 text-xs text-gray-400 outline-none hover:border-[#C9A86C]/40"
                      title="切换历史会话"
                    >
                      {sessionsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.messageCount}条)
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handleExportSession}
                    disabled={!currentSessionId}
                    className="ml-1 rounded border border-[#2A2A2A] px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:border-[#C9A86C]/40 hover:text-[#C9A86C] disabled:opacity-30"
                    title="导出当前会话为 JSON"
                  >
                    ⬇
                  </button>
                  <button
                    onClick={handleImportSession}
                    className="rounded border border-[#2A2A2A] px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:border-[#C9A86C]/40 hover:text-[#C9A86C]"
                    title="导入会话 JSON"
                  >
                    ⬆
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAuthorNote((v) => !v)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      authorNote.trim()
                        ? "border-[#C9A86C]/60 text-[#C9A86C]"
                        : "border-[#2A2A2A] text-gray-300 hover:border-[#C9A86C]/40 hover:text-[#C9A86C]"
                    }`}
                    title="作者批注：注入到上下文中控制叙事走向"
                  >
                    ✒️ 批注{authorNote.trim() ? " ●" : ""}
                  </button>
                  <button
                    onClick={() => void handleNewSession()}
                    className="rounded-md border border-[#2A2A2A] px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-[#C9A86C]/40 hover:text-[#C9A86C]"
                  >
                    ✚ 新对话
                  </button>
                  <button
                    onClick={() => setVnMode(true)}
                    className="rounded-md border border-[#2A2A2A] px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-[#C9A86C]/40 hover:text-[#C9A86C]"
                  >
                    🎮 VN模式
                  </button>
                </div>
              </div>

              {/* Author's Note panel — collapsible */}
              {showAuthorNote && (
                <div className="border-b border-[#1A1A1A] bg-[#0F0F0F] px-4 py-2.5">
                  <div className="mx-auto max-w-3xl">
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-[#C9A86C]">
                        作者批注（Author's Note）
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500">注入深度</span>
                        <select
                          value={authorNoteDepth}
                          onChange={(e) => {
                            setAuthorNoteDepth(Number(e.target.value));
                            scheduleAuthorNoteSave();
                          }}
                          className="rounded border border-[#2A2A2A] bg-[#141414] px-1.5 py-0.5 text-xs text-gray-300 outline-none hover:border-[#C9A86C]/40"
                          title="0=最末尾，数字越大越靠前"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <textarea
                      value={authorNote}
                      onChange={(e) => {
                        setAuthorNote(e.target.value);
                        scheduleAuthorNoteSave();
                      }}
                      placeholder="输入批注内容，例如：&#10;· 此时气氛应该突然紧张&#10;· 角色应主动提及往事&#10;· 加入一段环境描写"
                      rows={2}
                      className="w-full resize-y rounded border border-[#2A2A2A] bg-[#141414] p-2 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-[#C9A86C]/40"
                      style={{ fontFamily: CJK_FONT }}
                    />
                    <p className="mt-1 text-[10px] text-gray-600">
                      批注会按「深度」注入到 AI 的上下文中（0=末尾，4=倒数第4条消息前），用于临时引导叙事走向，不会保存到故事设定。
                    </p>
                  </div>
                </div>
              )}

              <MessageList
                messages={messages}
                streaming={streaming}
                showCursor={showCursor}
                lastMsgIndex={lastMsgIndex}
                speakingIndex={speakingIndex}
                scrollRef={scrollRef}
                onSpeak={handleSpeak}
                onStopSpeak={handleStopSpeak}
                characterName={activeCharName}
                onSwipePrev={handleSwipePrev}
                onSwipeNext={handleSwipeNext}
                onRegenerate={(i) => void handleRegenerate(i)}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                regeneratingIndex={regeneratingIndex}
              />

              <ChatInput
                input={input}
                sending={sending}
                streaming={streaming}
                usage={usage}
                error={error}
                ttsError={ttsError}
                quickReplies={quickReplies}
                onDismissError={() => setError(null)}
                onInputChange={setInput}
                onSend={() => void handleSend()}
                onStop={handleStop}
                onQuickReply={handleQuickReply}
              />
            </>
          )}
        </div>
      </div>

      {/* Visual Novel mode overlay — renders on top of the chat, shares the
          same SSE-backed message stream via handleSend. */}
      {vnMode && selectedChar && (
        <VisualNovelOverlay
          characterName={activeCharName}
          characterImage={activeCharAvatar}
          messages={messages}
          onClose={() => setVnMode(false)}
          onSend={(text) => void handleSend(text)}
        />
      )}

      {/* Inline keyframes for blinking cursor */}
      <style>{`
        @keyframes tavernos-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
