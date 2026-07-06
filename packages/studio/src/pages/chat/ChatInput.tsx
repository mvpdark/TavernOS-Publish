// Chat input footer — presentational component.
// Renders usage stats, error messages, quick reply pills, and the input bar
// with send/stop button. Receives all state and callbacks as props.

import type { TokenUsage } from "./types.js";
import { IconX } from "../../components/Icons.tsx";
import type { JSX } from "react";

export interface ChatInputProps {
  input: string;
  sending: boolean;
  streaming: boolean;
  usage: TokenUsage | null;
  error: string | null;
  ttsError: string | null;
  quickReplies?: string[];
  onDismissError?: () => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onQuickReply?: (text: string) => void;
}

export default function ChatInput({
  input,
  sending,
  streaming,
  usage,
  error,
  ttsError,
  quickReplies,
  onDismissError,
  onInputChange,
  onSend,
  onStop,
  onQuickReply,
}: ChatInputProps): JSX.Element {
  return (
    <>
      {/* Usage stats */}
      {usage && (
        <div className="border-t bg-gray-50 px-4 py-1.5 text-xs text-gray-400">
          Token: 输入 {usage.promptTokens} / 输出 {usage.completionTokens} / 合计{" "}
          {usage.totalTokens}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between bg-red-50 px-4 py-2 text-sm text-red-600">
          <span>{error}</span>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="btn-press ml-2 shrink-0 text-red-400 transition-colors hover:text-red-700"
              aria-label="关闭错误提示"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      )}

      {ttsError && (
        <div className="bg-orange-50 px-4 py-2 text-sm text-orange-600">
          {ttsError}
        </div>
      )}

      <div className="border-t p-4">
        {/* Quick reply pills */}
        {quickReplies && quickReplies.length > 0 && (
          <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => onQuickReply?.(reply)}
                disabled={sending}
                className="btn-press rounded-full border border-[rgba(201,168,108,0.2)] bg-[rgba(201,168,108,0.1)] px-3 py-1.5 text-xs text-[#C9A86C] transition-colors hover:bg-[rgba(201,168,108,0.2)] hover:border-[rgba(201,168,108,0.4)] disabled:opacity-50"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={sending}
            placeholder="输入消息..."
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm placeholder:text-[var(--color-text-placeholder)] focus:border-[var(--color-primary-border)] focus:outline-none"
          />
          {streaming ? (
            <button
              onClick={onStop}
              className="btn-press rounded-lg bg-red-500 px-6 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              停止
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={sending || !input.trim()}
              className="btn-press rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </>
  );
}
