import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/project.js";
import { apiGet } from "../api/client.js";
import type { JSX } from "react";

interface LoreEntriesResponse {
  entries?: unknown[];
}

interface AssetCatalog {
  characters: unknown[];
  scenes: unknown[];
  props: unknown[];
}

export default function WorldOverview(): JSX.Element {
  const navigate = useNavigate();
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [loreCount, setLoreCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [sceneCount, setSceneCount] = useState(0);
  const [propCount, setPropCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      apiGet<LoreEntriesResponse>(`/projects/${projectId}/lorebook`),
      apiGet<AssetCatalog>(`/projects/${projectId}/assets`),
    ]).then(([loreRes, assetRes]) => {
      if (cancelled) return;
      if (loreRes.status === "fulfilled") {
        setLoreCount(loreRes.value.entries?.length ?? 0);
      }
      if (assetRes.status === "fulfilled") {
        setCharCount(assetRes.value.characters?.length ?? 0);
        setSceneCount(assetRes.value.scenes?.length ?? 0);
        setPropCount(assetRes.value.props?.length ?? 0);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light text-[#E8E8E8]">世界观</h1>
        <p className="mt-6 text-sm text-[#555555]">请先在仪表盘选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-light text-[#E8E8E8]">世界观</h1>
        <p className="mt-1 text-sm text-[#555555]">
          当前项目：{currentProject?.name} · 管理世界设定与实体资产
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[#555555]">加载中...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 世界书卡片 */}
          <button
            onClick={() => navigate("/world/lorebook")}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#141414] p-8 text-left transition-[border-color,background-color,box-shadow] duration-300 hover:border-[rgba(201,168,108,0.3)] hover:shadow-[0_0_24px_rgba(201,168,108,0.08)]"
          >
            {/* 图标 */}
            <div className="flex items-center justify-between">
              <div className="text-[#555555] transition-colors group-hover:text-[#C9A86C]">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 4C5 3 6 2 7 2H21C22 2 23 3 23 4V24C23 25 22 26 21 26H7C6 26 5 25 5 24V4Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 8H19M9 12H19M9 16H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-mono text-2xl font-light text-[#C9A86C]">{loreCount}</span>
            </div>

            <div>
              <h2 className="text-lg font-light text-[#E8E8E8]">世界书</h2>
              <p className="mt-1 text-xs text-[#555555]">
                魔法体系 · 历史年表 · 地理环境 · 社会制度 · 组织势力
              </p>
            </div>

            {/* 标签 */}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#666666]">设定条目</span>
              <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#666666]">AI 引用</span>
              <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#666666]">扫描配置</span>
            </div>

            {/* 箭头 */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#333333] opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-[-8px] group-hover:opacity-100 group-hover:text-[#C9A86C]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {/* 资产目录卡片 */}
          <button
            onClick={() => navigate("/world/assets")}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#141414] p-8 text-left transition-[border-color,background-color,box-shadow] duration-300 hover:border-[rgba(201,168,108,0.3)] hover:shadow-[0_0_24px_rgba(201,168,108,0.08)]"
          >
            <div className="flex items-center justify-between">
              <div className="text-[#555555] transition-colors group-hover:text-[#C9A86C]">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="15" y="3" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="3" y="15" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="11" y="15" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="font-mono text-2xl font-light text-[#C9A86C]">{charCount + sceneCount + propCount}</span>
            </div>

            <div>
              <h2 className="text-lg font-light text-[#E8E8E8]">资产目录</h2>
              <p className="mt-1 text-xs text-[#555555]">
                角色 · 场景 · 物品 — 从章节内容中自动提取的结构化资产
              </p>
            </div>

            {/* 分类统计 */}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#666666]">
                角色 {charCount}
              </span>
              <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#666666]">
                场景 {sceneCount}
              </span>
              <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#666666]">
                物品 {propCount}
              </span>
            </div>

            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#333333] opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-[-8px] group-hover:opacity-100 group-hover:text-[#C9A86C]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
