import { create } from "zustand";
import {
  DEFAULT_PRESET,
  getPreset,
  type PresetColors,
  type PresetTheme,
} from "../themes/presets";
import { apiPut } from "../api/client.js";

// ---------------------------------------------------------------------------
// Theme configuration types
// ---------------------------------------------------------------------------

export type ThemeMode = "light" | "dark" | "auto";

export interface ThemeConfig {
  /** Light, dark, or follow system preference. */
  mode: ThemeMode;
  /** Preset theme id (default, warm, dark-night, ink, forest, ocean, sunset, lavender, crimson, mono). */
  preset: string;
  /** Custom primary color override (hex). Empty string = use preset default. */
  primaryColor: string;
  /** Background image URL. Empty string = none. */
  backgroundImage: string;
  /** Raw custom CSS string appended after variable injection. */
  customCss: string;
  /** Base font size in pixels (12-20). */
  fontSize: number;
  /** Chat bubble border radius in pixels (0-24). */
  bubbleRadius: number;
}

/**
 * Alias for ThemeConfig — matches the server-side AppearanceConfig shape
 * (packages/studio/server/context.ts). The two types are structurally
 * identical; this alias lets frontend code use the server's naming when
 * communicating with the /api/appearance endpoint.
 */
export type AppearanceConfig = ThemeConfig;

const STORAGE_KEY = "tavernos-theme";
// Bumped when the default config changes in a way that should override
// previously-saved user configs. v2: Noir Atelier UI is dark-only, so any
// config saved as "light" (the old default) is migrated to "dark".
const STORAGE_VERSION_KEY = "tavernos-theme-version";
const CURRENT_STORAGE_VERSION = 2;

export const DEFAULT_CONFIG: ThemeConfig = {
  mode: "dark",
  preset: DEFAULT_PRESET,
  primaryColor: "",
  backgroundImage: "",
  customCss: "",
  fontSize: 14,
  bubbleRadius: 8,
};

// ---------------------------------------------------------------------------
// Resolved theme — the actual color values applied to the DOM
// ---------------------------------------------------------------------------

export interface ResolvedTheme extends PresetColors {
  effectiveMode: "light" | "dark";
  backgroundImage: string;
  customCss: string;
  fontSize: number;
  bubbleRadius: number;
}

/** Resolve the effective dark/light mode, accounting for "auto". */
export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }
  return mode;
}

/** Darken (negative percent) or lighten (positive percent) a hex color. */
export function shadeHex(hex: string, percent: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const num = parseInt(cleaned, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return (
    "#" +
    ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
  );
}

/** Parse a hex color to { r, g, b } components. Returns null for invalid hex. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/** Convert a hex color to an rgba() string with the given alpha (0–1). */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/**
 * Resolve the full theme: look up the preset, pick light/dark colors,
 * and apply user overrides (custom primary color).
 */
export function resolveTheme(config: ThemeConfig): ResolvedTheme {
  const preset: PresetTheme =
    getPreset(config.preset) ?? getPreset(DEFAULT_PRESET)!;
  const effectiveMode = resolveMode(config.mode);
  const base = preset[effectiveMode];

  // Apply custom primary color override
  const colors: PresetColors = config.primaryColor
    ? {
        ...base,
        primary: config.primaryColor,
        primaryHover: shadeHex(config.primaryColor, -15),
        primary500: shadeHex(config.primaryColor, 10),
        primaryTint: hexToRgba(config.primaryColor, 0.08),
        primaryTintStrong: hexToRgba(config.primaryColor, 0.15),
        primaryBorder: hexToRgba(config.primaryColor, 0.3),
        primaryGlow: hexToRgba(config.primaryColor, 0.12),
      }
    : { ...base };

  return {
    ...colors,
    effectiveMode,
    backgroundImage: config.backgroundImage,
    customCss: config.customCss,
    fontSize: config.fontSize,
    bubbleRadius: config.bubbleRadius,
  };
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

function loadFromStorage(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    const config = { ...DEFAULT_CONFIG, ...parsed };
    // One-time migration: configs saved before v2 defaulted to "light" mode,
    // which renders dark text on the dark-only Noir Atelier UI (invisible).
    // Force dark for outdated configs so existing users get a usable theme.
    const storedVersion = Number(
      localStorage.getItem(STORAGE_VERSION_KEY) || "1",
    );
    if (storedVersion < CURRENT_STORAGE_VERSION) {
      config.mode = "dark";
    }
    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveToStorage(config: ThemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem(
      STORAGE_VERSION_KEY,
      String(CURRENT_STORAGE_VERSION),
    );
  } catch {
    // Ignore storage errors (e.g. private browsing)
  }
}

// ---------------------------------------------------------------------------
// Backend sync (best-effort)
// ---------------------------------------------------------------------------

async function syncToBackend(config: ThemeConfig): Promise<void> {
  try {
    // Use the shared API client (includes timeout + retry) instead of a raw
    // fetch. BASE_URL ("/api") is prepended by the client, so the path is
    // "/appearance" → "/api/appearance".
    await apiPut("/appearance", config);
  } catch {
    // Backend sync is best-effort; ignore network errors
  }
}

function persistConfig(config: ThemeConfig): void {
  saveToStorage(config);
  void syncToBackend(config);
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

interface ThemeState {
  config: ThemeConfig;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: string) => void;
  setPrimaryColor: (color: string) => void;
  setBackgroundImage: (url: string) => void;
  setCustomCss: (css: string) => void;
  setFontSize: (size: number) => void;
  setBubbleRadius: (radius: number) => void;
  setConfig: (config: Partial<ThemeConfig>) => void;
  reset: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  config:
    typeof window !== "undefined" ? loadFromStorage() : DEFAULT_CONFIG,
  setMode: (mode) => {
    const config = { ...get().config, mode };
    set({ config });
    persistConfig(config);
  },
  setPreset: (preset) => {
    const config = { ...get().config, preset };
    set({ config });
    persistConfig(config);
  },
  setPrimaryColor: (primaryColor) => {
    const config = { ...get().config, primaryColor };
    set({ config });
    persistConfig(config);
  },
  setBackgroundImage: (backgroundImage) => {
    const config = { ...get().config, backgroundImage };
    set({ config });
    persistConfig(config);
  },
  setCustomCss: (customCss) => {
    // Security: Custom CSS is user-provided and injected into a <style> tag
    // (see ThemeProvider). In a desktop-app context this is acceptable since
    // the user is editing their own theme. CSS cannot execute arbitrary JS, but
    // url() references could load external resources. Consider sanitizing
    // url()/@import to data: or same-origin only for additional safety.
    const config = { ...get().config, customCss };
    set({ config });
    persistConfig(config);
  },
  setFontSize: (fontSize) => {
    const config = { ...get().config, fontSize };
    set({ config });
    persistConfig(config);
  },
  setBubbleRadius: (bubbleRadius) => {
    const config = { ...get().config, bubbleRadius };
    set({ config });
    persistConfig(config);
  },
  setConfig: (partial) => {
    const config = { ...get().config, ...partial };
    set({ config });
    persistConfig(config);
  },
  reset: () => {
    set({ config: DEFAULT_CONFIG });
    persistConfig(DEFAULT_CONFIG);
  },
}));
