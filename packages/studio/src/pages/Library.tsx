import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/project.js";
import { useTaskStore } from "../store/tasks.js";
import { apiGet, apiDelete, apiPost } from "../api/client.js";
import { Modal, ConfirmDialog, SelectField, BTN } from "../components/ui.tsx";
import { coverColor } from "../lib/theme.js";
import { EmptyState } from "../components/EmptyState.js";
import type { JSX, MouseEvent, ChangeEvent } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
  version?: string;
  language?: string;
  type?: "long" | "short";
  genre?: string;
  coverUrl?: string;
  createdAt?: string;
  blueprint?: {
    premise?: string;
    protagonist?: string;
    sellingPoints?: string;
  };
}

interface ProjectStats {
  characters: number;
  loreEntries: number;
  chapters: number;
  totalWords: number;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatWords(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万字`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}千字`;
  return `${n}字`;
}

// ---------------------------------------------------------------------------
// Novel card component
// ---------------------------------------------------------------------------

function NovelCard({
  project,
  stats,
  onOpen,
  onDelete,
  onGenerateCover,
  generatingCover,
  onContextMenu,
}: {
  project: Project;
  stats: ProjectStats | null;
  onOpen: () => void;
  onDelete: () => void;
  onGenerateCover: () => void;
  generatingCover: boolean;
  onContextMenu: (e: MouseEvent) => void;
}): JSX.Element {
  const colors = coverColor(project.name);

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
      style={{ width: 120 }}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
    >
      <div className="relative h-44 bg-[#0A0A0A]">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${colors.bg}`}>
            {generatingCover && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-xs text-[#C9A86C] animate-pulse">生成封面中…</span>
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        {/* 类型标记 */}
        <span
          className="absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[9px] backdrop-blur-sm"
          style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
        >
          {project.type === "short" ? "短篇" : "长篇"}
        </span>
        {project.genre && (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/30 px-1 py-0.5 text-[9px] text-white/70 backdrop-blur-sm">
            {project.genre}
          </span>
        )}
        {/* 底部信息 */}
        <div className="absolute bottom-1.5 left-0 right-0 px-1.5 text-center">
          <p className="truncate text-sm font-medium text-[#C9A86C]">{project.name}</p>
          <div className="flex items-center justify-center gap-1 text-[9px] text-gray-500">
            <span>{stats?.chapters ?? 0}章</span>
            <span>·</span>
            <span>{stats ? formatWords(stats.totalWords) : "—"}</span>
          </div>
        </div>
      </div>
      {/* hover 操作按钮 */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/80 to-transparent pb-1 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="btn-press rounded bg-[rgba(201,168,108,0.2)] px-1.5 py-0.5 text-[9px] text-[#C9A86C] hover:bg-[rgba(201,168,108,0.3)]"
        >
          创作
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGenerateCover(); }}
          disabled={generatingCover}
          className="btn-press rounded bg-[#1C1C1E]/80 px-1.5 py-0.5 text-[9px] text-gray-300 hover:bg-[#2A2A2A] disabled:opacity-50"
        >
          封面
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn-press rounded bg-[rgba(201,104,90,0.15)] px-1.5 py-0.5 text-[9px] text-[#C9685A] hover:bg-[rgba(201,104,90,0.25)]"
        >
          删
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Library page
// ---------------------------------------------------------------------------

export default function Library(): JSX.Element {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("zh");
  const [projectType, setProjectType] = useState<"long" | "short">("long");
  const [genre, setGenre] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStats>>({});
  const [generatingCover, setGeneratingCover] = useState<string | null>(null);

  // Upload novel state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    project: Project;
    x: number;
    y: number;
  } | null>(null);

  // Extract assets state
  const [extractingAssets, setExtractingAssets] = useState<string | null>(null);

  // Success message (transient toast)
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Watch for completed cover generation tasks.
  const taskTasks = useTaskStore((s) => s.tasks);
  const lastCoverRefreshRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastCoverRefreshRef.current < 3000) return;
    const completed = taskTasks.filter(
      (t) =>
        t.type === "generate-cover" &&
        (t.status === "completed" || t.status === "failed") &&
        now - t.updatedAt < 5000,
    );
    if (completed.length === 0) return;
    lastCoverRefreshRef.current = now;
    void fetchProjects();
    setGeneratingCover(null);
  }, [taskTasks, fetchProjects]);

  // 生成小说封面
  const handleGenerateCover = async (projectId: string): Promise<void> => {
    setGeneratingCover(projectId);
    try {
      // API now returns { taskId, status: "running" } — runs in background.
      await apiPost<{ taskId: string; status: string }>(`/projects/${projectId}/generate-cover`, {});
      // Don't wait — task store + useEffect will auto-refresh.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGeneratingCover(null);
    }
  };

  // --- 上传小说 ---

  // 文件选择 → 读取内容 → 打开上传 Modal
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Apply the decoded content to upload state and open the upload modal.
    const applyContent = (content: string): void => {
      setUploadContent(content);
      setUploadFileName(file.name);
      // Default novel name: file name without extension
      const baseName = file.name.replace(/\.(txt|md)$/i, "");
      setName(baseName);
      setUploadModalOpen(true);
    };
    // Read as UTF-8 first; if the result contains a high density of
    // replacement characters (\uFFFD) the file is likely GBK/GB2312-encoded
    // (common for Chinese .txt files exported from Windows). Re-read with
    // 'gbk' so the content is decoded correctly instead of showing ���.
    const reader = new FileReader();
    reader.onload = () => {
      const utf8Content = String(reader.result ?? "");
      const replacementCount = (utf8Content.match(/\uFFFD/g) ?? []).length;
      if (replacementCount > 0 && replacementCount > utf8Content.length * 0.01) {
        const gbkReader = new FileReader();
        gbkReader.onload = () => applyContent(String(gbkReader.result ?? ""));
        gbkReader.onerror = () => applyContent(utf8Content);
        gbkReader.readAsText(file, "gbk");
      } else {
        applyContent(utf8Content);
      }
    };
    reader.onerror = () => {
      setError("读取文件失败");
    };
    reader.readAsText(file, "UTF-8");
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  // 确认上传 → POST /api/projects/upload
  const handleUpload = async (): Promise<void> => {
    if (!name.trim() || !uploadContent.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await apiPost<{ id: string }>("/projects/upload", {
        name: name.trim(),
        content: uploadContent,
        language,
        type: projectType,
        genre: genre || undefined,
      });
      setUploadModalOpen(false);
      setUploadContent("");
      setUploadFileName("");
      setName("");
      setLanguage("zh");
      setProjectType("long");
      setGenre("");
      setSuccessMsg("小说上传成功");
      await fetchProjects();
      // Auto-clear success message after 3s
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  // --- 右键上下文菜单 ---

  const handleContextMenu = (e: MouseEvent, project: Project): void => {
    setContextMenu({ project, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = (): void => setContextMenu(null);

  // 点击任意位置关闭菜单
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (): void => closeContextMenu();
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu]);

  // --- 提取资产 ---

  const handleExtractAssets = async (projectId: string): Promise<void> => {
    setExtractingAssets(projectId);
    setError(null);
    try {
      const result = await apiPost<{
        characters: number;
        scenes: number;
        props: number;
        syncedCards: number;
      }>(`/projects/${projectId}/extract-assets`, {});
      setSuccessMsg(
        `资产提取完成：${result.characters} 个角色、${result.scenes} 个场景、${result.props} 个道具${
          result.syncedCards > 0 ? `（同步 ${result.syncedCards} 张角色卡）` : ""
        }`,
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtractingAssets(null);
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // Fetch stats for all projects in parallel
  const fetchAllStats = useCallback(async () => {
    const entries = await Promise.all(
      projects.map(async (p) => {
        try {
          const stats = await apiGet<ProjectStats>(`/projects/${p.id}/stats`);
          return [p.id, stats] as const;
        } catch {
          return [p.id, null] as const;
        }
      }),
    );
    const filtered = entries.filter(([, v]) => v !== null) as Array<[string, ProjectStats]>;
    setStatsMap(Object.fromEntries(filtered));
  }, [projects]);

  useEffect(() => {
    if (projects.length > 0) void fetchAllStats();
  }, [projects, fetchAllStats]);

  const openProject = (p: Project): void => {
    setCurrentProject(p);
    // Has chapters → go to interactive writing; new project → go to blueprint
    const stats = statsMap[p.id];
    if (stats && stats.chapters > 0) {
      navigate("/write/create");
    } else {
      navigate("/write/blueprint");
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) return;
    try {
      const project = await createProject(name.trim(), language, projectType, genre || undefined);
      setModalOpen(false);
      setName("");
      setLanguage("zh");
      setProjectType("long");
      setGenre("");
      navigate("/write/blueprint");
      // 异步生成封面，不阻塞导航
      if (project?.id) {
        void apiPost(`/projects/${project.id}/generate-cover`, {}).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirmDelete) return;
    try {
      await apiDelete(`/projects/${confirmDelete.id}`);
      setConfirmDelete(null);
      await fetchProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light">创作库</h1>
          <p className="mt-1 text-sm text-gray-500">
            {projects.length > 0
              ? `共 ${projects.length} 部作品`
              : "开启你的第一部作品"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={BTN.ghost}
          >
            上传小说
          </button>
          <button onClick={() => setModalOpen(true)} className={BTN.primary}>
            新建小说
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
          {error}
        </p>
      )}

      {successMsg && (
        <p className="mt-4 rounded-lg bg-[rgba(201,168,108,0.08)] p-3 text-sm text-[#C9A86C]">
          {successMsg}
        </p>
      )}

      {/* Project grid */}
      {projects.length === 0 ? (
        <EmptyState
          icon="book"
          title="暂无作品"
          description='点击"新建小说"开始你的创作之旅'
          className="mt-8"
        />
      ) : (
        <div className="mt-6 flex flex-wrap gap-4">
          {projects.map((p) => (
            <NovelCard
              key={p.id}
              project={p}
              stats={statsMap[p.id] ?? null}
              onOpen={() => openProject(p)}
              onDelete={() => setConfirmDelete(p)}
              onGenerateCover={() => void handleGenerateCover(p.id)}
              generatingCover={generatingCover === p.id}
              onContextMenu={(e) => handleContextMenu(e, p)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {modalOpen && (
        <Modal
          title="新建小说"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className={BTN.ghost}>
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className={BTN.primary}
              >
                创建
              </button>
            </>
          }
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E8E8E8]">
              小说名称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的小说标题"
              className="w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
          </div>
          <SelectField
            label="语言"
            value={language}
            onChange={setLanguage}
            options={["zh", "en", "ja"]}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E8E8E8]">
              作品类型
            </label>
            <select
              value={projectType}
              onChange={(e) =>
                setProjectType(e.target.value as "long" | "short")
              }
              className="w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm"
            >
              <option value="long">长篇小说</option>
              <option value="short">短篇小说</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E8E8E8]">
              题材（可选）
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm"
            >
              <option value="">请选择（可选）</option>
              <option value="奇幻">奇幻</option>
              <option value="科幻">科幻</option>
              <option value="悬疑">悬疑</option>
              <option value="言情">言情</option>
              <option value="武侠">武侠</option>
              <option value="历史">历史</option>
              <option value="都市">都市</option>
            </select>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`确认删除"${confirmDelete.name}"？所有章节、角色和世界观数据将被永久删除。`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Upload modal */}
      {uploadModalOpen && (
        <Modal
          title="上传小说"
          onClose={() => {
            setUploadModalOpen(false);
            setUploadContent("");
            setUploadFileName("");
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadContent("");
                  setUploadFileName("");
                }}
                className={BTN.ghost}
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={!name.trim() || uploading}
                className={BTN.primary}
              >
                {uploading ? "上传中…" : "上传"}
              </button>
            </>
          }
        >
          {/* File info */}
          <div className="rounded-lg bg-[#1A1A1A] p-3">
            <p className="text-xs text-gray-400">已选择文件</p>
            <p className="mt-1 truncate text-sm text-[#C9A86C]">{uploadFileName}</p>
            <p className="mt-1 text-xs text-gray-500">
              {uploadContent.length > 10000
                ? `${(uploadContent.length / 10000).toFixed(1)} 万字`
                : `${uploadContent.length} 字`}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E8E8E8]">
              小说名称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的小说标题"
              className="w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <SelectField
            label="语言"
            value={language}
            onChange={setLanguage}
            options={["zh", "en", "ja"]}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E8E8E8]">
              作品类型
            </label>
            <select
              value={projectType}
              onChange={(e) =>
                setProjectType(e.target.value as "long" | "short")
              }
              className="w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm"
            >
              <option value="long">长篇小说</option>
              <option value="short">短篇小说</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E8E8E8]">
              题材（可选）
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm"
            >
              <option value="">请选择（可选）</option>
              <option value="奇幻">奇幻</option>
              <option value="科幻">科幻</option>
              <option value="悬疑">悬疑</option>
              <option value="言情">言情</option>
              <option value="武侠">武侠</option>
              <option value="历史">历史</option>
              <option value="都市">都市</option>
            </select>
          </div>
        </Modal>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] py-1 shadow-2xl"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleGenerateCover(contextMenu.project.id);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1A]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            生成封面
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleExtractAssets(contextMenu.project.id);
              closeContextMenu();
            }}
            disabled={extractingAssets === contextMenu.project.id}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#E8E8E8] hover:bg-[#1A1A1A] disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            {extractingAssets === contextMenu.project.id ? "提取中…" : "提取资产"}
          </button>
          <div className="my-1 border-t border-[#1A1A1A]" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(contextMenu.project);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#C9685A] hover:bg-[#1A1A1A]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6V20C19 20.6 18.6 21 18 21H6C5.4 21 5 20.6 5 20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            删除
          </button>
        </div>
      )}

      {/* Extracting assets overlay indicator */}
      {extractingAssets && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-4 py-3 shadow-2xl">
          <span className="text-sm text-[#C9A86C] animate-pulse">正在提取资产…</span>
        </div>
      )}
    </div>
  );
}
