// pages/Props.tsx
// Prop asset management page — two-layer navigation (novel folders → props).
// Mirrors the Characters.tsx pattern: Layer 1 shows project folder cards,
// Layer 2 shows the prop assets of the selected project.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../store/project.js";
import type { Project } from "../store/project.js";
import { apiGet, proxyImageUrl } from "../api/client.js";
import { coverColor } from "./characters-utils.js";
import type { Asset, AssetCatalog } from "./assets/types.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Inline treasure-chest / cube icon for props.
// ---------------------------------------------------------------------------

function PropIcon({
  size = 24,
  className,
}: {
  readonly size?: number;
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cube body */}
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      {/* Front face edges */}
      <path d="M3 7l9 5 9-5" />
      <line x1="12" y1="12" x2="12" y2="22" />
      {/* Treasure highlight line */}
      <line x1="7.5" y1="9.5" x2="9.5" y2="10.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton card.
// ---------------------------------------------------------------------------

function SkeletonCard(): JSX.Element {
  return (
    <div className="h-44 animate-pulse rounded-xl border border-[#1A1A1A] bg-[#0F0F0F]">
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 rounded bg-[#1A1A1A]" />
        <div className="h-3 w-1/3 rounded bg-[#1A1A1A]" />
        <div className="h-3 w-full rounded bg-[#1A1A1A]" />
        <div className="h-3 w-5/6 rounded bg-[#1A1A1A]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prop asset card.
// ---------------------------------------------------------------------------

function PropCard({ asset }: { readonly asset: Asset }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="btn-press rounded-xl border border-[#1A1A1A] bg-[#0F0F0F] p-4 transition-colors hover:border-[#C9A86C] hover:bg-[#1A1A1A]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A] text-[#C9A86C]">
          <PropIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[#E0E0E0]">
            {asset.name}
          </h3>
          <p className="mt-0.5 text-xs text-[#666666]">
            {t("props.chapterRange", {
              start: asset.firstChapter,
              end: asset.lastChapter,
            })}
          </p>
        </div>
      </div>

      {asset.aliases.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {asset.aliases.map((alias) => (
            <span
              key={alias}
              className="rounded bg-[#1A1A1A] px-1.5 py-0.5 text-[10px] text-[#999999]"
            >
              {alias}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[#999999]">
        {asset.description || "—"}
      </p>

      <div className="mt-3 border-t border-[#1A1A1A] pt-2 text-[10px] text-[#666666]">
        {asset.appearanceCount}x
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props page — two-layer navigation.
// ---------------------------------------------------------------------------

export default function Props(): JSX.Element {
  // Project list comes from the store; we do NOT depend on currentProject.
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  // Layer state: null = overview (novel folders), string = viewing props of projectId.
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Props of the currently selected project (Layer 2).
  const [props, setProps] = useState<Asset[]>([]);
  // Per-project prop counts shown on Layer 1 folder cards.
  const [propCounts, setPropCounts] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load the project list on mount.
  useEffect(() => {
    void (async () => {
      setLoadingProjects(true);
      await fetchProjects();
      setLoadingProjects(false);
    })();
  }, [fetchProjects]);

  // Load prop counts for every project so Layer 1 cards can show counts.
  // Calls apiGet('/projects/:id/assets') per project and reads the props array.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (projects.length === 0) {
        setPropCounts({});
        return;
      }
      setLoadingCounts(true);
      try {
        const results = await Promise.all(
          projects.map(async (p): Promise<readonly [string, number]> => {
            try {
              const data = await apiGet<AssetCatalog>(`/projects/${p.id}/assets`);
              return [p.id, (data.props ?? []).length] as const;
            } catch {
              // A single project failing should not break the whole grid.
              return [p.id, 0] as const;
            }
          }),
        );
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const [id, n] of results) counts[id] = n;
        setPropCounts(counts);
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  // Load props for the selected project (Layer 2).
  const loadProps = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AssetCatalog>(`/projects/${id}/assets`);
      setProps(data.props ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProps([]);
      return;
    }
    void loadProps(selectedProjectId);
  }, [selectedProjectId, loadProps]);

  const handleSelectNovel = (p: Project): void => {
    setSelectedProjectId(p.id);
    setSearchQuery("");
    setError(null);
  };

  const handleBackToSelector = (): void => {
    setSelectedProjectId(null);
    setProps([]);
    setSearchQuery("");
    setError(null);
  };

  // Prop assets filtered by the search query (name / aliases / description).
  const filteredProps = useMemo<Asset[]>(() => {
    if (!searchQuery.trim()) return props;
    const q = searchQuery.toLowerCase();
    return props.filter((asset) => {
      const nameMatch = asset.name.toLowerCase().includes(q);
      const aliasMatch = asset.aliases.some((a) => a.toLowerCase().includes(q));
      const descMatch = asset.description.toLowerCase().includes(q);
      return nameMatch || aliasMatch || descMatch;
    });
  }, [props, searchQuery]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  // --- Render: Layer 1 (novel folder overview) ---
  if (!selectedProjectId) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-light">道具管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">管理小说中的道具资产</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
            {error}
          </p>
        )}

        {/* 小说道具 — folder cards */}
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-400">小说道具</h2>
          <span className="text-xs text-gray-600">{projects.length} 本小说</span>
        </div>

        {loadingProjects ? (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 w-[120px] animate-pulse rounded-lg border border-[#1A1A1A] bg-[#0F0F0F]"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] p-12 text-center text-gray-500">
            暂无小说项目
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {projects.map((p) => {
              const colors = coverColor(p.name);
              const count = propCounts[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
                  style={{ width: 120 }}
                  onClick={() => handleSelectNovel(p)}
                >
                  <div className="relative h-44 bg-[#0A0A0A]">
                    {p.coverUrl ? (
                      <img
                        src={proxyImageUrl(p.coverUrl)}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${colors.bg}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {/* Prop badge */}
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-[#0F0F0F] bg-[#1A1A1A] text-[#C9A86C]">
                      <PropIcon size={14} />
                    </div>
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <p className="truncate text-sm font-medium text-[#C9A86C]">{p.name}</p>
                      <p className="text-[9px] text-gray-500">{count} 个道具</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loadingCounts && projects.length > 0 && (
          <p className="mt-4 text-center text-xs text-gray-600">加载道具数量中…</p>
        )}
      </div>
    );
  }

  // --- Render: Layer 2 (props of the selected project) ---
  return (
    <div className="p-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSelector}
            className="text-sm text-gray-500 hover:text-[#C9A86C]"
          >
            ← 选择小说
          </button>
          <div>
            <h1 className="text-2xl font-light">道具管理</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {selectedProject?.name ?? selectedProjectId}
              {props.length > 0 && ` · ${props.length} 个道具`}
            </p>
          </div>
        </div>
        {/* Search */}
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索道具…"
          className="w-full max-w-md rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-[#C9A86C]/40 focus:outline-none"
        />
      </div>

      {/* Body */}
      <div className="mt-6">
      {loading ? (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-gray-600">加载中…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => void loadProps(selectedProjectId)}
            className="btn-press mt-4 rounded-lg bg-[#C9A86C] px-4 py-2 text-sm font-medium text-black"
          >
            重试
          </button>
        </div>
      ) : filteredProps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1A1A1A] text-[#C9A86C]">
            <PropIcon size={32} />
          </div>
          <p className="max-w-sm text-sm text-gray-500">该项目暂无道具</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProps.map((asset) => (
            <PropCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
