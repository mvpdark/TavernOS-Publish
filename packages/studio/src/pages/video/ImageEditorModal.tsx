// ImageEditorModal — full-screen modal wrapper for the ImageEditor component.

import { useEffect } from "react";
import type { JSX } from "react";
import { IconX } from "../../components/Icons.tsx";
import ImageEditor from "./ImageEditor.js";

interface ImageEditorModalProps {
  open: boolean;
  imageUrl?: string;
  onExport: (editedImageUrl: string, maskImageUrl?: string) => void;
  onClose: () => void;
}

const APPLE_FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
} as const;

export default function ImageEditorModal({
  open,
  imageUrl,
  onExport,
  onClose,
}: ImageEditorModalProps): JSX.Element | null {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={APPLE_FONT_STYLE}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
          <h2 className="text-sm font-medium text-[var(--color-text)]">
            图片编辑器 — 裁剪 / 标注 / 蒙版
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-faint)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)]"
            title="关闭 (Esc)"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-hidden">
          <ImageEditor
            imageUrl={imageUrl}
            onExport={onExport}
            onClose={onClose}
            maxWidth={900}
            maxHeight={700}
          />
        </div>
      </div>
    </div>
  );
}
