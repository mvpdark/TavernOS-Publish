// VisualNovelOverlay.tsx
// Full-screen Visual Novel mode overlay for the character chat page.
// Displays a background, character sprite, emotion badge, a typewriter
// dialogue box, quick emotion switches, and a reply input — all driven by
// the same SSE-backed message stream as the regular chat.

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { proxyImageUrl } from "../api/client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VNMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VisualNovelOverlayProps {
  characterName: string;
  characterImage?: string;
  messages: VNMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Emotion system
// ---------------------------------------------------------------------------

interface EmotionDef {
  key: string;
  label: string;
  keywords: string[];
  icon: JSX.Element;
}

// Emotion SVG icons — simple outline style for noir theme
const EmotionIcon = ({ d, size = 16 }: { d: string; size?: number }): JSX.Element => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d={d} />
  </svg>
);

const EMOTIONS: EmotionDef[] = [
  { key: "happy", label: "开心", keywords: ["开心", "高兴", "大笑", "哈哈", "嘻嘻", "嘿嘿", "快乐", "愉快", "太棒了", "好极了"],
    icon: <EmotionIcon d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /> },
  { key: "sad", label: "悲伤", keywords: ["难过", "伤心", "哭", "悲伤", "眼泪", "心碎", "失望", "委屈", "心痛"],
    icon: <EmotionIcon d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01" /> },
  { key: "angry", label: "愤怒", keywords: ["生气", "愤怒", "怒火", "气死", "可恶", "混蛋", "讨厌", "烦躁", "怒"],
    icon: <EmotionIcon d="M8 14s1.5 0 2-1 2-1 2-1 1.5 0 2 1 2 1 2 1M9 9l-1-1M15 9l1-1" /> },
  { key: "fear", label: "恐惧", keywords: ["害怕", "恐惧", "惊恐", "吓", "紧张", "担心", "不安", "颤抖", "畏惧"],
    icon: <EmotionIcon d="M8 12h.01M12 12h.01M16 12h.01M9 9l-1-1M15 9l1-1" /> },
  { key: "love", label: "喜爱", keywords: ["喜欢", "心动", "害羞", "脸红", "亲爱的", "爱你", "想念", "温柔", "甜蜜"],
    icon: (<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>) },
  { key: "confident", label: "得意", keywords: ["得意", "自信", "当然", "轻松", "毫不费力", "小菜一碟", "哼"],
    icon: <EmotionIcon d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M12 2l2 4h-4l2-4z" /> },
  { key: "tired", label: "困倦", keywords: ["困了", "犯困", "累了", "疲惫", "哈欠", "困倦", "休息", "想睡"],
    icon: <EmotionIcon d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0M7 5l-2 2M17 5l2 2" /> },
  { key: "neutral", label: "平静", keywords: [],
    icon: <EmotionIcon d="M8 13h8M9 9h.01M15 9h.01" /> },
];

const DEFAULT_EMOTION_KEY = "neutral";

function detectEmotion(text: string): string {
  for (const e of EMOTIONS) {
    if (e.keywords.some((k) => text.includes(k))) return e.key;
  }
  return DEFAULT_EMOTION_KEY;
}

function getEmotionDef(key: string): EmotionDef {
  return EMOTIONS.find((e) => e.key === key) ?? EMOTIONS[EMOTIONS.length - 1]!;
}

// Reveal a few characters per tick for longer messages so pacing stays comfortable.
function chunkSize(len: number): number {
  if (len > 400) return 4;
  if (len > 200) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisualNovelOverlay({
  characterName,
  characterImage,
  messages,
  onClose,
  onSend,
}: VisualNovelOverlayProps): JSX.Element {
  // Active message pointer — start at the latest message.
  const [activeIndex, setActiveIndex] = useState<number>(
    messages.length > 0 ? messages.length - 1 : 0,
  );
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState(false);
  const [emotion, setEmotion] = useState(DEFAULT_EMOTION_KEY);
  const [reply, setReply] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const prevLenRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const emoTimerRef = useRef<number | null>(null);
  const caughtUpRef = useRef(true);
  const advanceRef = useRef<() => void>(() => {});

  const active = messages[activeIndex];
  const fullText = active?.content ?? "";
  const isAssistant = active?.role === "assistant";
  const isLast = activeIndex === messages.length - 1;
  const imgSrc = proxyImageUrl(characterImage);

  // --- Debounced auto emotion detection (assistant messages only) ---
  // Re-evaluates 500ms after text stops changing, so streaming no longer
  // causes the badge to flicker. Manual button presses persist until the
  // next assistant message arrives.
  useEffect(() => {
    if (!isAssistant || fullText.length === 0) return;
    if (emoTimerRef.current) clearTimeout(emoTimerRef.current);
    emoTimerRef.current = window.setTimeout(() => {
      setEmotion(detectEmotion(fullText));
    }, 500);
    return () => {
      if (emoTimerRef.current) clearTimeout(emoTimerRef.current);
    };
  }, [fullText, isAssistant]);

  // --- Reset typewriter when the active message changes ---
  useEffect(() => {
    setRevealed(0);
    setTyping(fullText.length > 0);
    prevLenRef.current = fullText.length;
    caughtUpRef.current = activeIndex >= messages.length - 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // --- Typewriter progression + streaming catch-up ---
  useEffect(() => {
    // Streaming: the same message is growing (SSE deltas arriving).
    if (fullText.length > prevLenRef.current) {
      setRevealed(fullText.length);
      setTyping(false);
      prevLenRef.current = fullText.length;
      return;
    }
    // Typewriter tick.
    if (typing && revealed < fullText.length) {
      timerRef.current = window.setTimeout(() => {
        setRevealed((r) => Math.min(r + chunkSize(fullText.length), fullText.length));
      }, 28);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
    if (typing && revealed >= fullText.length && fullText.length > 0) {
      setTyping(false);
    }
    prevLenRef.current = fullText.length;
  }, [fullText, revealed, typing]);

  // --- Clamp activeIndex when messages shrink (e.g. clearing history) ---
  useEffect(() => {
    setActiveIndex((i) => (i >= messages.length ? Math.max(0, messages.length - 1) : i));
  }, [messages.length]);

  // --- Auto-follow new messages when caught up ---
  useEffect(() => {
    if (messages.length === 0) return;
    if (caughtUpRef.current && messages.length - 1 > activeIndex) {
      setActiveIndex(messages.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // --- Advance logic: skip typewriter, then go to next message ---
  const revealAll = (): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRevealed(fullText.length);
    setTyping(false);
  };

  const advance = (): void => {
    if (typing) {
      revealAll();
      return;
    }
    if (activeIndex < messages.length - 1) {
      setActiveIndex((i) => i + 1);
    } else {
      inputRef.current?.focus();
    }
  };
  advanceRef.current = advance;

  // --- Keyboard: space to advance, Esc to exit ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.code === "Space" || e.key === " ") {
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        advanceRef.current();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // --- Cleanup timers on unmount ---
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (emoTimerRef.current) clearTimeout(emoTimerRef.current);
    };
  }, []);

  const handleReply = (): void => {
    const t = reply.trim();
    if (!t) return;
    onSend(t);
    setReply("");
    caughtUpRef.current = true;
  };

  const isEmpty = messages.length === 0;
  const showDots = isEmpty || (isLast && isAssistant && fullText.length === 0);
  const awaitingReply = isLast && !isAssistant && fullText.length > 0;
  const displayName = isEmpty || isAssistant ? characterName : "我";
  const hasMore = activeIndex < messages.length - 1;

  return (
    <div
      className="fixed inset-0 z-40 flex cursor-pointer select-none flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0A0A0A 0%, #141414 40%, #1A1410 100%)" }}
      onClick={() => advanceRef.current()}
    >
      {/* Vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* Exit button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="btn-press absolute right-4 top-4 z-20 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
      >
        退出VN
      </button>

      {/* Emotion badge */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
        <span
          key={emotion}
          className="text-white/80"
          style={{ animation: "vn-fade 0.3s ease", transition: "opacity 0.3s ease" }}
        >
          {getEmotionDef(emotion).icon}
        </span>
        <span className="text-xs text-white/70">{getEmotionDef(emotion).label}</span>
      </div>

      {/* Quick emotion buttons */}
      <div
        className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {EMOTIONS.map((e) => (
          <button
            key={e.key}
            onClick={() => setEmotion(e.key)}
            title={e.label}
            className={`btn-press flex h-8 w-8 items-center justify-center rounded-full text-base transition-all ${
              emotion === e.key
                ? "bg-[var(--color-primary-tint-strong)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                : "text-white/60 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {e.icon}
          </button>
        ))}
      </div>

      {/* Character sprite */}
      <div className="relative z-10 flex flex-1 items-end justify-center pb-2">
        {imgSrc ? (
          <img
            key={imgSrc}
            src={imgSrc}
            alt={characterName}
            className="max-h-[58vh] max-w-[80vw] object-contain transition-all duration-500"
            style={{
              animation: "vn-slide-in 0.5s ease-out",
              filter: isAssistant ? "none" : "grayscale(0.4) brightness(0.8)",
              opacity: isAssistant ? 1 : 0.75,
            }}
            draggable={false}
          />
        ) : (
          <div
            className="flex max-h-[58vh] min-h-[200px] w-[200px] items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-b from-white/5 to-transparent"
            style={{ animation: "vn-slide-in 0.5s ease-out" }}
          >
            <span className="text-6xl font-light text-white/40">
              {characterName.charAt(0) || "?"}
            </span>
          </div>
        )}
      </div>

      {/* Dialogue box */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4">
        <div
          className="rounded-xl border border-white/15 bg-black/60 p-4 backdrop-blur-md"
          style={{ animation: "vn-box-in 0.4s ease-out" }}
        >
          {/* Speaker name */}
          <div className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            {displayName || "???"}
          </div>

          {/* Text / waiting indicator */}
          <div
            className="min-h-[3.5rem] text-[15px] leading-relaxed"
            style={{ color: "var(--color-text)" }}
          >
            {showDots ? (
              <span className="inline-flex items-center gap-1 text-white/60">
                <span style={{ animation: "vn-bounce 1s infinite" }}>·</span>
                <span style={{ animation: "vn-bounce 1s infinite 0.2s" }}>·</span>
                <span style={{ animation: "vn-bounce 1s infinite 0.4s" }}>·</span>
                <span className="ml-1">正在输入</span>
              </span>
            ) : (
              <>
                <span>{fullText.slice(0, revealed)}</span>
                {typing && (
                  <span
                    className="ml-0.5 inline-block h-4 w-[2px] align-middle"
                    style={{ background: "var(--color-primary)", animation: "vn-blink 1s step-end infinite" }}
                  />
                )}
                {!typing && (
                  <span
                    className="ml-1 inline-block text-white/40"
                    style={{ animation: "vn-blink 1.2s infinite" }}
                  >
                    ▼
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Continue hint + progress */}
        <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-white/40">
          <span>点击 / 空格 继续</span>
          <span>
            {activeIndex + 1} / {messages.length}
            {awaitingReply ? " · 等待回复" : ""}
            {hasMore ? " · 还有未读" : ""}
          </span>
        </div>
      </div>

      {/* Reply input */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleReply();
              }
            }}
            placeholder="输入你的回复…"
            className="flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder-white/30 outline-none backdrop-blur-md transition-colors focus:border-[var(--color-primary-border)]"
          />
          <button
            onClick={handleReply}
            disabled={!reply.trim()}
            className="btn-press rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-all hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </div>

      {/* Keyframes (CSS only — no JS animation libraries) */}
      <style>{`
        @keyframes vn-slide-in {
          from { transform: translateX(-60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes vn-fade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes vn-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes vn-bounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes vn-box-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
