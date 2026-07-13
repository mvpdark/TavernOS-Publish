// ChatInputBar.tsx
// ---------------------------------------------------------------------------
// Bottom input bar + collapsible settings panel for the Create page.
//
// Settings panel: narrative pace preset + author notes textarea.
// Input bar: text input (Enter to send), settings gear toggle,
//            send/stop button.
// ---------------------------------------------------------------------------

import type { JSX } from "react";
import { WRITING_PRESETS } from "./constants.js";

interface ChatInputBarProps {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
  onStop: () => void;

  settingsOpen: boolean;
  onToggleSettings: () => void;

  writingPreset: string;
  onWritingPresetChange: (v: string) => void;

  authorNote: string;
  onAuthorNoteChange: (v: string) => void;
}

export default function ChatInputBar({
  input,
  onInputChange,
  onSend,
  streaming,
  onStop,
  settingsOpen,
  onToggleSettings,
  writingPreset,
  onWritingPresetChange,
  authorNote,
  onAuthorNoteChange,
}: ChatInputBarProps): JSX.Element {
  return (
    <>
      {/* --- Settings panel (collapsible) --- */}
      {settingsOpen && (
        <div className="border-t border-[#C9A86C]/10 bg-[#0F0F0F] px-6 py-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#888]">叙事节奏</label>
              <select
                value={writingPreset}
                onChange={(e) => onWritingPresetChange(e.target.value)}
                className="w-full rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-2 text-sm text-[#E8E8E8] outline-none focus:border-[#C9A86C]/40"
              >
                {WRITING_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value} className="bg-[#141414] text-[#E8E8E8]">
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#888]">作者批注</label>
              <textarea
                value={authorNote}
                onChange={(e) => onAuthorNoteChange(e.target.value)}
                placeholder="例：增加紧张感、聚焦角色内心冲突、结尾留悬念…"
                rows={3}
                className="w-full resize-none rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#555] outline-none focus:border-[#C9A86C]/40"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={onToggleSettings}
                className="rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#666] hover:bg-[#1A1A1A]"
              >
                收起
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Input area --- */}
      <div className="border-t border-[#C9A86C]/10 px-6 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="跟创作助手聊聊…（Enter 发送）"
            className="flex-1 rounded-xl border border-[#C9A86C]/20 bg-[#141414] px-4 py-2.5 text-sm text-[#E8E8E8] placeholder-[#555] outline-none focus:border-[#C9A86C]/40"
          />
          <button
            onClick={onToggleSettings}
            className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              settingsOpen || authorNote || writingPreset !== "default"
                ? "border-[#C9A86C]/40 bg-[#C9A86C]/10 text-[#C9A86C]"
                : "border-[#333] text-[#666] hover:bg-[#1A1A1A]"
            }`}
            title="作者批注 & 叙事节奏"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {streaming ? (
            <button
              onClick={onStop}
              className="btn-press rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[rgba(201,104,90,0.15)]"
            >
              停止
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              className="rounded-xl bg-[#C9A86C]/15 px-4 py-2.5 text-sm text-[#C9A86C] hover:bg-[#C9A86C]/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </>
  );
}
