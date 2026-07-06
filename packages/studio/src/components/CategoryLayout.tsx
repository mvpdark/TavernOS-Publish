import type { JSX, ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconChevron } from "./Icons.js";
import LanguageSwitcher from "./LanguageSwitcher.js";

export interface SubNavItem {
  readonly to: string;
  readonly label: string;
  readonly end?: boolean;
}

export interface CategoryLayoutProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly subNav: readonly SubNavItem[];
  readonly children?: ReactNode;
}

/**
 * Build a breadcrumb trail for the given pathname.
 * Uses i18n keys for route labels so breadcrumbs respect the active language.
 * Falls back to the route segment if no translation is available.
 */
function buildBreadcrumbs(
  pathname: string,
  t: (key: string) => string,
): Array<{ label: string; to: string }> {
  const crumbs: Array<{ label: string; to: string }> = [
    { label: t("breadcrumb.home"), to: "/" },
  ];

  // Route path → i18n key mapping
  const ROUTE_I18N_KEYS: Record<string, string> = {
    "/write": "nav.write",
    "/write/library": "nav.library",
    "/write/editor": "nav.editor",
    "/write/blueprint": "nav.blueprint",
    "/write/create": "common.create",
    "/write/style": "nav.styleLibrary",
    "/write/deep-game": "nav.deepGame",
    "/assets": "nav.assets",
    "/assets/characters": "nav.characters",
    "/assets/scenes": "nav.scenes",
    "/assets/props": "nav.props",
    "/world": "nav.world",
    "/world/lorebook": "nav.lorebook",
    "/world/assets": "nav.assets",
    "/studio": "nav.studio",
    "/studio/workshop": "nav.workshop",
    "/studio/video": "nav.video",
    "/studio/analytics": "nav.analytics",
    "/system": "nav.system",
    "/system/settings": "common.settings",
    "/system/appearance": "common.appearance",
  };

  // Walk path segments to build breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";
  for (const seg of segments) {
    currentPath += "/" + seg;
    const i18nKey = ROUTE_I18N_KEYS[currentPath];
    const label = i18nKey ? t(i18nKey) : seg;
    crumbs.push({ label, to: currentPath });
  }
  return crumbs;
}

export default function CategoryLayout({
  title,
  subtitle,
  subNav,
  children,
}: CategoryLayoutProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const breadcrumbs = buildBreadcrumbs(location.pathname, t);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar: back button + breadcrumbs + title */}
      <header className="flex items-center gap-4 border-b border-[var(--color-border)] px-8 py-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2 rounded"
          aria-label={t("common.backToHome")}
        >
          <IconArrowLeft size={16} />
        </button>

        {/* Breadcrumb trail */}
        <nav className="flex items-center gap-1 text-xs" aria-label={t("breadcrumb.breadcrumbNav")}>
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={crumb.to} className="flex items-center gap-1">
                {i > 0 && (
                  <IconChevron size={12} direction="right" className="text-[var(--color-border)]" />
                )}
                {isLast ? (
                  <span className="text-[var(--color-primary)]" aria-current="page">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => navigate(crumb.to)}
                    className="text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 rounded"
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="flex flex-col items-end gap-0.5">
              <h1 className="text-lg font-normal tracking-wide text-[var(--color-text)]">{title}</h1>
              {subtitle && (
                <span className="text-xs tracking-wide text-[var(--color-text-faint)]">{subtitle}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sub-navigation tabs with animated indicator */}
      <nav className="relative flex items-center gap-1 border-b border-[var(--color-border)] px-8 py-0">
        {subNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 rounded ${
                isActive
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.label}
                <span
                  className={`tab-indicator absolute bottom-0 left-0 h-0.5 w-full origin-center bg-[var(--color-primary)] ${isActive ? "scale-x-100" : "scale-x-0"}`}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Content area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
