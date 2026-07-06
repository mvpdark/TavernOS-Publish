import { useEffect, type ReactNode } from "react";
import { useThemeStore, resolveTheme } from "../store/theme";
import type { JSX } from "react";

/**
 * Maps a ResolvedTheme to a record of CSS custom-property name → value pairs.
 * These are injected onto document.documentElement.style.
 */
function buildCssVars(
  resolved: ReturnType<typeof resolveTheme>,
): Record<string, string> {
  return {
    "--color-primary": resolved.primary,
    "--color-primary-hover": resolved.primaryHover,
    "--color-primary-500": resolved.primary500,
    "--color-primary-tint": resolved.primaryTint,
    "--color-primary-tint-strong": resolved.primaryTintStrong,
    "--color-primary-border": resolved.primaryBorder,
    "--color-bg": resolved.bg,
    "--color-hover-bg": resolved.hoverBg,
    "--color-surface": resolved.surface,
    "--color-surface-raised": resolved.surfaceRaised,
    "--color-surface-sunken": resolved.surfaceSunken,
    "--color-border": resolved.border,
    "--color-border-strong": resolved.borderStrong,
    "--color-border-subtle": resolved.borderSubtle,
    "--color-text": resolved.text,
    "--color-text-muted": resolved.textMuted,
    "--color-text-faint": resolved.textFaint,
    "--color-text-placeholder": resolved.textPlaceholder,
    "--color-primary-glow": resolved.primaryGlow,
    "--color-sidebar-bg": resolved.sidebarBg,
    "--color-sidebar-text": resolved.sidebarText,
    "--color-sidebar-active": resolved.sidebarActive,
    "--color-sidebar-hover": resolved.sidebarHover,
    "--color-sidebar-muted": resolved.sidebarMuted,
    "--color-danger": resolved.danger,
    "--color-danger-bg": resolved.dangerBg,
    "--color-danger-border": resolved.dangerBorder,
    "--color-success": resolved.success,
    "--color-success-bg": resolved.successBg,
    "--color-success-border": resolved.successBorder,
    "--color-warning-bg": resolved.warningBg,
    "--color-warning-text": resolved.warningText,
    "--color-info": resolved.info,
    "--color-info-bg": resolved.infoBg,
    "--color-info-border": resolved.infoBorder,
    "--color-purple": resolved.purple,
    "--color-purple-bg": resolved.purpleBg,
    "--color-purple-border": resolved.purpleBorder,
    "--color-overlay": resolved.overlay,
    "--font-size-base": `${resolved.fontSize}px`,
    "--radius-bubble": `${resolved.bubbleRadius}px`,
    "--bg-image": resolved.backgroundImage
      ? `url("${resolved.backgroundImage}")`
      : "none",
  };
}

const CUSTOM_CSS_ID = "tavernos-custom-css";

/**
 * ThemeProvider watches the theme store and injects CSS custom properties
 * onto the document root element. It also:
 *  - Sets `data-theme` attribute (light/dark) for CSS-selector-based theming.
 *  - Injects user-supplied custom CSS into a <style> element.
 *  - Listens for system color-scheme changes when mode is "auto".
 */
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const config = useThemeStore((s) => s.config);

  // Inject CSS variables + custom CSS whenever config changes
  useEffect(() => {
    const resolved = resolveTheme(config);
    const root = document.documentElement;
    const vars = buildCssVars(resolved);

    root.setAttribute("data-theme", resolved.effectiveMode);

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    // Inject or remove custom CSS
    let styleEl = document.getElementById(
      CUSTOM_CSS_ID,
    ) as HTMLStyleElement | null;
    if (resolved.customCss.trim()) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = CUSTOM_CSS_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = resolved.customCss;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [config]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (config.mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (): void => {
      const currentConfig = useThemeStore.getState().config;
      const resolved = resolveTheme(currentConfig);
      document.documentElement.setAttribute(
        "data-theme",
        resolved.effectiveMode,
      );
      // Re-apply all variables since mode changed
      const vars = buildCssVars(resolved);
      for (const [key, value] of Object.entries(vars)) {
        document.documentElement.style.setProperty(key, value);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [config.mode]);

  return <>{children}</>;
}
