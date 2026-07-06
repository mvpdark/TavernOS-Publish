import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut, apiPost, apiDelete, apiUpload } from "../../api/client.js";
import { TextInput, NumberField, SelectField, BTN, Stratum } from "../../components/ui.tsx";
import type { TTSConfigData, TTSConfigResponse, TTSProviderInfo, CustomVoiceInfo } from "./types.js";
import type { JSX } from "react";

export default function TTSConfigSection(): JSX.Element | null {
  const [config, setConfig] = useState<TTSConfigData | null>(null);
  const [providers, setProviders] = useState<TTSProviderInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref for the "saved" indicator timer — cleared on unmount to avoid setState after unmount.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Voice design state ---
  const [designName, setDesignName] = useState("");
  const [designPrompt, setDesignPrompt] = useState("");
  const [designing, setDesigning] = useState(false);

  // --- Voice clone state ---
  const [cloneName, setCloneName] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);

  // --- Custom voice list ---
  const [customVoices, setCustomVoices] = useState<CustomVoiceInfo[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Load TTS config + custom voices on mount
  useEffect(() => {
    apiGet<TTSConfigResponse>("/tts/config")
      .then((d) => {
        setConfig(d.config);
        setProviders(d.providers);
      })
      .catch(() => {
        // TTS config is optional; ignore load errors silently
      });
    refreshCustomVoices();
  }, []);

  const refreshCustomVoices = async (): Promise<void> => {
    try {
      const data = await apiGet<{ voices: CustomVoiceInfo[] }>("/voices/custom");
      setCustomVoices(data.voices ?? []);
    } catch {
      // ignore
    }
  };

  // After any voice operation, refresh both custom voices and providers
  // (providers include merged custom voices in the voice dropdown)
  const refreshAfterVoiceOp = async (): Promise<void> => {
    await refreshCustomVoices();
    try {
      const d = await apiGet<TTSConfigResponse>("/tts/config");
      setProviders(d.providers);
      setConfig(d.config);
    } catch {
      // ignore
    }
  };

  const handleSave = async (): Promise<void> => {
    // Guard against double-submit (button is also disabled while saving).
    if (saving) return;
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/tts/config", config);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // --- Voice design handler ---
  const handleDesignVoice = async (): Promise<void> => {
    if (!designPrompt.trim()) return;
    setDesigning(true);
    setVoiceError(null);
    try {
      const voiceId = `voice_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await apiPost("/voices/minimax/design", {
        prompt: designPrompt,
        preview_text: "这是一段试听文本。",
        voice_id: voiceId,
        aigc_watermark: false,
        name: designName.trim() || designPrompt.slice(0, 20),
      });
      setDesignName("");
      setDesignPrompt("");
      await refreshAfterVoiceOp();
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : String(e));
    } finally {
      setDesigning(false);
    }
  };

  // --- Voice clone handler (upload + clone in one step) ---
  const handleCloneVoice = async (): Promise<void> => {
    if (!cloneFile) return;
    setCloning(true);
    setVoiceError(null);
    try {
      // Step 1: upload the audio file
      const formData = new FormData();
      formData.append("file", cloneFile);
      formData.append("purpose", "voice_clone");
      const uploadResult = await apiUpload<{ fileId: number }>("/voices/upload", formData);
      if (!uploadResult.fileId) {
        throw new Error("音频上传失败：未获得 file_id");
      }

      // Step 2: call voice_clone with the file_id
      const voiceId = `clone_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await apiPost("/voices/minimax/clone", {
        file_id: uploadResult.fileId,
        voice_id: voiceId,
        model: "speech-2.8-hd",
        name: cloneName.trim() || `克隆音色_${voiceId.slice(0, 8)}`,
        description: `从 ${cloneFile.name} 克隆`,
      });

      setCloneName("");
      setCloneFile(null);
      await refreshAfterVoiceOp();
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : String(e));
    } finally {
      setCloning(false);
    }
  };

  // --- Delete custom voice ---
  const handleDeleteVoice = async (voiceId: string): Promise<void> => {
    setVoiceError(null);
    try {
      await apiDelete(`/voices/custom/${encodeURIComponent(voiceId)}`);
      await refreshAfterVoiceOp();
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!config) return null;

  // Voice design & clone — available for all yunwu TTS providers that
  // support MiniMax voice design/clone (yunwu-minimax uses the MiniMax
  // voice_design / voice_clone endpoints under the hood).
  const supportsVoiceDesign = config.provider === "yunwu-minimax";

  return (
    <div>
      {error && <p className="rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">{error}</p>}
      {saved && <p className="rounded-[7px] bg-[rgba(120,180,120,0.08)] p-3 text-sm text-[#78B478]">语音配置保存成功</p>}

      <Stratum title="语音合成" subtitle="配置语音合成服务商（用于对话消息朗读）">
        <SelectField
          label="语音服务商"
          value={config.provider}
          onChange={(v) => {
            const provider = providers.find((p) => p.id === v);
            setConfig({
              ...config,
              provider: v,
              model: provider?.models[0]?.id ?? config.model,
              voice: provider?.voices[0]?.id ?? config.voice,
              baseUrl: provider?.baseUrl ?? config.baseUrl,
            });
          }}
          options={providers.map((p) => p.id)}
        />

        {(() => {
          const tp = providers.find((p) => p.id === config.provider);
          return tp && tp.models.length > 0 ? (
            <SelectField
              label="模型"
              value={config.model}
              onChange={(v) => setConfig({ ...config, model: v })}
              options={tp.models.map((m) => m.id)}
            />
          ) : (
            <TextInput
              label="模型 ID"
              value={config.model}
              onChange={(v) => setConfig({ ...config, model: v })}
            />
          );
        })()}

        {(() => {
          const tp = providers.find((p) => p.id === config.provider);
          if (!tp || tp.voices.length === 0) return null;
          return (
            <div>
              <label className="text-xs text-[#787878]">语音</label>
              <select
                value={config.voice}
                onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
              >
                {tp.voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          );
        })()}

        <TextInput
          label="API Key"
          value={config.apiKey}
          onChange={(v) => setConfig({ ...config, apiKey: v })}
        />

        <TextInput
          label="Base URL（可选，留空使用服务商默认）"
          value={config.baseUrl}
          onChange={(v) => setConfig({ ...config, baseUrl: v })}
        />

        <NumberField
          label="语速（0.25 - 4.0，默认 1.0）"
          value={config.speed}
          onChange={(v) => setConfig({ ...config, speed: v })}
        />

        <SelectField
          label="音频格式"
          value={config.responseFormat}
          onChange={(v) => setConfig({ ...config, responseFormat: v })}
          options={["mp3", "opus", "aac", "flac", "wav", "pcm"]}
        />

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={BTN.primary}
          >
            {saving ? "保存中..." : "保存语音配置"}
          </button>
        </div>
      </Stratum>

      {/* Voice design & clone — only for MiniMax provider */}
      {supportsVoiceDesign && (
        <div className="mt-6 space-y-4">
          {voiceError && (
            <p className="rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">{voiceError}</p>
          )}

          {/* Voice Design */}
          <div className="rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A]">
            <h3 className="text-sm font-light text-[#C9A86C]">🎨 音色设计</h3>
            <p className="mt-1 text-xs text-[#787878]">用文字描述生成自定义音色，生成后自动加入上方语音列表</p>
            <div className="mt-3 space-y-3">
              <TextInput
                label="音色名称（可选）"
                value={designName}
                onChange={setDesignName}
              />
              <div>
                <label className="text-xs text-[#787878]">音色描述</label>
                <textarea
                  value={designPrompt}
                  onChange={(e) => setDesignPrompt(e.target.value)}
                  placeholder="例：讲述悬疑故事的播音员，声音低沉富有磁性"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                />
              </div>
              <button
                onClick={() => void handleDesignVoice()}
                disabled={designing || !designPrompt.trim()}
                className="rounded-lg border border-[rgba(201,168,108,0.3)] px-4 py-2 text-sm text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)] disabled:opacity-50"
              >
                {designing ? "设计中..." : "设计音色"}
              </button>
            </div>
          </div>

          {/* Voice Clone */}
          <div className="rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A]">
            <h3 className="text-sm font-light text-[#C9A86C]">🎤 音色克隆</h3>
            <p className="mt-1 text-xs text-[#787878]">上传音频文件克隆音色（mp3/m4a/wav，10秒~5分钟，≤20MB）</p>
            <div className="mt-3 space-y-3">
              <TextInput
                label="音色名称（可选）"
                value={cloneName}
                onChange={setCloneName}
              />
              <div>
                <label className="text-xs text-[#787878]">音频文件</label>
                <input
                  type="file"
                  accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp3,audio/m4a,audio/wav"
                  onChange={(e) => setCloneFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm text-[#E8E8E8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1C1C1E] file:px-4 file:py-2 file:text-sm file:text-[#C9A86C] hover:file:bg-[#252525]"
                />
                {cloneFile && (
                  <p className="mt-1 text-xs text-[#787878]">
                    已选择: {cloneFile.name} ({(cloneFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <button
                onClick={() => void handleCloneVoice()}
                disabled={cloning || !cloneFile}
                className="rounded-lg border border-[rgba(201,168,108,0.3)] px-4 py-2 text-sm text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)] disabled:opacity-50"
              >
                {cloning ? "上传并克隆中..." : "上传并克隆"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom voice list */}
      {customVoices.length > 0 && (
        <div className="mt-6 rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A]">
          <h3 className="text-sm font-light text-[#C9A86C]">自定义音色列表</h3>
          <p className="mt-1 text-xs text-[#787878]">设计/克隆的音色会保存在此处，并自动加入对应服务商的语音下拉列表</p>
          <div className="mt-3 space-y-2">
            {customVoices.map((v) => (
              <div
                key={v.voiceId}
                className="flex items-center justify-between rounded-[7px] bg-[#0F0F0F] px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {v.source === "design" ? "🎨" : "🎤"} {v.name}
                  </span>
                  <span className="rounded bg-[#1C1C1E] px-2 py-0.5 text-xs text-[#787878]">
                    {v.source === "design" ? "设计" : "克隆"}
                  </span>
                  <span className="text-xs text-[#555555]">{v.provider}</span>
                  {v.prompt && (
                    <span className="text-xs text-[#555555]" title={v.prompt}>
                      {v.prompt.length > 30 ? v.prompt.slice(0, 30) + "…" : v.prompt}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => void handleDeleteVoice(v.voiceId)}
                  className="rounded px-2 py-1 text-xs text-[#C9685A] hover:bg-[rgba(201,104,90,0.08)]"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
