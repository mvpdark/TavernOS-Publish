import { useState, useEffect, useRef, useMemo, type JSX, type ReactNode, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/theme.js";
import { useProjectStore } from "../store/project.js";
import { apiGet } from "../api/client.js";
import {
  IconBook,
  IconPen,
  IconMap,
  IconFileText,
  IconGamepad,
  IconUsers,
  IconFolder,
  IconSettings,
  IconPalette,
  IconSparkles,
  IconFileEdit,
  IconSunMoon,
  IconSearch,
  IconUser,
  IconReturn,
} from "./Icons.js";

// ---------------------------------------------------------------------------
// Command Palette — global Ctrl+K / Cmd+K quick switcher
// ---------------------------------------------------------------------------
// A modal overlay that lets the user fuzzy-search navigation targets and
// quick actions, plus a debounced global content search across chapters,
// characters, and lorebook entries via /api/search. Follows the Strataform
// design system (dark carbon surfaces, #C9A86C amber accent). The component
// owns its own open state and the Ctrl+K hotkey listener, so it can be
// dropped anywhere inside the router.
// ---------------------------------------------------------------------------

interface Command {
  readonly id: string;
  readonly icon: FC<{ size?: number; className?: string }>;
  readonly label: string;
  readonly category: string;
  readonly keywords: readonly string[];
  readonly action: () => void;
  /** Optional snippet shown as a secondary line (used by search results). */
  readonly snippet?: string;
}

// ---------------------------------------------------------------------------
// Global search types — mirror the backend /api/search response shape.
// ---------------------------------------------------------------------------

interface SearchResultItem {
  type: "chapter" | "character" | "lorebook";
  projectId: string;
  title: string;
  snippet: string;
  url: string;
}

interface SearchResponse {
  chapters: SearchResultItem[];
  characters: SearchResultItem[];
  lorebook: SearchResultItem[];
}

/** Tiny styled <kbd> badge used in the footer hint bar. */
function Kbd({ children }: { children: ReactNode }): JSX.Element {
  return (
    <kbd className="rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--color-text-faint)]">
      {children}
    </kbd>
  );
}

export default function CommandPalette(): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // --- Global search state ------------------------------------------------
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const setMode = useThemeStore((s) => s.setMode);
  const currentMode = useThemeStore((s) => s.config.mode);
  const projects = useProjectStore((s) => s.projects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  // --- Command registry ---------------------------------------------------
  // Rebuilt only when the navigation/theme dependencies change. Each command
  // closes the palette after running so the user lands on the target view.
  const commands = useMemo<readonly Command[]>(() => {
    const go = (path: string): void => {
      navigate(path);
      setIsOpen(false);
    };
    return [
      // 导航 — Writing
      { id: "nav-library", icon: IconBook, label: "创作库", category: "导航", keywords: ["library", "项目", "小说"], action: () => go("/write/library") },
      { id: "nav-editor", icon: IconPen, label: "编辑器", category: "导航", keywords: ["editor", "写作", "章节"], action: () => go("/write/editor") },
      { id: "nav-blueprint", icon: IconMap, label: "蓝图", category: "导航", keywords: ["blueprint", "大纲", "规划"], action: () => go("/write/blueprint") },
      { id: "nav-style", icon: IconFileText, label: "文风库", category: "导航", keywords: ["style", "风格", "文笔"], action: () => go("/write/style") },
      { id: "nav-deep-game", icon: IconGamepad, label: "互动冒险", category: "导航", keywords: ["deep-game", "game", "冒险", "游戏"], action: () => go("/write/deep-game") },
      // 导航 — Characters & World
      { id: "nav-characters", icon: IconUsers, label: "角色", category: "导航", keywords: ["characters", "角色", "人物", "资产"], action: () => go("/assets/characters") },
      { id: "nav-scenes", icon: IconMap, label: "场景", category: "导航", keywords: ["scenes", "场景", "资产"], action: () => go("/assets/scenes") },
      { id: "nav-props", icon: IconFolder, label: "道具", category: "导航", keywords: ["props", "道具", "资产"], action: () => go("/assets/props") },
      { id: "nav-lorebook", icon: IconBook, label: "世界书", category: "导航", keywords: ["lorebook", "世界书", "设定"], action: () => go("/world/lorebook") },
      { id: "nav-assets", icon: IconFolder, label: "资产目录", category: "导航", keywords: ["assets", "资产", "目录"], action: () => go("/world/assets") },
      // 导航 — System
      { id: "nav-settings", icon: IconSettings, label: "设置", category: "导航", keywords: ["settings", "设置", "系统"], action: () => go("/system/settings") },
      { id: "nav-appearance", icon: IconPalette, label: "外观", category: "导航", keywords: ["appearance", "外观", "主题"], action: () => go("/system/appearance") },
      // 操作 — Actions
      { id: "act-new-project", icon: IconSparkles, label: "新建项目", category: "操作", keywords: ["new", "create", "新建", "创建", "项目"], action: () => go("/write/library") },
      { id: "act-write-chapter", icon: IconFileEdit, label: "写章节", category: "操作", keywords: ["write", "chapter", "写", "章节"], action: () => go("/write/editor") },
      {
        id: "act-toggle-theme",
        icon: IconSunMoon,
        label: "切换主题",
        category: "操作",
        keywords: ["theme", "toggle", "主题", "切换", "明暗"],
        action: () => {
          setMode(currentMode === "light" ? "dark" : "light");
          setIsOpen(false);
        },
      },
    ];
  }, [navigate, setMode, currentMode]);

  // --- Filtering ----------------------------------------------------------
  const filtered = useMemo<readonly Command[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  // --- Debounced global search (300ms) -----------------------------------
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      apiGet<SearchResponse>(
        `/search?q=${encodeURIComponent(q)}`,
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setSearchResults(data);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchResults(null);
            setSearching(false);
          }
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // --- Convert search results to palette items ---------------------------
  const searchItems = useMemo<readonly Command[]>(() => {
    if (!searchResults) return [];
    const go = (path: string, projectId: string): void => {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) setCurrentProject(proj);
      navigate(path);
      setIsOpen(false);
    };
    const items: Command[] = [];
    for (const ch of searchResults.chapters) {
      items.push({
        id: `search-ch-${ch.projectId}-${ch.title}`,
        icon: IconFileEdit,
        label: ch.title,
        category: "搜索 · 章节",
        keywords: [],
        action: () => go("/write/editor", ch.projectId),
        snippet: ch.snippet,
      });
    }
    for (const ch of searchResults.characters) {
      items.push({
        id: `search-char-${ch.projectId}-${ch.title}`,
        icon: IconUser,
        label: ch.title,
        category: "搜索 · 角色",
        keywords: [],
        action: () => go("/assets/characters", ch.projectId),
        snippet: ch.snippet,
      });
    }
    for (const ch of searchResults.lorebook) {
      items.push({
        id: `search-lore-${ch.projectId}-${ch.title}`,
        icon: IconBook,
        label: ch.title,
        category: "搜索 · 世界书",
        keywords: [],
        action: () => go("/world/lorebook", ch.projectId),
        snippet: ch.snippet,
      });
    }
    return items;
  }, [searchResults, projects, setCurrentProject, navigate]);

  // --- Combined visible list (filtered commands + search results) --------
  const visibleItems = useMemo<readonly Command[]>(() => {
    if (!query.trim()) return commands;
    return [...filtered, ...searchItems];
  }, [commands, filtered, searchItems, query]);

  // Mirror latest values into refs so the keydown handler (registered once
  // per open) always reads fresh data without re-binding on every keystroke.
  const visibleItemsRef = useRef<readonly Command[]>(visibleItems);
  visibleItemsRef.current = visibleItems;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  // --- Toggle with Ctrl+K / Cmd+K (always active) -------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // --- Reset & focus when opening ----------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // --- Clamp selection when the visible list shrinks --------------------
  useEffect(() => {
    setSelectedIndex((i) => (i >= visibleItems.length ? 0 : i));
  }, [visibleItems.length]);

  // --- Keyboard navigation while open ------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent): void => {
      const items = visibleItemsRef.current;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (items.length ? (i + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = items[selectedIndexRef.current];
        if (cmd) cmd.action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // --- Keep the active row scrolled into view ----------------------------
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, visibleItems]);

  if (!isOpen) return null;

  // Render grouped list: emit a category header whenever the category
  // changes between consecutive visible items.
  let lastCategory = "";

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-md pt-[12vh]"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
    >
      <div
        className="animate-modal-content flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search row */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
          <IconSearch size={16} className="shrink-0 text-[var(--color-text-placeholder)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索命令或内容…"
            spellCheck={false}
            autoComplete="off"
            aria-label="搜索命令或内容"
            className="w-full bg-transparent py-4 text-sm text-[var(--color-text)] placeholder-[var(--color-text-placeholder)] focus:outline-none"
          />
          <Kbd>ESC</Kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="stagger-children flex-1 overflow-y-auto py-2" role="listbox" aria-label="可用命令">
          {visibleItems.length === 0 ? (
            searching ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--color-text-placeholder)]">搜索中…</div>
            ) : query.trim() ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--color-text-placeholder)]">无结果</div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-[var(--color-text-placeholder)]">没有匹配的命令</div>
            )
          ) : (
            visibleItems.map((cmd, i) => {
              let header: JSX.Element | null = null;
              if (cmd.category !== lastCategory) {
                lastCategory = cmd.category;
                header = (
                  <div className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-placeholder)]">
                    {cmd.category}
                  </div>
                );
              }
              const active = i === selectedIndex;
              const IconEl = cmd.icon;
              return (
                <div key={cmd.id}>
                  {header}
                  <button
                    type="button"
                    data-index={i}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setSelectedIndex(i)}
                    onClick={() => cmd.action()}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-[var(--color-primary-tint-strong)] text-[var(--color-primary)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    <span className="flex w-5 shrink-0 items-center justify-center">
                      <IconEl size={16} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{cmd.label}</span>
                      {cmd.snippet && (
                        <span className="truncate text-[11px] text-[var(--color-text-faint)]">{cmd.snippet}</span>
                      )}
                    </span>
                    {active && (
                      <IconReturn size={12} className="shrink-0 text-[var(--color-primary)]/60" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint bar */}
        <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-text-placeholder)]">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            导航
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            执行
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            关闭
          </span>
          <span className="ml-auto tracking-wider">TAVERNOS · 命令面板</span>
        </div>
      </div>
    </div>
  );
}
