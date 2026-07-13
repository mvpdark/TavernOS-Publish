// CreateHeader.tsx
// ---------------------------------------------------------------------------
// Top header bar for the Create page.
//
// Contains: back button, title, project name, save status, and toggle
// buttons for clear-all, autopilot, X-mode, and Live2D panel.
// ---------------------------------------------------------------------------

import type { JSX } from "react";

interface CreateHeaderProps {
  projectName: string;
  saveStatus: string | null;
  autopilotActive: boolean;
  streaming: boolean;
  xMode: boolean;
  live2dOpen: boolean;
  onBack: () => void;
  onClearAll: () => void;
  onToggleAutopilot: () => void;
  onToggleXMode: () => void;
  onToggleLive2D: () => void;
}

export default function CreateHeader({
  projectName,
  saveStatus,
  autopilotActive,
  streaming,
  xMode,
  live2dOpen,
  onBack,
  onClearAll,
  onToggleAutopilot,
  onToggleXMode,
  onToggleLive2D,
}: CreateHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-[#C9A86C]/10 px-6 py-3">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-[#666] hover:text-[#C9A86C]"
        >
          ← 返回
        </button>
        <h1 className="text-lg font-light text-[#C9A86C]">对话式创作</h1>
        <span className="text-xs text-[#666]">{projectName}</span>
      </div>
      <div className="flex items-center gap-3">
        {saveStatus && (
          <span className="text-xs text-[#C9A86C]">{saveStatus}</span>
        )}
        {!autopilotActive && !streaming && (
          <button
            onClick={onClearAll}
            className="rounded-lg border border-[rgba(201,104,90,0.2)] px-3 py-1.5 text-xs text-[#C9685A] hover:bg-[rgba(201,104,90,0.08)]"
            title="删除所有已生成的章节"
          >
            清空章节
          </button>
        )}
        {!autopilotActive && !streaming && (
          <button
            onClick={onToggleAutopilot}
            className="rounded-lg border border-[#C9A86C]/30 px-3 py-1.5 text-xs text-[#C9A86C] hover:bg-[#C9A86C]/10"
          >
            托管模式
          </button>
        )}
        <button
          onClick={onToggleXMode}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            xMode
              ? "border-black/60 bg-black text-white"
              : "border-[#333] text-[#666] hover:bg-[#1A1A1A]"
          }`}
          title="X 模式：所有 Agent 使用 Grok 4.3"
        >
          <span className="font-bold">𝕏</span>
          {xMode ? "Grok 模式" : "X 模式"}
        </button>
        <button
          onClick={onToggleLive2D}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            live2dOpen
              ? "border-[#C9A86C]/40 bg-[#C9A86C]/10 text-[#C9A86C]"
              : "border-[#333] text-[#666] hover:bg-[#1A1A1A]"
          }`}
          title="Live2D 模型面板"
        >
          🎭 Live2D
        </button>
      </div>
    </div>
  );
}
