// Video module shared constants and display helpers.
//
// Extracted from CharacterPanel, ScriptParserPanel, PromptTemplatePanel,
// and BillingPanel to eliminate duplicate definitions across components.
// All values are identical to the originals — no behavioral changes.

// ---------------------------------------------------------------------------
// Apple system font style
// ---------------------------------------------------------------------------

/** Apple system font stack for a native, elegant look. */
export const APPLE_FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
} as const;

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * Format a duration in seconds to a human-readable string.
 *
 * Examples: 30 -> "30秒", 90 -> "1分30秒", 120 -> "2分", 0 -> "—"
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分`;
}

/**
 * Map a gender string to its Chinese label.
 *
 * Recognised values: "male" -> "男", "female" -> "女", everything else -> "其他".
 */
export function genderLabel(gender: string): string {
  switch (gender) {
    case "male":
      return "男";
    case "female":
      return "女";
    default:
      return "其他";
  }
}

/**
 * Tailwind badge class for a gender value.
 *
 * Returns a background + text colour pair suitable for a small pill badge.
 */
export function genderBadge(gender: string): string {
  switch (gender) {
    case "male":
      return "bg-blue-100 text-blue-700";
    case "female":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
