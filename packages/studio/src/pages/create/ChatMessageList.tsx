// ChatMessageList.tsx
// ---------------------------------------------------------------------------
// Chat message rendering area extracted from Create.tsx.
//
// Renders:
//   - Empty state (loading or quick-action buttons)
//   - Message list (user bubbles + assistant messages with agent badges,
//     chapter content previews, quick replies)
//   - Error banner
// ---------------------------------------------------------------------------

import { useRef, useEffect, type JSX } from "react";
import {
  type ChatMessage,
  type AgentProgressItem,
  AGENT_LABELS,
} from "./constants.js";

interface ChatMessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
  loadingHistory: boolean;
  agentProgress: { current: string | null; completed: AgentProgressItem[] };
  error: string | null;
  quickActions: string[];
  onSendMessage: (text: string) => void;
  onSaveChapter: (content: string) => void;
}

export default function ChatMessageList({
  messages,
  streaming,
  loadingHistory,
  agentProgress,
  error,
  quickActions,
  onSendMessage,
  onSaveChapter,
}: ChatMessageListProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
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
                    onClick={() => onSendMessage(action)}
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
                {!m.autoSaved && (
                  <button
                    onClick={() => onSaveChapter(m.chapterContent!)}
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
                  onClick={() => onSendMessage(qr)}
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
  );
}
