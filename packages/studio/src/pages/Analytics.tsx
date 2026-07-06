import { useEffect, useState, useMemo } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet } from "../api/client.js";
import type { JSX } from "react";
import { IconFolder, IconBook, IconPen, IconLayers, IconUsers, IconGlobe, IconFileText } from "../components/Icons.js";
import { useTranslation } from "react-i18next";

interface Stats {
  characters: number;
  loreEntries: number;
  chapters: number;
  totalWords: number;
}

interface Project {
  id: string;
  name: string;
  version?: string;
  language?: string;
  createdAt?: string;
}

interface ProjectsList {
  projects: Project[];
}

// ---------------------------------------------------------------------------
// Simple horizontal bar chart
// ---------------------------------------------------------------------------

function BarChart({ data, max }: {
  readonly data: readonly { readonly label: string; readonly value: number; readonly color: string }[];
  readonly max?: number;
}): JSX.Element {
  const chartMax = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = chartMax > 0 ? (item.value / chartMax) * 100 : 0;
        return (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#888888]">{item.label}</span>
              <span style={{ color: item.color }}>{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#1A1A1A]">
              <div
                className="h-full w-full origin-left rounded-full transition-transform duration-700 ease-out"
                style={{ transform: `scaleX(${pct / 100})`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Donut chart (ring with segments)
// ---------------------------------------------------------------------------

function DonutChart({ segments, size = 160 }: {
  readonly segments: readonly { readonly label: string; readonly value: number; readonly color: string }[];
  readonly size?: number;
}): JSX.Element {
  const { t } = useTranslation();
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = c * pct;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-light text-[#E8E8E8]">{total}</span>
        <span className="text-[10px] text-[#555555]">{t("analytics.total")}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics page
// ---------------------------------------------------------------------------

export default function Analytics(): JSX.Element {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { t } = useTranslation();
  const projectId = currentProject?.id;

  const [stats, setStats] = useState<Stats | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<ProjectsList>("/projects")
      .then((d) => setAllProjects(d.projects ?? []))
      .catch(() => setAllProjects([]));
  }, []);

  useEffect(() => {
    if (!projectId) {
      setStats(null);
      return;
    }
    setLoading(true);
    apiGet<Stats>(`/projects/${projectId}/stats`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Distribution data for donut chart
  const distribution = useMemo(() => {
    if (!stats) return [];
    return [
      { label: t("analytics.characters"), value: stats.characters, color: "#C9A86C" },
      { label: t("analytics.lorebookShort"), value: stats.loreEntries, color: "#A078C8" },
      { label: t("analytics.chapters"), value: stats.chapters, color: "#78A0C8" },
    ];
  }, [stats, t]);

  // Writing velocity data for bar chart
  const velocity = useMemo(() => {
    if (!stats) return [];
    return [
      { label: t("analytics.characters"), value: stats.characters, color: "#C9A86C" },
      { label: t("analytics.loreEntries"), value: stats.loreEntries, color: "#A078C8" },
      { label: t("analytics.chapters"), value: stats.chapters, color: "#78A0C8" },
      { label: t("analytics.tenThousandWords"), value: Math.round(stats.totalWords / 10000), color: "#78C8A0" },
    ];
  }, [stats, t]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-light tracking-wide text-[#E8E8E8]">{t("analytics.title")}</h1>
      <p className="mt-1 text-sm text-[#555555]">{t("analytics.subtitle")}</p>

      {/* Overview cards */}
      <div className="stagger-children mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={<IconFolder size={20} className="text-[#C9A86C]" />} label={t("analytics.totalProjects")} value={String(allProjects.length)} />
        <MetricCard icon={<IconBook size={20} className="text-[#78A0C8]" />} label={t("analytics.currentProject")} value={currentProject?.name ?? t("analytics.noProjectSelected")} />
        <MetricCard icon={<IconPen size={20} className="text-[#78C8A0]" />} label={t("analytics.totalWords")} value={stats ? (stats.totalWords?.toLocaleString() ?? "-") : "-"} />
      </div>

      {projectId && (
        <>
          <h2 className="mt-10 text-lg font-light text-[#E8E8E8]">{t("analytics.currentProjectDetails")}</h2>

          {loading ? (
            <div className="mt-4 rounded-xl border border-[#1A1A1A] bg-[#141414] p-10 text-center text-sm text-[#555555]">{t("common.loading")}</div>
          ) : stats ? (
            <>
              {/* Top stats */}
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <DetailCard icon={<IconUsers size={16} className="text-[#C9A86C]" />} label={t("analytics.characters")} value={stats.characters ?? 0} accent="#C9A86C" />
                <DetailCard icon={<IconGlobe size={16} className="text-[#A078C8]" />} label={t("analytics.loreEntries")} value={stats.loreEntries ?? 0} accent="#A078C8" />
                <DetailCard icon={<IconFileText size={16} className="text-[#78A0C8]" />} label={t("analytics.chapters")} value={stats.chapters ?? 0} accent="#78A0C8" />
                <DetailCard icon={<IconLayers size={16} className="text-[#78C8A0]" />} label={t("analytics.totalWords")} value={stats.totalWords ?? 0} accent="#78C8A0" large />
              </div>

              {/* Charts row */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Donut chart */}
                <div className="rounded-xl border border-[#1A1A1A] bg-[#141414] p-6">
                  <h3 className="mb-4 text-sm font-light text-[#888888]">{t("analytics.resourceDistribution")}</h3>
                  <div className="flex items-center justify-center py-2">
                    {distribution.some((d) => d.value > 0) ? (
                      <DonutChart segments={distribution} size={160} />
                    ) : (
                      <div className="flex h-[160px] items-center justify-center text-sm text-[#555555]">{t("analytics.noData")}</div>
                    )}
                  </div>
                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {distribution.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-1.5 text-xs text-[#888888]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                        {seg.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar chart */}
                <div className="rounded-xl border border-[#1A1A1A] bg-[#141414] p-6 lg:col-span-2">
                  <h3 className="mb-5 text-sm font-light text-[#888888]">{t("analytics.projectMetrics")}</h3>
                  <BarChart data={velocity} />
                </div>
              </div>

              {/* Progress bars */}
              <div className="mt-4 rounded-xl border border-[#1A1A1A] bg-[#141414] p-6">
                <h3 className="mb-5 text-sm font-light text-[#888888]">{t("analytics.writingProgress")}</h3>
                <ProgressBar label={t("analytics.characterSetup")} value={Math.min(stats.characters ?? 0, 10)} max={10} unit={t("analytics.unitCharacters")} color="#C9A86C" />
                <ProgressBar label={t("analytics.worldbuilding")} value={Math.min(stats.loreEntries ?? 0, 50)} max={50} unit={t("analytics.unitEntries")} color="#A078C8" />
                <ProgressBar label={t("analytics.chapterProgress")} value={Math.min(stats.chapters ?? 0, 20)} max={20} unit={t("analytics.unitChapters")} color="#78A0C8" />
                <ProgressBar label={t("analytics.wordGoal")} value={Math.min(stats.totalWords ?? 0, 100000)} max={100000} unit={t("analytics.unitWords")} color="#78C8A0" />
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-[#1A1A1A] bg-[#141414] p-10 text-center text-sm text-[#555555]">{t("analytics.noStats")}</div>
          )}
        </>
      )}

      {!projectId && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2A2A2A] bg-[#141414] py-16 text-center">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-30">
            <circle cx="32" cy="32" r="24" stroke="#78A0C8" strokeWidth="1.5" />
            <path d="M32 16v16l11 6" stroke="#78A0C8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-[#888888]">{t("analytics.selectProjectHint")}</p>
          <p className="mt-1 text-xs text-[#555555]">{t("analytics.selectProjectSubHint")}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ icon, label, value }: {
  readonly icon: JSX.Element;
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="card-lift group rounded-xl border border-[#1A1A1A] bg-[#141414] p-5 transition-[border-color,background-color,box-shadow,transform] duration-300 hover:border-[rgba(201,168,108,0.3)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F0F0F]">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-[#555555]">{label}</div>
          <div className="mt-1 truncate text-xl font-light text-[#E8E8E8]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ icon, label, value, accent, large }: {
  readonly icon: JSX.Element;
  readonly label: string;
  readonly value: number;
  readonly accent: string;
  readonly large?: boolean;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#141414] p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs text-[#555555]">{label}</span>
      </div>
      <div className={`font-light text-[#E8E8E8] ${large ? "text-xl" : "text-2xl"}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-2 h-0.5 w-full rounded-full" style={{ backgroundColor: accent, opacity: 0.5 }} />
    </div>
  );
}

function ProgressBar({ label, value, max, unit, color }: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly unit: string;
  readonly color: string;
}): JSX.Element {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-[#E8E8E8]">{label}</span>
        <span className="text-[#888888]">
          {value.toLocaleString()} / {max.toLocaleString()} {unit} ({percent}%)
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#1A1A1A]">
        <div
          className="h-full w-full origin-left rounded-full transition-transform duration-700 ease-out"
          style={{ transform: `scaleX(${percent / 100})`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
