// BillingPanel — collapsible panel for displaying video generation cost
// metrics and model pricing.
//
// Pulls aggregated cost data from the /videos/billing/summary endpoint and
// model pricing from /videos/billing/models. Renders:
//   - Total cost (large, with currency symbol)
//   - Today's cost + this month's cost
//   - Cost distribution by provider (progress bars)
//   - Cost distribution by operation (progress bars)
//   - Model pricing table
//   - Cost alert banner (when threshold exceeded)
//
// Style mirrors PromptTemplatePanel: Apple system font, collapsible header,
// CSS-variable-driven theming.

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../api/client.js";
import { IconChevron, IconAlertCircle } from "../../components/Icons.tsx";
import { APPLE_FONT_STYLE } from "./shared.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillingPanelProps {
  projectId: string | null;
}

/** Response shape from GET /videos/billing/summary. */
interface BillingSummary {
  totalCost: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  byProvider: Record<string, { cost: number; requests: number; successRate: number }>;
  byOperation: Record<string, { cost: number; requests: number }>;
  byDate: Record<string, { cost: number; requests: number }>;
  startDate: string;
  endDate: string;
  todayCost: number;
  monthCost: number;
  formattedTotalCost: string;
  formattedTodayCost: string;
  formattedMonthCost: string;
  alert: boolean;
}

/** Response shape from GET /videos/billing/models. */
interface BillingModel {
  provider: string;
  model: string;
  operation: string;
  unitPrice: number;
  currency: string;
  pricingType: string;
  formattedUnitPrice: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Color palette for provider / operation distribution bars. */
const DISTRIBUTION_COLORS = [
  "#5B8DEF",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
];

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Format a cents amount as ¥X.XX (assumes CNY_cents). */
function formatCents(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

/** Get a color from the palette by index (wraps around). */
function colorForIndex(index: number): string {
  return DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A labeled progress bar showing a cost distribution segment. */
function DistributionBar({
  label,
  cost,
  totalCost,
  color,
  requests,
}: {
  label: string;
  cost: number;
  totalCost: number;
  color: string;
  requests: number;
}): JSX.Element {
  const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-xs text-[var(--color-text-secondary)]" title={label}>
        {label}
      </span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--color-surface-sunken)]">
        <div
          className="flex h-full items-center justify-end rounded px-1.5 text-[10px] font-medium text-white transition-all"
          style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: color }}
        >
          {percentage > 10 ? `${percentage.toFixed(0)}%` : ""}
        </div>
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]">
        {formatCents(cost)}
      </span>
      <span className="w-12 shrink-0 text-right text-[10px] text-[var(--color-text-faint)]">
        {requests}次
      </span>
    </div>
  );
}

/** A single row in the model pricing table. */
function PricingRow({ model, index }: { model: BillingModel; index: number }): JSX.Element {
  const pricingTypeLabel: Record<string, string> = {
    per_second: "/秒",
    per_request: "/次",
    per_frame: "/帧",
    per_1k_frames: "/千帧",
  };

  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="px-2 py-1.5 text-xs text-[var(--color-text)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: colorForIndex(index) }}
          />
          {model.provider}
        </span>
      </td>
      <td className="px-2 py-1.5 text-xs text-[var(--color-text-secondary)]">{model.model}</td>
      <td className="px-2 py-1.5 text-[10px] text-[var(--color-text-faint)]">{model.operation}</td>
      <td className="px-2 py-1.5 text-right text-xs font-medium tabular-nums text-[var(--color-text)]">
        {model.formattedUnitPrice}
        <span className="text-[10px] text-[var(--color-text-faint)]">
          {pricingTypeLabel[model.pricingType] ?? ""}
        </span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BillingPanel({ projectId }: BillingPanelProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(true);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [models, setModels] = useState<BillingModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch billing summary + models from the API. */
  const loadBilling = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, modelsRes] = await Promise.all([
        apiGet<BillingSummary>(`/projects/${projectId}/videos/billing/summary`),
        apiGet<{ models: BillingModel[] }>(`/projects/${projectId}/videos/billing/models`),
      ]);
      setSummary(summaryRes);
      setModels(modelsRes.models ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load data when the panel is expanded or project changes.
  useEffect(() => {
    if (!collapsed && projectId) {
      void loadBilling();
    }
  }, [collapsed, projectId, loadBilling]);

  // --- Derived display values ---

  const totalCost = summary?.totalCost ?? 0;
  const totalRequests = summary?.totalRequests ?? 0;
  const alert = summary?.alert ?? false;

  const providerEntries = summary
    ? Object.entries(summary.byProvider).sort((a, b) => b[1].cost - a[1].cost)
    : [];

  const operationEntries = summary
    ? Object.entries(summary.byOperation).sort((a, b) => b[1].cost - a[1].cost)
    : [];

  const operationLabels: Record<string, string> = {
    video_generation: "视频生成",
    image_generation: "图片生成",
    lip_sync: "口型同步",
    review: "审核",
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
        <span className="text-base">💰</span>
        <span className="text-sm font-medium text-[var(--color-text)]">计费面板</span>
        {!collapsed && summary && (
          <span className="text-xs text-[var(--color-text-faint)]">
            总费用 {summary.formattedTotalCost}
          </span>
        )}
        <span className="ml-auto">
          <IconChevron
            size={18}
            direction={collapsed ? "right" : "down"}
            className="text-[var(--color-text-faint)]"
          />
        </span>
      </button>

      {/* Panel body (collapsible) */}
      {!collapsed && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          {loading && (
            <div className="py-8 text-center text-sm text-[var(--color-text-faint)]">
              加载中...
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg bg-[rgba(201,104,90,0.08)] p-2 text-xs text-[#C9685A]">
              {error}
            </div>
          )}

          {!loading && !error && summary && (
            <>
              {/* Cost alert banner */}
              {alert && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-[rgba(245,158,11,0.1)] p-2.5 text-xs text-amber-600">
                  <IconAlertCircle size={16} className="shrink-0" />
                  <span>费用已超过告警阈值，请关注用量</span>
                </div>
              )}

              {/* Total cost (large display) */}
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                    总费用
                  </div>
                  <div className="mt-0.5 text-3xl font-bold tabular-nums text-[var(--color-text)]">
                    {summary.formattedTotalCost}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--color-text-faint)]">
                    {totalRequests} 次请求 · {summary.successCount} 成功 / {summary.failureCount} 失败
                  </div>
                </div>
              </div>

              {/* Today / Month cost cards */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2.5">
                  <div className="text-[10px] font-medium text-[var(--color-text-faint)]">今日费用</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--color-text)]">
                    {summary.formattedTodayCost}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2.5">
                  <div className="text-[10px] font-medium text-[var(--color-text-faint)]">本月费用</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--color-text)]">
                    {summary.formattedMonthCost}
                  </div>
                </div>
              </div>

              {/* Cost distribution by provider */}
              {providerEntries.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                    按模型商费用分布
                  </div>
                  <div className="space-y-1.5">
                    {providerEntries.map(([provider, data], i) => (
                      <DistributionBar
                        key={provider}
                        label={provider}
                        cost={data.cost}
                        totalCost={totalCost}
                        color={colorForIndex(i)}
                        requests={data.requests}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cost distribution by operation */}
              {operationEntries.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                    按操作类型费用分布
                  </div>
                  <div className="space-y-1.5">
                    {operationEntries.map(([operation, data], i) => (
                      <DistributionBar
                        key={operation}
                        label={operationLabels[operation] ?? operation}
                        cost={data.cost}
                        totalCost={totalCost}
                        color={colorForIndex(i + 4)}
                        requests={data.requests}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Model pricing table */}
              {models.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                    模型定价表
                  </div>
                  <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[var(--color-surface-sunken)]">
                          <th className="px-2 py-1.5 text-left text-[10px] font-medium text-[var(--color-text-faint)]">商</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-medium text-[var(--color-text-faint)]">模型</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-medium text-[var(--color-text-faint)]">操作</th>
                          <th className="px-2 py-1.5 text-right text-[10px] font-medium text-[var(--color-text-faint)]">单价</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((m, i) => (
                          <PricingRow key={`${m.provider}-${m.model}-${m.operation}`} model={m} index={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Refresh button */}
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => void loadBilling()}
                  className="rounded-control border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)]"
                >
                  刷新
                </button>
              </div>
            </>
          )}

          {!loading && !error && !summary && (
            <div className="py-6 text-center text-sm text-[var(--color-text-faint)]">
              暂无计费数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}
