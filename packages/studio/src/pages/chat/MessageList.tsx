// Message list area — presentational component.
// Renders the scrollable message list with swipe-style alternative generations,
// inline message editing, copy/delete actions, lightweight Markdown
// rendering for assistant messages, a streaming cursor, TTS, and the
// "thinking..." indicator. All state and callbacks arrive as props.

import { useState, useRef, useEffect } from "react";
import type { RefObject, JSX } from "react";
import type { ChatMessage } from "./types.js";
import {
  IconPen,
  IconCopy,
  IconTrash2,
  IconVolume,
  IconStop,
  IconCheck,
  IconRefresh,
  IconChevron,
} from "../../components/Icons.tsx";

export interface MessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
  showCursor: boolean;
  lastMsgIndex: number;
  speakingIndex: number | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onSpeak: (index: number, text: string) => void;
  onStopSpeak: () => void;
  /** Display name of the assistant character (shown on assistant messages). */
  characterName?: string;
  /** Switch to the previous swipe for the message at `index`. */
  onSwipePrev: (index: number) => void;
  /** Switch to the next swipe for the message at `index`. */
  onSwipeNext: (index: number) => void;
  /** Regenerate the message at `index` (appends a new swipe). */
  onRegenerate: (index: number) => void;
  /** Persist an inline edit of the message at `index`. */
  onEdit: (index: number, newContent: string) => void;
  /** Delete the message at `index`. */
  onDelete: (index: number) => void;
  /** Index of the message currently being regenerated, or null. */
  regeneratingIndex: number | null;
}

// --- Lightweight Markdown -------------------------------------------------
// XSS-safe: we never use dangerouslySetInnerHTML; all user text is rendered
// as React text nodes. Supports **bold**, *italic*, `inline code`,
// ```fenced code blocks```, and hard line breaks (\n -> <br/>).

/** Tokenize a single line (no newlines) into inline React nodes. */
function parseInline(line: string, baseKey: string): JSX.Element[] {
  // Alternation order matters: **bold** must be tried before *italic*.
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const nodes: JSX.Element[] = [];
  let last = 0;
  let counter = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(
        <span key={`${baseKey}-t${counter++}`}>{line.slice(last, m.index)}</span>,
      );
    }
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(<strong key={`${baseKey}-b${counter++}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={`${baseKey}-c${counter++}`}
          className="rounded bg-[var(--color-surface-sunken)] px-1 py-0.5 text-xs text-[var(--color-primary)]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={`${baseKey}-i${counter++}`}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < line.length) {
    nodes.push(<span key={`${baseKey}-t${counter++}`}>{line.slice(last)}</span>);
  }
  return nodes;
}

/** Render a text segment with hard line breaks (\n -> <br/>). */
function renderText(text: string, baseKey: string): JSX.Element[] {
  const lines = text.split("\n");
  const nodes: JSX.Element[] = [];
  lines.forEach((line, idx) => {
    const inline = parseInline(line, `${baseKey}-l${idx}`);
    if (inline.length > 0) {
      nodes.push(...inline);
    }
    if (idx < lines.length - 1) {
      nodes.push(<br key={`${baseKey}-br${idx}`} />);
    }
  });
  return nodes;
}

/**
 * Render a Markdown string as React elements.
 * Fenced code blocks (```...```) are split out first, then each remaining
 * text segment is parsed for inline markup with hard line breaks.
 */
function renderMarkdown(text: string, baseKey: string): JSX.Element {
  const segments = text.split("```");
  const nodes: JSX.Element[] = [];
  segments.forEach((seg, idx) => {
    if (idx % 2 === 0) {
      // Normal text segment.
      if (seg.length > 0) {
        nodes.push(...renderText(seg, `${baseKey}-s${idx}`));
      }
    } else {
      // Code block. Strip an optional language tag on the first line.
      let code = seg;
      const nl = seg.indexOf("\n");
      if (nl !== -1) {
        const firstLine = seg.slice(0, nl).trim();
        if (firstLine.length > 0 && !firstLine.includes(" ")) {
          code = seg.slice(nl + 1);
        }
      }
      // Trim a single leading/trailing newline introduced by the fences.
      code = code.replace(/^\n/, "").replace(/\n$/, "");
      nodes.push(
        <pre
          key={`${baseKey}-pre${idx}`}
          className="my-1 overflow-x-auto rounded bg-[var(--color-surface-sunken)] p-2 text-xs text-[var(--color-text-muted)]"
        >
          <code>{code}</code>
        </pre>,
      );
    }
  });
  return <>{nodes}</>;
}

// --- Component ------------------------------------------------------------

export default function MessageList({
  messages,
  streaming,
  showCursor,
  lastMsgIndex,
  speakingIndex,
  scrollRef,
  onSpeak,
  onStopSpeak,
  characterName,
  onSwipePrev,
  onSwipeNext,
  onRegenerate,
  onEdit,
  onDelete,
  regeneratingIndex,
}: MessageListProps): JSX.Element {
  // Inline editing state (local UI state only; commits via onEdit).
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");
  // Transient "copied" indicator index.
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  // Timer for the transient "copied" indicator — cleared on unmount.
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const startEdit = (i: number, content: string): void => {
    setEditingIndex(i);
    setEditText(content);
  };

  const cancelEdit = (): void => {
    setEditingIndex(null);
    setEditText("");
  };

  const saveEdit = (i: number): void => {
    onEdit(i, editText);
    setEditingIndex(null);
    setEditText("");
  };

  const handleCopy = (i: number, content: string): void => {
    navigator.clipboard.writeText(content).then(
      () => {
        setCopiedIndex(i);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(
          () => setCopiedIndex((cur) => (cur === i ? null : cur)),
          1500,
        );
      },
      () => {
        /* clipboard write failed — ignore */
      },
    );
  };

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollRef}>
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400">开始与角色对话</div>
        )}
        {messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant";
          // A message is "actively streaming" if it is the assistant message
          // currently receiving tokens. Such messages hide actions and the
          // swipes navigation.
          const activelyStreaming =
            isAssistant &&
            (msg.isStreaming === true || (streaming && i === lastMsgIndex));
          const regenerating = regeneratingIndex === i;
          const editing = editingIndex === i;
          const swipes = msg.swipes;
          const showSwipesNav =
            isAssistant &&
            !activelyStreaming &&
            !editing &&
            (swipes.length > 1 || regenerating);
          const showActions = !activelyStreaming && !editing && !regenerating;

          return (
            <div
              key={msg.id}
              className={`group flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {isAssistant && characterName && msg.content && (
                <span className="mb-1 ml-1 text-xs text-[#C9A86C]">
                  {characterName}
                </span>
              )}

              {editing ? (
                <div className="w-full max-w-[80%]">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={Math.max(3, editText.split("\n").length + 1)}
                    className="w-full resize-y rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] p-2 text-sm text-[var(--color-text)]"
                  />
                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={() => saveEdit(i)}
                      className="btn-press rounded bg-[#C9A86C] px-3 py-1 text-xs text-black hover:opacity-90"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-press rounded border border-[#2A2A2A] px-3 py-1 text-xs text-gray-300 hover:text-[#C9A86C]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white"
                  }`}
                >
                  {isAssistant
                    ? renderMarkdown(msg.content, `md-${msg.id}`)
                    : msg.content}
                  {showCursor && i === lastMsgIndex && isAssistant && (
                    <span
                      className="ml-0.5 inline-block h-4 w-[2px] bg-indigo-500 align-middle"
                      style={{ animation: "tavernos-blink 1s step-end infinite" }}
                    />
                  )}
                </div>
              )}

              {/* Swipes navigation (assistant only, non-streaming). */}
              {showSwipesNav && (
                <div className="mt-1 ml-1 flex items-center gap-2 text-xs text-gray-400">
                  <button
                    onClick={() => onSwipePrev(i)}
                    disabled={msg.swipeIndex <= 0 || regenerating}
                    title="上一个版本"
                    className="btn-press hover:text-[#C9A86C] disabled:opacity-30"
                  >
                    <IconChevron size={14} direction="left" />
                  </button>
                  <span>
                    {msg.swipeIndex + 1}/{swipes.length}
                  </span>
                  <button
                    onClick={() => onSwipeNext(i)}
                    disabled={msg.swipeIndex >= swipes.length - 1 || regenerating}
                    title="下一个版本"
                    className="btn-press hover:text-[#C9A86C] disabled:opacity-30"
                  >
                    <IconChevron size={14} direction="right" />
                  </button>
                  <button
                    onClick={() => onRegenerate(i)}
                    disabled={regenerating}
                    title="重新生成"
                    className="btn-press hover:text-[#C9A86C] disabled:opacity-30"
                  >
                    {regenerating ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                    ) : (
                      <IconRefresh size={14} />
                    )}
                  </button>
                </div>
              )}

              {/* Hover action group: edit / copy / delete (+ speak for assistant). */}
              {showActions && msg.content && (
                <div
                  className={`mt-1 flex items-center gap-2 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 ${
                    msg.role === "user" ? "mr-1" : "ml-1"
                  }`}
                >
                  <button
                    onClick={() => startEdit(i, msg.content)}
                    title="编辑"
                    className="btn-press hover:text-[#C9A86C]"
                  >
                    <IconPen size={14} />
                  </button>
                  <button
                    onClick={() => handleCopy(i, msg.content)}
                    title="复制"
                    className="btn-press hover:text-[#C9A86C]"
                  >
                    {copiedIndex === i ? (
                      <span className="flex items-center gap-1 text-[var(--color-success)]">
                        <IconCheck size={14} />
                      </span>
                    ) : (
                      <IconCopy size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(i)}
                    title="删除"
                    className="btn-press hover:text-[var(--color-danger)]"
                  >
                    <IconTrash2 size={14} />
                  </button>
                  {isAssistant && (
                    <button
                      onClick={() =>
                        speakingIndex === i
                          ? onStopSpeak()
                          : void onSpeak(i, msg.content)
                      }
                      title={speakingIndex === i ? "停止朗读" : "朗读"}
                      className="btn-press hover:text-[#C9A86C]"
                    >
                      {speakingIndex === i ? <IconStop size={14} /> : <IconVolume size={14} />}
                      <span className="ml-1">{speakingIndex === i ? "停止" : "朗读"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Show thinking indicator only before first delta arrives */}
        {streaming &&
          lastMsgIndex >= 0 &&
          messages[lastMsgIndex].role === "assistant" &&
          messages[lastMsgIndex].content === "" && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-white px-4 py-3 text-sm text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <span className="animate-blink">思考中</span>
                  <span className="inline-flex gap-0.5">
                    <span className="animate-blink" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-blink" style={{ animationDelay: "200ms" }}>.</span>
                    <span className="animate-blink" style={{ animationDelay: "400ms" }}>.</span>
                  </span>
                </span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
