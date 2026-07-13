// CharacterImageSection.tsx
// ---------------------------------------------------------------------------
// Character image + three-view generation section extracted from
// CharacterDetailPanel.
//
// Contains: three-view generate button, image display (three-view or
// avatar), manual image upload button, upload error display.
// ---------------------------------------------------------------------------

import { useRef, type JSX } from "react";
import { proxyImageUrl } from "../../api/client.js";

interface CharacterImageSectionProps {
  cardName: string;
  displayUrl: string | undefined;
  threeViewUrl: string | undefined;
  generating: boolean;
  uploadingImage: boolean;
  uploadError: string | null;
  onGenerateThreeView: () => void;
  onImageUpload: (file: File) => void;
}

export default function CharacterImageSection({
  cardName,
  displayUrl,
  threeViewUrl,
  generating,
  uploadingImage,
  uploadError,
  onGenerateThreeView,
  onImageUpload,
}: CharacterImageSectionProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* 一键生成三视图按钮 */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onGenerateThreeView}
          disabled={generating}
          className="rounded-lg bg-[#C9A86C] px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#D4B87E] disabled:opacity-50"
        >
          {generating ? "生成中..." : "一键生成三视图"}
        </button>
      </div>

      {/* 角色图片 + 手动上传 */}
      <div className="relative">
        {displayUrl ? (
          <div className="overflow-hidden rounded-lg">
            {threeViewUrl ? (
              <div className="relative w-full overflow-hidden rounded-lg">
                <img
                  src={proxyImageUrl(threeViewUrl)}
                  alt={cardName}
                  className="w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <img
                src={proxyImageUrl(displayUrl)}
                alt={cardName}
                className="h-48 w-full object-cover"
              />
            )}
          </div>
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A]">
            {uploadingImage ? (
              <span className="animate-pulse text-xs text-[#C9A86C]">上传中…</span>
            ) : (
              <span className="text-3xl text-gray-700">👤</span>
            )}
          </div>
        )}

        {/* 手动上传图片按钮 */}
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageUpload(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="rounded-lg border border-[rgba(201,168,108,0.3)] px-3 py-1.5 text-xs text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)] disabled:opacity-50"
          >
            {uploadingImage ? "上传中…" : "📷 上传图片"}
          </button>
          {displayUrl && !threeViewUrl && (
            <span className="text-[10px] text-gray-500">上传后将替换当前头像</span>
          )}
        </div>
        {uploadError && (
          <p className="mt-1 text-xs text-red-400">{uploadError}</p>
        )}
      </div>
    </>
  );
}
