// Live2DPanel.tsx
// ---------------------------------------------------------------------------
// Right-side Live2D panel for the Create page.
//
// Encapsulates:
//   - Live2D model canvas display
//   - Model URL input
//   - Emotion detection from latest assistant message (keyword matching)
//
// Parent (Create.tsx) controls open/close and model URL state.
// This component owns the emotion detection logic internally.
// ---------------------------------------------------------------------------

import { useEffect, useState, type JSX } from "react";
import Live2DCanvas from "../../components/Live2DCanvas.js";
import type { Live2DEmotion } from "../../lib/live2d-emotions.js";
import { EMOTION_KEYWORDS, type ChatMessage } from "./constants.js";

interface Live2DPanelProps {
  /** Chat messages (used for emotion detection from latest assistant msg). */
  messages: ChatMessage[];
  /** Whether the panel is visible. */
  open: boolean;
  /** Close handler. */
  onClose: () => void;
  /** Current model URL (controlled). */
  modelUrl: string | null;
  /** Model URL change handler (controlled). */
  onModelUrlChange: (url: string | null) => void;
}

export default function Live2DPanel({
  messages,
  open,
  onClose,
  modelUrl,
  onModelUrlChange,
}: Live2DPanelProps): JSX.Element | null {
  const [emotion, setEmotion] = useState<Live2DEmotion>("neutral");

  // --- Emotion detection from latest assistant message ---
  useEffect(() => {
    if (!open) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.content) return;
    const text = lastMsg.content;
    for (const { key, words } of EMOTION_KEYWORDS) {
      if (words.some((w) => text.includes(w))) {
        setEmotion(key);
        return;
      }
    }
    setEmotion("neutral");
  }, [messages, open]);

  if (!open) return null;

  return (
    <div className="flex w-72 flex-col border-l border-[#C9A86C]/10 bg-[#0F0F0F]">
      <div className="flex items-center justify-between border-b border-[#C9A86C]/10 px-4 py-3">
        <span className="text-xs font-medium text-[#C9A86C]">Live2D 模型</span>
        <button
          onClick={onClose}
          className="text-xs text-[#666] hover:text-[#C9A86C]"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Live2DCanvas
          modelUrl={modelUrl}
          emotion={emotion}
          className="h-full w-full"
        />
      </div>
      <div className="border-t border-[#C9A86C]/10 px-4 py-3">
        <input
          type="text"
          value={modelUrl ?? ""}
          onChange={(e) => onModelUrlChange(e.target.value || null)}
          placeholder="输入 .model3.json URL"
          className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#444] outline-none focus:border-[#C9A86C]/40"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-[#666]">当前情绪:</span>
          <span className="text-[10px] text-[#C9A86C]">{emotion}</span>
        </div>
      </div>
    </div>
  );
}
