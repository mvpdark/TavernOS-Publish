import { useTranslation } from "react-i18next";
import { TextArea } from "../../components/ui.tsx";
import type { SavedClip, VideoReviewResult } from "./types.js";
import { verdictColor, scoreColor } from "./utils.js";
import { proxyImageUrl } from "../../api/client.js";
import type { JSX } from "react";

/** Tailwind badge classes for an issue severity. */
function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "major":
      return "bg-orange-100 text-orange-700";
    case "minor":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/** Special background for compliance dimension issues (red-tinted to highlight risk). */
function dimensionBg(dimension: string): string {
  if (dimension === "compliance") return "bg-red-50";
  return "bg-gray-50";
}

/** Tailwind badge classes for a review grade (A/B/C/D/F). */
function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-700";
    case "B":
      return "bg-emerald-100 text-emerald-700";
    case "C":
      return "bg-yellow-100 text-yellow-700";
    case "D":
      return "bg-orange-100 text-orange-700";
    case "F":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

interface ReviewPanelProps {
  selectedClip: SavedClip | null;
  reviewing: boolean;
  reviewResult: VideoReviewResult | null;
  scriptContext: string;
  onScriptContextChange: (value: string) => void;
  onReview: () => void;
  onUseRerollPrompt: (prompt: string) => void;
}

/** Right column: clip details, script context input, and review results. */
export default function ReviewPanel({
  selectedClip,
  reviewing,
  reviewResult,
  scriptContext,
  onScriptContextChange,
  onReview,
  onUseRerollPrompt,
}: ReviewPanelProps): JSX.Element {
  const { t } = useTranslation();

  /** Translate a dimension key to its localized label, falling back to the raw key. */
  const dimensionLabel = (dimension: string): string =>
    t(`video.review.dimensions.${dimension}`, { defaultValue: dimension });

  return (
    <div className="overflow-y-auto rounded-lg bg-white p-5 shadow">
      <h2 className="mb-3 text-sm font-light">{t("video.review.title")}</h2>

      {!selectedClip ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-[var(--color-text-faint)]">
          {t("video.review.noReview")}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Clip details */}
          <div className="rounded-lg bg-[var(--color-surface-sunken)] p-3">
            <div className="text-xs font-medium text-[var(--color-text)]">
              {selectedClip.id}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
              {/* TODO: i18n — composite format "第X章 · 片段 Y" needs its own key */}
              第{selectedClip.chapterId}章 · 片段 {selectedClip.clipNumber}
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-muted)]">
              {selectedClip.prompt}
            </div>
            {selectedClip.videoUrl && (
              <video
                src={proxyImageUrl(selectedClip.videoUrl)}
                controls
                className="mt-2 w-full rounded-lg max-h-48"
              />
            )}
          </div>

          {/* Script context input */}
          <TextArea
            label={t("video.review.summary")} // TODO: i18n — "剧本上下文（用于审核参考）" needs its own key
            value={scriptContext}
            onChange={onScriptContextChange}
            rows={3}
          />

          <button
            onClick={onReview}
            disabled={reviewing}
            className="btn-press w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {/* TODO: i18n — "审核中..." / "执行审核" needs its own keys */}
            {reviewing ? "审核中..." : "执行审核"}
          </button>

          {/* Review result */}
          {reviewResult && (
            <div className="space-y-3 rounded-lg border p-4">
              {/* Verdict + Grade + Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${verdictColor(
                      reviewResult.verdict,
                    )}`}
                  >
                    {t(`video.review.verdict.${reviewResult.verdict}`, {
                      defaultValue: reviewResult.verdict,
                    })}
                  </span>
                  {reviewResult.grade && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColor(
                        reviewResult.grade,
                      )}`}
                      title={t("video.review.title")}
                    >
                      {reviewResult.grade}
                    </span>
                  )}
                </div>
                <span className={`text-2xl font-light ${scoreColor(reviewResult.score)}`}>
                  {reviewResult.score}
                </span>
              </div>

              {/* Summary */}
              {reviewResult.summary && (
                <div className="rounded bg-gray-50 p-2 text-xs text-[var(--color-text-muted)]">
                  <span className="font-medium text-[var(--color-text)]">
                    {t("video.review.summary")}：
                  </span>
                  {reviewResult.summary}
                </div>
              )}

              {/* Issues */}
              {(reviewResult.issues ?? []).length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
                    {/* TODO: i18n — "问题（N）" needs its own key */}
                    问题（{reviewResult.issues.length}）
                  </div>
                  <ul className="space-y-2">
                    {(reviewResult.issues ?? []).map((issue, i) => (
                      <li
                        key={i}
                        className={`rounded border border-gray-100 ${dimensionBg(issue.dimension)} p-2 text-xs`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${severityColor(
                              issue.severity,
                            )}`}
                          >
                            {t(`video.review.severity.${issue.severity}`, {
                              defaultValue: issue.severity,
                            })}
                          </span>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                            {dimensionLabel(issue.dimension)}
                          </span>
                        </div>
                        <div className="mt-1 text-[var(--color-text)]">
                          {issue.description}
                        </div>
                        {issue.fixInstruction && (
                          <div className="mt-1 text-[var(--color-text-muted)]">
                            {/* TODO: i18n — "修复建议：" needs its own key */}
                            <span className="font-medium text-amber-700">修复建议：</span>
                            {issue.fixInstruction}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Post-fix suggestion */}
              {reviewResult.postFixSuggestion && (
                <div className="rounded bg-amber-50 p-2">
                  <div className="mb-1 text-xs font-medium text-amber-700">
                    {t("video.review.postFix")}
                  </div>
                  <div className="text-xs text-amber-900">
                    {reviewResult.postFixSuggestion}
                  </div>
                </div>
              )}

              {/* Reroll prompt */}
              {reviewResult.rerollPrompt && (
                <div className="rounded bg-blue-50 p-2">
                  <div className="mb-1 text-xs font-medium text-blue-700">
                    {t("video.review.rerollPrompt")}
                  </div>
                  <div className="text-xs text-blue-900">
                    {reviewResult.rerollPrompt}
                  </div>
                  <button
                    onClick={() => onUseRerollPrompt(reviewResult.rerollPrompt!)}
                    className="btn-press mt-2 text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {/* TODO: i18n — "使用此提示词重新生成 →" needs its own key */}
                    使用此提示词重新生成 →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
