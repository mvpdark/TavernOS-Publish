// Shared constants and helpers for the Group Chat page.

/** Color palette for character bubbles (cycle through distinct hues). */
export const BUBBLE_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
] as const;

export function colorForIndex(index: number): (typeof BUBBLE_COLORS)[number] {
  return BUBBLE_COLORS[index % BUBBLE_COLORS.length]!;
}

// CJK_FONT is sourced from the central lib (see M11 deduplication).
export { CJK_FONT } from "../../lib/constants.js";
