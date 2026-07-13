// pages/Scenes.tsx
// Scene asset management page — two-layer navigation (novel folders → scenes).
// Mirrors the Characters.tsx pattern: Layer 1 shows project/novel folder cards,
// Layer 2 shows the scene assets of the selected project.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet, proxyImageUrl } from "../api/client.js";
import { coverColor } from "./characters-utils.js";
import type { Asset, AssetCatalog } from "./assets/types.js";
import type { Project } from "../store/project.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Inline map / location icon for scenes.
// ---------------------------------------------------------------------------

function SceneIcon({
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
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
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
        <div className="h-5 w-2/3 rounded bg-[#1F1F1F]" />
        <div className="h-3 w-1/3 rounded bg-[#1F1F1F]" />
        <div className="h-3 w-full rounded bg-[#1F1F1F]" />
        <div className="h-3 w-5/6 rounded bg-[#1F1F1F]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene asset card.
// ---------------------------------------------------------------------------

function SceneCard({ asset }: { readonly asset: Asset }): JSX.Element {
  return (
    <div className="btn-press rounded-xl border border-[#1A1A1A] bg-[#0F0F0F] p-4 transition-colors hover:border-[#C9A86C]/40 hover:bg-[#141414]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F1F1F] text-[#C9A86C]">
          <SceneIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-200">
            {asset.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            第 {asset.firstChapter} - {asset.lastChapter} 章
          </p>
        </div>
      </div>

      {asset.aliases.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {asset.aliases.map((alias) => (
            <span
              key={alias}
              className="rounded bg-[#1F1F1F] px-1.5 py-0.5 text-[10px] text-gray-400"
            >
              {alias}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-gray-500">
        {asset.description || "—"}
      </p>

      <div className="mt-3 border-t border-[#1A1A1A] pt-2 text-[10px] text-gray-600">
        {asset.appearanceCount}x
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenes page — two-layer navigation.
// ---------------------------------------------------------------------------

export default function Scenes(): JSX.Element {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  // Layer state: null = overview (novel folders), string = viewing scenes of projectId.
  // Always start at Layer 1 (overview) — user picks a novel folder to enter.
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Layer 1 state — scene counts per project (best-effort).
  const [sceneCounts, setSceneCounts] = useState<Record<string, number>>({});
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Layer 2 state — full asset catalog + search for the selected project.
  const [catalog, setCatalog] = useState<AssetCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch the project list on mount (does not rely on currentProject).
  useEffect(() => {
    void (async () => {
      setLoadingProjects(true);
      await fetchProjects();
      setLoadingProjects(false);
    })();
  }, [fetchProjects]);

  // Layer 1: once projects are available, fetch scene counts for every project
  // in parallel so each folder card can display its scene total.
  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled(
        projects.map(async (p) => {
          const data = await apiGet<AssetCatalog>(`/projects/${p.id}/assets`);
          return { id: p.id, count: data.scenes?.length ?? 0 };
        }),
      );
      if (cancelled) return;
      const counts: Record<string, number> = {};
      for (const r of results) {
        if (r.status === "fulfilled") counts[r.value.id] = r.value.count;
      }
      setSceneCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  // Layer 2: fetch the full asset catalog when a project is selected.
  const loadScenes = useCallback((id: string): void => {
    setLoading(true);
    setError(null);
    apiGet<AssetCatalog>(`/projects/${id}/assets`)
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadScenes(selectedProjectId);
  }, [selectedProjectId, loadScenes]);

  const handleBackToSelector = (): void => {
    setSelectedProjectId(null);
    setCatalog(null);
    setError(null);
    setSearchQuery("");
  };

  // Scene assets filtered by the search query (name / aliases / description).
  const filteredScenes = useMemo<Asset[]>(() => {
    const scenes = catalog?.scenes ?? [];
    if (!searchQuery.trim()) return scenes;
    const q = searchQuery.toLowerCase();
    return scenes.filter((asset) => {
      const nameMatch = asset.name.toLowerCase().includes(q);
      const aliasMatch = asset.aliases.some((a) => a.toLowerCase().includes(q));
      const descMatch = asset.description.toLowerCase().includes(q);
      return nameMatch || aliasMatch || descMatch;
    });
  }, [catalog, searchQuery]);

  const totalCount = catalog?.scenes?.length ?? 0;

  // --- Render: Layer 1 (novel folder cards) ---
  if (!selectedProjectId) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-light">场景管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">浏览每本小说的场景资产</p>
        </div>

        {/* Novel folder section */}
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-400">小说场景</h2>
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
            {projects.map((proj: Project) => {
              const colors = coverColor(proj.name);
              const count = sceneCounts[proj.id] ?? 0;
              return (
                <div
                  key={proj.id}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
                  style={{ width: 120 }}
                  onClick={() => setSelectedProjectId(proj.id)}
                >
                  <div className="relative h-44 bg-[#0A0A0A]">
                    {proj.coverUrl ? (
                      <img
                        src={proxyImageUrl(proj.coverUrl)}
                        alt={proj.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${colors.bg}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <p className="truncate text-sm font-medium text-[#C9A86C]">{proj.name}</p>
                      <p className="text-[9px] text-gray-500">{count} 个场景</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- Render: Layer 2 (scene cards) ---
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
            <h1 className="text-2xl font-light">场景管理</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {selectedProject?.name ?? selectedProjectId}
              {totalCount > 0 && ` · ${totalCount} 个场景`}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-[rgba(201,104,90,0.08)] p-3">
          <p className="text-sm text-[#C9685A]">{error}</p>
          <button
            onClick={() => loadScenes(selectedProjectId)}
            className="btn-press shrink-0 rounded-lg bg-[#C9A86C] px-3 py-1 text-xs font-medium text-black"
          >
            重试
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mt-4">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索场景名称、别名或描述…"
          className="w-full max-w-md rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-[#C9A86C]/40 focus:outline-none"
        />
      </div>

      {/* Body */}
      <div className="mt-6">
        {/* Loading state */}
        {loading ? (
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-gray-600">加载场景中…</p>
          </div>
        ) : /* Error: the banner above already shows the message + retry button,
              so render nothing here to avoid duplicating the error text. */ error ? null : /* Empty state */ filteredScenes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F0F0F] text-gray-600">
              <SceneIcon size={32} />
            </div>
            <p className="max-w-sm text-sm text-gray-500">暂无场景资产</p>
          </div>
        ) : (
          /* Scene grid */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScenes.map((asset) => (
              <SceneCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
