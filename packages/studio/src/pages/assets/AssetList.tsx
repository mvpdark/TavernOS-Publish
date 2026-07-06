import { KIND_COLORS, KIND_LABELS, TAB_KINDS } from "./constants.js";
import type { Asset, TabKind } from "./types.js";
import type { JSX } from "react";

export interface AssetListProps {
  tab: TabKind;
  setTab: (tab: TabKind) => void;
  kindCounts: Record<TabKind, number>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chapterFilter: number | "all";
  setChapterFilter: (ch: number | "all") => void;
  chapterNumbers: number[];
  filteredAssets: Asset[];
  allAssetsLength: number;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
}

export function AssetList({
  tab,
  setTab,
  kindCounts,
  searchQuery,
  setSearchQuery,
  chapterFilter,
  setChapterFilter,
  chapterNumbers,
  filteredAssets,
  allAssetsLength,
  selectedAssetId,
  setSelectedAssetId,
}: AssetListProps): JSX.Element {
  return (
    <div className="flex w-2/3 flex-col border-r">
      {/* Toolbar */}
      <div className="space-y-3 border-b bg-[var(--color-surface-sunken)] px-5 py-3">
        {/* Tabs */}
        <div className="flex gap-1">
          {TAB_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setSelectedAssetId(null);
              }}
              className={`btn-press rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === k
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {KIND_LABELS[k]}
              <span className="ml-1.5 text-xs opacity-70">
                {kindCounts[k]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Chapter filter */}
        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索名称、别名或描述..."
            className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
          />
          <select
            value={chapterFilter === "all" ? "all" : String(chapterFilter)}
            onChange={(e) =>
              setChapterFilter(
                e.target.value === "all"
                  ? "all"
                  : Number(e.target.value),
              )
            }
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <option value="all">全部章节</option>
            {chapterNumbers.map((ch) => (
              <option key={ch} value={ch}>
                第 {ch} 章
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAssets.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-faint)]">
            {allAssetsLength === 0
              ? "暂无资产数据（运行管线后自动提取）"
              : "没有匹配的资产"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAssetId(asset.id)}
                className={`btn-press rounded-lg border p-3 text-left transition-colors ${
                  selectedAssetId === asset.id
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${KIND_COLORS[asset.kind]}`}
                      >
                        {KIND_LABELS[asset.kind]}
                      </span>
                      <span className="truncate text-sm font-medium text-[var(--color-text)]">
                        {asset.name}
                      </span>
                    </div>
                    {asset.aliases.length > 0 && (
                      <div className="mt-1 truncate text-xs text-[var(--color-text-faint)]">
                        别名: {asset.aliases.join(", ")}
                      </div>
                    )}
                    <div className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                      {asset.description || "（无描述）"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-faint)]">
                      第{asset.firstChapter}–{asset.lastChapter}章 · 出场 {asset.appearanceCount} 次
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
