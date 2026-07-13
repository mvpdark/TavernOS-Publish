import { useState, useEffect, useRef } from "react";
import type { JSX } from "react";
import { Modal } from "../components/ui.tsx";
import { apiGet, apiPost, apiPut, apiUpload } from "../api/client.js";
import type { PersonaCard, CharacterVoice, CharactersResponse } from "../shared/types.js";
import { VOICE_PROVIDERS } from "./characters-utils.js";
import EditableField from "../components/EditableField.js";
import VoiceBindingSection from "./create/VoiceBindingSection.js";
import CharacterImageSection from "./create/CharacterImageSection.js";
import CharacterLive2DSection from "./create/CharacterLive2DSection.js";

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
  const [generating, setGenerating] = useState(false);
  // Three-view generation polling — keeps `generating` true until the new
  // three-view image is detected (or polling times out / the panel unmounts).
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingCancelledRef = useRef(false);

  // Update local card when prop changes
  useEffect(() => {
    setCurrentCard(card);
  }, [card]);

  // Cancel any in-flight three-view polling when the panel unmounts so we
  // don't keep fetching / calling setState after the component is gone.
  useEffect(() => {
    return () => {
      pollingCancelledRef.current = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

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

  // Save Live2D model URL to card extensions
  const handleSaveLive2D = async (url: string): Promise<void> => {
    try {
      const tavernos = (currentCard.data.extensions as Record<string, unknown> | undefined)
        ?.tavernos as Record<string, unknown> | undefined ?? {};
      if (url.trim()) {
        tavernos.live2dModel = url.trim();
      } else {
        delete tavernos.live2dModel;
      }
      const payload = {
        ...currentCard.data,
        extensions: { ...(currentCard.data.extensions ?? {}), tavernos },
      };
      const updated = await apiPut<PersonaCard>(
        `/projects/${projectId}/characters/${encodeURIComponent(currentCard.filename)}`,
        payload,
      );
      setCurrentCard(updated);
      onCardUpdated?.(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadError(msg);
    }
  };

  // Poll for the three-view result after kicking off background generation.
  // The generate-three-view API returns immediately (the task runs in the
  // background); without polling the panel would not refresh until it is closed
  // and reopened. We poll every 3s (max 10 times) for a new threeViewUrl.
  const startThreeViewPolling = (): void => {
    const filename = currentCard.filename;
    const prevExt = (currentCard.data.extensions as Record<string, unknown> | undefined)
      ?.tavernos as Record<string, unknown> | undefined;
    const previousThreeView = prevExt?.threeViewUrl as string | undefined;

    let attempts = 0;
    const maxAttempts = 10;

    const poll = async (): Promise<void> => {
      if (pollingCancelledRef.current) return;
      attempts++;
      try {
        const data = await apiGet<CharactersResponse>(`/projects/${projectId}/characters`);
        if (pollingCancelledRef.current) return;
        const updated = (data.characters ?? []).find((c) => c.filename === filename);
        if (updated) {
          const newExt = (updated.data.extensions as Record<string, unknown> | undefined)
            ?.tavernos as Record<string, unknown> | undefined;
          const newThreeView = newExt?.threeViewUrl as string | undefined;
          if (newThreeView && newThreeView !== previousThreeView) {
            // Result detected — refresh the panel and notify the parent.
            setCurrentCard(updated);
            onCardUpdated?.(updated);
            setGenerating(false);
            return;
          }
        }
      } catch {
        // Transient fetch error — keep polling.
      }
      if (attempts >= maxAttempts) {
        // Timeout: stop the spinner. The background task may still finish
        // later (the parent list auto-refreshes via its own task watcher); the
        // user can reopen the panel to see the result.
        setGenerating(false);
        return;
      }
      pollTimerRef.current = setTimeout(poll, 3000);
    };

    pollTimerRef.current = setTimeout(poll, 3000);
  };

  // 一键生成角色三视图：触发后台任务生成三视图图片
  const handleGenerateThreeView = async (): Promise<void> => {
    setUploadError(null);
    setGenerating(true);
    try {
      await apiPost<{ taskId: string; status: string }>(
        `/projects/${projectId}/characters/${encodeURIComponent(currentCard.filename)}/generate-three-view`,
        {},
      );
      // API returns immediately — generation runs in the background. Keep
      // `generating` true and poll for the result so the panel refreshes the
      // three-view image without needing to be closed and reopened.
      startThreeViewPolling();
    } catch (e) {
      console.error("Generate three-view failed:", e);
      setUploadError(e instanceof Error ? e.message : String(e));
      setGenerating(false);
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
  const live2dModelUrl = tavernos?.live2dModel as string | undefined;

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
        <CharacterImageSection
          cardName={currentCard.data.name}
          displayUrl={displayUrl}
          threeViewUrl={threeView}
          generating={generating}
          uploadingImage={uploadingImage}
          uploadError={uploadError}
          onGenerateThreeView={() => void handleGenerateThreeView()}
          onImageUpload={(file) => void handleImageUpload(file)}
        />

        <CharacterLive2DSection
          live2dModelUrl={live2dModelUrl}
          onSave={(url) => void handleSaveLive2D(url)}
          onClear={() => void handleSaveLive2D("")}
        />

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
        <VoiceBindingSection
          voice={voice}
          ttsProviders={ttsProviders}
          saving={saving}
          voiceSaved={voiceSaved}
          voiceName={voiceName}
          providerLabel={providerLabel}
          onVoiceChange={setVoice}
          onSave={() => void handleSaveVoice()}
        />
      </div>
    </Modal>
  );
}
