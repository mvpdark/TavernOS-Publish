// Video page utilities: SSE stream consumer and display helpers.
//
// streamSsePost has been promoted to the shared API client so every page can
// reuse the same SSE consumption logic. Re-export it here so existing imports
// from "pages/video/utils" continue to work without touching Video.tsx.
export { streamSsePost } from "../../api/client.js";

/** Tailwind badge color classes for a review verdict. */
export function verdictColor(verdict: string): string {
  switch (verdict) {
    case "pass":
      return "bg-green-100 text-green-700";
    case "borderline":
      return "bg-yellow-100 text-yellow-700";
    case "fail":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/** Tailwind text color class for a review score (0-100). */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}
