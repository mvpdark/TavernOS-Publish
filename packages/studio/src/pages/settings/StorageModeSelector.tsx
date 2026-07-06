// Storage mode selector — a toggle card UI for choosing between
// WebDAV (remote) and Local (filesystem) storage backends.
// WebDAV config auto-saves on field change (debounced 600ms).

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { apiGet, apiPut, apiPost } from "../../api/client.js";
import { BTN, TextInput } from "../../components/ui.tsx";

interface StorageConfig {
  mode: "webdav" | "local";
  webdav: {
    url: string;
    username: string;
    password: string;
    basePath: string;
    configured: boolean;
  };
  local: {
    path: string;
    configured: boolean;
  };
}

interface DriveList {
  drives: string[];
}

interface StorageModeSelectorProps {
  /** Called when storage config changes (mode switch, save, test). */
  onConfigChange?: () => void;
}

export default function StorageModeSelector({ onConfigChange }: StorageModeSelectorProps): JSX.Element {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // WebDAV form state
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUser, setWebdavUser] = useState("");
  const [webdavPass, setWebdavPass] = useState("");
  const [webdavBasePath, setWebdavBasePath] = useState("/TavernOS");
  const [testingWebdav, setTestingWebdav] = useState(false);
  const [webdavMsg, setWebdavMsg] = useState<string | null>(null);
  const [webdavSaved, setWebdavSaved] = useState(false);

  // Local storage state
  const [localPath, setLocalPath] = useState("");
  const [drives, setDrives] = useState<string[]>([]);
  const [savingLocal, setSavingLocal] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [createdFolders, setCreatedFolders] = useState<string[] | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // --- Auto-save refs ---
  const loadedRef = useRef(false);
  const webdavSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webdavSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (): Promise<void> => {
    try {
      const d = await apiGet<StorageConfig>("/storage/config");
      setConfig(d);
      setWebdavUrl(d.webdav.url);
      setWebdavUser(d.webdav.username);
      setWebdavPass(d.webdav.password);
      setWebdavBasePath(d.webdav.basePath || "/TavernOS");
      setLocalPath(d.local.path);
      // Load drive list
      try {
        const dl = await apiGet<DriveList>("/storage/local/browse");
        setDrives(dl.drives);
      } catch {
        // Non-Windows or error — drives list not critical
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  };

  useEffect(() => {
    void load();
    return () => {
      if (webdavSaveTimer.current) clearTimeout(webdavSaveTimer.current);
      if (webdavSavedTimer.current) clearTimeout(webdavSavedTimer.current);
    };
  }, []);

  // --- WebDAV auto-save (debounced 600ms after last keystroke) ---
  useEffect(() => {
    if (!loadedRef.current) return;
    // Skip if all fields empty (avoids saving blank initial state)
    if (!webdavUrl && !webdavUser && !webdavPass) return;

    if (webdavSaveTimer.current) clearTimeout(webdavSaveTimer.current);
    webdavSaveTimer.current = setTimeout(async () => {
      try {
        await apiPut("/webdav/config", {
          url: webdavUrl,
          username: webdavUser,
          password: webdavPass,
          basePath: webdavBasePath,
        });
        setWebdavSaved(true);
        if (webdavSavedTimer.current) clearTimeout(webdavSavedTimer.current);
        webdavSavedTimer.current = setTimeout(() => setWebdavSaved(false), 1500);
        onConfigChange?.();
      } catch (e) {
        setWebdavMsg(`自动保存失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    }, 600);

    return () => {
      if (webdavSaveTimer.current) clearTimeout(webdavSaveTimer.current);
    };
  }, [webdavUrl, webdavUser, webdavPass, webdavBasePath]);

  const handleSwitchMode = async (mode: "webdav" | "local"): Promise<void> => {
    if (switching || !config || config.mode === mode) return;
    setSwitching(true);
    try {
      await apiPut("/storage/mode", { mode });
      setConfig({ ...config, mode });
      onConfigChange?.();
    } catch (e) {
      setLocalMsg(`切换失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSwitching(false);
    }
  };

  const handleTestWebdav = async (): Promise<void> => {
    if (testingWebdav) return;
    setTestingWebdav(true);
    setWebdavMsg(null);
    try {
      // Save current fields before testing
      await apiPut("/webdav/config", {
        url: webdavUrl,
        username: webdavUser,
        password: webdavPass,
        basePath: webdavBasePath,
      });
      const r = await apiPost<{ ok: boolean; message?: string; error?: string }>("/webdav/test", {
        url: webdavUrl,
        username: webdavUser,
        password: webdavPass,
        basePath: webdavBasePath,
      });
      if (r.ok) {
        setWebdavMsg(`✓ ${r.message || "连接成功"}`);
        await load();
        onConfigChange?.();
      } else {
        setWebdavMsg(`✗ ${r.error || r.message || "连接失败"}`);
      }
    } catch (e) {
      setWebdavMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestingWebdav(false);
    }
  };

  const handleSaveLocal = async (): Promise<void> => {
    if (savingLocal) return;
    setSavingLocal(true);
    setLocalMsg(null);
    setCreatedFolders(null);
    try {
      const r = await apiPut<{ success: boolean; path: string; folders: string[]; test: { ok: boolean; message: string } }>(
        "/storage/local",
        { path: localPath },
      );
      if (r.success) {
        setLocalMsg(`✓ ${r.test.message}`);
        setCreatedFolders(r.folders);
        await load();
        onConfigChange?.();
      } else {
        setLocalMsg("✗ 保存失败");
      }
    } catch (e) {
      setLocalMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingLocal(false);
    }
  };

  const handleTestLocal = async (): Promise<void> => {
    if (testingLocal) return;
    setTestingLocal(true);
    setLocalMsg(null);
    try {
      const r = await apiPost<{ ok: boolean; message: string }>("/storage/local/test", { path: localPath });
      setLocalMsg(r.ok ? `✓ ${r.message}` : `✗ ${r.message}`);
    } catch (e) {
      setLocalMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestingLocal(false);
    }
  };

  const handleSyncAll = async (): Promise<void> => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await apiPost<{ results: Array<{ project: string; uploaded?: number; error?: string }> }>("/sync/all", {});
      const results = r.results ?? [];
      const totalUploaded = results.reduce((s, r) => s + (r.uploaded ?? 0), 0);
      const errors = results.filter((r) => r.error);
      setSyncMsg(
        errors.length > 0
          ? `同步 ${totalUploaded} 个文件，${errors.length} 个错误：${errors.slice(0, 3).map((e) => e.error).join("；")}`
          : `✓ 已全量同步 ${totalUploaded} 个文件到存储`,
      );
    } catch (e) {
      setSyncMsg(`✗ 同步失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[14px] bg-[#141414] p-8 shadow-md border border-[#1A1A1A]">
        <p className="text-sm text-[#787878]">加载存储配置中…</p>
      </div>
    );
  }

  const mode = config?.mode ?? "webdav";
  const webdavConfigured = config?.webdav.configured ?? false;
  const localConfigured = config?.local.configured ?? false;

  return (
    <div className="rounded-[14px] bg-[#141414] p-8 shadow-md border border-[#1A1A1A]">
      <h2 className="text-lg font-light text-[#C9A86C]">存储设置</h2>
      <p className="mt-1 text-sm text-[#787878]">选择存储模式：本地磁盘 或 WebDAV（二选一）</p>

      {/* Mode toggle cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Local storage card */}
        <button
          onClick={() => handleSwitchMode("local")}
          disabled={switching}
          className={`rounded-xl border p-4 text-left transition-all ${
            mode === "local"
              ? "border-[#C9A86C] bg-[rgba(201,168,108,0.08)]"
              : "border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#3A3A3A]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#E8E8E8]">本地磁盘</span>
            {mode === "local" && (
              <span className="rounded-full bg-[#C9A86C] px-2 py-0.5 text-xs text-[#0F0F0F]">当前</span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#787878]">直接读写本地文件夹，速度快，无需网络</p>
          {localConfigured && mode !== "local" && (
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">已配置</span>
          )}
        </button>

        {/* WebDAV card */}
        <button
          onClick={() => handleSwitchMode("webdav")}
          disabled={switching}
          className={`rounded-xl border p-4 text-left transition-all ${
            mode === "webdav"
              ? "border-[#C9A86C] bg-[rgba(201,168,108,0.08)]"
              : "border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#3A3A3A]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#E8E8E8]">WebDAV</span>
            {mode === "webdav" && (
              <span className="rounded-full bg-[#C9A86C] px-2 py-0.5 text-xs text-[#0F0F0F]">当前</span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#787878]">远程 WebDAV 服务器，支持多端同步</p>
          {webdavConfigured && mode !== "webdav" && (
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">已配置</span>
          )}
        </button>
      </div>

      {/* === Local storage panel === */}
      {mode === "local" && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#787878]">存储路径（将在此路径下创建 TavernOS 文件夹）</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="例如: D:\TavernOS 或 /data/TavernOS"
                className="flex-1 rounded-lg bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] outline-none ring-1 ring-[#2A2A2A] focus:ring-[#C9A86C]"
              />
              <button onClick={handleSaveLocal} disabled={savingLocal || !localPath} className={BTN.primary}>
                {savingLocal ? "创建中…" : "选择并创建"}
              </button>
            </div>
          </div>

          {/* Drive quick-select */}
          {drives.length > 0 && !localPath && (
            <div>
              <label className="mb-1 block text-xs text-[#787878]">可用磁盘（点击选择）</label>
              <div className="flex flex-wrap gap-2">
                {drives.map((d) => (
                  <button
                    key={d}
                    onClick={() => setLocalPath(`${d}TavernOS`)}
                    className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-sm text-[#E8E8E8] transition-colors hover:border-[#C9A86C] hover:text-[#C9A86C]"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={handleTestLocal} disabled={testingLocal || !localPath} className={BTN.ghost}>
              {testingLocal ? "测试中…" : "测试写入"}
            </button>
          </div>

          {localMsg && (
            <p
              className={`rounded-lg p-2 text-sm ${
                localMsg.startsWith("✓") ? "bg-green-50 text-green-600" : "bg-[rgba(201,104,90,0.08)] text-[#C9685A]"
              }`}
            >
              {localMsg}
            </p>
          )}

          {createdFolders && createdFolders.length > 0 && (
            <div className="rounded-[7px] bg-[#0F0F0F] p-3 text-xs text-[#787878]">
              <div className="text-[#C9A86C]">已创建文件夹结构</div>
              <pre className="mt-1 whitespace-pre-wrap font-mono">{`TavernOS/
├── Novels/          小说数据
├── Characters/      全局角色库
└── ConfirmedSlots/
    ├── three-views/ 三视图
    ├── realistic/    写实角色
    └── anime/        动漫角色`}</pre>
            </div>
          )}

          {/* Sync button (same as WebDAV mode) */}
          {localConfigured && (
            <div className="flex items-center gap-2">
              <button onClick={handleSyncAll} disabled={syncing} className={BTN.ghost}>
                {syncing ? "同步中…" : "全量同步所有项目"}
              </button>
              <span className="text-xs text-[#555555]">将本地数据镜像到存储路径</span>
            </div>
          )}
        </div>
      )}

      {/* === WebDAV panel === */}
      {mode === "webdav" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#787878]">配置自动保存</span>
            {webdavSaved && (
              <span className="text-xs text-green-600">已自动保存 ✓</span>
            )}
          </div>
          <TextInput label="WebDAV 地址" value={webdavUrl} onChange={setWebdavUrl} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="用户名" value={webdavUser} onChange={setWebdavUser} />
            <TextInput label="密码 / 应用密码" value={webdavPass} onChange={setWebdavPass} />
          </div>
          <TextInput label="目标文件夹路径" value={webdavBasePath} onChange={setWebdavBasePath} />

          <div className="flex items-center gap-2">
            <button onClick={handleTestWebdav} disabled={testingWebdav} className={BTN.ghost}>
              {testingWebdav ? "测试中…" : "测试连接"}
            </button>
            {webdavConfigured && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">已配置</span>
            )}
          </div>

          {webdavMsg && (
            <p
              className={`rounded-lg p-2 text-sm ${
                webdavMsg.startsWith("✓") ? "bg-green-50 text-green-600" : "bg-[rgba(201,104,90,0.08)] text-[#C9685A]"
              }`}
            >
              {webdavMsg}
            </p>
          )}

          {webdavConfigured && (
            <div className="rounded-[7px] bg-[#0F0F0F] p-3 text-xs leading-relaxed text-[#787878]">
              <div className="text-[#C9A86C]">目录结构</div>
              <pre className="mt-1 whitespace-pre-wrap font-mono">{`TavernOS/
├── Novels/{小说名}/
│   ├── Chapters/   章节内容
│   ├── Characters/ 该小说的人物
│   ├── Scenes/     场景分镜
│   └── Props/      道具/世界书
└── Characters/     全局人物库`}</pre>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={handleSyncAll} disabled={syncing} className={BTN.ghost}>
                  {syncing ? "同步中…" : "全量同步所有项目"}
                </button>
                <span className="text-[#555555]">补传已有数据</span>
              </div>
              {syncMsg && (
                <p
                  className={`mt-2 rounded p-2 text-sm ${
                    syncMsg.startsWith("✓") ? "bg-green-50 text-green-600" : "bg-[rgba(201,104,90,0.08)] text-[#C9685A]"
                  }`}
                >
                  {syncMsg}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
