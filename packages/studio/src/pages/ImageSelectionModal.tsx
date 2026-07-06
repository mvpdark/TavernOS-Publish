import type { JSX } from "react";
import { Modal, BTN } from "../components/ui.tsx";
import { proxyImageUrl } from "../api/client.js";
import type { PersonaCard } from "../shared/types.js";

// ---------------------------------------------------------------------------
// ImageSelectionModal — 4-to-1 avatar picker modal.
//
// Shared between Layer 1 (pending characters) and Layer 2 (character cards)
// to eliminate the duplicate modal JSX that existed in Characters.tsx.
// ---------------------------------------------------------------------------

interface ImageSelectionModalProps {
  selectionCard: PersonaCard & { projectId?: string };
  currentAvatar?: string;
  selecting: boolean;
  onSelectImage: (url: string) => void;
  onClose: () => void;
  description?: string;
}

export function ImageSelectionModal({
  selectionCard,
  currentAvatar,
  selecting,
  onSelectImage,
  onClose,
  description,
}: ImageSelectionModalProps): JSX.Element {
  const images: string[] = Array.isArray(
    selectionCard.data.extensions?.tavernos?.allImages,
  )
    ? (selectionCard.data.extensions!.tavernos!.allImages as string[])
    : [];

  return (
    <Modal
      title={`挑选头像 — ${selectionCard.data.name}`}
      onClose={() => !selecting && onClose()}
      footer={
        <button
          onClick={onClose}
          disabled={selecting}
          className={BTN.ghost}
        >
          {selecting ? "处理中..." : "取消"}
        </button>
      }
    >
      <p className="mb-4 text-sm text-gray-400">
        {description ?? "选择一张作为角色头像，其余 3 张将自动删除。"}
      </p>
      <div className="grid grid-cols-2 gap-4">
        {images.map((url, i) => {
          const isSelected = url === currentAvatar;
          return (
            <button
              key={url}
              disabled={selecting}
              onClick={() => onSelectImage(url)}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-[#C9A86C]"
                  : "border-transparent hover:border-[#C9A86C]/40"
              } ${selecting ? "cursor-wait opacity-60" : "cursor-pointer"}`}
            >
              <img
                src={proxyImageUrl(url)}
                alt={`候选 ${i + 1}`}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <span className="text-xs text-white/90">候选 {i + 1}</span>
              </div>
              {isSelected && (
                <div className="absolute right-2 top-2 rounded-full bg-[#C9A86C] px-2 py-0.5 text-xs text-black">
                  当前
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
