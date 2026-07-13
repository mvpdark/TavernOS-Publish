import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { apiGet, apiPut, apiPost } from "../api/client.js";
import { TextInput, NumberField, SelectField, BTN, Stratum } from "../components/ui.tsx";
import type {
  SettingsData,
  SettingsResponse,
  ProviderInfo,
  ProviderCredentialsData,
  EmbedderConfigData,
} from "./settings/types.js";
import ImageConfigSection from "./settings/ImageConfigSection.tsx";
import TTSConfigSection from "./settings/TTSConfigSection.tsx";
import VideoConfigSection from "./settings/VideoConfigSection.tsx";
import MusicConfigSection from "./settings/MusicConfigSection.tsx";
import PlusConfigSection from "./settings/PlusConfigSection.tsx";
import { ModelSelect } from "./settings/ModelSelect.tsx";
import type { JSX } from "react";

/** Agent definitions for the writing pipeline.
 *  `priority` lists provider ids in order of preference; the first
 *  configured provider's best model is used as the recommendation. */
const AGENTS = [
  { id: "architect", name: "大纲规划", desc: "剧情架构与伏笔设计", priority: ["anthropic", "yunwu", "openai", "grok", "agnes", "deepseek"] },
  { id: "conductor", name: "上下文筛选", desc: "筛选相关历史信息", priority: ["deepseek", "openai", "grok", "yunwu", "anthropic", "agnes"] },
  { id: "writerSkeleton", name: "写作·骨架阶段", desc: "两阶段骨架（长上下文模型，如 Kimi）", priority: ["moonshot", "google", "grok", "agnes", "yunwu", "openai"] },
  { id: "writerFlesh", name: "写作·血肉阶段", desc: "两阶段血肉（文学模型，如 Claude）", priority: ["anthropic", "yunwu", "openai", "grok", "agnes", "deepseek"] },
  { id: "writer", name: "写作·单阶段兜底", desc: "未配置骨架时使用", priority: ["anthropic", "yunwu", "openai", "grok", "agnes", "deepseek"] },
  { id: "auditor", name: "一致性审查", desc: "检查剧情漏洞与矛盾", priority: ["deepseek", "anthropic", "openai", "grok", "yunwu", "agnes"] },
  { id: "reviser", name: "修订润色", desc: "根据审查结果修改正文", priority: ["anthropic", "yunwu", "openai", "grok", "agnes", "deepseek"] },
  { id: "consolidator", name: "状态提取", desc: "提取角色状态变化", priority: ["deepseek", "openai", "grok", "yunwu", "anthropic", "agnes"] },
  { id: "asset-extractor", name: "资产提取", desc: "提取角色/场景/道具", priority: ["deepseek", "openai", "grok", "yunwu", "anthropic", "agnes"] },
  { id: "consultant", name: "蓝图顾问", desc: "创作顾问对话（建议强对话模型）", priority: ["anthropic", "yunwu", "openai", "grok", "agnes", "deepseek"] },
] as const;

/** Visual divider with a label, used to group related configuration sections. */
function SectionLabel({ label }: { label: string }): JSX.Element {
  return (
    <div className="mb-5 mt-12 flex items-center gap-3 first:mt-6">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A86C]/50">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-[#1A1A1A] to-transparent" />
    </div>
  );
}

export default function Settings(): JSX.Element {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [, setDataDir] = useState("");
  const [agentModels, setAgentModels] = useState<Record<string, string>>({});
  const [providerCreds, setProviderCreds] = useState<ProviderCredentialsData>({});
  const [grokLogin, setGrokLogin] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [grokMsg, setGrokMsg] = useState<string | null>(null);
  const [grokCode, setGrokCode] = useState("");
  const [grokCodeSubmitting, setGrokCodeSubmitting] = useState(false);
  const grokPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const grokTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref for the "saved" indicator timer — cleared on unmount to avoid setState after unmount.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-provider auto-save + validation state.
  // status: idle → saving → validating → valid | invalid
  const [providerStatus, setProviderStatus] = useState<Record<string, { status: "idle" | "saving" | "validating" | "valid" | "invalid"; message?: string }>>({});
  const providerDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Refs to always access the latest settings/agentModels inside the
  // debounced autoSave timer, preventing stale-closure overwrites
  // when the user edits other fields during the 800ms debounce window.
  const settingsRef = useRef(settings);
  const agentModelsRef = useRef(agentModels);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { agentModelsRef.current = agentModels; }, [agentModels]);

  // Per-provider "fetch models" state — tracks the dynamic model-list fetch.
  const [fetchStatus, setFetchStatus] = useState<Record<string, { loading: boolean; error?: string; count?: number }>>({});

  // Load settings from the backend. Extracted as a callback so the failure
  // screen can offer a "重试" (retry) button that re-runs the same load.
  const loadSettings = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet<SettingsResponse>("/settings")
      .then((d) => {
        setSettings(d.settings);
        setProviders(d.providers);
        setDataDir(d.dataDir);
        const loaded = (d as SettingsResponse & { agentModels?: Record<string, string> }).agentModels ?? {};
        setAgentModels(loaded);
        setSavedAgentModels(loaded);
        setProviderCreds(d.providerCredentials ?? {});
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Clean up Grok OAuth polling interval, timeout, and saved-indicator timer on unmount
  useEffect(() => {
    return () => {
      if (grokPollRef.current) clearInterval(grokPollRef.current);
      if (grokTimeoutRef.current) clearTimeout(grokTimeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Set of provider ids that have credentials configured (apiKey or oauthToken
  // set to the mask sentinel "***"). Used by ModelSelect to show a green dot
  // next to ready-to-use providers.
  const configuredProviders = useMemo(() => {
    const set = new Set<string>();
    for (const [id, cred] of Object.entries(providerCreds)) {
      if (cred.apiKey || cred.oauthToken) set.add(id);
    }
    return set;
  }, [providerCreds]);

  // Snapshot of agentModels as last loaded/saved — used to detect unsaved edits.
  const [savedAgentModels, setSavedAgentModels] = useState<Record<string, string>>({});
  const [agentModelsDirty, setAgentModelsDirty] = useState(false);

  // Check if agentModels differ from the saved snapshot whenever either changes.
  useEffect(() => {
    const allKeys = new Set([...Object.keys(savedAgentModels), ...Object.keys(agentModels)]);
    let dirty = false;
    for (const k of allKeys) {
      if ((savedAgentModels[k] ?? "") !== (agentModels[k] ?? "")) { dirty = true; break; }
    }
    setAgentModelsDirty(dirty);
  }, [agentModels, savedAgentModels]);

  /** Pick the best model for an agent from configured providers.
   *  Returns "" if no provider with models is configured. */
  const getRecommendedModel = useCallback((priority: readonly string[]): string => {
    for (const pid of priority) {
      if (!configuredProviders.has(pid)) continue;
      const provider = providers.find((p) => p.id === pid);
      if (provider && provider.models.length > 0) {
        // First model in the list is the provider's flagship.
        return `${pid}:${provider.models[0].id}`;
      }
    }
    return "";
  }, [configuredProviders, providers]);

  /** Whether any configured provider has models available. */
  const hasAnyConfiguredModel = useMemo(() => {
    return providers.some((p) => configuredProviders.has(p.id) && p.models.length > 0);
  }, [providers, configuredProviders]);

  const handleSave = async (): Promise<void> => {
    // Guard against double-submit: the button is also disabled while saving,
    // but this prevents a duplicate write if two clicks land before re-render.
    if (saving) return;
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/settings", { ...settings, agentModels, providerCredentials: providerCreds });
      setSavedAgentModels({ ...agentModels });
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  /** Debounced auto-save for a single provider's credential.
   *  Triggered when the user types/pastes a key. After 800ms of inactivity,
   *  saves the key and then validates it by making a test API call. */
  const autoSaveProviderCredential = useCallback((providerId: string, currentCreds: ProviderCredentialsData) => {
    // Clear any pending debounce for this provider.
    if (providerDebounceRef.current[providerId]) {
      clearTimeout(providerDebounceRef.current[providerId]!);
    }
    providerDebounceRef.current[providerId] = setTimeout(async () => {
      const cred = currentCreds[providerId] ?? {};
      const key = cred.apiKey || cred.oauthToken || "";
      // Skip if empty or still the mask (unchanged).
      if (!key || key === "***") return;

      setProviderStatus((prev) => ({ ...prev, [providerId]: { status: "saving" } }));

      try {
        // Save the credential — use refs to always save the latest settings,
        // not the stale snapshot captured when the timer was created.
        if (!settingsRef.current) return;
        await apiPut("/settings", { ...settingsRef.current, agentModels: agentModelsRef.current, providerCredentials: currentCreds });
        setProviderStatus((prev) => ({ ...prev, [providerId]: { status: "validating" } }));

        // Validate by making a test API call.
        const result = await apiPost<{ valid: boolean; error?: string }>("/settings/validate-provider", { providerId });
        if (result.valid) {
          setProviderStatus((prev) => ({ ...prev, [providerId]: { status: "valid" } }));
        } else {
          setProviderStatus((prev) => ({ ...prev, [providerId]: { status: "invalid", message: result.error } }));
        }
      } catch (e) {
        setProviderStatus((prev) => ({
          ...prev,
          [providerId]: { status: "invalid", message: e instanceof Error ? e.message : String(e) },
        }));
      }
    }, 800);
  }, []);

  // Clean up debounce timers on unmount.
  useEffect(() => {
    return () => {
      for (const timer of Object.values(providerDebounceRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  /** Fetch the live model list from a provider's /models API endpoint
   *  using the user's saved key. Updates the providers state in-place so
   *  the UI immediately reflects the actual available models. */
  const fetchModels = useCallback(async (providerId: string) => {
    setFetchStatus((prev) => ({ ...prev, [providerId]: { loading: true } }));
    try {
      const result = await apiPost<{ models: Array<{ id: string; name?: string }> } | { error: string }>(
        "/settings/fetch-models",
        { providerId },
      );
      if ("error" in result) {
        setFetchStatus((prev) => ({ ...prev, [providerId]: { loading: false, error: result.error } }));
        return;
      }
      const fetched = result.models;
      // Update the providers list so the UI shows the live models immediately.
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? {
                ...p,
                models: fetched.map((m) => ({
                  id: m.id,
                  name: m.name ?? m.id,
                  contextWindow: 0,
                })),
                modelsFetched: true,
              }
            : p,
        ),
      );
      setFetchStatus((prev) => ({ ...prev, [providerId]: { loading: false, count: fetched.length } }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFetchStatus((prev) => ({ ...prev, [providerId]: { loading: false, error: msg } }));
    }
  }, []);

  // Grok OAuth one-click login: ask the backend to start the loopback PKCE
  // flow, open the authorize URL in a new tab, then poll until success/error.
  const handleGrokLogin = async (): Promise<void> => {
    setGrokLogin("pending");
    setGrokMsg("正在启动浏览器登录…");
    try {
      const { authorizeUrl } = await apiPost<{ authorizeUrl: string }>("/oauth/grok/start", {});
      if (!authorizeUrl) throw new Error("未获取到授权 URL");
      window.open(authorizeUrl, "_blank");
      // Poll the login state every 2s until it resolves or times out.
      if (grokPollRef.current) clearInterval(grokPollRef.current);
      grokPollRef.current = setInterval(async () => {
        try {
          const st = await apiGet<{ status: string; message?: string }>("/oauth/grok/status");
          if (st.status === "success") {
            setGrokLogin("success");
            setGrokMsg(st.message ?? "Grok 登录成功");
            if (grokPollRef.current) clearInterval(grokPollRef.current);
            // Refresh credentials so the configured badge updates.
            const d = await apiGet<SettingsResponse>("/settings");
            setProviderCreds(d.providerCredentials ?? {});
          } else if (st.status === "error") {
            setGrokLogin("error");
            setGrokMsg(st.message ?? "登录失败");
            if (grokPollRef.current) clearInterval(grokPollRef.current);
          }
        } catch {
          // keep polling
        }
      }, 2000);
      // Safety: stop polling after 200s.
      grokTimeoutRef.current = setTimeout(() => {
        if (grokPollRef.current) clearInterval(grokPollRef.current);
      }, 200_000);
    } catch (e) {
      setGrokLogin("error");
      setGrokMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGrokLogout = async (): Promise<void> => {
    try {
      await apiPost("/oauth/grok/logout", {});
    } catch (e) {
      // Logout failure is non-fatal — still reset UI state.
      console.error("[settings] grok logout error:", e);
    }
    setGrokLogin("idle");
    setGrokMsg(null);
    setGrokCode("");
  };

  // Submit the code shown on xAI's OAuth page manually.
  // Used when xAI shows a code instead of redirecting back.
  const handleGrokSubmitCode = async (): Promise<void> => {
    if (!grokCode.trim()) return;
    setGrokCodeSubmitting(true);
    try {
      await apiPost("/oauth/grok/submit-code", { code: grokCode.trim() });
      setGrokLogin("success");
      setGrokMsg("Grok 登录成功");
      setGrokCode("");
      if (grokPollRef.current) clearInterval(grokPollRef.current);
      // Refresh credentials so the configured badge updates.
      const d = await apiGet<SettingsResponse>("/settings");
      setProviderCreds(d.providerCredentials ?? {});
    } catch (e) {
      setGrokLogin("error");
      setGrokMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setGrokCodeSubmitting(false);
    }
  };

  /** Patch the embedder config (Phase B RAG), initializing defaults if absent. */
  const updateEmbedder = (patch: Partial<EmbedderConfigData>): void => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            embedderConfig: {
              type: prev.embedderConfig?.type ?? "openai",
              model: prev.embedderConfig?.model ?? "text-embedding-3-small",
              dimensions: prev.embedderConfig?.dimensions ?? 1536,
              apiKey: prev.embedderConfig?.apiKey,
              baseUrl: prev.embedderConfig?.baseUrl,
              ...patch,
            },
          }
        : prev,
    );
  };

  if (loading) return <div className="p-8 text-[#787878]">加载中...</div>;
  if (!settings) return (
    <div className="p-8">
      <p className="text-red-500">配置加载失败</p>
      {error && <p className="mt-2 text-sm text-[#787878]">{error}</p>}
      <button onClick={loadSettings} className={`${BTN.primary} mt-4`}>重试</button>
    </div>
  );

  const currentProvider = providers.find((p) => p.id === settings.service);

  return (
    <div className="p-8 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#E8E8E8]">设置</h1>
          <p className="mt-1 text-sm text-[#787878]">配置 LLM 服务商和模型参数</p>
        </div>
        <div className="flex items-center gap-4">
          {saved && <span className="text-sm text-[#78B478]">保存成功</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className={BTN.primary}
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">{error}</p>}

      {/* ── 语言模型 ── */}
      <SectionLabel label="语言模型" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&>div]:mt-0">

      <Stratum title="LLM 配置" subtitle="核心语言模型服务商与参数">
        <SelectField
          label="LLM 服务商"
          value={settings.service}
          onChange={(v) => {
            const provider = providers.find((p) => p.id === v);
            // Load the per-provider credential key (or mask) into the global apiKey field.
            const cred = providerCreds[v] ?? {};
            setSettings({
              ...settings,
              service: v,
              model: provider?.models[0]?.id ?? "",
              apiKey: cred.apiKey ?? "",
              // Only clear baseUrl when the selected provider ships a fixed
              // baseUrl (the backend will use its default). For "custom"
              // providers with no baseUrl, preserve the user's existing input.
              baseUrl: provider?.baseUrl ? "" : settings.baseUrl,
            });
          }}
          options={providers.map((p) => p.id)}
          optionLabels={providers.map((p) => p.name)}
        />

        {currentProvider && (
          <div className="rounded-[7px] bg-[#0F0F0F] p-3 text-sm">
            <span className="font-medium">{currentProvider.name}</span>
            {currentProvider.apiKeyOptional && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                API Key 可选
              </span>
            )}
            {currentProvider.authType === "oauth" && (
              <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-[#A078C8]">
                OAuth 认证
              </span>
            )}
            <span className="ml-2 text-[#787878]">
              {currentProvider.models.length > 0
                ? `${currentProvider.models.length} 个模型`
                : "自定义模型"}
            </span>
          </div>
        )}

        {currentProvider && currentProvider.models.length > 0 ? (
          <SelectField
            label="模型"
            value={settings.model}
            onChange={(v) => setSettings({ ...settings, model: v })}
            options={currentProvider.models.map((m) => m.id)}
            optionLabels={currentProvider.models.map((m) => m.name)}
          />
        ) : (
          <TextInput
            label="模型 ID"
            value={settings.model}
            onChange={(v) => setSettings({ ...settings, model: v })}
          />
        )}

        {currentProvider && currentProvider.models.find((m) => m.id === settings.model) && (
          <div className="text-xs text-[#787878]">
            上下文窗口:{" "}
            {currentProvider.models.find((m) => m.id === settings.model)!.contextWindow.toLocaleString()} tokens
          </div>
        )}

        {currentProvider && currentProvider.authType === "oauth" ? (
          <>
            <TextInput
              label="OAuth Token"
              value={settings.oauthToken ?? ""}
              onChange={(v) => setSettings({ ...settings, oauthToken: v })}
            />
            <div className="rounded-lg bg-[rgba(160,120,200,0.08)] p-3 text-xs text-[#A078C8]">
              Grok 使用 SuperGrok OAuth 认证。将你的 OAuth Access Token 填入上方。
              也可设置环境变量 <code className="rounded bg-purple-100 px-1">XAI_OAUTH_TOKEN</code>。
            </div>
          </>
        ) : (
          <TextInput
            label="API Key"
            value={settings.apiKey}
            onChange={(v) => {
              setSettings({ ...settings, apiKey: v });
              // Sync to per-provider credential so agent overrides work.
              const pid = settings.service;
              if (pid) {
                const newCreds = {
                  ...providerCreds,
                  [pid]: { ...providerCreds[pid], apiKey: v },
                };
                setProviderCreds(newCreds);
                autoSaveProviderCredential(pid, newCreds);
              }
            }}
          />
        )}

        <TextInput
          label="Base URL（可选，留空使用服务商默认）"
          value={settings.baseUrl ?? ""}
          onChange={(v) => setSettings({ ...settings, baseUrl: v })}
        />

        <NumberField
          label="Temperature"
          value={settings.temperature}
          onChange={(v) => setSettings({ ...settings, temperature: v })}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.stream}
            onChange={(e) => setSettings({ ...settings, stream: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          <span className="text-sm text-[#E8E8E8]">启用流式响应（Streaming）</span>
        </div>
      </Stratum>

      {/* Provider login — paste a key for each provider to drive its models */}
      <Stratum title="服务商账号登录" subtitle="为每个服务商填入密钥即可驱动其模型，支持同时登录多个服务商。已配置的显示绿色标记。">

        <div className="mt-4 space-y-3">
          {providers.map((p) => {
            const isOAuth = p.authType === "oauth";
            const cred = providerCreds[p.id] ?? {};
            const value = isOAuth ? cred.oauthToken ?? "" : cred.apiKey ?? "";
            const configured = value.length > 0;
            const ps = providerStatus[p.id];
            return (
              <div key={p.id} className="rounded-[7px] bg-[#0F0F0F] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#E8E8E8]">{p.name}</span>
                    <code className="rounded bg-[#1A1A1A] px-1.5 py-0.5 text-xs text-[#787878]">{p.id}</code>
                    {isOAuth && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-[#A078C8]">OAuth</span>
                    )}
                    {p.apiKeyOptional && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Key 可选</span>
                    )}
                  </div>
                  {/* Status badge: shows save/validate/result state */}
                  {ps?.status === "saving" && (
                    <span className="text-xs text-[#787878]">保存中…</span>
                  )}
                  {ps?.status === "validating" && (
                    <span className="text-xs text-[#787878]">验证中…</span>
                  )}
                  {ps?.status === "valid" && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">密钥有效</span>
                  )}
                  {ps?.status === "invalid" && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700" title={ps.message}>
                      {ps.message ?? "密钥无效"}
                    </span>
                  )}
                  {!ps && (
                    configured ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">已配置</span>
                    ) : (
                      <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#555555]">未配置</span>
                    )
                  )}
                </div>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => {
                    const newCreds = {
                      ...providerCreds,
                      [p.id]: {
                        ...providerCreds[p.id],
                        [isOAuth ? "oauthToken" : "apiKey"]: e.target.value,
                      },
                    };
                    setProviderCreds(newCreds);
                    // Trigger debounced auto-save + validation.
                    autoSaveProviderCredential(p.id, newCreds);
                  }}
                  placeholder={isOAuth ? "粘贴 OAuth Access Token" : "粘贴 API Key"}
                  className={`w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] transition-colors ${
                    ps?.status === "invalid"
                      ? "border-[rgba(201,104,90,0.4)]"
                      : ps?.status === "valid"
                        ? "border-[rgba(107,159,107,0.3)]"
                        : "border-[#1A1A1A]"
                  }`}
                />
                {isOAuth && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleGrokLogin}
                      disabled={grokLogin === "pending"}
                      className="rounded-lg bg-[#7C5CB8] px-3 py-1.5 text-xs text-white hover:bg-[#8D6CC9] disabled:opacity-50"
                    >
                      {grokLogin === "pending" ? "等待授权…" : "一键网页登录"}
                    </button>
                    {cred.oauthToken && (
                      <button onClick={handleGrokLogout} className="btn-press rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#787878] hover:text-[#C9685A]">
                        退出登录
                      </button>
                    )}
                    {grokMsg && (
                      <span className={`text-xs ${grokLogin === "success" ? "text-[#78B478]" : grokLogin === "error" ? "text-[#C9685A]" : "text-[#787878]"}`}>
                        {grokMsg}
                      </span>
                    )}
                    {grokLogin === "pending" && (
                      <div className="w-full mt-2 rounded-lg border border-[rgba(124,92,184,0.3)] bg-[rgba(124,92,184,0.1)] p-3">
                        <div className="text-xs text-purple-300 mb-2">
                          如果浏览器没有自动跳回，请将 xAI 页面显示的代码粘贴到下方：
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={grokCode}
                            onChange={(e) => setGrokCode(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && grokCode.trim()) handleGrokSubmitCode(); }}
                            placeholder="粘贴 xAI 显示的代码"
                            className="flex-1 rounded-lg border border-[#333] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#E8E8E8] placeholder-[#444444] focus:border-[#7C5CB8] focus:outline-none"
                          />
                          <button
                            onClick={handleGrokSubmitCode}
                            disabled={!grokCode.trim() || grokCodeSubmitting}
                            className="rounded-lg bg-[#7C5CB8] px-3 py-1.5 text-xs text-white hover:bg-[#8D6CC9] disabled:opacity-50"
                          >
                            {grokCodeSubmitting ? "提交中…" : "提交代码"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="w-full text-xs text-[#A078C8]">
                      点"一键网页登录"会弹出浏览器前往 auth.x.ai，登录授权后自动回填令牌。如 xAI 显示代码，请在上方输入框粘贴。
                    </div>
                  </div>
                )}
                {/* Dynamic model-fetch button: calls the provider's /models API
                    to read the actual available models for this key. */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => fetchModels(p.id)}
                    disabled={!configured || fetchStatus[p.id]?.loading}
                    className={`rounded-[7px] px-3 py-1.5 text-xs transition-colors ${
                      configured && !fetchStatus[p.id]?.loading
                        ? "bg-[#C9A86C] text-[#0F0F0F] hover:bg-[#D4B876]"
                        : "bg-[#1A1A1A] text-[#555] cursor-not-allowed"
                    }`}
                  >
                    {fetchStatus[p.id]?.loading ? "拉取中…" : "拉取模型列表"}
                  </button>
                  {p.modelsFetched && !fetchStatus[p.id]?.loading && !fetchStatus[p.id]?.error && (
                    <span className="rounded-full bg-[rgba(201,168,108,0.12)] px-2 py-0.5 text-xs text-[#C9A86C]">
                      已拉取 {p.models.length} 个模型
                    </span>
                  )}
                  {fetchStatus[p.id]?.error && (
                    <span className="text-xs text-[#C9685A]" title={fetchStatus[p.id]?.error}>
                      {fetchStatus[p.id]!.error!.slice(0, 60)}
                    </span>
                  )}
                  <span className="text-xs text-[#555555]">
                    用你的 Key 调用 API 读取实际可用模型（覆盖内置列表）
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-[#787878]">
          提示：粘贴密钥后自动保存并验证，无需手动点击保存。密钥保存在本地 <code className="rounded bg-[#1A1A1A] px-1">settings.json</code>，界面仅显示掩码。
        </div>
      </Stratum>
      </div>

      {/* Agent model overrides for the writing pipeline — full width */}
      <Stratum>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-light text-[#C9A86C]">写作 Agent 模型配置</h2>
            <p className="mt-1 text-sm text-[#787878]">
              为每个写作 Agent 指定专用模型，留空则使用全局模型。支持 <code className="rounded bg-[#1A1A1A] px-1 text-[#C9A86C]">服务商:模型</code> 格式实现多模型分工。
            </p>
          </div>
          {/* Inline save button for agent models */}
          <button
            onClick={handleSave}
            disabled={saving || !agentModelsDirty}
            className={`shrink-0 rounded-[7px] px-4 py-2 text-sm transition-colors ${
              agentModelsDirty
                ? "bg-[#C9A86C] text-[#0F0F0F] hover:bg-[#D4B876]"
                : "bg-[#1A1A1A] text-[#555] cursor-not-allowed"
            }`}
          >
            {saving ? "保存中…" : agentModelsDirty ? "保存模型配置" : "已保存"}
          </button>
        </div>

        {!hasAnyConfiguredModel && (
          <div className="mt-3 rounded-[7px] bg-[rgba(201,104,90,0.08)] border border-[rgba(201,104,90,0.2)] p-3 text-xs text-[#C9685A]">
            尚未配置任何服务商密钥，请先在上方"服务商账号登录"中添加密钥，否则模型选择和推荐将不可用。
          </div>
        )}

        <div className="mt-4 space-y-3">
          {AGENTS.map((agent) => {
            const isTwoStage = agent.id === "writerSkeleton" || agent.id === "writerFlesh";
            const skeletonConfigured = agentModels["writerSkeleton"];
            const recommended = getRecommendedModel(agent.priority);
            return (
              <div
                key={agent.id}
                className={`rounded-[7px] p-3 ${isTwoStage ? "bg-[rgba(201,168,108,0.05)] border border-[rgba(201,168,108,0.15)]" : "bg-[#0F0F0F]"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-[#E8E8E8]">{agent.name}</span>
                    {isTwoStage && (
                      <span className="ml-2 rounded bg-[rgba(201,168,108,0.15)] px-1.5 py-0.5 text-[10px] text-[#C9A86C]">两阶段</span>
                    )}
                    <span className="ml-2 text-xs text-[#E8E8E8]">{agent.desc}</span>
                  </div>
                  {recommended && (
                    <button
                      onClick={() => setAgentModels((prev) => ({ ...prev, [agent.id]: recommended }))}
                      className="text-xs text-[#C9A86C] hover:underline shrink-0 ml-2"
                    >
                      推荐模型
                    </button>
                  )}
                </div>
                <ModelSelect
                  value={agentModels[agent.id] ?? ""}
                  onChange={(v) => setAgentModels((prev) => ({ ...prev, [agent.id]: v }))}
                  placeholder={recommended || "留空使用全局模型"}
                  providers={providers}
                  configuredProviders={configuredProviders}
                />
                {agent.id === "writer" && skeletonConfigured && (
                  <div className="mt-1 text-xs text-[#E8E8E8]">
                    已配置骨架阶段，此单阶段兜底模型仅在骨架未生效时使用
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-[7px] bg-[#0F0F0F] p-3 text-xs text-[#787878]">
          <span className="text-[#C9A86C]">两阶段写作说明：</span>
          配置「骨架阶段」后，写作将分两步进行——先用长上下文模型（如 Kimi）搭建场景骨架，再用文学模型（如 Claude）扩写情感血肉。留空骨架则使用单阶段模式。
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => {
              const defaults: Record<string, string> = {};
              for (const a of AGENTS) defaults[a.id] = getRecommendedModel(a.priority);
              setAgentModels(defaults);
            }}
            disabled={!hasAnyConfiguredModel}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              hasAnyConfiguredModel
                ? "border-[rgba(201,168,108,0.3)] text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)]"
                : "border-[#1A1A1A] text-[#444] cursor-not-allowed"
            }`}
          >
            全部设为推荐配置
          </button>
          {agentModelsDirty && (
            <span className="text-xs text-[#C9685A]">有未保存的更改</span>
          )}
        </div>
      </Stratum>

      {/* Embedder config — Phase B RAG vector retrieval */}
      <Stratum title="向量检索配置（RAG）" subtitle="配置嵌入模型用于语义检索已完成章节，写作时自动召回相关前文片段保持连贯。留空 API Key 将自动降级为本地模拟（不影响写作流程）。">

        <div className="mt-4 space-y-4">
          <SelectField
            label="嵌入方式"
            value={settings.embedderConfig?.type ?? "openai"}
            onChange={(v) => updateEmbedder({ type: v as "stub" | "openai" })}
            options={["openai", "stub"]}
          />
          {settings.embedderConfig?.type !== "stub" && (
            <>
              <TextInput
                label="嵌入模型"
                value={settings.embedderConfig?.model ?? ""}
                onChange={(v) => updateEmbedder({ model: v })}
              />
              <NumberField
                label="向量维度"
                value={settings.embedderConfig?.dimensions ?? 1536}
                onChange={(v) => updateEmbedder({ dimensions: v })}
              />
              <TextInput
                label="API Key（留空则复用全局密钥，仍为空则降级本地模拟）"
                value={settings.embedderConfig?.apiKey ?? ""}
                onChange={(v) => updateEmbedder({ apiKey: v })}
              />
              <TextInput
                label="Base URL（可选，留空复用全局 Base URL）"
                value={settings.embedderConfig?.baseUrl ?? ""}
                onChange={(v) => updateEmbedder({ baseUrl: v })}
              />
            </>
          )}
          {settings.embedderConfig?.type === "stub" && (
            <div className="rounded-[7px] bg-[#0F0F0F] p-3 text-xs text-[#787878]">
              本地模拟模式：使用随机向量，无需任何 API，仅用于功能测试。正式写作请切换为 openai 并配置密钥。
            </div>
          )}
        </div>
      </Stratum>

      {/* ── 媒体生成 ── */}
      <SectionLabel label="媒体生成" />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 [&>div]:mt-0">

      {/* Image generation configuration */}
      <ImageConfigSection />

      {/* Video generation configuration */}
      <VideoConfigSection />

      {/* Music generation configuration */}
      <MusicConfigSection />
      </div>

      {/* TTS configuration — full width (contains voice design/clone sub-sections) */}
      <TTSConfigSection />

      {/* ── 高级功能 ── */}
      <SectionLabel label="高级功能" />

      {/* Plus module (daily silent character generation via LLM + Midjourney + WebDAV) */}
      <PlusConfigSection />
    </div>
  );
}
