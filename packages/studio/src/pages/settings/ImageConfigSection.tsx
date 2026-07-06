import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut } from "../../api/client.js";
import { TextInput, SelectField, BTN, Stratum } from "../../components/ui.tsx";
import type { ImageConfigData, ImageConfigResponse, ImageProviderInfo } from "./types.js";
import type { JSX } from "react";

export default function ImageConfigSection(): JSX.Element | null {
  const [config, setConfig] = useState<ImageConfigData | null>(null);
  const [providers, setProviders] = useState<ImageProviderInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref for the "saved" indicator timer — cleared on unmount to avoid setState after unmount.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    apiGet<ImageConfigResponse>("/images/config")
      .then((d) => {
        setConfig(d.config);
        setProviders(d.providers);
      })
      .catch(() => {
        // Image config is optional; ignore load errors silently
      });
  }, []);

  const handleSave = async (): Promise<void> => {
    // Guard against double-submit (button is also disabled while saving).
    if (saving) return;
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/images/config", config);
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

  return (
    <div>
      {error && <p className="rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">{error}</p>}
      {saved && <p className="rounded-[7px] bg-[rgba(120,180,120,0.08)] p-3 text-sm text-[#78B478]">图像配置保存成功</p>}

      <Stratum title="图像生成" subtitle="配置图像生成服务商（用于角色头像和章节插图）">
        <SelectField
          label="图像服务商"
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

        {(() => {
          const ip = providers.find((p) => p.id === config.provider);
          return ip && ip.models.length > 0 ? (
            <SelectField
              label="模型"
              value={config.model}
              onChange={(v) => setConfig({ ...config, model: v })}
              options={ip.models.map((m) => m.id)}
            />
          ) : (
            <TextInput
              label="模型 ID"
              value={config.model}
              onChange={(v) => setConfig({ ...config, model: v })}
            />
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

        <SelectField
          label="图片尺寸"
          value={config.size}
          onChange={(v) => setConfig({ ...config, size: v })}
          options={["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]}
        />

        <SelectField
          label="风格"
          value={config.style}
          onChange={(v) => setConfig({ ...config, style: v })}
          options={["vivid", "natural"]}
        />

        <SelectField
          label="质量"
          value={config.quality}
          onChange={(v) => setConfig({ ...config, quality: v })}
          options={["standard", "hd"]}
        />

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={BTN.primary}
          >
            {saving ? "保存中..." : "保存图像配置"}
          </button>
        </div>
      </Stratum>
    </div>
  );
}
