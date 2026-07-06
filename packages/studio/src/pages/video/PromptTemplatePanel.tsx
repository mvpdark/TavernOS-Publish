// PromptTemplatePanel — collapsible panel for browsing the built-in prompt
// template library.
//
// Templates are static data shipped in @tavernos/core (110+ templates across
// 12 categories). This panel provides category filtering, keyword search,
// popular/rating sort, and one-click injection of a template's visualPrompt
// into the video generation prompt input.
//
// Style mirrors ScriptParserPanel: Apple system font, collapsible header,
// CSS-variable-driven theming.

import { useMemo, useState } from "react";
// Import directly from the pure-data module to avoid pulling in Node-only
// modules (fs, child_process, better-sqlite3) through @tavernos/core's barrel.
import {
  searchTemplates,
  PROMPT_CATEGORIES,
  getTemplateStats,
} from "@tavernos/core/dist/video/prompt-templates.js";
import type { PromptTemplate, PromptCategory } from "@tavernos/core";
import { IconChevron, IconBook, IconSearch } from "../../components/Icons.tsx";
import { APPLE_FONT_STYLE, formatDuration } from "./shared.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptTemplatePanelProps {
  onSelectTemplate: (visualPrompt: string, actingPrompt: string) => void;
}

type SortMode = "popular" | "rating";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max templates to render at once (performance guard for large libraries). */
const RENDER_LIMIT = 30;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single template card. Click to expand details. */
function TemplateCard({
  template,
  expanded,
  onToggle,
  onUse,
}: {
  template: PromptTemplate;
  expanded: boolean;
  onToggle: () => void;
  onUse: () => void;
}): JSX.Element {
  return (
    <div
      onClick={onToggle}
      className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2.5 transition-colors hover:border-[var(--color-border-accent)]"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-[var(--color-text)]">{template.title}</span>
        {template.rating != null && (
          <span className="shrink-0 text-[10px] text-amber-600">★ {template.rating.toFixed(1)}</span>
        )}
      </div>

      {/* Description */}
      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
        {template.description}
      </p>

      {/* Meta row */}
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--color-text-faint)]">
        {template.recommendedDuration != null && (
          <span>⏱ {formatDuration(template.recommendedDuration)}</span>
        )}
        <span>👤 {template.characterCount}人</span>
        {template.usageCount != null && template.usageCount > 0 && (
          <span>🔥 {template.usageCount}</span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 space-y-2 border-t border-[var(--color-border)] pt-2">
          {template.visualPrompt && (
            <div>
              <div className="text-[10px] font-medium text-[var(--color-text-faint)]">视觉提示词</div>
              <p className="mt-0.5 max-h-24 overflow-y-auto rounded bg-[var(--color-surface)] p-1.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                {template.visualPrompt}
              </p>
            </div>
          )}
          {template.actingPrompt && (
            <div>
              <div className="text-[10px] font-medium text-[var(--color-text-faint)]">表演指导</div>
              <p className="mt-0.5 rounded bg-[var(--color-surface)] p-1.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                {template.actingPrompt}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
            className="btn-press w-full rounded-control bg-[var(--color-primary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-inverse)] transition-all hover:bg-[var(--color-primary-hover)]"
          >
            使用此模板
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PromptTemplatePanel({
  onSelectTemplate,
}: PromptTemplatePanelProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("popular");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => getTemplateStats(), []);

  // Compute filtered + sorted templates via the core search function.
  const templates = useMemo(() => {
    const results = searchTemplates({
      category: selectedCategory ?? undefined,
      keyword: keyword.trim() || undefined,
      sortBy,
      limit: RENDER_LIMIT,
    });
    return results;
  }, [selectedCategory, keyword, sortBy]);

  const handleUse = (template: PromptTemplate): void => {
    onSelectTemplate(template.visualPrompt, template.actingPrompt ?? "");
    // Collapse the panel after selection to return focus to the prompt input.
    setCollapsed(true);
    setExpandedId(null);
  };

  // --- Render ---

  return (
    <div
      style={APPLE_FONT_STYLE}
      className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
      >
        <IconBook size={18} className="text-[var(--color-primary)]" />
        <span className="text-sm font-medium text-[var(--color-text)]">提示词模板</span>
        <span className="text-xs text-[var(--color-text-faint)]">
          {stats.total} 个精选模板，一键填充
        </span>
        <span className="ml-auto">
          <IconChevron size={18} direction={collapsed ? "right" : "down"} className="text-[var(--color-text-faint)]" />
        </span>
      </button>

      {/* Panel body (collapsible) */}
      {!collapsed && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          {/* Search + sort row */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索模板标题、描述或提示词..."
                className="w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface-sunken)] py-1.5 pl-8 pr-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-placeholder)] transition-colors focus:border-[var(--color-border-accent)] focus:outline-none"
              />
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-control border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setSortBy("popular")}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  sortBy === "popular"
                    ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30"
                }`}
              >
                热门
              </button>
              <button
                type="button"
                onClick={() => setSortBy("rating")}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  sortBy === "rating"
                    ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30"
                }`}
              >
                评分
              </button>
            </div>
          </div>

          {/* Category filter tags (horizontal scroll) */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                selectedCategory === null
                  ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                  : "bg-[var(--color-border)]/40 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/60"
              }`}
            >
              全部
            </button>
            {PROMPT_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.value;
              const count = stats.byCategory[cat.value] ?? 0;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                      : "bg-[var(--color-border)]/40 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/60"
                  }`}
                >
                  {cat.icon} {cat.label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Template grid */}
          {templates.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-faint)]">
              未找到匹配的模板
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  expanded={expandedId === t.id}
                  onToggle={() => setExpandedId((prev) => (prev === t.id ? null : t.id))}
                  onUse={() => handleUse(t)}
                />
              ))}
            </div>
          )}

          {/* Result count */}
          <div className="mt-2 text-right text-[10px] text-[var(--color-text-faint)]">
            显示 {templates.length} / {stats.total} 个模板
          </div>
        </div>
      )}
    </div>
  );
}
