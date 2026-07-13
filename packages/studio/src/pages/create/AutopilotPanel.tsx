// AutopilotPanel.tsx
// ---------------------------------------------------------------------------
// Autopilot control + progress bar extracted from Create.tsx.
//
// Two parts:
//   1. Configuration panel (target chapters, direction, start/cancel buttons)
//   2. Progress bar (current/total, instruction, agent stage, stop button)
// ---------------------------------------------------------------------------

import type { JSX } from "react";
import { AGENT_LABELS, type AgentProgressItem } from "./constants.js";

interface AutopilotPanelProps {
  panelOpen: boolean;
  active: boolean;
  streaming: boolean;
  target: number;
  direction: string;
  progress: {
    current: number;
    total: number;
    instruction: string | null;
  };
  agentProgress: { current: string | null; completed: AgentProgressItem[] };
  onTargetChange: (n: number) => void;
  onDirectionChange: (s: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClosePanel: () => void;
}

export default function AutopilotPanel({
  panelOpen,
  active,
  streaming,
  target,
  direction,
  progress,
  agentProgress,
  onTargetChange,
  onDirectionChange,
  onStart,
  onStop,
  onClosePanel,
}: AutopilotPanelProps): JSX.Element {
  return (
    <>
      {/* --- Configuration panel --- */}
      <div
        id="autopilot-panel"
        className={`${panelOpen ? "" : "hidden"} border-b border-[#C9A86C]/10 bg-[#0F0F0F] px-6 py-3`}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">目标章数</label>
            <input
              type="number"
              min={1}
              max={50}
              value={target}
              onChange={(e) => onTargetChange(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-1.5 text-sm text-[#E8E8E8] outline-none focus:border-[#C9A86C]/40"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-[#888]">创作方向（可选）</label>
            <input
              type="text"
              value={direction}
              onChange={(e) => onDirectionChange(e.target.value)}
              placeholder="如：悬疑推理，主角是侦探，逐步揭开阴谋"
              className="flex-1 rounded-lg border border-[#C9A86C]/20 bg-[#141414] px-3 py-1.5 text-sm text-[#E8E8E8] placeholder-[#555] outline-none focus:border-[#C9A86C]/40"
            />
          </div>
          <button
            onClick={onStart}
            disabled={streaming}
            className="rounded-lg bg-[#C9A86C]/15 px-4 py-2 text-sm text-[#C9A86C] hover:bg-[#C9A86C]/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            启动托管
          </button>
          <button
            onClick={onClosePanel}
            className="rounded-lg border border-[#333] px-3 py-2 text-sm text-[#666] hover:bg-[#1A1A1A]"
          >
            取消
          </button>
        </div>
      </div>

      {/* --- Progress bar --- */}
      {active && progress.total > 0 && (
        <div className="border-b border-[#C9A86C]/10 bg-[#0F0F0F] px-6 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#C9A86C]">
              托管创作中 · 第 {progress.current}/{progress.total} 章
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A1A1A]">
              <div
                className="h-full w-full origin-left rounded-full bg-[#C9A86C]/60 transition-transform"
                style={{ transform: `scaleX(${progress.current / progress.total})` }}
              />
            </div>
            {progress.instruction && (
              <span className="max-w-[40%] truncate text-xs text-[#888]">
                指令：{progress.instruction}
              </span>
            )}
            {agentProgress.current && (
              <span className="text-xs text-[#C9A86C]/70">
                {AGENT_LABELS[agentProgress.current] ?? agentProgress.current}…
              </span>
            )}
            <button
              onClick={onStop}
              className="btn-press rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-1 text-xs text-[var(--color-danger)] hover:bg-[rgba(201,104,90,0.15)]"
            >
              停止托管
            </button>
          </div>
        </div>
      )}
    </>
  );
}
