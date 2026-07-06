import { KIND_COLORS, KIND_LABELS } from "./constants.js";
import type { Asset } from "./types.js";
import type { JSX } from "react";

export interface AssetDetailProps {
  selectedAsset: Asset | null;
}

export function AssetDetail({ selectedAsset }: AssetDetailProps): JSX.Element {
  return (
    <div className="w-1/3 overflow-y-auto bg-white p-5">
      {!selectedAsset ? (
        <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-faint)]">
          选择一个资产查看详情
        </div>
      ) : (
        <div className="space-y-4">
          {/* Name + Kind */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${KIND_COLORS[selectedAsset.kind]}`}
              >
                {KIND_LABELS[selectedAsset.kind]}
              </span>
              <h2 className="text-lg font-light text-[var(--color-text)]">
                {selectedAsset.name}
              </h2>
            </div>
            {selectedAsset.aliases.length > 0 && (
              <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                别名: {selectedAsset.aliases.join(", ")}
              </div>
            )}
          </div>

          {/* Chapter range */}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-faint)]">首次出现: </span>
              <span className="font-medium">第 {selectedAsset.firstChapter} 章</span>
            </div>
            <div>
              <span className="text-[var(--color-text-faint)]">最后出现: </span>
              <span className="font-medium">第 {selectedAsset.lastChapter} 章</span>
            </div>
            <div>
              <span className="text-[var(--color-text-faint)]">出场次数: </span>
              <span className="font-medium">{selectedAsset.appearanceCount}</span>
            </div>
          </div>

          {/* Description */}
          {selectedAsset.description && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-[var(--color-text)]">描述</h3>
              <div className="whitespace-pre-wrap rounded-lg bg-[var(--color-surface-sunken)] p-3 text-sm text-[var(--color-text-muted)]">
                {selectedAsset.description}
              </div>
            </div>
          )}

          {/* Attributes */}
          {Object.keys(selectedAsset.attributes).length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-[var(--color-text)]">属性</h3>
              <div className="space-y-1">
                {Object.entries(selectedAsset.attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-sunken)] px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium text-[var(--color-text-muted)]">{key}</span>
                    <span className="text-[var(--color-text-faint)]">:</span>
                    <span className="text-[var(--color-text)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ID */}
          <div className="border-t pt-3">
            <div className="text-xs text-[var(--color-text-faint)]">ID: {selectedAsset.id}</div>
          </div>
        </div>
      )}
    </div>
  );
}
