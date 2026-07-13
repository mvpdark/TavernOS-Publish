import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiPost, apiPut, apiDelete, proxyImageUrl, BASE_URL } from "../api/client.js";
import { Modal, ConfirmDialog, TextInput, TextArea, SelectField, BTN } from "../components/ui.tsx";
import {
  IconPlus,
  IconUpload,
  IconDownload,
  IconTrash2,
  IconSave,
  IconRefresh,
  IconImage,
  IconSparkles,
  IconMessageSquare,
  IconUndo,
  IconRedo,
  IconHistory,
  IconX,
  IconMenu,
  IconFileText,
} from "../components/Icons.js";
import type { JSX } from "react";

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ChaptersResponse {
  chapters: Chapter[];
}

interface Annotation {
  text: string;
  comment: string;
  severity: "info" | "warning" | "suggestion";
}

interface VersionSnapshot {
  content: string;
  timestamp: number;
  label: string;
}

export default function Editor(): JSX.Element {
  const navigate = useNavigate();
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Chapter | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [illustration, setIllustration] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"txt" | "markdown">("txt");
  const [importing, setImporting] = useState(false);

  // Export dropdown state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // AI assist states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string>("");
  const [selection, setSelection] = useState<string>("");
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);

  // Version history (undo/redo)
  const [history, setHistory] = useState<VersionSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoRedo = useRef(false);
  // Mirror historyIndex in a ref so setTimeout closures always read the
  // latest value instead of a stale capture from the render scope.
  const historyIndexRef = useRef(-1);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController for the chapter list refresh triggered after an import.
  // Stored in a ref so it can be aborted on unmount, preventing the
  // fetchChapters response from updating state after the component is gone.
  const importControllerRef = useRef<AbortController | null>(null);
  // Store selection positions for AI rewrite (avoids stale closure issue)
  const selectionRangeRef = useRef<{ start: number; end: number } | null>(null);
  // Refs to hold latest state for debounced save (avoids stale-closure bug)
  const latestRef = useRef({ projectId, activeId, title, content });
  latestRef.current = { projectId, activeId, title, content };

  const fetchChapters = useCallback(async (id: string, signal: AbortSignal) => {
    setLoading(true);
    try {
      const data = await apiGet<ChaptersResponse>(`/projects/${id}/story`, signal);
      if (signal.aborted || latestRef.current.projectId !== id) return;
      const list = data.chapters ?? [];
      setChapters(list);
      if (list.length > 0 && !latestRef.current.activeId) {
        setActiveId(list[0].id);
        setTitle(list[0].title);
        setContent(list[0].content);
      }
    } catch (e) {
      if (signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setChapters([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (historyTimer.current) clearTimeout(historyTimer.current);
    const controller = new AbortController();
    setActiveId(null);
    setTitle("");
    setContent("");
    setDirty(false);
    setError(null);
    setIllustration(null);
    setHistory([]);
    setHistoryIndex(-1);
    setAnnotations([]);
    setShowAnnotations(false);
    setSelection("");
    setSelectionPos(null);
    setRewriteInstruction(null);
    setShowHistory(false);
    setExportMenuOpen(false);
    if (projectId) {
      void fetchChapters(projectId, controller.signal);
    } else {
      setChapters([]);
    }
    return () => {
      controller.abort();
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectChapter = (ch: Chapter): void => {
    if (dirty && !confirm("当前章节未保存，是否切换？")) return;
    // Flush any pending debounced save so the current chapter's edits are
    // not lost when switching chapters. Without this, the saveTimer would
    // fire after latestRef has been updated to the new chapter, saving the
    // new chapter's content over the old chapter's unsaved edits (or just
    // silently dropping them).
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (dirty) void save();
    }
    if (historyTimer.current) clearTimeout(historyTimer.current);
    setActiveId(ch.id);
    setTitle(ch.title);
    setContent(ch.content);
    setDirty(false);
    setHistory([]);
    setHistoryIndex(-1);
    setAnnotations([]);
    setShowAnnotations(false);
    setSelection("");
    setSelectionPos(null);
    setRewriteInstruction(null);
    setShowHistory(false);
    setSidebarOpen(false);
  };

  const handleContentChange = (v: string): void => {
    setContent(v);
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 3000);

    if (!isUndoRedo.current && historyTimer.current) clearTimeout(historyTimer.current);
    if (!isUndoRedo.current) {
      historyTimer.current = setTimeout(() => {
        setHistory((prev) => {
          // Use functional update to read the latest historyIndex,
          // avoiding stale closure capture from the render scope.
          const truncated = prev.slice(0, historyIndexRef.current + 1);
          const next = [...truncated, { content: v, timestamp: Date.now(), label: `v${truncated.length + 1}` }];
          return next.slice(-30);
        });
        setHistoryIndex((prev) => Math.min(prev + 1, 29));
      }, 2000);
    }
    isUndoRedo.current = false;
  };

  // Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      if (!e.shiftKey && historyIndex > 0) {
        isUndoRedo.current = true;
        const prev = history[historyIndex - 1];
        if (prev) {
          setContent(prev.content);
          setHistoryIndex(historyIndex - 1);
          setDirty(true);
        }
      } else if (e.shiftKey && historyIndex < history.length - 1) {
        isUndoRedo.current = true;
        const next = history[historyIndex + 1];
        if (next) {
          setContent(next.content);
          setHistoryIndex(historyIndex + 1);
          setDirty(true);
        }
      }
    }
  };

  // Track text selection in textarea
  const handleSelect = (): void => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (end - start > 5) {
      const selected = content.slice(start, end);
      setSelection(selected);
      selectionRangeRef.current = { start, end };
      // Position the floating toolbar above the selection using textarea measurements
      const rect = ta.getBoundingClientRect();
      // Approximate position based on selection (simplified)
      const lineHeight = 28; // leading-loose at text-sm
      const charsPerLine = Math.max(40, Math.floor((rect.width - 48) / 14));
      const selectionStartLine = Math.floor(start / charsPerLine);
      setSelectionPos({
        x: rect.left + rect.width / 2,
        y: rect.top + 60 + selectionStartLine * lineHeight,
      });
    } else {
      setSelection("");
      setSelectionPos(null);
      selectionRangeRef.current = null;
    }
  };

  // AI assist: completion, rewrite, annotate
  const callAiAssist = async (action: "complete" | "rewrite" | "annotate", instruction?: string): Promise<void> => {
    if (!projectId || !activeId) return;
    setAiLoading(true);
    setAiAction(action);
    setError(null);
    setShowHistory(false);
    setShowAnnotations(false);
    try {
      const res = await apiPost<{ result: string; annotations?: Annotation[] }>(
        `/projects/${projectId}/story/${activeId}/ai-assist`,
        { action, text: content, selection: selection || undefined, instruction },
      );
      if (action === "complete" && res.result) {
        const newContent = content + "\n\n" + res.result;
        setContent(newContent);
        setDirty(true);
      } else if (action === "rewrite" && res.result) {
        const range = selectionRangeRef.current;
        if (range && selection) {
          setContent((prev) => prev.slice(0, range.start) + res.result + prev.slice(range.end));
          setDirty(true);
        }
        setRewriteInstruction(null);
      } else if (action === "annotate" && res.annotations) {
        setAnnotations(res.annotations);
        setShowAnnotations(true);
      }
    } catch {
      setError("AI处理失败，请稍后重试");
    } finally {
      setAiLoading(false);
      setAiAction("");
      setSelection("");
      setSelectionPos(null);
      selectionRangeRef.current = null;
    }
  };

  const save = async (): Promise<void> => {
    const { projectId: pid, activeId: aid, title: t, content: c } = latestRef.current;
    if (!pid || !aid) return;
    try {
      await apiPut(`/projects/${pid}/story/${aid}`, { title: t, content: c });
      setDirty(false);
      setChapters((prev) => prev.map((ch) => (ch.id === aid ? { ...ch, title: t, content: c } : ch)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (historyTimer.current) clearTimeout(historyTimer.current);
      // Abort any in-flight chapter list refresh from an import so its
      // response doesn't call setState after unmount.
      importControllerRef.current?.abort();
    };
  }, []);

  const handleCreate = async (): Promise<void> => {
    if (!projectId || !newTitle.trim()) return;
    try {
      const ch = await apiPost<Chapter>(`/projects/${projectId}/story`, { title: newTitle.trim() });
      setChapters((prev) => [...prev, ch]);
      setActiveId(ch.id);
      setTitle(ch.title);
      setContent(ch.content);
      setModalOpen(false);
      setNewTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!projectId || !confirmDelete) return;
    try {
      await apiDelete(`/projects/${projectId}/story/${confirmDelete.id}`);
      const remaining = chapters.filter((c) => c.id !== confirmDelete.id);
      setChapters(remaining);
      if (activeId === confirmDelete.id) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
          setTitle(remaining[0].title);
          setContent(remaining[0].content);
        } else {
          setActiveId(null);
        }
      }
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleClearAll = async (): Promise<void> => {
    if (!projectId) return;
    try {
      await apiDelete<{ success: boolean; deleted: number }>(
        `/projects/${projectId}/story`,
      );
      setChapters([]);
      setActiveId(null);
      setTitle("");
      setContent("");
      setConfirmClearAll(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRewrite = (): void => {
    if (!activeId) return;
    const ch = chapters.find((c) => c.id === activeId);
    if (!ch) return;
    navigate(
      `/write/create?rewrite=${encodeURIComponent(ch.id)}&chapter=${encodeURIComponent(ch.order + 1)}`,
    );
  };

  const handleGenerateIllustration = async (): Promise<void> => {
    if (!projectId || !activeId) return;
    setGenerating(true);
    setError(null);
    try {
      const excerpt = content.slice(0, 500);
      const prompt = `小说章节插图：${title}。${excerpt}`;
      const res = await apiPost<{ images: Array<{ url: string }> }>(
        `/projects/${projectId}/images/generate`,
        { prompt, size: "1024x1024", n: 1 },
      );
      if (res.images?.length > 0) {
        setIllustration(res.images[0]!.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: "txt" | "markdown" | "epub"): Promise<void> => {
    if (!projectId) return;
    if (chapters.length === 0) {
      setError("暂无章节，无法导出");
      return;
    }
    setExporting(true);
    setExportMenuOpen(false);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/projects/${projectId}/export/${format}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `导出失败 (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const filenameMatch = cd.match(/filename\*=UTF-8''(.+?)(?:;|$)/) || cd.match(/filename="(.+?)"/);
      const ext = format === "markdown" ? "md" : format;
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]!) : `${currentProject?.name ?? "export"}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (): Promise<void> => {
    if (!projectId || !importText.trim()) return;
    setImporting(true);
    setError(null);
    try {
      await apiPost(`/projects/${projectId}/story/import`, {
        text: importText,
        format: importFormat,
      });
      setImportModalOpen(false);
      setImportText("");
      setImportFormat("txt");
      const controller = new AbortController();
      importControllerRef.current = controller;
      await fetchChapters(projectId, controller.signal);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  // Toolbar button style classes (consistent with Noir Atelier)
  const tbBtn = "btn-press inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40";
  const tbBtnNeutral = `${tbBtn} border-[#222222] text-[#787878] hover:border-[#333333] hover:bg-[#1A1A1A] hover:text-[#C8C8C8]`;
  const tbBtnGold = `${tbBtn} border-[rgba(201,168,108,0.25)] text-[#C9A86C] hover:border-[rgba(201,168,108,0.5)] hover:bg-[rgba(201,168,108,0.06)]`;
  const tbBtnBlue = `${tbBtn} border-[rgba(120,160,200,0.25)] text-[#78A0C8] hover:border-[rgba(120,160,200,0.5)] hover:bg-[rgba(120,160,200,0.06)]`;
  const tbBtnPurple = `${tbBtn} border-[rgba(155,127,194,0.25)] text-[#9B7FC2] hover:border-[rgba(155,127,194,0.5)] hover:bg-[rgba(155,127,194,0.06)]`;
  const tbBtnRed = `${tbBtn} border-[rgba(201,104,90,0.2)] text-[#C9685A] hover:border-[rgba(201,104,90,0.4)] hover:bg-[rgba(201,104,90,0.06)]`;
  const tbBtnPrimary = `${tbBtn} border-[#C9A86C] bg-[#C9A86C] text-[#0A0A0A] font-medium hover:bg-[#D4B884] hover:shadow-[0_0_10px_rgba(201,168,108,0.12)]`;
  const tbDivider = "mx-1 h-5 w-px bg-[#222222]";
  const tbIcon = "h-3.5 w-3.5";

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light tracking-wide text-[#E8E8E8]">编辑器</h1>
        <p className="mt-6 text-sm text-[#555555]">请先在仪表盘选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0A0A0A]">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="btn-press fixed left-2 top-20 z-30 inline-flex items-center gap-1.5 rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#C9A86C] shadow-lg lg:hidden"
      >
        <IconMenu size={14} />
        {sidebarOpen ? "关闭" : "章节"}
      </button>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: chapter list */}
      <div className={`fixed left-0 top-0 z-20 flex h-full w-64 shrink-0 flex-col border-r border-[#1A1A1A] bg-[#0F0F0F] transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar header */}
        <div className="border-b border-[#1A1A1A] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-widest text-[#555555]">Chapters</span>
              <h2 className="mt-0.5 text-sm font-light text-[#E8E8E8]">章节列表</h2>
            </div>
            <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[10px] text-[#888888]">{chapters.length}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setModalOpen(true)}
              className={`${tbBtnPrimary} flex-1 justify-center !px-2 !py-1.5`}
              title="新建章节"
            >
              <IconPlus size={12} />
              新建
            </button>
            <button
              onClick={() => { setImportModalOpen(true); setImportText(""); setImportFormat("txt"); }}
              className={`${tbBtnBlue} !px-2 !py-1.5`}
              title="从文本导入章节"
            >
              <IconUpload size={12} />
            </button>
          </div>
        </div>

        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-4 text-center text-xs text-[#555555]">加载中...</div>
          ) : chapters.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#222222] bg-[#111111]">
                <IconFileText size={20} className="text-[#333333]" />
              </div>
              <p className="text-xs text-[#555555]">暂无章节</p>
              <p className="mt-1 text-[10px] text-[#3A3A3A]">点击上方"新建"开始创作</p>
            </div>
          ) : (
            chapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => selectChapter(ch)}
                className={`group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 ${
                  activeId === ch.id
                    ? "bg-[rgba(201,168,108,0.08)] text-[#E8E8E8]"
                    : "text-[#888888] hover:bg-[#141414] hover:text-[#C8C8C8]"
                }`}
              >
                {/* Active indicator bar */}
                {activeId === ch.id && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#C9A86C]" />
                )}
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-mono ${
                  activeId === ch.id ? "bg-[#C9A86C]/15 text-[#C9A86C]" : "bg-[#1A1A1A] text-[#555555] group-hover:text-[#888888]"
                }`}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{ch.title || "未命名章节"}</span>
              </button>
            ))
          )}
        </div>

        {/* Sidebar footer: danger zone */}
        {chapters.length > 0 && (
          <div className="border-t border-[#1A1A1A] p-3">
            <button
              onClick={() => setConfirmClearAll(true)}
              className={`${tbBtnRed} w-full justify-center !py-1.5`}
            >
              <IconTrash2 size={12} />
              清空全部
            </button>
          </div>
        )}
      </div>

      {/* Main: editor */}
      <div className="flex flex-1 flex-col bg-[#0E0E0E]">
        {error && (
          <div className="flex items-center justify-between border-b border-[rgba(201,104,90,0.2)] bg-[rgba(201,104,90,0.06)] px-6 py-2.5 text-sm text-[#C9685A]">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn-press text-[#C9685A]/60 hover:text-[#C9685A]">
              <IconX size={14} />
            </button>
          </div>
        )}
        {activeId ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1A1A1A] bg-[#0F0F0F] px-4 py-2.5 sm:px-6">
              {/* Title input */}
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-[#E8E8E8] transition-colors placeholder-[#3A3A3A] focus:border-[#222222] focus:bg-[#141414] focus:outline-none"
                placeholder="章节标题"
              />

              <div className={tbDivider} />

              {/* Primary: Save */}
              <button
                onClick={() => void save()}
                disabled={!dirty}
                className={dirty ? tbBtnPrimary : `${tbBtn} border-[#222222] text-[#555555]`}
              >
                <IconSave size={13} className={tbIcon} />
                {dirty ? "保存" : "已保存"}
              </button>

              <div className={tbDivider} />

              {/* Chapter operations */}
              <button
                onClick={() => setConfirmDelete(chapters.find((c) => c.id === activeId) ?? null)}
                className={tbBtnRed}
                title="删除当前章节"
              >
                <IconTrash2 size={13} className={tbIcon} />
              </button>
              <button onClick={handleRewrite} className={tbBtnBlue} title="AI 重写本章">
                <IconRefresh size={13} className={tbIcon} />
                重写
              </button>
              <button
                onClick={() => void handleGenerateIllustration()}
                disabled={generating}
                className={tbBtnGold}
                title="生成章节插图"
              >
                <IconImage size={13} className={tbIcon} />
                {generating ? "生成中..." : "插图"}
              </button>

              <div className={tbDivider} />

              {/* AI tools */}
              <button
                onClick={() => void callAiAssist("complete")}
                disabled={aiLoading || !content.trim()}
                className={tbBtnPurple}
                title="AI续写：在当前内容后追加约200字"
              >
                <IconSparkles size={13} className={tbIcon} />
                {aiAction === "complete" ? "续写中..." : "续写"}
              </button>
              <button
                onClick={() => void callAiAssist("annotate")}
                disabled={aiLoading || !content.trim()}
                className={tbBtnBlue}
                title="AI批注：分析写作质量并给出建议"
              >
                <IconMessageSquare size={13} className={tbIcon} />
                {aiAction === "annotate" ? "分析中..." : "批注"}
              </button>

              <div className={tbDivider} />

              {/* History controls */}
              <button
                onClick={() => {
                  if (historyIndex > 0) {
                    isUndoRedo.current = true;
                    const prev = history[historyIndex - 1];
                    if (prev) { setContent(prev.content); setHistoryIndex(historyIndex - 1); setDirty(true); }
                  }
                }}
                disabled={historyIndex <= 0}
                className={tbBtnNeutral}
                title="撤销 (Ctrl+Z)"
              >
                <IconUndo size={13} className={tbIcon} />
              </button>
              <button
                onClick={() => {
                  if (historyIndex < history.length - 1) {
                    isUndoRedo.current = true;
                    const next = history[historyIndex + 1];
                    if (next) { setContent(next.content); setHistoryIndex(historyIndex + 1); setDirty(true); }
                  }
                }}
                disabled={historyIndex >= history.length - 1}
                className={tbBtnNeutral}
                title="重做 (Ctrl+Shift+Z)"
              >
                <IconRedo size={13} className={tbIcon} />
              </button>
              <button
                onClick={() => { setShowHistory((v) => !v); setShowAnnotations(false); }}
                disabled={history.length === 0}
                className={`${tbBtnNeutral} ${showHistory ? "!border-[rgba(201,168,108,0.3)] !bg-[rgba(201,168,108,0.08)] !text-[#C9A86C]" : ""}`}
                title="历史版本"
              >
                <IconHistory size={13} className={tbIcon} />
              </button>

              <div className={tbDivider} />

              {/* Export */}
              {chapters.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setExportMenuOpen((v) => !v)}
                    disabled={exporting}
                    className={tbBtnBlue}
                    title="导出"
                  >
                    <IconDownload size={13} className={tbIcon} />
                    {exporting ? "导出中..." : "导出"}
                  </button>
                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-30 mt-1.5 w-32 overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] py-1 shadow-xl">
                        <button
                          onClick={() => void handleExport("txt")}
                          className="btn-press block w-full px-3 py-2 text-left text-xs text-[#B0B0B0] transition-colors hover:bg-[#141414] hover:text-[#E8E8E8]"
                        >
                          导出为 TXT
                        </button>
                        <button
                          onClick={() => void handleExport("markdown")}
                          className="btn-press block w-full px-3 py-2 text-left text-xs text-[#B0B0B0] transition-colors hover:bg-[#141414] hover:text-[#E8E8E8]"
                        >
                          导出为 Markdown
                        </button>
                        <button
                          onClick={() => void handleExport("epub")}
                          className="btn-press block w-full px-3 py-2 text-left text-xs text-[#B0B0B0] transition-colors hover:bg-[#141414] hover:text-[#E8E8E8]"
                        >
                          导出为 EPUB
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Illustration */}
            {illustration && (
              <div className="border-b border-[#1A1A1A] bg-[#0C0C0C] px-6 py-4">
                <div className="relative mx-auto max-w-md">
                  <img
                    src={proxyImageUrl(illustration)}
                    alt="章节插图"
                    className="w-full rounded-lg border border-[#1A1A1A]"
                  />
                  <button
                    onClick={() => setIllustration(null)}
                    className="btn-press absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/80 transition-colors hover:bg-black/80 hover:text-white"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Editor area - centered max-width for comfortable reading */}
            <div className="flex flex-1 justify-center overflow-y-auto">
              <div className="flex w-full max-w-3xl flex-col">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onSelect={handleSelect}
                  onMouseUp={handleSelect}
                  className="flex-1 resize-none bg-transparent px-12 py-10 text-[15px] leading-[2] text-[#D0D0D0] outline-none placeholder-[#3A3A3A]"
                  placeholder="在此输入章节内容..."
                  style={{
                    fontFamily: "'Noto Sans CJK SC', 'Source Han Sans CN', 'Microsoft YaHei', 'PingFang SC', sans-serif",
                    minHeight: "500px",
                  }}
                />
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between border-t border-[#1A1A1A] bg-[#0F0F0F] px-6 py-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[#555555]">
                  {content.length.toLocaleString()} 字
                </span>
                {dirty && (
                  <span className="flex items-center gap-1 text-[#C9A86C]">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#C9A86C]" />
                    未保存·3秒后自动保存
                  </span>
                )}
                {!dirty && content.length > 0 && (
                  <span className="flex items-center gap-1 text-[#555555]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#78C8A0]/60" />
                    已保存
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[#555555]">
                {history.length > 0 && (
                  <span>版本 {historyIndex + 1}/{history.length}</span>
                )}
                {annotations.length > 0 && (
                  <button
                    onClick={() => { setShowAnnotations((v) => !v); setShowHistory(false); }}
                    className={`btn-press transition-colors ${showAnnotations ? "text-[#78A0C8]" : "hover:text-[#888888]"}`}
                  >
                    {annotations.length} 条批注
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#222222] bg-[#111111]">
              <IconFileText size={32} className="text-[#333333]" />
            </div>
            <p className="text-sm text-[#555555]">请选择或创建一个章节</p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-press mt-4 rounded-lg border border-[rgba(201,168,108,0.3)] px-4 py-2 text-sm text-[#C9A86C] transition-colors hover:border-[#C9A86C] hover:bg-[rgba(201,168,108,0.06)]"
            >
              <IconPlus size={14} className="mr-1.5 inline" />
              新建第一章
            </button>
          </div>
        )}
      </div>

      {/* Floating panels - positioned to avoid overlap */}
      {/* AI loading indicator */}
      {aiLoading && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-lg border border-[rgba(201,168,108,0.2)] bg-[#0F0F0F] px-4 py-2.5 shadow-xl">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#C9A86C] border-t-transparent" />
          <span className="text-xs text-[#C9A86C]">
            {aiAction === "complete" ? "AI 正在续写..." : aiAction === "rewrite" ? "AI 正在改写..." : aiAction === "annotate" ? "AI 正在分析..." : "AI 处理中..."}
          </span>
        </div>
      )}

      {/* History panel */}
      {showHistory && history.length > 0 && !aiLoading && (
        <div className="fixed bottom-6 right-6 z-40 w-72 overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1A1A1A] px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#C9A86C]">历史版本</span>
            <button onClick={() => setShowHistory(false)} className="btn-press text-[#555555] transition-colors hover:text-[#E8E8E8]">
              <IconX size={14} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {history.map((snap, i) => (
              <button
                key={i}
                onClick={() => {
                  isUndoRedo.current = true;
                  setContent(snap.content);
                  setHistoryIndex(i);
                  setDirty(true);
                  setShowHistory(false);
                }}
                className={`btn-press mb-1 block w-full rounded-md px-3 py-2 text-left text-xs transition-colors ${
                  i === historyIndex
                    ? "bg-[rgba(201,168,108,0.1)] text-[#C9A86C]"
                    : "text-[#787878] hover:bg-[#141414] hover:text-[#C8C8C8]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">{snap.label}</span>
                  <span className="text-[10px] text-[#555555]">{snap.content.length.toLocaleString()}字</span>
                </div>
                <div className="mt-0.5 text-[10px] text-[#444444]">
                  {new Date(snap.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Annotations panel */}
      {showAnnotations && annotations.length > 0 && !aiLoading && (
        <div className="fixed bottom-6 right-6 z-40 w-80 overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1A1A1A] px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#78A0C8]">AI 批注 ({annotations.length})</span>
            <button onClick={() => setShowAnnotations(false)} className="btn-press text-[#555555] transition-colors hover:text-[#E8E8E8]">
              <IconX size={14} />
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            {annotations.map((ann, i) => (
              <div key={i} className="rounded-md border border-[#1A1A1A] bg-[#141414] p-3">
                {ann.text && (
                  <div className="mb-2 border-l-2 border-[#333333] pl-2 text-xs italic leading-relaxed text-[#787878]">
                    "{ann.text.slice(0, 80)}{ann.text.length > 80 ? "..." : ""}"
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    ann.severity === "warning" ? "bg-[rgba(201,104,90,0.12)] text-[#C9685A]" :
                    ann.severity === "suggestion" ? "bg-[rgba(201,168,108,0.12)] text-[#C9A86C]" :
                    "bg-[rgba(120,160,200,0.12)] text-[#78A0C8]"
                  }`}>
                    {ann.severity === "warning" ? "警告" : ann.severity === "suggestion" ? "建议" : "信息"}
                  </span>
                  <span className="text-xs leading-relaxed text-[#C8C8C8]">{ann.comment}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating selection toolbar */}
      {selection && selectionPos && !aiLoading && !rewriteInstruction && (
        <div
          className="fixed z-40 flex items-center gap-0.5 rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-1 py-1 shadow-xl"
          style={{ left: selectionPos.x, top: Math.max(selectionPos.y, 60), transform: "translateX(-50%)" }}
        >
          <button
            onClick={() => setRewriteInstruction("")}
            className="btn-press inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-[#C9A86C] transition-colors hover:bg-[rgba(201,168,108,0.1)]"
          >
            <IconRefresh size={12} />
            改写
          </button>
          <button
            onClick={() => void callAiAssist("annotate")}
            className="btn-press inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-[#78A0C8] transition-colors hover:bg-[rgba(120,160,200,0.1)]"
          >
            <IconMessageSquare size={12} />
            批注
          </button>
        </div>
      )}

      {/* Rewrite instruction input */}
      {rewriteInstruction !== null && (
        <div
          className="fixed z-50 rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] p-3 shadow-xl"
          style={{
            left: selectionPos?.x ?? 200,
            top: Math.max((selectionPos?.y ?? 100) + 45, 100),
            transform: "translateX(-50%)",
          }}
        >
          <input
            autoFocus
            value={rewriteInstruction}
            onChange={(e) => setRewriteInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void callAiAssist("rewrite", rewriteInstruction || undefined);
              if (e.key === "Escape") setRewriteInstruction(null);
            }}
            placeholder="改写要求（如：更紧张、简化、更生动）"
            className="w-64 rounded-md border border-[#222222] bg-[#141414] px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#444444] focus:border-[rgba(201,168,108,0.4)] focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setRewriteInstruction(null)} className="btn-press text-xs text-[#787878] transition-colors hover:text-[#E8E8E8]">取消</button>
            <button
              onClick={() => void callAiAssist("rewrite", rewriteInstruction || undefined)}
              className="btn-press rounded-md bg-[#C9A86C] px-3 py-1 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-[#D4B884]"
            >
              改写
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <Modal
          title="新建章节"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className={BTN.ghost}>取消</button>
              <button onClick={handleCreate} disabled={!newTitle.trim()} className={BTN.primary}>创建</button>
            </>
          }
        >
          <TextInput label="章节标题" value={newTitle} onChange={setNewTitle} />
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`确认删除章节"${confirmDelete.title}"？此操作不可撤销。`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {confirmClearAll && (
        <ConfirmDialog
          message={`确认清空所有章节？将删除全部 ${chapters.length} 章，此操作不可撤销。`}
          onCancel={() => setConfirmClearAll(false)}
          onConfirm={handleClearAll}
        />
      )}

      {importModalOpen && (
        <Modal
          title="导入章节"
          onClose={() => setImportModalOpen(false)}
          footer={
            <>
              <button onClick={() => setImportModalOpen(false)} className={BTN.ghost}>取消</button>
              <button onClick={() => void handleImport()} disabled={!importText.trim() || importing} className={BTN.primary}>
                {importing ? "导入中..." : "导入"}
              </button>
            </>
          }
        >
          <SelectField label="格式" value={importFormat} onChange={setImportFormat} options={["txt", "markdown"] as const} />
          <TextArea label="文本内容" value={importText} onChange={setImportText} rows={10} />
        </Modal>
      )}
    </div>
  );
}
