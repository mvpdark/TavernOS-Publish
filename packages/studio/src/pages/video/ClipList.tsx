import { useState } from "react";
import type { JSX, DragEvent as ReactDragEvent } from "react";
import type { SavedClip } from "./types.js";
import { ConfirmDialog } from "../../components/ui.tsx";
import { IconGripVertical, IconTrash2, IconRefresh } from "../../components/Icons.tsx";
import { proxyImageUrl } from "../../api/client.js";

// TODO: i18n — This component contains hardcoded Chinese strings that should be migrated to t() calls.
//   Key strings to migrate:
//   - "视频片段" → needs its own key (video.clipListTitle or similar)
//   - "加载中..." → common.loading
//   - "刷新" → common.refresh
//   - "暂无视频片段" → video.noClips
//   - "缩略图" (alt text) → needs its own key
//   - "第X章 · 片段 Y" → composite format, needs its own key
//   - "选择此片段参与合成" (title) → needs its own key
//   - "删除片段" (title/aria-label) → video.deleteClip
//   - "确定删除此片段？" → needs its own key

interface ClipListProps {
  clips: SavedClip[];
  selectedClipId: string | null;
  clipsLoading: boolean;
  onRefresh: () => void;
  onSelectClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onReorder: (clipIds: string[]) => void;
  /** Set of clip IDs selected for composition. */
  composeClipIds: Set<string>;
  /** Toggle a clip's inclusion in the composition selection. */
  onToggleComposeClip: (clipId: string) => void;
}

/** Center column: scrollable list of generated video clips with selection, delete, drag reorder, and compose checkboxes. */
export default function ClipList({
  clips,
  selectedClipId,
  clipsLoading,
  onRefresh,
  onSelectClip,
  onDeleteClip,
  onReorder,
  composeClipIds,
  onToggleComposeClip,
}: ClipListProps): JSX.Element {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDragStart = (e: ReactDragEvent, clipId: string) => {
    setDraggedId(clipId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", clipId);
  };

  const handleDragOver = (e: ReactDragEvent, clipId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== clipId) {
      setDragOverId(clipId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: ReactDragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Reorder clips array
    const newClips = [...clips];
    const fromIdx = newClips.findIndex((c) => c.id === draggedId);
    const toIdx = newClips.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = newClips.splice(fromIdx, 1);
    newClips.splice(toIdx, 0, moved);

    // Notify parent of new order
    onReorder(newClips.map((c) => c.id));

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteClip(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-light">视频片段</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {clips.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={clipsLoading}
          className="btn-press flex items-center gap-1 text-xs text-indigo-600 hover:underline disabled:opacity-50"
        >
          <IconRefresh size={12} />
          {clipsLoading ? "加载中..." : "刷新"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {clips.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            暂无视频片段
          </div>
        ) : (
          <div className="space-y-2">
            {clips.map((clip) => (
              <div
                key={clip.id}
                draggable
                onDragStart={(e) => handleDragStart(e, clip.id)}
                onDragOver={(e) => handleDragOver(e, clip.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, clip.id)}
                onDragEnd={handleDragEnd}
                className={`group relative rounded-lg border p-3 transition-all ${
                  selectedClipId === clip.id
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-gray-200 hover:bg-gray-50"
                } ${draggedId === clip.id ? "opacity-40" : ""} ${
                  dragOverId === clip.id ? "border-t-4 border-t-indigo-400" : ""
                } cursor-grab active:cursor-grabbing`}
              >
                {/* Drag handle indicator */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconGripVertical size={14} />
                </div>

                <div
                  onClick={() => onSelectClip(clip.id)}
                  className="ml-3 flex items-start gap-2"
                >
                  {/* Thumbnail */}
                  {clip.thumbnailUrl ? (
                    <img
                      src={proxyImageUrl(clip.thumbnailUrl)}
                      alt="缩略图"
                      className="h-12 w-20 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-gray-700">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* Compose selection checkbox */}
                      <input
                        type="checkbox"
                        checked={composeClipIds.has(clip.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleComposeClip(clip.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        title="选择此片段参与合成"
                      />
                      <span className="text-xs font-medium text-gray-700">
                        第{clip.chapterId}章 · 片段 {clip.clipNumber}
                      </span>
                      {clip.lastReview && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            clip.lastReview.verdict === "pass"
                              ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                              : clip.lastReview.verdict === "fail"
                                ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                                : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                          }`}
                          title={`Score: ${clip.lastReview.score}`}
                        >
                          {clip.lastReview.score}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {clip.prompt}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {clip.duration}s · {clip.generateConfig.model}
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        clip.status === "completed"
                          ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {clip.status}
                    </span>
                    {/* Delete button — visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(clip.id);
                      }}
                      className="btn-press ml-1 rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover:opacity-100"
                      title="删除片段"
                      aria-label="删除片段"
                    >
                      <IconTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <ConfirmDialog
          message="确定删除此片段？"
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
