import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { apiGet, apiPut, apiPost } from "../../api/client.js";
import { BTN, TextInput, NumberField, SelectField } from "../../components/ui.tsx";
import StorageModeSelector from "./StorageModeSelector.tsx";
import type {
  PlusConfigData,
  PlusProjectInfo,
  PlusGenerationLog,
  PlusConfigResponse,
} from "./types.js";

/** Aspect ratio quick options. */
const ASPECT_RATIOS = ["16:9", "3:4", "2:3", "1:1", "4:3", "9:16"];

/** Image generation version options via yunwu midjourney-proxy (latest first). */
const MJ_VERSIONS = ["8.1", "8", "7", "6.1"];

/**
 * DropdownInput — a combobox that shows a clickable dropdown of preset options
 * while also allowing free text input. Replaces <datalist> which renders
 * invisibly in some dark-theme browsers.
 */
function DropdownInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handler(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-xs text-[#787878]">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 pr-8 text-sm text-[#E8E8E8] outline-none focus:border-[#C9A86C]"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787878] hover:text-[#C9A86C]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-1 shadow-xl popover-enter">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-[#2A2A2A] ${
                value === opt ? "text-[#C9A86C]" : "text-[#E8E8E8]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Preset theme options for character generation. */
const THEMES = [
  // 奇幻 / 玄幻
  "奇幻酒馆",
  "东方仙侠",
  "黑暗奇幻",
  "异世界转生",
  "童话寓言",
  // 科幻
  "赛博朋克",
  "蒸汽朋克",
  "星际科幻",
  "机甲战争",
  "末日废土",
  "末日丧尸",
  // 现代 / 都市
  "现代都市",
  "校园青春",
  "都市悬疑",
  "商战职场",
  "娱乐圈",
  // 悬疑 / 恐怖
  "悬疑推理",
  "规则怪谈",
  "恐怖惊悚",
  "克苏鲁神话",
  // 古风 / 历史
  "历史古风",
  "宫廷权谋",
  "武侠江湖",
  "重生年代",
  // 其他
  "吸血鬼/狼人",
  "无限流",
];

/** Visual style options for MID_JOURNEY (realistic) mode. */
const REALISTIC_STYLES = [
  // 写实摄影
  "电影感写实",
  "纪实摄影",
  "时尚杂志",
  "黑白摄影",
  "胶片质感",
  // 3D / 渲染
  "3D渲染写实",
  "虚幻引擎",
  "雕塑质感",
  // 概念设定
  "概念设定图",
  "角色概念艺术",
  // 西方绘画
  "油画质感",
  "厚涂插画",
  "水彩画风",
  // 特殊视觉
  "赛博霓虹",
  "暗黑哥特",
  "蒸汽朋克机械",
  "复古海报",
  "波普艺术",
  "极光梦幻",
];

/** Visual style options for NIJI_JOURNEY (anime) mode. */
const ANIME_STYLES = [
  // 日系动漫主流
  "新海诚风",
  "吉卜力风",
  "京都动画风",
  "赛璐璐风",
  // 漫画风
  "少女漫画",
  "少年漫画",
  "美式漫画",
  "暗黑漫画",
  // 插画风
  "厚涂日系",
  "水彩日系",
  "轻小说插画",
  "像素动漫",
  // 东方风
  "水墨国风",
  "水墨日系",
  "和风动漫",
  // 特色
  "Q版萌系",
  "机甲动漫",
  "梦幻童话",
  "复古动漫",
];

/** Returns the style list for the current bot type. */
function stylesForBotType(botType: string): readonly string[] {
  return botType === "NIJI_JOURNEY" ? ANIME_STYLES : REALISTIC_STYLES;
}

export default function PlusConfigSection(): JSX.Element {
  const [plus, setPlus] = useState<PlusConfigData | null>(null);
  const [, setWebdavConfigured] = useState(false);
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [, setProjects] = useState<PlusProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [plusSaved, setPlusSaved] = useState(false);
  const [plusError, setPlusError] = useState<string | null>(null);

  // --- Auto-save refs ---
  const loadedRef = useRef(false);
  const plusSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [triggering, setTriggering] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [lastLog, setLastLog] = useState<PlusGenerationLog | null>(null);
  const [logs, setLogs] = useState<PlusGenerationLog[]>([]);

  // Polling ref for background task status.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 轮询超时上限 ref，防止永久轮询
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Ref for the "saved" indicator timer — cleared on unmount to avoid setState after unmount.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (plusSaveTimer.current) clearTimeout(plusSaveTimer.current);
    };
  }, []);

  const load = async (): Promise<void> => {
    try {
      const d = await apiGet<PlusConfigResponse>("/plus/config");
      setPlus(d.plusConfig);
      setWebdavConfigured(d.webdavConfigured);
      setStorageConfigured(d.storageConfigured ?? d.webdavConfigured);
      setProjects(d.projects);
      const lg = await apiGet<{ logs: PlusGenerationLog[] }>("/plus/logs");
      setLogs(lg.logs ?? []);
    } catch (e) {
      // ignore load errors
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Validate schedule time format (HH:MM)
  const isValidTime = (t: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  // --- Plus config auto-save (debounced 800ms after last field change) ---
  useEffect(() => {
    if (!loadedRef.current || !plus) return;
    // Validate schedule time before saving
    if (plus.scheduleTime && !isValidTime(plus.scheduleTime)) {
      setPlusError("定时时间格式错误，请使用 HH:MM 格式（如 03:00）");
      return;
    }
    setPlusError(null);

    if (plusSaveTimer.current) clearTimeout(plusSaveTimer.current);
    plusSaveTimer.current = setTimeout(async () => {
      try {
        await apiPut("/plus/config", plus);
        setPlusSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setPlusSaved(false), 1500);
      } catch (e) {
        setPlusError(`自动保存失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    }, 800);

    return () => {
      if (plusSaveTimer.current) clearTimeout(plusSaveTimer.current);
    };
  }, [plus]);

  const handleTrigger = async (): Promise<void> => {
    setTriggering(true);
    setProgress([]);
    setLastLog(null);
    try {
      // Fire and forget — the backend runs generation in the background.
      await apiPost<{ taskId: string; status: string }>("/plus/trigger", {});
      // Start polling for status.
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const st = await apiGet<{
            status: "idle" | "running" | "done" | "error";
            progress: string[];
            log?: PlusGenerationLog;
            error?: string;
          }>("/plus/status");
          setProgress(st.progress ?? []);
          if (st.status === "done") {
            if (st.log) setLastLog(st.log);
            setTriggering(false);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            // 轮询正常结束，清除超时定时器
            clearTimeout(pollTimeoutRef.current);
            // Refresh logs.
            const lg = await apiGet<{ logs: PlusGenerationLog[] }>("/plus/logs");
            setLogs(lg.logs ?? []);
          } else if (st.status === "error") {
            setProgress((prev) => [...prev, `错误: ${st.error ?? "未知错误"}`]);
            setTriggering(false);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            // 轮询正常结束，清除超时定时器
            clearTimeout(pollTimeoutRef.current);
          }
        } catch {
          // Polling error — keep trying.
        }
      }, 2000);
      // 启动 120 秒超时上限，防止永久轮询
      pollTimeoutRef.current = setTimeout(() => {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setTriggering(false);
        setProgress(prev => [...prev, "轮询超时，请检查后端状态"]);
      }, 120_000);
    } catch (e) {
      setProgress((prev) => [...prev, `请求失败: ${e instanceof Error ? e.message : String(e)}`]);
      setTriggering(false);
    }
  };

  if (loading) return <div className="text-sm text-[#787878]">加载 Plus 模块…</div>;

  return (
    <div className="mt-7 space-y-4">
      {/* Storage mode selector (WebDAV or Local) */}
      <StorageModeSelector onConfigChange={() => void load()} />

      {/* Plus module configuration */}
      <div
        className={`rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A] ${
          !storageConfigured ? "opacity-50" : ""
        }`}
      >
        <h2 className="text-lg font-light text-[#C9A86C]">Plus 模块（每日自动生成角色）</h2>
        <p className="mt-1 text-sm text-[#787878]">
          每天定时调用 LLM 生成角色设定 + 图片代理生成头像，静默保存到 WebDAV 与本地角色库
        </p>

        {!storageConfigured && (
          <p className="mt-3 rounded-[7px] bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
            请先配置并测试 WebDAV 连接，才能启用 Plus 模块。
          </p>
        )}

        {plus && (
          <div className={`mt-4 space-y-3 ${!storageConfigured ? "pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plus.enabled}
                onChange={(e) => setPlus({ ...plus, enabled: e.target.checked })}
                className="h-4 w-4 rounded"
                disabled={!storageConfigured}
              />
              <span className="text-sm text-[#E8E8E8]">启用每日自动生成（静默运行）</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="每日生成数量"
                value={plus.dailyCount}
                onChange={(v) => setPlus({ ...plus, dailyCount: v })}
              />
              <TextInput
                label="定时时间 (HH:MM)"
                value={plus.scheduleTime}
                onChange={(v) => setPlus({ ...plus, scheduleTime: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DropdownInput
                label="题材方向"
                value={plus.theme}
                onChange={(v) => setPlus({ ...plus, theme: v })}
                options={THEMES}
                placeholder="选择或输入题材…"
              />
              <SelectField
                label="图片尺寸"
                value={plus.aspectRatio}
                onChange={(v) => setPlus({ ...plus, aspectRatio: v })}
                options={ASPECT_RATIOS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[#787878]">MJ 模式</label>
                <select
                  value={plus.botType}
                  onChange={(e) => {
                    const newBotType = e.target.value as PlusConfigData["botType"];
                    const newStyles = stylesForBotType(newBotType);
                    // Reset style to the first option of the new mode.
                    setPlus({ ...plus, botType: newBotType, style: newStyles[0] });
                  }}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] outline-none focus:border-[#C9A86C]"
                >
                  <option value="MID_JOURNEY">写实</option>
                  <option value="NIJI_JOURNEY">动漫</option>
                </select>
              </div>
              <DropdownInput
                key={`style-${plus.botType}`}
                label={`视觉风格（${plus.botType === "NIJI_JOURNEY" ? "动漫" : "写实"}）`}
                value={plus.style}
                onChange={(v) => setPlus({ ...plus, style: v })}
                options={stylesForBotType(plus.botType)}
                placeholder="选择或输入风格…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="MJ 版本"
                value={plus.mjVersion}
                onChange={(v) => setPlus({ ...plus, mjVersion: v })}
                options={MJ_VERSIONS}
              />
              <SelectField
                label="角色语言"
                value={plus.language}
                onChange={(v) => setPlus({ ...plus, language: v })}
                options={["zh", "en"]}
              />
            </div>

            <div className="rounded-md border border-[#C9A86C]/15 bg-[#C9A86C]/[0.03] p-3 text-xs text-[#C9A86C]/70">
              角色卡生成后存放在全局四选一槽，确认选中后再移动到目标项目。
            </div>

            <TextInput
              label="额外 MJ 提示词（可选）"
              value={plus.extraPrompt}
              onChange={(v) => setPlus({ ...plus, extraPrompt: v })}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#787878]">配置自动保存</span>
              {plusSaved && <span className="text-sm text-green-600">已自动保存 ✓</span>}
            </div>

            {plusError && (
              <p className="rounded-[7px] bg-[rgba(201,104,90,0.08)] p-2 text-sm text-[#C9685A]">{plusError}</p>
            )}

            {/* Manual trigger */}
            <div className="mt-4 border-t border-[#1A1A1A] pt-4">
              <div className="flex items-center gap-2">
                <button onClick={handleTrigger} disabled={triggering || !storageConfigured} className={BTN.ghost}>
                  {triggering ? "生成中…" : "立即生成一次（测试）"}
                </button>
                <span className="text-xs text-[#787878]">手动触发完整流程，用于验证配置</span>
              </div>

              {progress.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-[7px] bg-[#0F0F0F] p-3 text-xs text-[#E8E8E8]">
                  {progress.map((p, i) => (
                    <div key={i}>{p}</div>
                  ))}
                </div>
              )}

              {lastLog && (
                <div className="mt-3 rounded-[7px] bg-[#0F0F0F] p-3 text-sm">
                  <div className="font-medium text-[#C9A86C]">本次结果</div>
                  {lastLog.error && <p className="mt-1 text-[#C9685A]">{lastLog.error}</p>}
                  {(lastLog.items ?? []).map((it, i) => (
                    <div key={i} className="mt-1 text-xs">
                      {it.ok ? (
                        <span className="text-green-600">
                          ✓ {it.name} — {it.filename}
                        </span>
                      ) : (
                        <span className="text-[#C9685A]">✗ {it.name} — {it.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Run history */}
      {logs.length > 0 && (
        <div className="rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A]">
          <h2 className="text-lg font-light text-[#C9A86C]">运行历史</h2>
          <div className="mt-3 space-y-2">
            {[...logs].reverse().slice(0, 10).map((l, i) => (
              <div key={i} className="rounded-[7px] bg-[#0F0F0F] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#E8E8E8]">
                    {new Date(l.timestamp).toLocaleString("zh-CN")} ·{" "}
                    <span className={l.trigger === "schedule" ? "text-[#C9A86C]" : "text-blue-400"}>
                      {l.trigger === "schedule" ? "定时" : "手动"}
                    </span>
                  </span>
                  <span>
                    {(l.items ?? []).filter((it) => it.ok).length}/{(l.items ?? []).length} 成功
                  </span>
                </div>
                {l.error && <p className="mt-1 text-[#C9685A]">{l.error}</p>}
                <div className="mt-1 text-[#787878]">
                  {(l.items ?? []).map((it) => (it.ok ? it.name : `${it.name}(失败)`)).join("、") || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

