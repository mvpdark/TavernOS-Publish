import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut, apiPost } from "../../api/client.js";
import { TextInput, SelectField, BTN, Stratum } from "../../components/ui.tsx";
import type { VideoConfigData, VideoConfigResponse, VideoProviderInfo } from "./types.js";
import type { JSX } from "react";

export default function VideoConfigSection(): JSX.Element | null {
  const [config, setConfig] = useState<VideoConfigData | null>(null);
  const [providers, setProviders] = useState<VideoProviderInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Jimeng direct: test connection state
  const [testingJimeng, setTestingJimeng] = useState(false);
  const [jimengTestResult, setJimengTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
  // Ref for the "saved" indicator timer — cleared on unmount to avoid setState after unmount.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    apiGet<VideoConfigResponse>("/videos/config")
      .then((d) => {
        setConfig(d.config);
        setProviders(d.providers);
      })
      .catch(() => {
        // Video config is optional; ignore load errors silently
      });
  }, []);

  const handleSave = async (): Promise<void> => {
    // Guard against double-submit (button is also disabled while saving).
    if (saving) return;
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/videos/config", config);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTestJimeng = async (): Promise<void> => {
    if (testingJimeng || !config) return;
    setTestingJimeng(true);
    setJimengTestResult(null);
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/videos/test-jimeng", {
        sessionid: config.jimengSessionId,
      });
      setJimengTestResult(result);
    } catch (e) {
      setJimengTestResult({ valid: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTestingJimeng(false);
    }
  };

  if (!config) return null;

  const isJimengDirect = config.provider === "jimeng-direct";

  return (
    <div>
      {error && <p className="rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">{error}</p>}
      {saved && <p className="rounded-[7px] bg-[rgba(120,180,120,0.08)] p-3 text-sm text-[#78B478]">视频配置保存成功</p>}

      <Stratum title="视频生成" subtitle="配置视频生成服务商（用于章节动画短片）">
        <SelectField
          label="视频服务商"
          value={config.provider}
          onChange={(v) => {
            const provider = providers.find((p) => p.id === v);
            setConfig({
              ...config,
              provider: v,
              model: provider?.models[0]?.id ?? config.model,
              baseUrl: provider?.baseUrl ?? config.baseUrl,
            });
            // Reset jimeng test result when switching providers
            setJimengTestResult(null);
          }}
          options={providers.map((p) => p.id)}
        />

        {(() => {
          const vp = providers.find((p) => p.id === config.provider);
          return vp && vp.models.length > 0 ? (
            <SelectField
              label="模型"
              value={config.model}
              onChange={(v) => setConfig({ ...config, model: v })}
              options={vp.models.map((m) => m.id)}
            />
          ) : (
            <TextInput
              label="模型 ID"
              value={config.model}
              onChange={(v) => setConfig({ ...config, model: v })}
            />
          );
        })()}

        {/* --- 即梦直连专属配置 --- */}
        {isJimengDirect && (
          <>
            <div className="rounded-[7px] bg-[rgba(180,160,120,0.06)] p-3 text-xs leading-relaxed text-[#8B7E6A]">
              <p className="mb-1 font-semibold text-[#7A6E5A]">即梦直连使用说明</p>
              <p>1. 打开 <a href="https://jimeng.jianying.com" target="_blank" rel="noopener noreferrer" className="underline">jimeng.jianying.com</a> 并登录</p>
              <p>2. 按 F12 打开开发者工具 → Application → Cookies → https://jimeng.jianying.com</p>
              <p>3. 找到 <code className="rounded bg-[rgba(122,110,90,0.1)] px-1">sessionid</code> 这一行，复制 Value 值</p>
              <p className="mt-1 text-[#C9685A]">⚠ sessionid 有效期约 2-4 小时，过期后需重新获取</p>
            </div>

            <TextInput
              label="Session ID"
              value={config.jimengSessionId}
              onChange={(v) => setConfig({ ...config, jimengSessionId: v })}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestJimeng}
                disabled={testingJimeng}
                className={`${BTN.ghost} text-sm`}
              >
                {testingJimeng ? "测试中..." : "测试连接"}
              </button>
              {jimengTestResult && (
                <span className={`text-sm ${jimengTestResult.valid ? "text-[#78B478]" : "text-[#C9685A]"}`}>
                  {jimengTestResult.valid ? "✓ 连接成功，sessionid 有效" : `✗ ${jimengTestResult.error ?? "连接失败"}`}
                </span>
              )}
            </div>
          </>
        )}

        {/* --- 非 jimeng-direct 显示常规 API Key / Base URL --- */}
        {!isJimengDirect && (
          <>
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
          </>
        )}

        <SelectField
          label="默认时长（秒）"
          value={String(config.duration)}
          onChange={(v) => setConfig({ ...config, duration: Number(v) })}
          options={["4", "5", "6", "8", "10", "15"]}
        />

        <SelectField
          label="分辨率"
          value={config.resolution}
          onChange={(v) => setConfig({ ...config, resolution: v })}
          options={["720p", "1080p", "4k"]}
        />

        <SelectField
          label="宽高比"
          value={config.aspectRatio}
          onChange={(v) => setConfig({ ...config, aspectRatio: v })}
          options={["16:9", "9:16", "1:1"]}
        />

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={BTN.primary}
          >
            {saving ? "保存中..." : "保存视频配置"}
          </button>
        </div>
      </Stratum>
    </div>
  );
}
