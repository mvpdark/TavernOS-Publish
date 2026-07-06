import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet } from "../api/client.js";
import { AssetDetail } from "./assets/AssetDetail.js";
import { AssetList } from "./assets/AssetList.js";
import type { Asset, AssetCatalog, TabKind } from "./assets/types.js";
import type { JSX } from "react";

export default function Assets(): JSX.Element {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [catalog, setCatalog] = useState<AssetCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tab, setTab] = useState<TabKind>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState<number | "all">("all");

  // Selected asset for detail view
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
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

  // Collect all assets and compute chapter range
  const allAssets = useMemo<Asset[]>(() => {
    if (!catalog) return [];
    return [...(catalog.characters ?? []), ...(catalog.scenes ?? []), ...(catalog.props ?? [])];
  }, [catalog]);

  // Available chapter numbers for the filter dropdown
  const chapterNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const asset of allAssets) {
      set.add(asset.firstChapter);
      set.add(asset.lastChapter);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [allAssets]);

  // Filtered assets based on tab, search, and chapter filter
  const filteredAssets = useMemo<Asset[]>(() => {
    if (!catalog) return [];

    let assets: Asset[];
    if (tab === "all") {
      assets = allAssets;
    } else if (tab === "character") {
      assets = catalog.characters ?? [];
    } else if (tab === "scene") {
      assets = catalog.scenes ?? [];
    } else {
      assets = catalog.props ?? [];
    }

    return assets.filter((asset) => {
      // Chapter filter: show assets that appear in the selected chapter
      if (chapterFilter !== "all") {
        if (
          asset.firstChapter > chapterFilter ||
          asset.lastChapter < chapterFilter
        ) {
          return false;
        }
      }

      // Search filter: match name, aliases, or description
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = asset.name.toLowerCase().includes(q);
        const aliasMatch = asset.aliases.some((a) =>
          a.toLowerCase().includes(q),
        );
        const descMatch = asset.description.toLowerCase().includes(q);
        if (!nameMatch && !aliasMatch && !descMatch) return false;
      }

      return true;
    });
  }, [catalog, allAssets, tab, searchQuery, chapterFilter]);

  // Count per kind for tab badges
  const kindCounts = useMemo<Record<TabKind, number>>(() => {
    if (!catalog) return { all: 0, character: 0, scene: 0, prop: 0 };
    return {
      all: allAssets.length,
      character: (catalog.characters ?? []).length,
      scene: (catalog.scenes ?? []).length,
      prop: (catalog.props ?? []).length,
    };
  }, [catalog, allAssets]);

  const selectedAsset =
    filteredAssets.find((a) => a.id === selectedAssetId) ?? null;

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light">资产目录</h1>
        <p className="mt-6 text-gray-500">请先在仪表盘选择一个项目</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-gray-500">加载中...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-[#141414] px-6 py-4">
        <h1 className="text-xl font-light">资产目录</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          角色 / 场景 / 物品 — 从章节内容中自动提取的结构化资产
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <AssetList
          tab={tab}
          setTab={setTab}
          kindCounts={kindCounts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chapterFilter={chapterFilter}
          setChapterFilter={setChapterFilter}
          chapterNumbers={chapterNumbers}
          filteredAssets={filteredAssets}
          allAssetsLength={allAssets.length}
          selectedAssetId={selectedAssetId}
          setSelectedAssetId={setSelectedAssetId}
        />
        <AssetDetail selectedAsset={selectedAsset} />
      </div>
    </div>
  );
}
