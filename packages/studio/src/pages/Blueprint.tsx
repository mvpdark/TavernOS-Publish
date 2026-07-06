import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type JSX,
  type ChangeEvent,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiPost, apiPut, BASE_URL, streamSsePost } from "../api/client.js";
import { BTN } from "../components/ui.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "fanqie" | "qidian" | "jjwxc" | "feilu" | "qimao" | "other";
type Channel = "male" | "female" | "";

interface Blueprint {
  platform: Platform;
  channel: Channel;
  genre: string;
  referenceBook: string;
  goldenFinger: string;
  sellingPoint: string;
  protagonist: string;
  worldTone: string;
  plotDirection: string;
  wordCount: number;
  updateFrequency: string;
  status: "drafting" | "confirmed";
}

const EMPTY_BP: Blueprint = {
  platform: "other",
  channel: "",
  genre: "",
  referenceBook: "",
  goldenFinger: "",
  sellingPoint: "",
  protagonist: "",
  worldTone: "",
  plotDirection: "",
  wordCount: 0,
  updateFrequency: "",
  status: "drafting",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  quickReplies?: string[];
}

interface StoryBibleResult {
  premise?: string;
  world?: string;
  characters?: unknown;
  plot?: unknown;
  hooks?: unknown;
}

// ---------------------------------------------------------------------------
// Preset options (quick-select chips)
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: "fanqie", label: "番茄" },
  { value: "qidian", label: "起点" },
  { value: "jjwxc", label: "晋江" },
  { value: "feilu", label: "飞卢" },
  { value: "qimao", label: "七猫" },
  { value: "other", label: "其他" },
];

const GOLDEN_FINGER_PRESETS = [
  "系统流",
  "重生",
  "穿越",
  "签到",
  "模拟器",
  "随身空间",
  "血脉觉醒",
  "无限流",
  "签到打卡",
  "数据化",
];

const GENRE_PRESETS = [
  "玄幻",
  "都市",
  "科幻",
  "言情",
  "武侠",
  "历史",
  "悬疑",
  "游戏",
  "轻小说",
  "仙侠",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Blueprint(): JSX.Element {
  const navigate = useNavigate();
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [bp, setBp] = useState<Blueprint>(EMPTY_BP);
  const [generating, setGenerating] = useState(false);
  const [storyBible, setStoryBible] = useState<StoryBibleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [styleOptions, setStyleOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedProjectRef = useRef<string | null>(null);
  // Debounce timer for deferred blueprint persistence.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Latest projectId mirrored into a ref so the unmount cleanup (which has a
  // stale closure) can still flush pending saves to the correct project.
  const projectIdRef = useRef<string | undefined>(projectId);
  // Accumulates field changes between debounced saves. The previous logic
  // reused a single debounce timer for every field, so editing field B
  // within 800ms of field A cancelled A's pending PUT — silently dropping
  // blueprint.genre (and any other earlier edit). We now batch all pending
  // fields into one PUT so nothing is lost.
  const pendingFieldsRef = useRef<Partial<Blueprint>>({});

  // --- Load existing blueprint + chat history on mount / project switch ---
  useEffect(() => {
    if (!projectId || loadedProjectRef.current === projectId) return;
    loadedProjectRef.current = projectId;
    let cancelled = false;
    void (async () => {
      // Use allSettled so a failure in one request (e.g. no history yet for a
      // new project) doesn't discard the other. Previously Promise.all would
      // reject entirely if either endpoint 404'd, losing the blueprint too.
      const [blueprintResult, historyResult] = await Promise.allSettled([
        apiGet<{ blueprint: Blueprint }>(
          `/projects/${projectId}/blueprint`,
        ),
        apiGet<{ history: ChatMessage[] }>(
          `/projects/${projectId}/blueprint/history`,
        ),
      ]);
      if (cancelled) return;
      if (blueprintResult.status === "fulfilled") {
        setBp({ ...EMPTY_BP, ...blueprintResult.value.blueprint });
      }
      if (
        historyResult.status === "fulfilled" &&
        historyResult.value.history &&
        historyResult.value.history.length > 0
      ) {
        setMessages(historyResult.value.history);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // --- Auto-scroll chat to bottom ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Keep projectIdRef in sync so the unmount cleanup can flush to the right project.
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  // --- Abort on unmount ---
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      // Flush pending blueprint changes instead of discarding them, so a
      // field edited right before navigating away (e.g. selecting genre) is
      // still persisted to tavernos.json.
      clearTimeout(debounceRef.current);
      const pid = projectIdRef.current;
      const payload = pendingFieldsRef.current;
      if (pid && Object.keys(payload).length > 0) {
        pendingFieldsRef.current = {};
        void apiPut(`/projects/${pid}/blueprint`, payload).catch(() => {});
      }
    };
  }, []);

  // --- Load style library options on mount ---
  useEffect(() => {
    void (async () => {
      try {
        const d = await apiGet<{ styles: Array<{ id: string; name: string }> }>("/style-library");
        setStyleOptions(d.styles);
      } catch {
        // style library not available
      }
    })();
  }, []);

  // --- Load project's style binding ---
  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const d = await apiGet<{ styleId?: string | null }>(`/projects/${projectId}`);
        setSelectedStyleId(d.styleId ?? null);
      } catch {
        // ignore
      }
    })();
  }, [projectId]);

  const handleStyleChange = async (styleId: string): Promise<void> => {
    setSelectedStyleId(styleId);
    if (!projectId) return;
    try {
      await apiPut(`/projects/${projectId}/style`, { styleId });
    } catch {
      // ignore
    }
  };

  // --- Send a chat message via SSE ---
  const sendMessage = useCallback(async (overrideText?: string) => {
    const userMsg = (overrideText ?? input).trim();
    if (!projectId || !userMsg || streaming) return;
    const nextMessages = [
      ...messages,
      { role: "user" as const, content: userMsg },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let assistantText = "";

      await streamSsePost<{
        type: string;
        content?: string;
        blueprint?: Partial<Blueprint>;
        quickReplies?: string[];
        error?: string;
      }>(
        `${BASE_URL}/projects/${projectId}/blueprint/chat`,
        {
          message: userMsg,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
        (frame) => {
          if (frame.type === "delta" && frame.content) {
            assistantText += frame.content;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                role: "assistant",
                content: assistantText,
              };
              return copy;
            });
          } else if (frame.type === "done") {
            assistantText = frame.content ?? assistantText;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                role: "assistant",
                content: assistantText,
                quickReplies: frame.quickReplies ?? [],
              };
              return copy;
            });
            if (frame.blueprint) {
              setBp((prev) => ({ ...prev, ...frame.blueprint }));
              // The backend chat endpoint only persists chat history, not
              // the consultant-filled blueprint, so persist it here too.
              // Without this, genre / platform / goldenFinger returned by
              // the consultant are lost on reload and the generate step
              // falls back to config.genre. Merge into pendingFieldsRef and
              // schedule a single debounced PUT — avoids a duplicate write
              // when a debounced flush from updateField is already pending.
              if (projectId) {
                pendingFieldsRef.current = {
                  ...pendingFieldsRef.current,
                  ...frame.blueprint,
                };
                clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => {
                  const payload = pendingFieldsRef.current;
                  if (Object.keys(payload).length === 0) return;
                  pendingFieldsRef.current = {};
                  void apiPut(`/projects/${projectId}/blueprint`, payload).catch(() => {});
                }, 800);
              }
            }
          } else if (frame.type === "error") {
            setError(frame.error ?? "创作顾问响应失败");
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
  }, [projectId, input, streaming, messages]);

  // --- Stop streaming ---
  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  // --- Save blueprint fields (debounced via PUT) ---
  // All field edits are accumulated into pendingFieldsRef and flushed as a
  // single PUT after 800ms of inactivity. This fixes the bug where editing
  // multiple fields in succession cancelled earlier saves (because only one
  // debounce timer was shared across every field), causing genre and other
  // fields to never persist.
  const updateField = useCallback(
    (field: keyof Blueprint, value: string | number) => {
      setBp((prev) => ({ ...prev, [field]: value }));
      if (!projectId) return;
      pendingFieldsRef.current = { ...pendingFieldsRef.current, [field]: value };
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const payload = pendingFieldsRef.current;
        if (Object.keys(payload).length === 0) return;
        pendingFieldsRef.current = {};
        void apiPut(`/projects/${projectId}/blueprint`, payload).catch(() => {});
      }, 800);
    },
    [projectId],
  );

  // Immediately persist any pending field changes, bypassing the 800ms
  // debounce. Called before operations that read the saved blueprint
  // server-side (e.g. generate) so the backend sees the latest genre /
  // goldenFinger instead of a stale copy.
  const flushPendingSave = useCallback(() => {
    clearTimeout(debounceRef.current);
    if (!projectId) return;
    const payload = pendingFieldsRef.current;
    if (Object.keys(payload).length === 0) return;
    pendingFieldsRef.current = {};
    void apiPut(`/projects/${projectId}/blueprint`, payload).catch(() => {});
  }, [projectId]);

  // --- Generate story bible from the blueprint ---
  const generateStoryBible = useCallback(async () => {
    if (!projectId || generating) return;
    // Flush any pending blueprint edits (e.g. genre just selected) so the
    // backend generate endpoint reads the latest blueprint from tavernos.json
    // instead of a stale copy that still has an empty genre.
    flushPendingSave();
    setGenerating(true);
    setError(null);
    try {
      const data = await apiPost<{ storyBible: StoryBibleResult; blueprint: Blueprint }>(
        `/projects/${projectId}/blueprint/generate`,
        {},
      );
      setStoryBible(data.storyBible);
      setBp({ ...EMPTY_BP, ...data.blueprint });
    } catch (e) {
      setError(e instanceof Error ? e.message : "资产圣经生成失败");
    } finally {
      setGenerating(false);
    }
  }, [projectId, generating, flushPendingSave]);

  // --- Count filled fields for the completion meter ---
  const filledCount = [
    bp.platform !== "other",
    bp.channel !== "",
    bp.genre,
    bp.referenceBook,
    bp.goldenFinger,
    bp.sellingPoint,
    bp.protagonist,
    bp.worldTone,
    bp.plotDirection,
    bp.wordCount > 0,
    bp.updateFrequency,
  ].filter(Boolean).length;
  const totalFields = 11;
  const completionPct = Math.round((filledCount / totalFields) * 100);

  if (!projectId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <p className="mb-4 text-[#E8E8E8]">未选择项目</p>
          <button className={BTN.primary} onClick={() => navigate("/write/library")}>
            返回创作库
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#1A1A1A] bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <button
            className="btn-press text-sm text-[#888888] transition-colors hover:text-[#E8E8E8]"
            onClick={() => navigate("/write/library")}
          >
            ← 返回
          </button>
          <div className="h-4 w-px bg-[#2A2A2A]" />
          <h1 className="text-lg font-light">作品蓝图</h1>
          <span className="text-sm text-[#888888]">· {currentProject?.name}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-[#888888]">
              完成度 {completionPct}%
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#1A1A1A]">
              <div
                className="h-full w-full origin-left rounded-full bg-[#C9A86C] transition-transform"
                style={{ transform: `scaleX(${completionPct / 100})` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_380px]">
        {/* ===== Left: Chat ===== */}
        <section className="flex h-[calc(100vh-140px)] flex-col rounded-xl border border-[#1A1A1A] bg-[#0F0F0F]">
          {/* Chat messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto p-5"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#222222] bg-[#0C0C0C]">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#3A3A3A]"
                  >
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="10" x2="16" y2="10" />
                    <line x1="8" y1="14" x2="12" y2="14" />
                  </svg>
                </div>
                <p className="mb-2 text-base font-light text-[#C8C8C8]">跟创作顾问聊聊你的新书</p>
                <p className="max-w-md text-sm leading-relaxed text-[#666666]">
                  告诉我你想写什么故事，我会帮你确认平台、金手指、卖点、主角设定等核心要素，最后生成你的资产圣经。
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "我想写一本番茄的系统流小说",
                    "帮我定个起点玄幻的金手指",
                    "我有对标作品想参考",
                  ].map((s) => (
                    <button
                      key={s}
                      className="btn-press rounded-full border border-[#2A2A2A] px-4 py-2 text-xs text-[#999999] transition-colors duration-300 hover:border-[rgba(201,168,108,0.3)] hover:bg-[rgba(201,168,108,0.05)] hover:text-[#C9A86C]"
                      onClick={() => setInput(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex flex-col items-start gap-2"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-[#C9A86C]/15 px-4 py-2.5 text-sm text-[#E8E8E8]"
                      : "max-w-[85%] rounded-2xl rounded-tl-sm bg-[#141414] px-4 py-2.5 text-sm leading-relaxed text-[#E8E8E8] whitespace-pre-wrap"
                  }
                >
                  {m.content || (
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce text-[#C9A86C]">·</span>
                      <span className="animate-bounce text-[#C9A86C]" style={{ animationDelay: "0.15s" }}>·</span>
                      <span className="animate-bounce text-[#C9A86C]" style={{ animationDelay: "0.3s" }}>·</span>
                    </span>
                  )}
                </div>
                {m.role === "assistant" && m.quickReplies && m.quickReplies.length > 0 && m.content && (
                  <div className="flex flex-wrap gap-2">
                    {m.quickReplies.map((qr) => (
                      <button
                        key={qr}
                        disabled={streaming}
                        onClick={() => void sendMessage(qr)}
                        className="btn-press rounded-full border border-[#C9A86C]/30 bg-[#C9A86C]/5 px-3 py-1.5 text-xs text-[#C9A86C] transition-colors hover:border-[#C9A86C]/60 hover:bg-[#C9A86C]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-5 mb-2 rounded-lg border border-[#C9685A]/30 bg-[#C9685A]/10 px-3 py-2 text-xs text-[#C9685A]">
              {error}
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-[#1A1A1A] p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setInput(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="跟顾问聊聊你的想法…（Enter 发送，Shift+Enter 换行）"
                rows={1}
                className="max-h-32 flex-1 resize-none rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#E8E8E8] placeholder-[#555555] focus:border-[rgba(201,168,108,0.5)] focus:outline-none"
                style={{ minHeight: "42px" }}
              />
              {streaming ? (
                <button
                  className="btn-press rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm text-[#E8E8E8] transition-colors hover:border-[#C9685A]/50"
                  onClick={stopStream}
                >
                  停止
                </button>
              ) : (
                <button
                  className="btn-press rounded-lg bg-[#C9A86C] px-4 py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#D4B884] disabled:opacity-40"
                  disabled={!input.trim()}
                  onClick={() => void sendMessage()}
                >
                  发送
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===== Right: Blueprint panel ===== */}
        <aside className="flex h-[calc(100vh-140px)] flex-col rounded-xl border border-[#1A1A1A] bg-[#0F0F0F]">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            <div className="mb-2">
              <h2 className="text-sm font-light text-[#E8E8E8]">核心设定</h2>
              <p className="mt-1 text-xs text-[#888888]">
                聊天时自动填充，也可手动编辑或点选
              </p>
            </div>

            {/* Section 1: 投放基础 */}
            <SectionGroup title="投放基础" defaultOpen={true}>
              {/* Platform */}
              <FieldGroup label="投放平台">
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_OPTIONS.map((o) => (
                    <Chip
                      key={o.value}
                      active={bp.platform === o.value}
                      onClick={() => updateField("platform", o.value)}
                    >
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </FieldGroup>

              {/* Channel */}
              <FieldGroup label="频道">
                <div className="flex gap-1.5">
                  {(["male", "female"] as const).map((ch) => (
                    <Chip
                      key={ch}
                      active={bp.channel === ch}
                      onClick={() => updateField("channel", ch)}
                    >
                      {ch === "male" ? "男频" : "女频"}
                    </Chip>
                  ))}
                </div>
              </FieldGroup>

              {/* Genre */}
              <FieldGroup label="题材类型">
                <input
                  value={bp.genre}
                  onChange={(e) => updateField("genre", e.target.value)}
                  placeholder="如：玄幻"
                  className={inputCls}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {GENRE_PRESETS.map((g) => (
                    <Chip
                      key={g}
                      active={bp.genre === g}
                      onClick={() => updateField("genre", g)}
                    >
                      {g}
                    </Chip>
                  ))}
                </div>
              </FieldGroup>
            </SectionGroup>

            {/* Section 2: 核心创意 */}
            <SectionGroup title="核心创意" defaultOpen={true}>
              {/* Golden finger */}
              <FieldGroup label="金手指">
                <input
                  value={bp.goldenFinger}
                  onChange={(e) => updateField("goldenFinger", e.target.value)}
                  placeholder="如：系统流"
                  className={inputCls}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {GOLDEN_FINGER_PRESETS.map((g) => (
                    <Chip
                      key={g}
                      active={bp.goldenFinger === g}
                      onClick={() => updateField("goldenFinger", g)}
                    >
                      {g}
                    </Chip>
                  ))}
                </div>
              </FieldGroup>

              {/* Reference book */}
              <FieldGroup label="对标作品">
                <input
                  value={bp.referenceBook}
                  onChange={(e) => updateField("referenceBook", e.target.value)}
                  placeholder="如：《诡秘之主》"
                  className={inputCls}
                />
              </FieldGroup>

              {/* Writing style selection */}
              <FieldGroup label="文风仿写">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedStyleId ?? ""}
                    onChange={(e) => void handleStyleChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">不使用文风仿写</option>
                    {styleOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {styleOptions.length === 0 && (
                    <span className="whitespace-nowrap text-xs text-[#555]">
                      <Link to="/write/style" className="text-[#C9A86C] hover:underline">去克隆文风</Link>
                    </span>
                  )}
                </div>
                {selectedStyleId && (
                  <p className="mt-1 text-xs text-[#787878]">已绑定文风，Writer 写作时将自动模仿此风格</p>
                )}
              </FieldGroup>
            </SectionGroup>

            {/* Section 3: 故事要素 */}
            <SectionGroup title="故事要素" defaultOpen={true}>
              {/* Selling point */}
              <FieldGroup label="卖点 / 爽点">
                <textarea
                  value={bp.sellingPoint}
                  onChange={(e) => updateField("sellingPoint", e.target.value)}
                  placeholder="这本书最大的看点"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </FieldGroup>

              {/* Protagonist */}
              <FieldGroup label="主角设定">
                <textarea
                  value={bp.protagonist}
                  onChange={(e) => updateField("protagonist", e.target.value)}
                  placeholder="身份、性格、目标"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </FieldGroup>

              {/* World tone */}
              <FieldGroup label="世界观基调">
                <textarea
                  value={bp.worldTone}
                  onChange={(e) => updateField("worldTone", e.target.value)}
                  placeholder="背景、核心规则"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </FieldGroup>

              {/* Plot direction */}
              <FieldGroup label="期望剧情走向">
                <textarea
                  value={bp.plotDirection}
                  onChange={(e) => updateField("plotDirection", e.target.value)}
                  placeholder="开局、发展、高潮"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </FieldGroup>
            </SectionGroup>

            {/* Section 4: 创作计划 */}
            <SectionGroup title="创作计划" defaultOpen={false}>
              {/* Word count + update frequency */}
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="目标字数">
                  <input
                    type="number"
                    value={bp.wordCount || ""}
                    onChange={(e) =>
                      updateField("wordCount", Number(e.target.value) || 0)
                    }
                    placeholder="如：1000000"
                    className={inputCls}
                  />
                </FieldGroup>
                <FieldGroup label="更新频率">
                  <input
                    value={bp.updateFrequency}
                    onChange={(e) => updateField("updateFrequency", e.target.value)}
                    placeholder="如：日更4000"
                    className={inputCls}
                  />
                </FieldGroup>
              </div>
            </SectionGroup>
          </div>

          {/* Generate button */}
          <div className="border-t border-[#1A1A1A] p-4">
            <button
              className="btn-press w-full rounded-lg bg-[#C9A86C] px-4 py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#D4B884] hover:shadow-[0_0_12px_rgba(201,168,108,0.15)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={generating || filledCount < 2}
              onClick={() => void generateStoryBible()}
            >
              {generating
                ? "正在生成资产圣经…"
                : bp.status === "confirmed"
                  ? "重新生成资产圣经"
                  : "生成资产圣经"}
            </button>
            {filledCount < 2 && (
              <p className="mt-2 text-center text-xs text-[#666666]">
                至少填写 2 项设定后可生成
              </p>
            )}
            {bp.status === "confirmed" && (
              <button
                className="btn-press mt-2 w-full rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#E8E8E8] transition-colors hover:border-[#3A3A3A]"
                onClick={() => navigate("/write/editor")}
              >
                进入编辑器 →
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ===== Story Bible preview modal ===== */}
      {storyBible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#1A1A1A] bg-[#141414] p-6">
            <h2 className="mb-1 text-lg font-light text-[#C9A86C]">资产圣经已生成</h2>
            <p className="mb-4 text-xs text-[#888888]">
              已保存为 story-bible.md，architect 会以此为设定基准
            </p>
            {storyBible.premise && (
              <BibleSection title="故事前提">{storyBible.premise}</BibleSection>
            )}
            {storyBible.world && (
              <BibleSection title="世界观">{storyBible.world}</BibleSection>
            )}
            {storyBible.characters != null && (
              <BibleSection title="角色">
                <pre className="whitespace-pre-wrap text-xs text-[#B0B0B0]">
                  {JSON.stringify(storyBible.characters, null, 2)}
                </pre>
              </BibleSection>
            )}
            {storyBible.plot != null && (
              <BibleSection title="剧情结构">
                <pre className="whitespace-pre-wrap text-xs text-[#B0B0B0]">
                  {JSON.stringify(storyBible.plot, null, 2)}
                </pre>
              </BibleSection>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className={BTN.ghost}
                onClick={() => setStoryBible(null)}
              >
                继续完善设定
              </button>
              <button
                className={BTN.primary}
                onClick={() => navigate("/write/editor")}
              >
                进入编辑器 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555555] transition-colors focus:border-[rgba(201,168,108,0.5)] focus:outline-none";

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-light text-[#B0B0B0]">
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Section Group
// ---------------------------------------------------------------------------

function SectionGroup({
  title,
  children,
  defaultOpen = true,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-[#1A1A1A] bg-[#0C0C0C]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-press flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#111111]"
      >
        <span className="text-xs font-light tracking-wide text-[#C8C8C8]">{title}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#666666] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div className="space-y-4 border-t border-[#1A1A1A] px-4 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      className={
        active
          ? "btn-press rounded-full bg-[#C9A86C] px-3 py-1 text-xs font-medium text-[#0A0A0A]"
          : "btn-press rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#B0B0B0] transition-colors hover:border-[#C9A86C]/40 hover:text-[#E8E8E8]"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-4 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] p-4">
      <h3 className="mb-2 text-xs font-light text-[#C9A86C]">{title}</h3>
      <div className="text-sm leading-relaxed text-[#E8E8E8] whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
