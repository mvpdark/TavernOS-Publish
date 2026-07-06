// pages/Props.tsx
// Prop asset management page — displays prop-type assets only.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../store/project.js";
import { apiGet } from "../api/client.js";
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
    <div className="h-44 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 rounded bg-[var(--color-surface-hover)]" />
        <div className="h-3 w-1/3 rounded bg-[var(--color-surface-hover)]" />
        <div className="h-3 w-full rounded bg-[var(--color-surface-hover)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--color-surface-hover)]" />
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
    <div className="btn-press rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-primary)]">
          <PropIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[var(--color-text)]">
            {asset.name}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
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
              className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
            >
              {alias}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {asset.description || "—"}
      </p>

      <div className="mt-3 border-t border-[var(--color-border)] pt-2 text-[10px] text-[var(--color-text-faint)]">
        {asset.appearanceCount}x
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props page.
// ---------------------------------------------------------------------------

export default function Props(): JSX.Element {
  const { t } = useTranslation();
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [catalog, setCatalog] = useState<AssetCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    apiGet<AssetCatalog>(`/projects/${projectId}/assets`)
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Prop assets filtered by the search query (name / aliases / description).
  const filteredProps = useMemo<Asset[]>(() => {
    const props = catalog?.props ?? [];
    if (!searchQuery.trim()) return props;
    const q = searchQuery.toLowerCase();
    return props.filter((asset) => {
      const nameMatch = asset.name.toLowerCase().includes(q);
      const aliasMatch = asset.aliases.some((a) => a.toLowerCase().includes(q));
      const descMatch = asset.description.toLowerCase().includes(q);
      return nameMatch || aliasMatch || descMatch;
    });
  }, [catalog, searchQuery]);

  const totalCount = catalog?.props?.length ?? 0;

  // No project selected.
  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light text-[var(--color-text)]">
          {t("props.title")}
        </h1>
        <p className="mt-6 text-sm text-[var(--color-text-muted)]">
          {t("dashboard.selectProject")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light text-[var(--color-text)]">
              {t("props.title")}
            </h1>
            <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
              {totalCount} {totalCount === 1 ? "prop" : "props"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("props.search")}
            className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading state */}
        {loading ? (
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-[var(--color-text-faint)]">
              {t("props.loading")}
            </p>
          </div>
        ) : /* Error state */ error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={loadData}
              className="btn-press mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : /* Empty state */ filteredProps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-faint)]">
              <PropIcon size={32} />
            </div>
            <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
              {t("props.empty")}
            </p>
          </div>
        ) : (
          /* Prop grid */
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
