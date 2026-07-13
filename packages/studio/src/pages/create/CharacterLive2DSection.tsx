// CharacterLive2DSection.tsx
// ---------------------------------------------------------------------------
// Live2D model preview + URL binding section extracted from
// CharacterDetailPanel.
//
// Contains: Live2D canvas preview (or empty placeholder), model URL
// input with save/clear buttons.
// ---------------------------------------------------------------------------

import { useState, type JSX } from "react";
import Live2DCanvas from "../../components/Live2DCanvas.js";

interface CharacterLive2DSectionProps {
  live2dModelUrl: string | undefined;
  onSave: (url: string) => void;
  onClear: () => void;
}

export default function CharacterLive2DSection({
  live2dModelUrl,
  onSave,
  onClear,
}: CharacterLive2DSectionProps): JSX.Element {
  const [live2dInput, setLive2dInput] = useState("");

  return (
    <div className="border-t border-[#1A1A1A] pt-4">
      <h4 className="mb-3 text-xs text-[#C9A86C]">Live2D 模型</h4>
      {live2dModelUrl ? (
        <div className="mb-3 h-64 overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0A0A0A]">
          <Live2DCanvas modelUrl={live2dModelUrl} className="h-full w-full" />
        </div>
      ) : (
        <div className="mb-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A]">
          <span className="text-xs text-[#555]">未绑定 Live2D 模型</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={live2dInput || live2dModelUrl || ""}
          onChange={(e) => setLive2dInput(e.target.value)}
          placeholder="输入 .model3.json 文件 URL"
          className="flex-1 rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#444] outline-none focus:border-[#C9A86C]/40"
        />
        <button
          onClick={() => onSave(live2dInput || live2dModelUrl || "")}
          className="rounded-lg border border-[#C9A86C]/30 px-3 py-2 text-xs text-[#C9A86C] hover:bg-[#C9A86C]/10"
        >
          保存
        </button>
        {live2dModelUrl && (
          <button
            onClick={() => { setLive2dInput(""); onClear(); }}
            className="rounded-lg border border-[#C9685A]/30 px-3 py-2 text-xs text-[#C9685A] hover:bg-[#C9685A]/10"
          >
            清除
          </button>
        )}
      </div>
    </div>
  );
}
