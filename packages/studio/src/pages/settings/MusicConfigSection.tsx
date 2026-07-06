import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut } from "../../api/client.js";
import { SelectField, TextInput, BTN, Stratum } from "../../components/ui.tsx";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MusicModelInfo {
  id: string;
  name: string;
}

interface MusicProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  models: MusicModelInfo[];
  apiKeyOptional?: boolean;
}

interface MusicConfigData {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  instrumental: boolean;
}

interface MusicConfigResponse {
  config: MusicConfigData;
  providers: MusicProviderInfo[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MusicConfigSection(): JSX.Element | null {
  const [config, setConfig] = useState<MusicConfigData | null>(null);
  const [providers, setProviders] = useState<MusicProviderInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    apiGet<MusicConfigResponse>("/music/config")
      .then((d) => {
        setConfig(d.config);
        setProviders(d.providers);
      })
      .catch(() => {
        // Music config is optional; ignore load errors silently
      });
  }, []);

  const handleSave = async (): Promise<void> => {
    if (saving || !config) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/music/config", config);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!config) return null;

  const currentProvider = providers.find((p) => p.id === config.provider);

  return (
    <div>
      {error && <p className="rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">{error}</p>}
      {saved && <p className="rounded-[7px] bg-[rgba(120,180,120,0.08)] p-3 text-sm text-[#78B478]">音乐配置保存成功</p>}

      <Stratum title="音乐生成" subtitle="配置 Suno 音乐生成服务商（用于场景配乐和主题曲）">
        <SelectField
          label="音乐服务商"
          value={config.provider}
          onChange={(v) => {
            const provider = providers.find((p) => p.id === v);
            setConfig({
              ...config,
              provider: v,
              model: provider?.models[0]?.id ?? config.model,
              baseUrl: provider?.baseUrl ?? config.baseUrl,
            });
          }}
          options={providers.map((p) => p.id)}
        />

        {currentProvider && currentProvider.models.length > 0 ? (
          <SelectField
            label="模型"
            value={config.model}
            onChange={(v) => setConfig({ ...config, model: v })}
            options={currentProvider.models.map((m) => m.id)}
          />
        ) : (
          <TextInput
            label="模型 ID"
            value={config.model}
            onChange={(v) => setConfig({ ...config, model: v })}
          />
        )}

        <TextInput
          label="API Base URL"
          value={config.baseUrl}
          onChange={(v) => setConfig({ ...config, baseUrl: v })}
        />

        <TextInput
          label="API Key"
          value={config.apiKey}
          onChange={(v) => setConfig({ ...config, apiKey: v })}
        />
        <p className="text-xs text-gray-600">
          如不填写，将自动使用全局 LLM 配置的 API Key（仅当服务商为 yunwu 时有效）
        </p>

        <div className="flex items-center gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.instrumental}
              onChange={(e) => setConfig({ ...config, instrumental: e.target.checked })}
              className="h-4 w-4 rounded border-[#2A2A2A] bg-[#1A1A1A] text-[#C9A86C] focus:ring-[#C9A86C]/20"
            />
            <span className="text-sm text-gray-300">默认生成纯音乐（无歌词）</span>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={BTN.primary}
          >
            {saving ? "保存中…" : "保存音乐配置"}
          </button>
        </div>
      </Stratum>
    </div>
  );
}
