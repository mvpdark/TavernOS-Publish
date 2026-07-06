import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type JSX,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete, apiPut, BASE_URL, proxyImageUrl, streamSsePost } from "../api/client.js";
import { BTN, Modal, ConfirmDialog } from "../components/ui.tsx";
import { SkeletonCard } from "../components/Skeleton.tsx";
import { RetryButton } from "../components/RetryButton.tsx";
import { coverColor } from "../lib/theme.js";
import { EmptyState } from "../components/EmptyState.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionListItem {
  id: string;
  title: string;
  genre: string;
  mode: "novel" | "original";
  status: "active" | "completed" | "abandoned";
  turnCount: number;
  createdAt: number;
  updatedAt: number;
  hasScore: boolean;
  totalScore?: number;
}

interface PlayerState {
  name: string;
  location: string;
  inventory: string[];
  status: string;
  relationships: Record<string, string>;
}

interface GameTurn {
  id: string;
  role: "player" | "narrator" | "system";
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  choices?: string[];
  timestamp: number;
}

interface GameWorld {
  mode: "novel" | "original";
  sourceProjectId?: string;
  title: string;
  premise: string;
  setting: string;
  genre: string;
  characterSummary?: string;
  worldSummary?: string;
  playerCharacter: string;
  startingScene: string;
}

interface AdventureScore {
  totalScore: number;
  dimensions: {
    narrative: number;
    engagement: number;
    creativity: number;
    coherence: number;
    character: number;
    tension: number;
  };
  summary: string;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  novelPotential: string;
}

interface GameSession {
  id: string;
  world: GameWorld;
  player: PlayerState;
  turns: GameTurn[];
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  updatedAt: number;
  turnCount: number;
  score?: AdventureScore;
}

interface Project {
  id: string;
  name: string;
  genre?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_SEPARATOR = "\n===META===\n";

const QUICK_ACTIONS = [
  "观察周围环境",
  "检查随身物品",
  "寻找出口或通路",
  "与附近的人交谈",
];

const GENRE_OPTIONS = ["奇幻", "科幻", "悬疑", "都市", "武侠", "仙侠", "历史", "言情", "末日", "无限流"];

// ---------------------------------------------------------------------------
// Ambient sound scene detection
// ---------------------------------------------------------------------------

type SceneType = "forest" | "combat" | "city" | "default";

function detectSceneType(text: string): SceneType {
  if (/森林|树林|野外|荒野|丛林|山脉|山洞|草地|草原|河流|湖泊|大海|山谷|悬崖/.test(text)) return "forest";
  if (/战斗|打斗|危险|攻击|敌人|武器|剑|杀|搏斗|冲突|威胁|怪物|巨兽|受伤|流血/.test(text)) return "combat";
  if (/城市|城镇|酒馆|街道|市场|店铺|客栈|宫殿|城堡|村落|港口|广场|巷弄/.test(text)) return "city";
  return "default";
}

function extractVisitedLocations(turns: GameTurn[]): string[] {
  const locations: string[] = [];
  for (const turn of turns) {
    if (turn.role !== "narrator") continue;
    // Look for 位置: pattern in the content (META section may be embedded)
    const match = turn.content.match(/位置[:：]\s*(.+?)(?:\n|$)/);
    if (match && match[1]) {
      const loc = match[1].trim();
      if (loc && !locations.includes(loc)) locations.push(loc);
    }
  }
  return locations;
}

// ---------------------------------------------------------------------------
// Session Card component (aligned with NovelCard from Library)
// ---------------------------------------------------------------------------

function SessionCard({
  session,
  onOpen,
  onDelete,
}: {
  session: SessionListItem;
  onOpen: () => void;
  onDelete: () => void;
}): JSX.Element {
  const colors = coverColor(session.title);

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
      style={{ width: 120 }}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onDelete();
      }}
    >
      <div className="relative h-44 bg-[#0A0A0A]">
        <div className={`h-full w-full bg-gradient-to-br ${colors.bg}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        {/* Mode tag */}
        <span
          className="absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[9px] backdrop-blur-sm"
          style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
        >
          {session.mode === "novel" ? "小说世界" : "原创世界"}
        </span>
        {session.genre && (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/30 px-1 py-0.5 text-[9px] text-white/70 backdrop-blur-sm">
            {session.genre}
          </span>
        )}
        {/* Bottom info */}
        <div className="absolute bottom-1.5 left-0 right-0 px-1.5 text-center">
          <p className="truncate text-sm font-medium text-[#C9A86C]">{session.title}</p>
          <div className="flex items-center justify-center gap-1 text-[9px] text-gray-500">
            <span>{session.turnCount}回合</span>
            {session.hasScore && (
              <>
                <span>·</span>
                <span>评分: {session.totalScore}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Status badge */}
      <div className="flex items-center justify-between px-1.5 py-1 text-[10px]">
        <span className={`rounded px-1.5 py-0.5 ${
          session.status === "active"
            ? "bg-[#C9A86C]/10 text-[#C9A86C]"
            : session.status === "completed"
            ? "bg-[#5A8C5A]/10 text-[#5A8C5A]"
            : "bg-[#555555]/10 text-[#888888]"
        }`}>
          {session.status === "active" ? "进行中" : session.status === "completed" ? "已转化" : "已放弃"}
        </span>
        {/* Hover delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 transition-opacity group-hover:opacity-100 rounded bg-[rgba(201,104,90,0.15)] px-1.5 py-0.5 text-[9px] text-[#C9685A] hover:bg-[rgba(201,104,90,0.25)]"
        >
          删
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeepGame(): JSX.Element {
  const navigate = useNavigate();

  // View state: "list" | "new" | "adventure"
  const [view, setView] = useState<"list" | "new" | "adventure">("list");

  // Session list
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // New session form
  const [mode, setMode] = useState<"novel" | "original">("original");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [prefGenre, setPrefGenre] = useState("");
  const [prefTheme, setPrefTheme] = useState("");
  const [prefSetting, setPrefSetting] = useState("");
  const [prefPlayerChar, setPrefPlayerChar] = useState("");
  const [creating, setCreating] = useState(false);

  // Adventure state
  const [session, setSession] = useState<GameSession | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [pendingChoices, setPendingChoices] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Score state
  const [scoreLoading, setScoreLoading] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<string>("");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Adventure tree modal
  const [showTree, setShowTree] = useState(false);

  // Location map modal
  const [showMap, setShowMap] = useState(false);

  // Ambient sound
  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const convertAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Load session list on mount ---
  const loadSessions = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const d = await apiGet<{ sessions: SessionListItem[] }>("/deepgame/sessions");
      setSessions(d.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // --- Load projects for novel mode ---
  useEffect(() => {
    if (mode === "novel" && projects.length === 0) {
      void (async () => {
        try {
          const d = await apiGet<{ projects: Project[] }>("/projects");
          setProjects(d.projects);
        } catch {
          // ignore
        }
      })();
    }
  }, [mode, projects.length]);

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.turns, streamingText]);

  // --- Abort on unmount ---
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      convertAbortRef.current?.abort();
    };
  }, []);

  // --- Create a new session ---
  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { mode };
      if (mode === "novel" && selectedProjectId) {
        body.sourceProjectId = selectedProjectId;
      }
      if (mode === "original" || mode === "novel") {
        const preferences: Record<string, string> = {};
        if (prefGenre) preferences.genre = prefGenre;
        if (prefTheme) preferences.theme = prefTheme;
        if (prefSetting) preferences.setting = prefSetting;
        if (prefPlayerChar) preferences.playerCharacter = prefPlayerChar;
        if (Object.keys(preferences).length > 0) body.preferences = preferences;
      }
      const d = await apiPost<{ session: GameSession }>("/deepgame/sessions", body);
      setSession(d.session);
      setView("adventure");
      setStreamingText("");
      // Refresh list in background.
      void loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }, [mode, selectedProjectId, prefGenre, prefTheme, prefSetting, prefPlayerChar, loadSessions]);

  // --- Open an existing session ---
  const handleOpen = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      const d = await apiGet<{ session: GameSession }>(`/deepgame/sessions/${sessionId}`);
      setSession(d.session);
      setView("adventure");
      setStreamingText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, []);

  // --- Send an action (SSE streaming) ---
  const sendAction = useCallback(async (overrideText?: string) => {
    const actionText = (overrideText ?? action).trim();
    if (!session || !actionText || streaming) return;

    setAction("");
    setStreaming(true);
    setStreamingText("");
    setPendingChoices([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullStreamedText = "";
      let doneReceived = false;

      await streamSsePost<{
        type: string;
        content?: string;
        imageUrl?: string | null;
        narrative?: string;
        player?: PlayerState;
        turnCount?: number;
        choices?: string[];
        turnId?: string;
        error?: string;
      }>(
        `${BASE_URL}/deepgame/sessions/${session.id}/turn`,
        { action: actionText },
        (frame) => {
          if (frame.type === "delta" && frame.content) {
            fullStreamedText += frame.content;
            // Only show narrative part (before META separator).
            const sepIdx = fullStreamedText.indexOf(META_SEPARATOR);
            const display = sepIdx >= 0
              ? fullStreamedText.slice(0, sepIdx)
              : fullStreamedText;
            setStreamingText(display);
          } else if (frame.type === "image_generating") {
            setImageLoading(true);
          } else if (frame.type === "image_done") {
            setImageLoading(false);
            // If we got an image URL and a turnId, patch the turn in the
            // current session so the image appears without a full refresh.
            if (frame.imageUrl && frame.turnId && session) {
              setSession((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  turns: prev.turns.map((t) =>
                    t.id === frame.turnId
                      ? { ...t, imageUrl: frame.imageUrl ?? undefined }
                      : t,
                  ),
                };
              });
            }
          } else if (frame.type === "done") {
            setStreamingText("");
            setPendingChoices(frame.choices ?? []);
            // Mark streaming as done — user can interact immediately.
            setStreaming(false);
            doneReceived = true;
          } else if (frame.type === "error") {
            setError(frame.error ?? "冒险回应失败");
          }
        },
        controller.signal,
      );

      // After stream completes, refresh session from server to get the
      // updated turns. Guard against race condition: if user started a new
      // turn, don't overwrite with stale data.
      if (doneReceived) {
        try {
          const updated = await apiGet<{ session: GameSession }>(
            `/deepgame/sessions/${session.id}`,
          );
          // Only update if this controller is still active
          if (abortRef.current === controller) {
            setSession(updated.session);
          }
          // Clear pending choices once session data is loaded (choices now on turn).
          if (abortRef.current === controller) {
            setPendingChoices([]);
          }
          void loadSessions();
        } catch {
          // Session refresh failed — choices remain as pendingChoices fallback
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // Only clean up if this is still the active controller — if the user
      // already started a new turn, don't clobber the new state.
      if (abortRef.current === controller) {
        setStreaming(false);
        setImageLoading(false);
        abortRef.current = null;
      }
    }
  }, [session, action, streaming, loadSessions]);

  // --- Stop streaming ---
  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setImageLoading(false);
  }, []);

  // --- Score the adventure ---
  const handleScore = useCallback(async () => {
    if (!session || scoreLoading) return;
    setScoreLoading(true);
    setError(null);
    try {
      const d = await apiPost<{ score: AdventureScore }>(
        `/deepgame/sessions/${session.id}/score`,
        {},
      );
      setSession({ ...session, score: d.score });
      setShowScore(true);
      void loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "评分失败");
    } finally {
      setScoreLoading(false);
    }
  }, [session, scoreLoading, loadSessions]);

  // --- Convert to novel project (SSE streaming with progress) ---
  const handleConvert = useCallback(async () => {
    if (!session || converting) return;
    setConverting(true);
    setError(null);
    setConvertProgress("正在创建小说项目...");

    const controller = new AbortController();
    convertAbortRef.current = controller;

    try {
      await streamSsePost<{
        type: string;
        projectId?: string;
        name?: string;
        index?: number;
        total?: number;
        title?: string;
        count?: number;
        chapterCount?: number;
        characterCount?: number;
        error?: string;
      }>(
        `${BASE_URL}/deepgame/sessions/${session.id}/convert`,
        {},
        (frame) => {
          if (frame.type === "project_created") {
            setConvertProgress("正在将冒险记录改写为小说章节...");
          } else if (frame.type === "chapter_done") {
            const idx = (frame.index ?? 0) + 1;
            const total = frame.total ?? 0;
            setConvertProgress(`已完成 ${idx}/${total} 章：${frame.title ?? ""}`);
          } else if (frame.type === "chapters_written") {
            setConvertProgress(`已写入 ${frame.count ?? 0} 章正文，正在同步角色和世界观...`);
          } else if (frame.type === "characters_written") {
            setConvertProgress(`已同步 ${frame.count ?? 0} 个角色卡，正在完成...`);
          } else if (frame.type === "done") {
            setConvertProgress("");
            setSession({ ...session, status: "completed" });
            void loadSessions();
            // Navigate to the new project's library page.
            navigate(`/write/library`);
          } else if (frame.type === "error") {
            setError(frame.error ?? "转换失败");
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled — no error message needed.
      } else {
        setError(e instanceof Error ? e.message : "转换失败");
      }
    } finally {
      setConverting(false);
      setConvertProgress("");
      convertAbortRef.current = null;
    }
  }, [session, converting, navigate, loadSessions]);

  // --- Delete session ---
  const handleDeleteFromList = useCallback(async (sessionId: string) => {
    try {
      await apiDelete(`/deepgame/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // ignore
    }
    setDeleteId(null);
  }, []);

  // --- Ambient sound: stop all current audio nodes ---
  const stopAmbientSound = useCallback(() => {
    for (const node of audioNodesRef.current) {
      try {
        // AudioScheduledSourceNode has stop(); other nodes don't
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop();
        }
      } catch {
        // Already stopped
      }
      try {
        node.disconnect();
      } catch {
        // Already disconnected
      }
    }
    audioNodesRef.current = [];
  }, []);

  // --- Ambient sound: start playing based on scene type ---
  const startAmbientSound = useCallback((sceneType: SceneType) => {
    // Stop existing nodes first
    stopAmbientSound();

    // AudioContext is created in the toggleSound click handler (user gesture).
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Master gain — keep very quiet
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.07;
    masterGain.connect(ctx.destination);
    audioNodesRef.current.push(masterGain);

    if (sceneType === "forest") {
      // Brown noise → lowpass filter (nature ambience)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      source.connect(filter);
      filter.connect(masterGain);
      source.start();
      audioNodesRef.current.push(source, filter);
    } else if (sceneType === "combat") {
      // Tense higher frequency hum — two detuned sawtooth oscillators
      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.value = 110;
      const osc2 = ctx.createOscillator();
      osc2.type = "sawtooth";
      osc2.frequency.value = 113;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 200;
      filter.Q.value = 2;
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      osc1.start();
      osc2.start();
      audioNodesRef.current.push(osc1, osc2, filter);
    } else if (sceneType === "city") {
      // Medium ambient murmur — filtered white noise
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 500;
      filter.Q.value = 0.5;
      source.connect(filter);
      filter.connect(masterGain);
      source.start();
      audioNodesRef.current.push(source, filter);
    } else {
      // Default: very subtle low drone
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 100;
      osc.connect(filter);
      filter.connect(masterGain);
      osc.start();
      audioNodesRef.current.push(osc, filter);
    }
  }, [stopAmbientSound]);

  // --- Ambient sound: toggle on/off ---
  const toggleSound = useCallback(() => {
    if (soundOn) {
      stopAmbientSound();
      setSoundOn(false);
    } else {
      // Create/resume the AudioContext inside the user gesture so browsers
      // (especially Safari/iOS) allow audio playback instead of blocking it.
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      if (audioCtxRef.current.state === "suspended") void audioCtxRef.current.resume();
      setSoundOn(true);
    }
  }, [soundOn, stopAmbientSound]);

  // --- Compute active choices for keyboard shortcuts ---
  const activeChoices = useMemo<string[]>(() => {
    if (streaming || !session || session.status !== "active") return [];
    if (pendingChoices.length > 0) return pendingChoices;
    // Find the last narrator turn with choices
    for (let i = session.turns.length - 1; i >= 0; i--) {
      const t = session.turns[i]!;
      if (t.role === "narrator" && t.choices && t.choices.length > 0) {
        return t.choices;
      }
    }
    return [];
  }, [streaming, session, pendingChoices]);

  // --- Ambient sound: manage playback when toggled or scene changes ---
  useEffect(() => {
    if (!soundOn) {
      stopAmbientSound();
      return;
    }
    // Determine scene type from the latest narrator turn
    const narratorTurns = session?.turns.filter((t) => t.role === "narrator") ?? [];
    const latestNarrator = narratorTurns[narratorTurns.length - 1];
    const sceneType = latestNarrator ? detectSceneType(latestNarrator.content) : "default";
    startAmbientSound(sceneType);
  }, [soundOn, session?.turns, startAmbientSound, stopAmbientSound]);

  // --- Ambient sound: cleanup audio context on unmount ---
  useEffect(() => {
    return () => {
      stopAmbientSound();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [stopAmbientSound]);

  // --- Keyboard shortcuts: 1/2/3/4 to select choices ---
  useEffect(() => {
    if (activeChoices.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.tagName === "SELECT"
      ) {
        return;
      }
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < activeChoices.length) {
        e.preventDefault();
        void sendAction(activeChoices[idx]);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeChoices, sendAction]);

  // -------------------------------------------------------------------------
  // Render: List View
  // -------------------------------------------------------------------------

  if (view === "list") {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light">互动冒险</h1>
            <p className="mt-1 text-sm text-gray-500">
              {sessions.length > 0
                ? `共 ${sessions.length} 个世界`
                : "开启你的第一次冒险"}
            </p>
          </div>
          <button
            onClick={() => { setView("new"); setError(null); }}
            className={BTN.primary}
          >
            新冒险
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <RetryButton message={error} onRetry={loadSessions} />
          </div>
        )}

        {/* Session grid */}
        {loadingList ? (
          <div className="mt-6 flex flex-wrap gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} className="w-[120px]" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon="sword"
            title="暂无冒险记录"
            description="创建新冒险，在小说世界中探索，或生成全新世界"
            className="mt-8"
          />
        ) : (
          <div className="mt-6 flex flex-wrap gap-4">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onOpen={() => handleOpen(s.id)}
                onDelete={() => setDeleteId(s.id)}
              />
            ))}
          </div>
        )}

        {deleteId && (
          <ConfirmDialog
            message="确定要删除这个冒险记录吗？此操作不可撤销。"
            onCancel={() => setDeleteId(null)}
            onConfirm={() => void handleDeleteFromList(deleteId)}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: New Session View
  // -------------------------------------------------------------------------

  if (view === "new") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8]">
        <header className="sticky top-0 z-10 border-b border-[#1A1A1A] bg-[#0A0A0A]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
            <button
              className="text-sm text-[#888888] transition-colors hover:text-[#E8E8E8]"
              onClick={() => { setView("list"); setError(null); }}
            >
              ← 返回
            </button>
            <div className="h-4 w-px bg-[#2A2A2A]" />
            <h1 className="text-lg font-light">创建新冒险</h1>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-6 py-8">
          {error && (
            <div className="mb-4 rounded-lg border border-[#C9685A]/30 bg-[#C9685A]/10 px-4 py-3 text-sm text-[#C9685A]">
              {error}
            </div>
          )}

          {/* Mode selector */}
          <div className="mb-6">
            <label className="mb-2 block text-xs text-[#787878]">冒险模式</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`rounded-[14px] border p-5 text-left transition-[border-color,background-color,box-shadow] ${
                  mode === "original"
                    ? "border-[#C9A86C]/40 bg-[#C9A86C]/5"
                    : "border-[#1A1A1A] bg-[#141414] hover:border-[#2A2A2A]"
                }`}
                onClick={() => setMode("original")}
              >
                <div className="mb-1 text-2xl">🌍</div>
                <div className="mb-1 text-sm font-medium text-[#E8E8E8]">原创世界</div>
                <div className="text-xs text-[#888888]">从零生成一个全新世界，自由冒险</div>
              </button>
              <button
                className={`rounded-[14px] border p-5 text-left transition-[border-color,background-color,box-shadow] ${
                  mode === "novel"
                    ? "border-[#C9A86C]/40 bg-[#C9A86C]/5"
                    : "border-[#1A1A1A] bg-[#141414] hover:border-[#2A2A2A]"
                }`}
                onClick={() => setMode("novel")}
              >
                <div className="mb-1 text-2xl">📖</div>
                <div className="mb-1 text-sm font-medium text-[#E8E8E8]">小说世界</div>
                <div className="text-xs text-[#888888]">进入已有小说的世界，在其中冒险</div>
              </button>
            </div>
          </div>

          {/* Novel mode: project selector */}
          {mode === "novel" && (
            <div className="mb-6">
              <label className="mb-2 block text-xs text-[#787878]">选择小说项目</label>
              {projects.length === 0 ? (
                <p className="rounded-lg border border-[#1A1A1A] bg-[#141414] px-4 py-3 text-sm text-[#888888]">
                  暂无可用项目，请先创建一个小说项目。
                </p>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-[7px] border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
                >
                  <option value="">— 选择项目 —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.genre ? ` (${p.genre})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Preferences */}
          <div className="rounded-[14px] border border-[#1A1A1A] bg-[#141414] p-6">
            <h2 className="mb-4 text-base font-light text-[#C9A86C]">冒险偏好</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-[#787878]">类型</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      className={`rounded px-3 py-1 text-xs transition-colors ${
                        prefGenre === g
                          ? "bg-[#C9A86C] text-[#0A0A0A]"
                          : "bg-[#1A1A1A] text-[#888888] hover:bg-[#2A2A2A]"
                      }`}
                      onClick={() => setPrefGenre(prefGenre === g ? "" : g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#787878]">主题（可选）</label>
                <input
                  value={prefTheme}
                  onChange={(e) => setPrefTheme(e.target.value)}
                  placeholder="如：复仇、成长、探索、生存..."
                  className="w-full rounded-[7px] border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#444444] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#787878]">设定偏好（可选）</label>
                <input
                  value={prefSetting}
                  onChange={(e) => setPrefSetting(e.target.value)}
                  placeholder="如：末日废土、赛博朋克、古代江湖..."
                  className="w-full rounded-[7px] border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#444444] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#787878]">玩家角色（可选）</label>
                <input
                  value={prefPlayerChar}
                  onChange={(e) => setPrefPlayerChar(e.target.value)}
                  placeholder="如：流浪剑客、黑客、侦探..."
                  className="w-full rounded-[7px] border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#444444] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button className={BTN.ghost} onClick={() => setView("list")}>
              取消
            </button>
            <button
              className={BTN.primary}
              disabled={creating || (mode === "novel" && !selectedProjectId)}
              onClick={() => void handleCreate()}
            >
              {creating ? "生成世界中..." : "开始冒险"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Adventure View
  // -------------------------------------------------------------------------

  if (view === "adventure" && session) {
    const narratorTurns = session.turns.filter((t) => t.role === "narrator");
    const lastImageUrl = [...session.turns].reverse().find((t) => t.imageUrl)?.imageUrl;
    const displayImage = streaming ? lastImageUrl : (narratorTurns[narratorTurns.length - 1]?.imageUrl ?? lastImageUrl);

    return (
      <div className="flex h-screen flex-col bg-[#0A0A0A] text-[#E8E8E8]">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-[#1A1A1A] bg-[#0A0A0A]/95 px-6 py-3 backdrop-blur">
          <button
            className="text-sm text-[#888888] transition-colors hover:text-[#E8E8E8]"
            onClick={() => { setView("list"); setSession(null); }}
          >
            ← 返回
          </button>
          <div className="h-4 w-px bg-[#2A2A2A]" />
          <h1 className="text-base font-light">{session.world.title}</h1>
          <span className="text-xs text-[#888888]">
            · {session.world.mode === "novel" ? "小说世界" : "原创世界"}
            {session.world.genre && ` · ${session.world.genre}`}
            · {session.turnCount} 回合
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              className={BTN.ghost}
              onClick={() => setShowTree(true)}
              title="查看冒险树"
            >
              <span className="mr-1">🌳</span>冒险树
            </button>
            <button
              className={BTN.ghost}
              onClick={() => setShowMap(true)}
              title="查看地图"
            >
              <span className="mr-1">🗺️</span>地图
            </button>
            <button
              className={soundOn ? BTN.primary : BTN.ghost}
              onClick={toggleSound}
              title="环境音效"
            >
              <span className="mr-1">🔊</span>{soundOn ? "音效 开" : "音效 关"}
            </button>
            {session.turnCount >= 3 && session.status === "active" && (
              <button
                className={BTN.ghost}
                disabled={scoreLoading}
                onClick={() => void handleScore()}
              >
                {scoreLoading ? "评分中..." : "AI评分"}
              </button>
            )}
            {session.score && (
              <button
                className={BTN.ghost}
                onClick={() => setShowScore(true)}
              >
                查看评分
              </button>
            )}
            {session.status === "active" && (
              <button
                className={BTN.ghost}
                disabled={converting}
                onClick={() => void handleConvert()}
              >
                {converting ? "转换中..." : "转小说化"}
              </button>
            )}
          </div>
        </header>

        {/* Convert progress banner */}
        {converting && convertProgress && (
          <div className="flex items-center justify-between border-b border-[#C9A86C]/20 bg-[#C9A86C]/5 px-6 py-2 text-sm text-[#C9A86C]">
            <span>
              <span className="inline-block animate-pulse mr-2">⏳</span>
              {convertProgress}
            </span>
            <button
              onClick={() => convertAbortRef.current?.abort()}
              className="rounded bg-[#C9685A]/15 px-2 py-0.5 text-xs text-[#C9685A] hover:bg-[#C9685A]/25"
            >
              取消
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="border-b border-[#C9685A]/20 bg-[#C9685A]/5 px-6 py-2 text-sm text-[#C9685A]">
            {error}
          </div>
        )}

        {/* Main content area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Scene Image */}
            {(displayImage || imageLoading) && (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#0F0F0F]">
                {imageLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-sm text-[#888888]">
                      <span className="inline-block animate-pulse">生成场景画面中...</span>
                    </div>
                  </div>
                ) : displayImage ? (
                  <img
                    src={proxyImageUrl(displayImage)}
                    alt="场景"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            )}

            {/* Player Status Bar */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#1A1A1A] bg-[#141414] px-4 py-2.5 text-xs">
              <span className="text-[#888888]">
                📍 <span className="text-[#E8E8E8]">{session.player.location || "未知"}</span>
              </span>
              <span className="text-[#888888]">
                ❤ <span className="text-[#E8E8E8]">{session.player.status}</span>
              </span>
              {session.player.inventory.length > 0 && (
                <span className="text-[#888888]">
                  🎒 <span className="text-[#E8E8E8]">{session.player.inventory.join("、")}</span>
                </span>
              )}
              <span className="ml-auto text-[#555555]">
                {session.world.playerCharacter}
              </span>
            </div>

            {/* Narrative Turns */}
            {session.turns.map((turn, idx) => {
              if (turn.role === "player") {
                return (
                  <div key={turn.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg rounded-br-sm bg-[#C9A86C]/10 border border-[#C9A86C]/20 px-4 py-2 text-sm text-[#E8E8E8]">
                      {turn.content}
                    </div>
                  </div>
                );
              }
              if (turn.role === "narrator") {
                // Check if this is the last narrator turn (for showing choices).
                const isLastNarrator = idx === session.turns.length - 1 ||
                  !session.turns.slice(idx + 1).some((t) => t.role === "narrator");
                const showChoices = isLastNarrator && turn.choices && turn.choices.length > 0 && !streaming && session.status === "active";
                return (
                  <div key={turn.id} className="space-y-3">
                    <div className="rounded-lg rounded-bl-sm border border-[#1A1A1A] bg-[#141414] px-4 py-3">
                      <p className="text-sm leading-relaxed text-[#E8E8E8] whitespace-pre-wrap">
                        {turn.content}
                      </p>
                    </div>
                    {showChoices && (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {turn.choices!.map((choice, ci) => (
                            <button
                              key={ci}
                              onClick={() => void sendAction(choice)}
                              className="group flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-left text-sm text-[#E8E8E8] transition-[border-color,background-color,box-shadow] hover:border-[#C9A86C]/40 hover:bg-[#1C1C1E] hover:shadow-[0_0_12px_rgba(201,168,108,0.12)]"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#3A3A3A] text-[10px] text-[#888888] group-hover:border-[#C9A86C] group-hover:text-[#C9A86C]">
                                {String.fromCharCode(65 + ci)}
                              </span>
                              <span className="flex-1">{choice}</span>
                              <span className="shrink-0 rounded bg-[#1A1A1A] px-1 text-[9px] text-[#555555] group-hover:text-[#888888]">
                                {ci + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => void sendAction(turn.choices![Math.floor(Math.random() * turn.choices!.length)])}
                            className="rounded-full border border-[#2A2A2A] bg-[#141414] px-3 py-1 text-xs text-[#888888] transition-colors hover:border-[#C9A86C]/40 hover:text-[#C9A86C]"
                          >
                            随机
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}

            {/* Streaming text */}
            {streaming && streamingText && (
              <div className="rounded-lg rounded-bl-sm border border-[#C9A86C]/20 bg-[#141414] px-4 py-3">
                <p className="text-sm leading-relaxed text-[#E8E8E8] whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-2 animate-pulse text-[#C9A86C]">▌</span>
                </p>
              </div>
            )}

            {/* Streaming placeholder */}
            {streaming && !streamingText && (
              <div className="rounded-lg border border-[#1A1A1A] bg-[#141414] px-4 py-3">
                <p className="text-sm text-[#888888]">
                  <span className="inline-block animate-pulse">思考中...</span>
                </p>
              </div>
            )}

            {/* Pending choices (shown immediately from done frame, before session refresh) */}
            {!streaming && pendingChoices.length > 0 && session.status === "active" && (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {pendingChoices.map((choice, ci) => (
                    <button
                      key={ci}
                      onClick={() => {
                        setPendingChoices([]);
                        void sendAction(choice);
                      }}
                      className="group flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-left text-sm text-[#E8E8E8] transition-[border-color,background-color,box-shadow] hover:border-[#C9A86C]/40 hover:bg-[#1C1C1E] hover:shadow-[0_0_12px_rgba(201,168,108,0.12)]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#3A3A3A] text-[10px] text-[#888888] group-hover:border-[#C9A86C] group-hover:text-[#C9A86C]">
                        {String.fromCharCode(65 + ci)}
                      </span>
                      <span className="flex-1">{choice}</span>
                      <span className="shrink-0 rounded bg-[#1A1A1A] px-1 text-[9px] text-[#555555] group-hover:text-[#888888]">
                        {ci + 1}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const pick = pendingChoices[Math.floor(Math.random() * pendingChoices.length)];
                      setPendingChoices([]);
                      if (pick) void sendAction(pick);
                    }}
                    className="rounded-full border border-[#2A2A2A] bg-[#141414] px-3 py-1 text-xs text-[#888888] transition-colors hover:border-[#C9A86C]/40 hover:text-[#C9A86C]"
                  >
                    随机
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {!streaming && session.status === "active" && (
          <div className="border-t border-[#1A1A1A] px-6 pt-2">
            <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa}
                  className="rounded-full border border-[#2A2A2A] bg-[#141414] px-3 py-1 text-xs text-[#888888] transition-colors hover:border-[#3A3A3A] hover:text-[#E8E8E8]"
                  onClick={() => void sendAction(qa)}
                >
                  {qa}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Input */}
        {session.status === "active" ? (
          <div className="border-t border-[#1A1A1A] bg-[#0A0A0A] px-6 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendAction();
                  }
                }}
                rows={1}
                placeholder="输入你的行动..."
                disabled={streaming}
                className="flex-1 resize-none rounded-[7px] border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#444444] focus:border-[rgba(201,168,108,0.3)] focus:outline-none disabled:opacity-50"
                style={{ maxHeight: "120px" }}
              />
              {streaming ? (
                <button className={BTN.ghost} onClick={stopStream}>
                  停止
                </button>
              ) : (
                <button
                  className={BTN.primary}
                  disabled={!action.trim()}
                  onClick={() => void sendAction()}
                >
                  发送
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t border-[#1A1A1A] bg-[#0A0A0A] px-6 py-3">
            <div className="mx-auto flex max-w-3xl items-center justify-center gap-3">
              <span className="text-sm text-[#888888]">
                {session.status === "completed" ? "冒险已转化为小说项目" : "冒险已放弃"}
              </span>
              {session.status === "abandoned" && (
                <button
                  className={BTN.ghost}
                  onClick={() => {
                    void apiPut(`/deepgame/sessions/${session.id}`, { status: "active" })
                      .then(() => {
                        setSession((prev) => prev ? { ...prev, status: "active" } : prev);
                      })
                      .catch(() => {
                        setError("继续冒险失败，请重试");
                      });
                  }}
                >
                  继续冒险
                </button>
              )}
            </div>
          </div>
        )}

        {/* Score Modal */}
        {showScore && session.score && (
          <ScoreModal
            score={session.score}
            onClose={() => setShowScore(false)}
            onConvert={() => { setShowScore(false); void handleConvert(); }}
            canConvert={session.status === "active"}
          />
        )}

        {/* Adventure Tree Modal */}
        {showTree && (
          <AdventureTreeModal
            session={session}
            onClose={() => setShowTree(false)}
          />
        )}

        {/* Location Map Modal */}
        {showMap && (
          <LocationMapModal
            session={session}
            onClose={() => setShowMap(false)}
          />
        )}
      </div>
    );
  }

  // Fallback (should not reach here)
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <button className={BTN.primary} onClick={() => setView("list")}>
        返回列表
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Modal sub-component
// ---------------------------------------------------------------------------

function ScoreModal({
  score,
  onClose,
  onConvert,
  canConvert,
}: {
  score: AdventureScore;
  onClose: () => void;
  onConvert: () => void;
  canConvert: boolean;
}): JSX.Element {
  const dims = [
    { key: "narrative", label: "叙事质量" },
    { key: "engagement", label: "互动参与" },
    { key: "creativity", label: "创意性" },
    { key: "coherence", label: "世界观一致" },
    { key: "character", label: "角色塑造" },
    { key: "tension", label: "戏剧张力" },
  ] as const;

  const recColor = score.totalScore >= 80
    ? "text-[#5A8C5A]"
    : score.totalScore >= 60
    ? "text-[#C9A86C]"
    : "text-[#C9685A]";

  return (
    <Modal
      title="冒险评估报告"
      onClose={onClose}
      footer={
        <>
          <button className={BTN.ghost} onClick={onClose}>关闭</button>
          {canConvert && (
            <button className={BTN.primary} onClick={onConvert}>
              转小说化
            </button>
          )}
        </>
      }
    >
      {/* Total Score */}
      <div className="flex items-center gap-4 rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#C9A86C]/30">
          <span className={`text-2xl font-light ${recColor}`}>{score.totalScore}</span>
        </div>
        <div>
          <p className={`text-sm font-medium ${recColor}`}>{score.recommendation}</p>
          <p className="mt-1 text-xs text-[#888888]">{score.summary}</p>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="space-y-2">
        {dims.map((d) => {
          const val = score.dimensions[d.key];
          return (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-20 text-xs text-[#888888]">{d.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A1A1A]">
                <div
                  className="h-full w-full origin-left rounded-full bg-[#C9A86C] transition-transform"
                  style={{ transform: `scaleX(${val / 100})` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-[#C9A86C]">{val}</span>
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {score.strengths.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-[#5A8C5A]">优点</p>
          <ul className="space-y-1">
            {score.strengths.map((s, i) => (
              <li key={i} className="text-xs text-[#E8E8E8]">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {score.weaknesses.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-[#C9685A]">不足</p>
          <ul className="space-y-1">
            {score.weaknesses.map((s, i) => (
              <li key={i} className="text-xs text-[#E8E8E8]">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Novel Potential */}
      <div className="rounded-lg border border-[#C9A86C]/20 bg-[#C9A86C]/5 p-3">
        <p className="mb-1 text-xs text-[#C9A86C]">小说化建议</p>
        <p className="text-xs leading-relaxed text-[#E8E8E8]">{score.novelPotential}</p>
      </div>
      <div className="mt-2 text-xs text-[#777777]">
        提示：转小说化会自动将冒险世界、角色和互动历程同步到小说项目，之后可使用蓝图/创作功能继续扩写。
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Adventure Tree Modal sub-component
// ---------------------------------------------------------------------------

function AdventureTreeModal({
  session,
  onClose,
}: {
  session: GameSession;
  onClose: () => void;
}): JSX.Element {
  const turns = session.turns.filter(
    (t) => t.role === "player" || t.role === "narrator",
  );

  const nodeSpacing = 90;
  const svgWidth = Math.max(600, turns.length * nodeSpacing + 40);
  const svgHeight = 170;
  const playerY = 45;
  const narratorY = 120;

  // Build node positions
  const nodes = turns.map((turn, i) => ({
    turn,
    x: i * nodeSpacing + 40,
    y: turn.role === "player" ? playerY : narratorY,
    index: i,
  }));

  return (
    <Modal
      title="冒险树"
      onClose={onClose}
      footer={
        <button className={BTN.ghost} onClick={onClose}>
          关闭
        </button>
      }
    >
      {turns.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#888888]">
          暂无冒险记录
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] p-2">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="block"
              style={{ minWidth: "100%" }}
            >
              {/* Edges connecting consecutive nodes */}
              {nodes.slice(1).map((node, i) => {
                const prev = nodes[i]!;
                return (
                  <line
                    key={`edge-${i}`}
                    x1={prev.x}
                    y1={prev.y}
                    x2={node.x}
                    y2={node.y}
                    stroke="#2A2A2A"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node, i) => {
                const isCurrent = i === nodes.length - 1;
                const isPlayer = node.turn.role === "player";
                const preview = node.turn.content.slice(0, 20);
                return (
                  <g key={`node-${i}`}>
                    {/* Pulsing border for current position */}
                    {isCurrent && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={24}
                        fill="none"
                        stroke="#C9A86C"
                        strokeWidth="2"
                        opacity="0.6"
                      >
                        <animate
                          attributeName="r"
                          values="22;26;22"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.6;0.2;0.6"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={16}
                      fill={isPlayer ? "#C9A86C" : "#1A1A1A"}
                      stroke={isPlayer ? "#C9A86C" : "#3A3A3A"}
                      strokeWidth="1.5"
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isPlayer ? "#0A0A0A" : "#888888"}
                    >
                      {i + 1}
                    </text>
                    {/* Tooltip on hover */}
                    <title>
                      {`#${i + 1} (${isPlayer ? "玩家" : "旁白"}): ${preview}`}
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-[#888888]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#C9A86C]" />
              玩家
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border border-[#3A3A3A] bg-[#1A1A1A]" />
              旁白
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-[#C9A86C]" />
              当前位置
            </span>
            <span className="ml-auto text-[#555555]">
              共 {turns.length} 个节点 · 悬停查看内容
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Location Map Modal sub-component
// ---------------------------------------------------------------------------

function LocationMapModal({
  session,
  onClose,
}: {
  session: GameSession;
  onClose: () => void;
}): JSX.Element {
  const currentLocation = session.player.location || "";
  const visitedFromTurns = extractVisitedLocations(session.turns);

  // Combine all known locations (current + from turns)
  const allLocations = [
    ...new Set(
      [currentLocation, ...visitedFromTurns].filter((l) => l && l.trim()),
    ),
  ];

  // Deterministic grid position for each location based on name hash
  const gridPositions = new Map<string, { row: number; col: number }>();
  for (const loc of allLocations) {
    let hash = 0;
    for (let j = 0; j < loc.length; j++) {
      hash = ((hash << 5) - hash + loc.charCodeAt(j)) | 0;
    }
    const row = Math.abs(hash) % 10;
    const col = Math.abs(hash >> 4) % 10;
    gridPositions.set(loc, { row, col });
  }

  const hasLocationData = currentLocation !== "" || allLocations.length > 0;

  return (
    <Modal
      title="冒险地图"
      onClose={onClose}
      footer={
        <button className={BTN.ghost} onClick={onClose}>
          关闭
        </button>
      }
    >
      <div className="flex flex-col items-center">
        {/* 10x10 grid mini-map */}
        <div className="grid grid-cols-10 gap-0.5 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] p-2">
          {Array.from({ length: 100 }, (_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            // Find which location (if any) is at this grid cell
            let locationHere: string | null = null;
            for (const [loc, pos] of gridPositions) {
              if (pos.row === row && pos.col === col) {
                locationHere = loc;
                break;
              }
            }
            const isCurrent = locationHere !== null && locationHere === currentLocation;
            const isVisited = locationHere !== null && !isCurrent;
            return (
              <div
                key={i}
                className={`flex h-7 w-7 items-center justify-center rounded-sm border text-xs transition-colors ${
                  isCurrent
                    ? "border-[#C9A86C]/40 bg-[#C9A86C]/20"
                    : isVisited
                    ? "border-[#2A2A2A] bg-[#1A1A1A]"
                    : "border-[#141414] bg-[#0F0F0F]"
                }`}
                title={locationHere ?? undefined}
              >
                {isCurrent ? (
                  <span className="text-sm">📍</span>
                ) : isVisited ? (
                  <span className="text-[#444444]">·</span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Location name */}
        <p className="mt-3 text-sm text-[#C9A86C]">
          {hasLocationData ? (currentLocation || allLocations[0] || "未知区域") : "未知区域"}
        </p>

        {/* Visited locations list */}
        {allLocations.length > 1 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {allLocations.map((loc) => (
              <span
                key={loc}
                className={`rounded px-2 py-0.5 text-[10px] ${
                  loc === currentLocation
                    ? "bg-[#C9A86C]/15 text-[#C9A86C]"
                    : "bg-[#1A1A1A] text-[#555555]"
                }`}
              >
                {loc}
              </span>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-[#888888]">
          <span className="flex items-center gap-1.5">
            <span className="text-sm">📍</span>
            当前位置
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#444444]">·</span>
            已探索
          </span>
        </div>
      </div>
    </Modal>
  );
}
