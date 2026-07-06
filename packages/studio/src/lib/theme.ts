/**
 * Shared design tokens and theme constants for TavernOS.
 * Noir Atelier — the architecture of warmth within darkness.
 */

// ---------------------------------------------------------------------------
// Cover color palette — deterministic per name.
// Used by Library, Chat, DeepGame, character cards, and any card needing
// a gradient background. One palette, consistent across the entire app.
// ---------------------------------------------------------------------------

export interface CoverColor {
  readonly bg: string;      // Tailwind gradient classes (from-... to-...)
  readonly accent: string;  // Hex accent color
}

export const COVER_COLORS: readonly CoverColor[] = [
  { bg: "from-[#2A1810] to-[#1A0F08]", accent: "#C9A86C" },
  { bg: "from-[#102028] to-[#081418]", accent: "#78A0C8" },
  { bg: "from-[#281020] to-[#180810]", accent: "#C878A0" },
  { bg: "from-[#102818] to-[#08180F]", accent: "#78C8A0" },
  { bg: "from-[#281810] to-[#180F08]", accent: "#C8A078" },
  { bg: "from-[#181028] to-[#0F0818]", accent: "#A078C8" },
  { bg: "from-[#282010] to-[#181208]", accent: "#C8C078" },
  { bg: "from-[#102828] to-[#081818]", accent: "#78C8C8" },
];

/**
 * Deterministically pick a cover color from a name string.
 * Same name always returns the same color — stable across app restarts.
 */
export function coverColor(name: string | undefined): CoverColor {
  const safeName = name ?? "unknown";
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = ((hash << 5) - hash + safeName.charCodeAt(i)) | 0;
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length]!;
}

// ---------------------------------------------------------------------------
// Toast types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly type: ToastType;
  readonly duration: number;
}
