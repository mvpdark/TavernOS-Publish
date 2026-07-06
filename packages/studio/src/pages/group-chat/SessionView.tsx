// Active session view — participant sidebar, speaking-order bar, chat messages,
// emotion indicators, narrator mode, and input bar.
// Presentational component: receives all state and callbacks as props.

import { useState } from "react";
import type { RefObject, JSX } from "react";
import type { GroupChatSession, TokenUsage, PersonaCard } from "./types.js";
import { colorForIndex, BUBBLE_COLORS } from "./constants.js";
import { proxyImageUrl } from "../../api/client.js";
import { IconSettings, IconMasks, IconX } from "../../components/Icons.tsx";

// ---------------------------------------------------------------------------
// Enhancement settings (owned by GroupChat, passed down as props)
// ---------------------------------------------------------------------------

export interface GroupChatEnhSettings {
  /** 发言顺序显示 — numbered avatar row at the top of the chat area. */
  showSpeakingOrder: boolean;
  /** 情绪指示器 — emotion badges on bubbles + user emotion picker. */
  showEmotions: boolean;
  /** 旁白模式 — narrator toggle in the input bar. */
  narratorEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Emotion system
// ---------------------------------------------------------------------------

export type EmotionKey =
  | "neutral"
  | "sad"
  | "angry"
  | "fear"
  | "love"
  | "confident"
  | "tired"
  | "silent";

interface EmotionDef {
  key: EmotionKey;
  emoji: string;
  label: string;
  /** Keywords (Chinese + English) used to detect the emotion in text. */
  keywords: string[];
}

const EMOTIONS: EmotionDef[] = [
  { key: "neutral", emoji: "😊", label: "中性", keywords: ["中性", "平静", "平淡", "neutral", "calm"] },
  { key: "sad", emoji: "😢", label: "悲伤", keywords: ["悲伤", "难过", "伤心", "哀伤", "哀愁", "失落", "sad", "sorrow"] },
  { key: "angry", emoji: "😡", label: "愤怒", keywords: ["愤怒", "生气", "恼怒", "怒火", "愤慨", "怒", "angry", "rage"] },
  { key: "fear", emoji: "😨", label: "恐惧", keywords: ["恐惧", "害怕", "惊恐", "畏惧", "惶恐", "怕", "fear", "afraid"] },
  { key: "love", emoji: "😍", label: "喜爱", keywords: ["喜爱", "喜欢", "爱慕", "心动", "钟情", "倾心", "love", "fond"] },
  { key: "confident", emoji: "😎", label: "自信", keywords: ["自信", "骄傲", "得意", "胸有成竹", "confident", "pride"] },
  { key: "tired", emoji: "😴", label: "疲惫", keywords: ["疲惫", "疲倦", "劳累", "困倦", "乏力", "精疲力竭", "tired", "exhausted"] },
  { key: "silent", emoji: "😶", label: "沉默", keywords: ["沉默", "无语", "默然", "无言", "缄默", "silent", "speechless"] },
];

const EMOTION_MAP: Record<EmotionKey, EmotionDef> = Object.fromEntries(
  EMOTIONS.map((e) => [e.key, e]),
) as Record<EmotionKey, EmotionDef>;

/** Marker strings embedded in user message content for narrator / emotion. */
const NARRATOR_PREFIX = "【旁白】";
const EMOTION_TAG_OPEN = "【情绪：";
const EMOTION_TAG_CLOSE = "】";

/**
 * Parse an emotion from message content.
 * 1. Looks for a structured tag like 【情绪：悲伤】 / [情绪:悲伤] / *情绪：悲伤*.
 *    When found, the tag is stripped from the returned cleanContent.
 * 2. Otherwise scans the text for emotion keywords (first match wins).
 * 3. Defaults to "neutral".
 */
function parseEmotion(content: string): { emotion: EmotionKey; cleanContent: string } {
  // 1. Structured tag.
  const tagRe = /[*【（\[]?\s*情绪\s*[:：]\s*([^\s*】）\]]+?)[\s*】）\]]?/;
  const m = content.match(tagRe);
  if (m) {
    const label = m[1]!.replace(/[。，！？、~～\s]+$/u, "").trim();
    const def = EMOTIONS.find((e) => e.label === label || e.key === label.toLowerCase());
    if (def) {
      const clean = content.replace(m[0], "").replace(/\s{2,}/g, " ").trim();
      return { emotion: def.key, cleanContent: clean };
    }
  }
  // 2. Keyword scan (skip neutral — it is the default).
  for (const def of EMOTIONS) {
    if (def.key === "neutral") continue;
    for (const kw of def.keywords) {
      if (content.includes(kw)) {
        return { emotion: def.key, cleanContent: content };
      }
    }
  }
  return { emotion: "neutral", cleanContent: content };
}

// ---------------------------------------------------------------------------
// Name → color hashing (stable per-character accent colors)
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Stable accent color for a character, derived from their name (not position). */
function colorForName(name: string): (typeof BUBBLE_COLORS)[number] {
  return BUBBLE_COLORS[hashString(name) % BUBBLE_COLORS.length]!;
}

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="btn-press flex w-full items-center justify-between py-1.5 text-left"
    >
      <span className="text-xs text-gray-300">{label}</span>
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-strong)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            checked ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function MemberAvatar({
  card,
  name,
  size,
}: {
  card?: PersonaCard;
  name: string;
  size: number;
}): JSX.Element {
  const avatar = card?.data.extensions?.tavernos?.avatar;
  const sz = { width: size, height: size };
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-[var(--color-border)] ring-1 ring-[var(--color-border-strong)]"
      style={sz}
    >
      {avatar ? (
        <img
          src={proxyImageUrl(avatar)}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-medium text-[var(--color-primary)]"
          style={{ fontSize: Math.max(10, size * 0.4) }}
        >
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SessionViewProps {
  session: GroupChatSession;
  streamingContent: string;
  streamingMember: string | null;
  generating: boolean;
  userInput: string;
  error: string | null;
  usage: TokenUsage | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onUserInputChange: (s: string) => void;
  /** Receives the fully-composed message content (narrator/emotion tags included). */
  onAddUserMessage: (content: string) => void;
  onNext: () => void;
  onStop: () => void;
  /** All loaded persona cards — used to resolve member avatars. */
  characters: PersonaCard[];
  /** Enhancement toggles (群聊增强). */
  settings: GroupChatEnhSettings;
  onSettingsChange: (s: GroupChatEnhSettings) => void;
  /** Member id the user clicked to force as the next speaker (null = natural order). */
  forcedSpeakerId: string | null;
  onForceSpeaker: (memberId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionView({
  session,
  streamingContent,
  streamingMember,
  generating,
  userInput,
  error,
  usage,
  scrollRef,
  onUserInputChange,
  onAddUserMessage,
  onNext,
  onStop,
  characters,
  settings,
  onSettingsChange,
  forcedSpeakerId,
  onForceSpeaker,
}: SessionViewProps): JSX.Element {
  const members = session.config.memberIds;

  // Local UI state (not persisted).
  const [narratorMode, setNarratorMode] = useState(false);
  const [userEmotion, setUserEmotion] = useState<EmotionKey | "none">("none");
  const [emotionPickerOpen, setEmotionPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Resolve persona cards by filename for avatars.
  const cardMap = new Map<string, PersonaCard>();
  for (const c of characters) cardMap.set(c.filename, c);

  // Members that have already spoken at least once.
  const spokenSet = new Set(
    session.messages.filter((m) => m.role === "character").map((m) => m.memberId),
  );

  // The "active" speaker: who is currently speaking (during generation) or who
  // is about to speak next. A forced speaker takes precedence when set.
  const nextNatural = members[session.currentTurnIndex % members.length] ?? null;
  const activeMember = generating
    ? (streamingMember ?? forcedSpeakerId ?? nextNatural)
    : (forcedSpeakerId ?? nextNatural);

  const intendedSpeakerId = forcedSpeakerId ?? nextNatural;
  const intendedSpeakerName = intendedSpeakerId
    ? (session.memberNames[intendedSpeakerId] ?? intendedSpeakerId)
    : "";

  const sendMessage = (): void => {
    const trimmed = userInput.trim();
    if (!trimmed) return;
    let content = trimmed;
    if (settings.narratorEnabled && narratorMode) {
      content = `${NARRATOR_PREFIX}${content}`;
    }
    if (settings.showEmotions && userEmotion !== "none") {
      content = `${content} ${EMOTION_TAG_OPEN}${EMOTION_MAP[userEmotion].label}${EMOTION_TAG_CLOSE}`;
    }
    onAddUserMessage(content);
    setUserEmotion("none");
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar: participants */}
      <div className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="px-4 py-3 text-sm font-light text-[var(--color-text)]">参与角色</div>
        <div className="overflow-y-auto">
          {members.map((memberId, i) => {
            const name = session.memberNames[memberId] ?? memberId;
            const color = colorForIndex(i);
            const isActive = memberId === activeMember;
            return (
              <div
                key={memberId}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${
                  isActive ? "bg-[var(--color-primary-tint)]" : ""
                }`}
              >
                <span className={`inline-block h-3 w-3 rounded-full ${color.bg}`} />
                <span className={isActive ? "font-medium text-[var(--color-primary)]" : "text-gray-300"}>
                  {name}
                </span>
                {isActive && <span className="text-xs text-[var(--color-primary)]">下一个</span>}
              </div>
            );
          })}
        </div>
        <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-gray-500">
          顺序: {session.config.order === "fixed" ? "固定" : session.config.order === "round-robin" ? "轮转" : "随机"}
          {" · "}
          轮次: {session.turnCount}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar: speaking order + enhancement settings */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="mx-auto max-w-3xl px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {settings.showSpeakingOrder ? "发言顺序" : "群聊"}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className="btn-press flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-[var(--color-primary)]"
                  title="群聊增强设置"
                >
                  <IconSettings size={16} />
                </button>
                {settingsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 shadow-xl popover-enter">
                      <div className="mb-2 text-xs font-medium text-[var(--color-primary)]">群聊增强</div>
                      <Toggle
                        label="启用发言顺序显示"
                        checked={settings.showSpeakingOrder}
                        onChange={(v) => onSettingsChange({ ...settings, showSpeakingOrder: v })}
                      />
                      <Toggle
                        label="启用情绪指示器"
                        checked={settings.showEmotions}
                        onChange={(v) => onSettingsChange({ ...settings, showEmotions: v })}
                      />
                      <Toggle
                        label="启用旁白模式"
                        checked={settings.narratorEnabled}
                        onChange={(v) => onSettingsChange({ ...settings, narratorEnabled: v })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {settings.showSpeakingOrder && (
              <div className="mt-2 flex items-start gap-2 overflow-x-auto pb-1">
                {members.map((memberId, i) => {
                  const name = session.memberNames[memberId] ?? memberId;
                  const card = cardMap.get(memberId);
                  const isActive = memberId === activeMember;
                  const hasSpoken = spokenSet.has(memberId) && !isActive;
                  return (
                    <button
                      key={memberId}
                      type="button"
                      disabled={generating}
                      onClick={() => {
                        if (generating) return;
                        onForceSpeaker(isActive && forcedSpeakerId === memberId ? null : memberId);
                      }}
                      title={`点击指定 ${name} 下一个发言`}
                      className="btn-press group relative shrink-0 disabled:cursor-not-allowed"
                    >
                      <div
                        className={`relative rounded-full transition-all ${
                          isActive
                            ? "ring-2 ring-[var(--color-primary)] shadow-[0_0_10px_rgba(201,168,108,0.35)]"
                            : "ring-1 ring-[var(--color-border-strong)]"
                        } ${hasSpoken ? "opacity-40" : "opacity-100"}`}
                        style={
                          isActive
                            ? { animation: "tavernos-gc-pulse 1.8s ease-in-out infinite" }
                            : undefined
                        }
                      >
                        <MemberAvatar card={card} name={name} size={32} />
                      </div>
                      {/* Numbered badge */}
                      <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-[var(--color-text-inverse)]">
                        {i + 1}
                      </span>
                      {forcedSpeakerId === memberId && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-purple)] px-1 text-[9px] font-medium text-white">
                          已指定
                        </span>
                      )}
                      <span className="mt-0.5 block max-w-[3.2rem] truncate text-center text-[10px] text-gray-400">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="mx-auto max-w-3xl space-y-4 p-6">
            {session.messages.length === 0 && !streamingContent && (
              <div className="text-center text-sm text-gray-500">
                群聊已创建，点击&ldquo;下一条&rdquo;开始对话
              </div>
            )}
            {session.messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isNarrator = isUser && msg.content.startsWith(NARRATOR_PREFIX);
              const afterNarrator = isNarrator
                ? msg.content.slice(NARRATOR_PREFIX.length)
                : msg.content;
              const parsed = settings.showEmotions
                ? parseEmotion(afterNarrator)
                : { emotion: "neutral" as EmotionKey, cleanContent: afterNarrator };
              const emoDef = EMOTION_MAP[parsed.emotion];
              const color = isUser ? null : colorForName(msg.memberName);
              const card = isUser ? undefined : cardMap.get(msg.memberId);
              const displayName = isUser ? (isNarrator ? "旁白" : "你") : msg.memberName;

              const bubbleClass = isNarrator
                ? "bg-[var(--color-purple-bg)] border border-[var(--color-purple-border)] text-[var(--color-text)]"
                : isUser
                  ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                  : color
                    ? `${color.bg} ${color.text} border ${color.border}`
                    : "bg-[var(--color-surface)] text-gray-300 border border-[var(--color-border-strong)]";

              return (
                <div
                  key={i}
                  className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <MemberAvatar
                    card={card}
                    name={isUser ? "你" : msg.memberName}
                    size={24}
                  />
                  <div
                    className={`flex min-w-0 flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                      {isUser ? (
                        <span
                          className={isNarrator ? "font-medium text-[var(--color-purple)]" : "font-medium text-[var(--color-primary)]"}
                        >
                          {displayName}
                        </span>
                      ) : (
                        <span className={`font-medium ${color?.text ?? "text-gray-300"}`}>
                          {displayName}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div
                      className={`relative max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${bubbleClass}`}
                    >
                      {settings.showEmotions && emoDef.key !== "neutral" && (
                        <span
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-xs"
                          title={emoDef.label}
                        >
                          {emoDef.emoji}
                        </span>
                      )}
                      {isNarrator && (
                        <span className="mr-1 font-medium text-[var(--color-purple)]">【旁白】</span>
                      )}
                      <span className={isNarrator ? "italic" : ""}>{parsed.cleanContent}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {streamingContent && (
              <div className="flex flex-row gap-2">
                <MemberAvatar
                  card={streamingMember ? cardMap.get(streamingMember) : undefined}
                  name={streamingMember ? (session.memberNames[streamingMember] ?? "?") : "?"}
                  size={24}
                />
                <div className="flex min-w-0 flex-col items-start">
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-[var(--color-primary)]">
                      {streamingMember
                        ? (session.memberNames[streamingMember] ?? "生成中")
                        : "生成中..."}
                    </span>
                  </div>
                  <div className="max-w-[80%] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-sm leading-relaxed text-gray-200">
                    {streamingContent}
                    <span
                      className="ml-0.5 inline-block h-4 w-[2px] bg-[var(--color-primary)] align-middle"
                      style={{ animation: "tavernos-gc-blink 1s step-end infinite" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage stats */}
        {usage && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-1.5 text-xs text-gray-500">
            Token: 输入 {usage.promptTokens} / 输出 {usage.completionTokens} / 合计 {usage.totalTokens}
          </div>
        )}

        {error && (
          <div className="bg-[var(--color-danger-bg)] px-4 py-2 text-sm text-[var(--color-danger)]">{error}</div>
        )}

        {/* Input bar */}
        <div className="border-t border-[var(--color-border)] p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            {/* Emotion picker */}
            {settings.showEmotions && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEmotionPickerOpen((o) => !o)}
                  className="btn-press flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-base hover:border-[var(--color-primary)]"
                  title="选择情绪"
                >
                  {userEmotion === "none" ? <IconMasks size={16} className="text-gray-400" /> : <span>{EMOTION_MAP[userEmotion].emoji}</span>}
                </button>
                {emotionPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setEmotionPickerOpen(false)} />
                    <div className="absolute bottom-full left-0 z-50 mb-2 grid w-48 grid-cols-2 gap-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2 shadow-xl popover-enter-up">
                      <button
                        type="button"
                        onClick={() => {
                          setUserEmotion("none");
                          setEmotionPickerOpen(false);
                        }}
                        className={`btn-press flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          userEmotion === "none"
                            ? "bg-[var(--color-primary-tint-strong)] text-[var(--color-primary)]"
                            : "text-gray-300 hover:bg-[var(--color-surface-hover)]"
                        }`}
                      >
                        <IconX size={12} />
                        <span>无</span>
                      </button>
                      {EMOTIONS.map((e) => (
                        <button
                          key={e.key}
                          type="button"
                          onClick={() => {
                            setUserEmotion((prev) => (prev === e.key ? "none" : e.key));
                            setEmotionPickerOpen(false);
                          }}
                          className={`btn-press flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            userEmotion === e.key
                              ? "bg-[var(--color-primary-tint-strong)] text-[var(--color-primary)]"
                              : "text-gray-300 hover:bg-[var(--color-surface-hover)]"
                          }`}
                        >
                          <span>{e.emoji}</span>
                          <span>{e.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Narrator toggle */}
            {settings.narratorEnabled && (
              <button
                type="button"
                onClick={() => setNarratorMode((v) => !v)}
                className={`btn-press h-9 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  narratorMode
                    ? "border-[var(--color-purple-border)] bg-[var(--color-purple-bg)] text-[var(--color-purple)]"
                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-gray-400 hover:border-[var(--color-purple)]"
                }`}
                title="旁白模式：以叙述者身份描述场景/动作，而非角色对话"
              >
                旁白
              </button>
            )}

            <input
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={generating}
              placeholder={
                settings.narratorEnabled && narratorMode
                  ? "输入旁白描述（叙述场景/动作）..."
                  : "输入用户消息（可选）..."
              }
              className={`flex-1 rounded-lg border bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] ${
                settings.narratorEnabled && narratorMode
                  ? "border-[var(--color-purple-border)] italic"
                  : "border-[var(--color-border-strong)]"
              }`}
            />
            <button
              onClick={sendMessage}
              disabled={generating || !userInput.trim()}
              className="btn-press rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm text-gray-300 hover:border-[var(--color-primary)] disabled:opacity-50"
            >
              插入消息
            </button>
            <button
              onClick={onNext}
              disabled={generating}
              className="btn-press rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {generating ? "生成中..." : `下一条${intendedSpeakerName ? ` (${intendedSpeakerName})` : ""}`}
            </button>
            {generating && (
              <button
                onClick={onStop}
                className="btn-press rounded-lg bg-[var(--color-danger)] px-6 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                停止
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
