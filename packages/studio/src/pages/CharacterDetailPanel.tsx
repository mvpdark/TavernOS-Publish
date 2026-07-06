import { useState, useEffect, useRef } from "react";
import type { JSX } from "react";
import { Modal } from "../components/ui.tsx";
import { proxyImageUrl, apiGet, apiPut, apiUpload } from "../api/client.js";
import type { PersonaCard, CharacterVoice } from "../shared/types.js";
import { VOICE_PROVIDERS } from "./characters-utils.js";

// ---------------------------------------------------------------------------
// CharacterDetailPanel — detail modal for a character card.
//
// Features:
//   - View / manually upload avatar image
//   - Inline edit text fields (description, personality, scenario, first_mes)
//   - Voice binding (TTS provider + voice + speed)
// Footer buttons: 开始对话, 编辑角色, 关闭.
// ---------------------------------------------------------------------------

interface TTSProvider {
  id: string;
  name: string;
  voices: Array<{ id: string; name: string }>;
}

interface CharacterDetailPanelProps {
  card: PersonaCard;
  projectId: string;
  onClose: () => void;
  onEdit: (card: PersonaCard) => void;
  onVoiceUpdated?: () => void;
  /** Called when the card data changes (image upload or text edit) so the parent can refresh. */
  onCardUpdated?: (card: PersonaCard) => void;
}

/** Editable text field with inline edit capability. */
function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      console.error(`[detail] save ${label} failed:`, e);
      // Revert on failure
      setDraft(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-[#C9A86C]">{label}</h4>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="text-[10px] text-gray-500 hover:text-[#C9A86C] transition-colors"
          >
            编辑
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            autoFocus
            className="w-full rounded-lg border border-[rgba(201,168,108,0.3)] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] focus:border-[#C9A86C] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded bg-[rgba(201,168,108,0.2)] px-2 py-0.5 text-[10px] text-[#C9A86C] hover:bg-[rgba(201,168,108,0.3)] disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded bg-[#1C1C1E] px-2 py-0.5 text-[10px] text-gray-400 hover:bg-[#2A2A2A]"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">
          {value || <span className="text-gray-600 italic">（空）</span>}
        </p>
      )}
    </div>
  );
}

export function CharacterDetailPanel({
  card,
  projectId,
  onClose,
  onEdit,
  onVoiceUpdated,
  onCardUpdated,
}: CharacterDetailPanelProps): JSX.Element {
  const [ttsProviders, setTtsProviders] = useState<TTSProvider[]>([]);
  const [voice, setVoice] = useState<CharacterVoice>({ enabled: false });
  const [saving, setSaving] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<PersonaCard>(card);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local card when prop changes
  useEffect(() => {
    setCurrentCard(card);
  }, [card]);

  // Load TTS providers on mount.
  useEffect(() => {
    apiGet<{ providers: TTSProvider[] }>("/tts/config")
      .then((d) => setTtsProviders(d.providers ?? []))
      .catch(() => {});
  }, []);

  // Load voice config from card.
  useEffect(() => {
    const extVoice = (currentCard.data.extensions as Record<string, unknown> | undefined)
      ?.tavernos as Record<string, unknown> | undefined;
    const v = extVoice?.voice as Record<string, unknown> | undefined;
    if (v) {
      setVoice({
        provider: v.provider as string | undefined,
        voiceId: v.voiceId as string | undefined,
        speed: v.speed as number | undefined,
        enabled: v.enabled === true,
      });
    } else {
      setVoice({ enabled: false });
    }
    setVoiceSaved(false);
  }, [currentCard]);

  // Save voice config to character card.
  const handleSaveVoice = async (): Promise<void> => {
    setSaving(true);
    setVoiceSaved(false);
    try {
      const tavernos = (currentCard.data.extensions as Record<string, unknown> | undefined)
        ?.tavernos as Record<string, unknown> | undefined ?? {};
      if (voice.enabled) {
        tavernos.voice = voice;
      } else {
        delete tavernos.voice;
      }
      const payload = {
        ...currentCard.data,
        extensions: {
          ...(currentCard.data.extensions ?? {}),
          tavernos,
        },
      };
      await apiPut(
        `/projects/${projectId}/characters/${encodeURIComponent(currentCard.filename)}`,
        payload,
      );
      setVoiceSaved(true);
      setTimeout(() => setVoiceSaved(false), 2000);
      onVoiceUpdated?.();
    } catch (e) {
      console.error("[detail] save voice failed:", e);
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // Handle manual image upload
  const handleImageUpload = async (file: File): Promise<void> => {
    setUploadingImage(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiUpload<{ success: boolean; avatar: string }>(
        `/projects/${projectId}/characters/${encodeURIComponent(currentCard.filename)}/upload-image`,
        formData,
      );
      // Update local card with new avatar
      const tavernos = (currentCard.data.extensions as Record<string, unknown> | undefined)
        ?.tavernos as Record<string, unknown> | undefined ?? {};
      tavernos.avatar = result.avatar;
      const updatedCard: PersonaCard = {
        ...currentCard,
        data: {
          ...currentCard.data,
          extensions: {
            ...(currentCard.data.extensions ?? {}),
            tavernos,
          },
        },
      };
      setCurrentCard(updatedCard);
      onCardUpdated?.(updatedCard);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadError(msg);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save a text field (description, personality, etc.)
  const handleSaveField = async (field: string, newValue: string): Promise<void> => {
    try {
      const payload = { ...currentCard.data, [field]: newValue };
      const updated = await apiPut<PersonaCard>(
        `/projects/${projectId}/characters/${encodeURIComponent(currentCard.filename)}`,
        payload,
      );
      setCurrentCard(updated);
      onCardUpdated?.(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadError(msg); // 复用已有的 uploadError 状态
    }
  };

  // Resolve provider name for display.
  const providerName = (voice.provider ?? "yunwu");
  const providerLabel = VOICE_PROVIDERS.find((p) => p.id === providerName)?.name ?? providerName;
  const voiceName = (() => {
    if (!voice.voiceId) return "";
    const tp = ttsProviders.find((p) => p.id === providerName);
    return tp?.voices.find((v) => v.id === voice.voiceId)?.name ?? voice.voiceId;
  })();

  // Resolve image URLs
  const tavernos = (currentCard.data.extensions as Record<string, unknown> | undefined)?.tavernos as Record<string, unknown> | undefined;
  const threeView = tavernos?.threeViewUrl as string | undefined;
  const avatar = tavernos?.avatar as string | undefined;
  const displayUrl = threeView || avatar;

  return (
    <Modal
      title={currentCard.data.name}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(currentCard)}
            className="rounded-lg border border-[rgba(201,168,108,0.3)] px-4 py-2 text-sm text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)]"
          >
            编辑角色
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-gray-400 hover:bg-[#1A1A1A]"
          >
            关闭
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 角色图片 + 手动上传 */}
        <div className="relative">
          {displayUrl ? (
            <div className="overflow-hidden rounded-lg">
              {threeView ? (
                <div className="relative w-full overflow-hidden rounded-lg">
                  <img
                    src={proxyImageUrl(threeView)}
                    alt={currentCard.data.name}
                    className="w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ) : (
                <img src={proxyImageUrl(displayUrl)} alt={currentCard.data.name} className="h-48 w-full object-cover" />
              )}
            </div>
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A]">
              {uploadingImage ? (
                <span className="text-xs text-[#C9A86C] animate-pulse">上传中…</span>
              ) : (
                <span className="text-3xl text-gray-700">👤</span>
              )}
            </div>
          )}

          {/* 手动上传图片按钮 */}
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="rounded-lg border border-[rgba(201,168,108,0.3)] px-3 py-1.5 text-xs text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)] disabled:opacity-50"
            >
              {uploadingImage ? "上传中…" : "📷 上传图片"}
            </button>
            {displayUrl && !threeView && (
              <span className="text-[10px] text-gray-500">上传后将替换当前头像</span>
            )}
          </div>
          {uploadError && (
            <p className="mt-1 text-xs text-red-400">{uploadError}</p>
          )}
        </div>

        {/* 基本信息 - inline editable */}
        <EditableField
          label="描述"
          value={currentCard.data.description ?? ""}
          onSave={(v) => handleSaveField("description", v)}
        />

        <EditableField
          label="性格"
          value={currentCard.data.personality ?? ""}
          onSave={(v) => handleSaveField("personality", v)}
        />

        <EditableField
          label="场景"
          value={currentCard.data.scenario ?? ""}
          onSave={(v) => handleSaveField("scenario", v)}
        />

        <EditableField
          label="开场白"
          value={currentCard.data.first_mes ?? ""}
          onSave={(v) => handleSaveField("first_mes", v)}
        />

        {/* 专属音色绑定 */}
        <div className="border-t border-[#1A1A1A] pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-[#C9A86C]">专属音色</h4>
            <label className="flex items-center gap-2 text-xs text-[#E8E8E8]">
              <input
                type="checkbox"
                checked={voice.enabled}
                onChange={(e) => setVoice((prev) => ({ ...prev, enabled: e.target.checked }))}
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
                  onChange={(e) => setVoice((prev) => ({ ...prev, provider: e.target.value, voiceId: undefined }))}
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
                      onChange={(e) => setVoice((prev) => ({ ...prev, voiceId: e.target.value }))}
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
                      onChange={(e) => setVoice((prev) => ({ ...prev, voiceId: e.target.value }))}
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
                  onChange={(e) => setVoice((prev) => ({ ...prev, speed: parseFloat(e.target.value) }))}
                  className="mt-1 w-full accent-[#C9A86C]"
                />
              </div>

              {/* 保存按钮 */}
              <button
                onClick={() => void handleSaveVoice()}
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
      </div>
    </Modal>
  );
}
