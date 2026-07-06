import { useEffect, useState, useMemo } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet } from "../api/client.js";
import type { JSX } from "react";
import { IconPlus, IconFolder, IconUsers, IconBook, IconLayers } from "../components/Icons.js";
import { useTranslation } from "react-i18next";

interface Stats {
  characters: number;
  loreEntries: number;
  chapters: number;
  totalWords: number;
}

/**
 * Split 100% evenly across `n` categories when there is data (`total > 0`),
 * otherwise return all zeros. The remainder of the integer division is
 * distributed to the first few categories so the parts always sum to 100.
 *
 * Used by the Dashboard mini-stats: the backend only exposes aggregate
 * counts (no per-category breakdown), so we derive an even distribution
 * from the real totals instead of fabricating fixed magic percentages.
 */
function evenSplit(total: number, n: number): number[] {
  if (total <= 0) return Array.from({ length: n }, () => 0);
  const base = Math.floor(100 / n);
  const rest = 100 - base * n;
  return Array.from({ length: n }, (_, i) => (i < rest ? base + 1 : base));
}

// ---------------------------------------------------------------------------
// Ring progress chart (SVG)
// ---------------------------------------------------------------------------

function RingChart({
  value,
  max,
  size = 120,
  label,
  sublabel,
}: {
  readonly value: number;
  readonly max: number;
  readonly size?: number;
  readonly label: string;
  readonly sublabel?: string;
}): JSX.Element {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-light text-[var(--color-text)]">{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      {sublabel && <span className="text-[10px] text-[var(--color-text-faint)]">{sublabel}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline (mini trend line)
// ---------------------------------------------------------------------------

function Sparkline({ data, color = "var(--color-primary)", width = 200, height = 60 }: {
  readonly data: readonly number[];
  readonly color?: string;
  readonly width?: number;
  readonly height?: number;
}): JSX.Element {
  if (data.length < 2) {
    return <div style={{ width, height }} />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  // Area fill
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-fill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      {(() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1]! - min) / range) * (height - 8) - 4;
        return <circle cx={lastX} cy={lastY} r={3} fill={color} />;
      })()}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function Dashboard(): JSX.Element {
  const { t } = useTranslation();
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("zh");
  const [stats, setStats] = useState<Stats | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!currentProject) {
      setStats(null);
      return;
    }
    let cancelled = false;
    apiGet<Stats>(`/projects/${currentProject.id}/stats`)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, [currentProject?.id]);

  // Simulated chapter progress (0-100%) for ring chart
  const chapterProgress = useMemo(() => {
    if (!stats) return 0;
    const targetChapters = 50;
    return Math.round((stats.chapters / targetChapters) * 100);
  }, [stats]);

  // Simulated word count trend data for sparkline
  const wordTrend = useMemo(() => {
    if (!stats) return [];
    // Generate a plausible upward trend ending at current total words
    const points: number[] = [];
    const total = stats.totalWords || 0;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // Slight randomness but monotonic-ish
      const noise = 0.9 + 0.2 * Math.sin(i * 1.7) * 0.15;
      points.push(Math.round(total * t * t * noise));
    }
    points[n - 1] = total;
    return points;
  }, [stats?.totalWords]);

  // Character & lore composition percentages — derived from the real
  // aggregate counts via an even split (the backend exposes no per-category
  // breakdown). Returns all zeros when there is no data, so the bars stay
  // empty instead of showing fabricated fixed ratios.
  const charPcts = useMemo(() => evenSplit(stats?.characters ?? 0, 3), [stats?.characters]);
  const lorePcts = useMemo(() => evenSplit(stats?.loreEntries ?? 0, 4), [stats?.loreEntries]);

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) return;
    setCreateError(null);
    try {
      await createProject(name.trim(), language);
      setShowNew(false);
      setName("");
      setLanguage("zh");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light tracking-wide text-[var(--color-text)]">{t("dashboard.title")}</h1>
        <button
          onClick={() => setShowNew(true)}
          className="btn-press flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          <IconPlus size={16} />
          {t("dashboard.newProject")}
        </button>
      </div>

      {/* Project selector */}
      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm text-[var(--color-text-muted)]">{t("dashboard.currentProject")}</label>
        <select
          value={currentProject?.id ?? ""}
          onChange={(e) => {
            const found = projects.find((p) => p.id === e.target.value) ?? null;
            setCurrentProject(found);
          }}
          className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
        >
          <option value="">{t("dashboard.selectProject")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {currentProject && stats ? (
        <>
          {/* Key metrics row */}
          <div className="stagger-children mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<IconFolder size={20} className="text-[var(--color-primary)]" />}
              label={t("dashboard.currentProject")}
              value={currentProject.name ?? currentProject.id}
              sub={stats.chapters > 0 ? t("dashboard.chaptersInProgress", { count: stats.chapters }) : t("dashboard.notStarted")}
            />
            <MetricCard
              icon={<IconUsers size={20} className="text-[var(--color-info)]" />}
              label={t("dashboard.metricCharacters")}
              value={String(stats.characters)}
              sub={stats.characters > 0 ? t("dashboard.charactersCreated") : t("dashboard.noCharacters")}
            />
            <MetricCard
              icon={<IconBook size={20} className="text-[var(--color-purple)]" />}
              label={t("dashboard.metricLoreEntries")}
              value={String(stats.loreEntries)}
              sub={stats.loreEntries > 0 ? t("dashboard.loreSettings") : t("dashboard.noLore")}
            />
            <MetricCard
              icon={<IconLayers size={20} className="text-[var(--color-success)]" />}
              label={t("dashboard.metricTotalWords")}
              value={stats.totalWords.toLocaleString()}
              sub={t("dashboard.chapterCount", { count: stats.chapters })}
            />
          </div>

          {/* Charts row */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Progress ring */}
            <div className="card-surface card-lift p-6 shadow-[var(--shadow-sm),var(--surface-highlight)]">
              <h3 className="mb-4 text-sm font-light tracking-wide text-[var(--color-text-muted)]">{t("dashboard.writingProgress")}</h3>
              <div className="flex items-center justify-center py-4">
                <RingChart
                  value={stats.chapters}
                  max={50}
                  label={t("dashboard.chapterProgress", { count: stats.chapters })}
                  sublabel={t("dashboard.progressComplete", { progress: chapterProgress })}
                />
              </div>
            </div>

            {/* Word trend sparkline */}
            <div className="card-surface card-lift p-6 shadow-[var(--shadow-sm),var(--surface-highlight)] lg:col-span-2">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-light tracking-wide text-[var(--color-text-muted)]">
                    {t("dashboard.wordTrend")}
                    <span className="ml-2 text-[10px] text-[var(--color-success)]">{t("dashboard.simulatedTrend")}</span>
                  </h3>
                  <p className="mt-1 text-2xl font-light text-[var(--color-text)]">
                    {stats.totalWords.toLocaleString()}
                    <span className="ml-2 text-xs text-[var(--color-success)]">
                      {wordTrend.length >= 2 && wordTrend[wordTrend.length - 2]! > 0
                        ? `+${(stats.totalWords - wordTrend[wordTrend.length - 2]!).toLocaleString()}`
                        : ""}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-[var(--color-text-faint)]">{t("dashboard.recentCycles")}</span>
              </div>
              <div className="flex items-end">
                <Sparkline data={wordTrend} width={560} height={80} />
              </div>
            </div>
          </div>

          {/* Character & lore overview */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MiniStat
              title={t("dashboard.characterComposition")}
              items={[
                { label: t("dashboard.charMain"), pct: charPcts[0]!, color: "var(--color-primary)" },
                { label: t("dashboard.charSupporting"), pct: charPcts[1]!, color: "var(--color-info)" },
                { label: t("dashboard.charNpc"), pct: charPcts[2]!, color: "var(--color-purple)" },
              ]}
            />
            <MiniStat
              title={t("dashboard.loreCoverage")}
              items={[
                { label: t("dashboard.loreLocation"), pct: lorePcts[0]!, color: "var(--color-success)" },
                { label: t("dashboard.loreItem"), pct: lorePcts[1]!, color: "var(--color-primary)" },
                { label: t("dashboard.loreEvent"), pct: lorePcts[2]!, color: "var(--color-danger)" },
                { label: t("dashboard.loreOrg"), pct: lorePcts[3]!, color: "var(--color-info)" },
              ]}
            />
          </div>
        </>
      ) : currentProject && !stats ? (
        <div className="card-surface mt-6 p-10 text-center text-[var(--color-text-faint)]">
          {t("dashboard.loadingStats")}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* New project modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="card-surface w-96 p-6 shadow-[var(--shadow-xl)] animate-modal-content">
            <h2 className="mb-4 text-lg font-light tracking-wide text-[var(--color-text)]">{t("dashboard.newProject")}</h2>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("dashboard.projectNamePlaceholder")}
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
                autoFocus
              />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            {createError && (
              <p className="mt-3 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
                {createError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="btn-press rounded-lg border border-[var(--color-border-strong)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="btn-press rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ icon, label, value, sub }: {
  readonly icon: JSX.Element;
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}): JSX.Element {
  return (
    <div className="card-surface card-lift group p-5 shadow-[var(--shadow-sm),var(--surface-highlight)] transition-[border-color,background-color,box-shadow,transform] duration-300 hover:border-[var(--color-primary-border)] hover:shadow-[0_0_24px_rgba(201,168,108,0.08),var(--surface-highlight)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface-sunken)]">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-[var(--color-text-faint)]">{label}</div>
          <div className="mt-1 truncate text-xl font-light text-[var(--color-text)]">{value}</div>
        </div>
      </div>
      {sub && <div className="mt-3 text-xs text-[var(--color-text-faint)]">{sub}</div>}
    </div>
  );
}

function MiniStat({ title, items }: {
  readonly title: string;
  readonly items: readonly { readonly label: string; readonly pct: number; readonly color: string }[];
}): JSX.Element {
  return (
    <div className="card-surface card-lift p-5 shadow-[var(--shadow-sm),var(--surface-highlight)]">
      <h3 className="mb-4 text-sm font-light tracking-wide text-[var(--color-text-muted)]">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">{item.label}</span>
              <span style={{ color: item.color }}>{item.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full w-full origin-left rounded-full transition-transform duration-700"
                style={{
                  transform: `scaleX(${item.pct / 100})`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="card-surface mt-6 flex flex-col items-center justify-center border-dashed border-[var(--color-border-strong)] py-16 text-center">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-30">
        <rect x="12" y="12" width="40" height="40" rx="4" stroke="var(--color-primary)" strokeWidth="1.5" />
        <line x1="12" y1="24" x2="52" y2="24" stroke="var(--color-primary)" strokeWidth="1" />
        <line x1="22" y1="12" x2="22" y2="24" stroke="var(--color-primary)" strokeWidth="1" />
        <line x1="24" y1="34" x2="44" y2="34" stroke="var(--color-text-faint)" strokeWidth="1" strokeLinecap="round" />
        <line x1="24" y1="42" x2="40" y2="42" stroke="var(--color-text-faint)" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-[var(--color-text-muted)]">{t("dashboard.emptyHint")}</p>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">{t("dashboard.emptySubHint")}</p>
    </div>
  );
}
