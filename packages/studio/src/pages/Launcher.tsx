import type { JSX } from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CategoryCard {
  readonly title: string;
  readonly subtitle: string;
  readonly path: string;
  readonly icon: JSX.Element;
  readonly items: readonly string[];
}

// ---------------------------------------------------------------------------
// Card component with click animation state
// ---------------------------------------------------------------------------

function CategoryCardItem({
  cat,
  onClick,
  isExiting,
  isActive,
}: {
  cat: CategoryCard;
  onClick: () => void;
  isExiting: boolean;
  isActive: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={isExiting}
      className={
        "card-lift group relative flex flex-col gap-5 overflow-hidden rounded-[var(--radius-card)] border p-7 text-left " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] " +
        (isActive
          ? "pointer-events-none border-[var(--color-primary-border)] bg-[var(--color-surface-hover)] shadow-[0_0_40px_rgba(201,168,108,0.15),inset_0_1px_0_rgba(255,255,255,0.03)]"
          : isExiting
            ? "pointer-events-none border-[var(--color-border)] bg-[var(--color-surface)] opacity-20 transition-opacity duration-300"
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-[0_0_24px_rgba(201,168,108,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]")
      }
    >
      {/* Icon */}
      <div
        className={
          "transition-colors duration-300 " +
          (isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-placeholder)] group-hover:text-[var(--color-primary)]")
        }
      >
        {cat.icon}
      </div>

      {/* Title + subtitle */}
      <div className="flex flex-col">
        <h2 className="text-base font-normal text-[var(--color-text)]">{cat.title}</h2>
        <p className="mt-1 text-xs text-[var(--color-text-faint)]">{cat.subtitle}</p>
      </div>

      {/* Arrow indicator */}
      <div
        className={
          "absolute right-6 top-1/2 -translate-y-1/2 transition-[transform,opacity] duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-[-8px] " +
          (isActive
            ? ""
            : "text-[var(--color-text-placeholder)] group-hover:text-[var(--color-primary)]")
        }
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dashboard card (same style, included in grid)
// ---------------------------------------------------------------------------

function DashboardCard({
  onClick,
  isExiting,
  isActive,
}: {
  onClick: () => void;
  isExiting: boolean;
  isActive: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={isExiting}
      className={
        "card-lift group relative flex flex-col gap-5 overflow-hidden rounded-[var(--radius-card)] border p-7 text-left " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] " +
        (isActive
          ? "pointer-events-none border-[var(--color-primary-border)] bg-[var(--color-surface-hover)] shadow-[0_0_40px_rgba(201,168,108,0.15),inset_0_1px_0_rgba(255,255,255,0.03)]"
          : isExiting
            ? "pointer-events-none border-[var(--color-border)] bg-[var(--color-surface)] opacity-20 transition-opacity duration-300"
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-[0_0_24px_rgba(201,168,108,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]")
      }
    >
      <div
        className={
          "transition-colors duration-300 " +
          (isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-placeholder)] group-hover:text-[var(--color-primary)]")
        }
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </div>
      <div className="flex flex-col">
        <h2 className="text-base font-normal text-[var(--color-text)]">{t("launcher.dashboardTitle")}</h2>
        <p className="mt-1 text-xs text-[var(--color-text-faint)]">{t("launcher.dashboardSubtitle")}</p>
      </div>
      <div
        className={
          "absolute right-6 top-1/2 -translate-y-1/2 transition-[transform,opacity] duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-[-8px] " +
          (isActive
            ? ""
            : "text-[var(--color-text-placeholder)] group-hover:text-[var(--color-primary)]")
        }
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Launcher page
// ---------------------------------------------------------------------------

export default function Launcher(): JSX.Element {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [exitTitle, setExitTitle] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  // Timer for the post-animation navigation — cleared on a new click (race
  // guard) and on unmount so we never navigate after the component is gone.
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories: readonly CategoryCard[] = [
    {
      title: t("launcher.writeTitle"),
      subtitle: t("launcher.writeSubtitle"),
      path: "/write",
      items: [t("launcher.writeItemLibrary"), t("launcher.writeItemEditor")],
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7.5 18.5L3 20L4.5 15.5L16.5 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.5 5.5L17.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: t("launcher.assetsTitle"),
      subtitle: t("launcher.assetsSubtitle"),
      path: "/assets",
      items: [t("launcher.assetsItemCharacters"), t("launcher.assetsItemScenes"), t("launcher.assetsItemProps")],
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: t("launcher.worldTitle"),
      subtitle: t("launcher.worldSubtitle"),
      path: "/world",
      items: [t("launcher.worldItemLorebook"), t("launcher.worldItemAssets")],
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M3 12H21M12 3C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21C9.5 18.5 8 15.5 8 12C8 8.5 9.5 5.5 12 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: t("launcher.studioTitle"),
      subtitle: t("launcher.studioSubtitle"),
      path: "/studio",
      items: [t("launcher.studioItemWorkshop"), t("launcher.studioItemVideo"), t("launcher.studioItemAnalytics")],
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: t("launcher.systemTitle"),
      subtitle: t("launcher.systemSubtitle"),
      path: "/system",
      items: [t("launcher.systemItemSettings"), t("launcher.systemItemAppearance")],
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M12 2V4M12 20V22M4 12H2M22 12H20M5 5L6.5 6.5M17.5 17.5L19 19M19 5L17.5 6.5M6.5 17.5L5 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  // Reset animation state when component mounts (e.g. user navigates back)
  useEffect(() => {
    setExitTitle(null);
    setActivePath(null);
  }, []);

  // Clear any pending navigation timer on unmount.
  useEffect(() => () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  }, []);

  // --- Haptic + audio feedback ---
  const playClickSound = useCallback(() => {
    try {
      // Vibrate on supported devices (mobile)
      if ("vibrate" in navigator) {
        navigator.vibrate(15);
      }
      // Create crisp "ding" sound via Web Audio API
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Two layered oscillators for a rich, crystalline chime
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.connect(ctx.destination);

      // Fundamental tone (warm)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1318.5, now); // E6
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.25, now + 0.005);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(g1).connect(master);

      // Overtone (bright shimmer)
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(2093.0, now); // C7
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, now);
      g2.gain.linearRampToValueAtTime(0.12, now + 0.003);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(g2).connect(master);

      // Very high sparkle
      const osc3 = ctx.createOscillator();
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(3136.0, now); // G7
      const g3 = ctx.createGain();
      g3.gain.setValueAtTime(0, now);
      g3.gain.linearRampToValueAtTime(0.06, now + 0.002);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc3.connect(g3).connect(master);

      // Master envelope: quick attack, smooth decay
      master.gain.linearRampToValueAtTime(1, now + 0.005);
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
      osc3.stop(now + 0.5);

      // Close context after sound finishes
      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 600);
    } catch {
      // Audio not available — silently ignore
    }
  }, []);

  const handleNavigate = useCallback(
    (title: string, path: string) => {
      if (exitTitle) return; // already animating
      playClickSound();
      setExitTitle(title);
      setActivePath(path);
      // Wait for the zoom-fade animation (~750ms), then navigate.
      // Clear any pending timer first so rapid clicks don't race.
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        navigate(path);
      }, 750);
    },
    [exitTitle, navigate, playClickSound],
  );

  return (
    <>
      {/* Language switcher — subtle text link top-right */}
      <div className="fixed right-8 top-8 z-50">
        <button
          onClick={() => {
            const next = i18n.language === "zh" ? "en" : "zh";
            i18n.changeLanguage(next);
          }}
          className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-faint)]/40 transition-colors hover:text-[var(--color-text-faint)]"
        >
          ZH / EN
        </button>
      </div>
      {/* Page content */}
      <div
        className="flex min-h-screen flex-col items-center justify-center px-8 py-20"
        style={{
          opacity: exitTitle ? 0 : 1,
          transition: "opacity 0.4s ease-in 0.2s",
        }}
      >
        {/* Brand */}
        <div className="mb-20 flex flex-col items-center">
          <h1 className="text-4xl font-light tracking-[0.25em] text-[var(--color-primary)]">TAVERNOS</h1>
          <p className="mt-2 text-xs tracking-[0.15em] uppercase text-[var(--color-text-faint)]">{t("launcher.tagline")}</p>
        </div>

        {/* Category cards */}
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <CategoryCardItem
              key={cat.path}
              cat={cat}
              onClick={() => handleNavigate(cat.title, cat.path)}
              isExiting={exitTitle !== null}
              isActive={activePath === cat.path}
            />
          ))}

          {/* Dashboard card */}
          <DashboardCard
            onClick={() => handleNavigate(t("launcher.dashboardTitle"), "/dashboard")}
            isExiting={exitTitle !== null}
            isActive={activePath === "/dashboard"}
          />
        </div>

        {/* Footer */}
        <div className="mt-20 flex flex-col items-center gap-2">
          <p className="text-[11px] italic tracking-wide text-[var(--color-text-faint)]/60">Darkness is not the absence of design.</p>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-text-faint)]/40">NOIR ATELIER · TAVERNOS</p>
        </div>
      </div>

      {/* Exit transition overlay */}
      {exitTitle && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            pointerEvents: "none",
            background: "radial-gradient(circle at center, rgba(10,10,10,0.6) 0%, rgba(5,5,5,0.95) 70%)",
            animation: "exitBgIn 0.7s ease-out forwards",
          }}
        >
          {/* Zooming title */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "var(--color-primary)",
              fontSize: "clamp(48px, 10vw, 120px)",
              fontWeight: 300,
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
              animation: "titleZoomFade 0.75s cubic-bezier(0.16,1,0.3,1) forwards",
              textShadow: "0 0 60px rgba(201,168,108,0.3)",
            }}
          >
            {exitTitle}
          </div>
        </div>
      )}
    </>
  );
}
