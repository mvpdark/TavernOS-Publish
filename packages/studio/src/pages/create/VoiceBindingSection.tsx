// VoiceBindingSection.tsx
// ---------------------------------------------------------------------------
// Voice/TTS binding section extracted from CharacterDetailPanel.
//
// Contains: enable toggle, TTS provider selector, voice selector,
// speed slider, save button, and disabled-state status display.
// ---------------------------------------------------------------------------

import type { JSX } from "react";
import type { CharacterVoice } from "../../shared/types.js";
import { VOICE_PROVIDERS } from "../characters-utils.js";

interface TTSProvider {
  id: string;
  name: string;
  voices: Array<{ id: string; name: string }>;
}

interface VoiceBindingSectionProps {
  voice: CharacterVoice;
  ttsProviders: TTSProvider[];
  saving: boolean;
  voiceSaved: boolean;
  voiceName: string | null;
  providerLabel: string;
  onVoiceChange: (updater: (prev: CharacterVoice) => CharacterVoice) => void;
  onSave: () => void;
}

export default function VoiceBindingSection({
  voice,
  ttsProviders,
  saving,
  voiceSaved,
  voiceName,
  providerLabel,
  onVoiceChange,
  onSave,
}: VoiceBindingSectionProps): JSX.Element {
  return (
    <div className="border-t border-[#1A1A1A] pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-[#C9A86C]">专属音色</h4>
        <label className="flex items-center gap-2 text-xs text-[#E8E8E8]">
          <input
            type="checkbox"
            checked={voice.enabled}
            onChange={(e) => onVoiceChange((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="accent-[#C9A86C]"
          />
          启用
        </label>
      </div>

      {voice.enabled && (
        <div className="mt-3 space-y-3">
          {/* TTS 供应商 */}
          <div>
            <label className="text-xs text-[#E8E8E8]">TTS 供应商</label>
            <select
              value={voice.provider ?? "yunwu"}
              onChange={(e) => onVoiceChange((prev) => ({ ...prev, provider: e.target.value, voiceId: undefined }))}
              className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
            >
              {VOICE_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 音色选择 */}
          <div>
            <label className="text-xs text-[#E8E8E8]">音色</label>
            {(() => {
              const tp = ttsProviders.find((p) => p.id === (voice.provider ?? "yunwu"));
              const voiceOpts = tp?.voices ?? [];
              return voiceOpts.length > 0 ? (
                <select
                  value={voice.voiceId ?? ""}
                  onChange={(e) => onVoiceChange((prev) => ({ ...prev, voiceId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                >
                  <option value="">— 选择音色 —</option>
                  {voiceOpts.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={voice.voiceId ?? ""}
                  onChange={(e) => onVoiceChange((prev) => ({ ...prev, voiceId: e.target.value }))}
                  placeholder="输入音色 ID"
                  className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                />
              );
            })()}
          </div>

          {/* 语速 */}
          <div>
            <label className="text-xs text-[#E8E8E8]">语速 ({voice.speed ?? 1})</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={voice.speed ?? 1}
              onChange={(e) => onVoiceChange((prev) => ({ ...prev, speed: parseFloat(e.target.value) }))}
              className="mt-1 w-full accent-[#C9A86C]"
            />
          </div>

          {/* 保存按钮 */}
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg border border-[rgba(201,168,108,0.3)] px-3 py-1.5 text-xs text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)] disabled:opacity-50"
          >
            {saving ? "保存中…" : voiceSaved ? "✓ 已保存" : "保存音色"}
          </button>
        </div>
      )}

      {/* 未启用时显示当前绑定状态 */}
      {!voice.enabled && voiceName && (
        <p className="mt-2 text-xs text-gray-500">
          当前: {providerLabel} · {voiceName}
        </p>
      )}
      {!voice.enabled && !voiceName && (
        <p className="mt-2 text-xs text-gray-600">未绑定音色，勾选"启用"后可选择</p>
      )}
    </div>
  );
}
