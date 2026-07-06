import type { JSX } from "react";
import { proxyImageUrl } from "../api/client.js";
import type { PendingCharacter } from "./characters-utils.js";

// ---------------------------------------------------------------------------
// Pending character strip — horizontal scroll of 4-to-1 avatar candidates
// ---------------------------------------------------------------------------

export function PendingCharacterStrip({
  pendingCharacters,
  onSelect,
}: {
  pendingCharacters: PendingCharacter[];
  onSelect: (pc: PendingCharacter) => void;
}): JSX.Element | null {
  if (pendingCharacters.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">📂</span>
        <h2 className="text-sm font-medium text-[#C9685A]">待挑选头像</h2>
        <span className="text-xs text-gray-600">
          {pendingCharacters.length} 个角色待确认
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {pendingCharacters.map((pc) => (
          <button
            key={pc.filename}
            onClick={() => onSelect(pc)}
            className="group relative flex-shrink-0 overflow-hidden rounded-lg border border-[rgba(201,104,90,0.2)] bg-[#141414] transition-all hover:border-[#C9685A]/40"
            style={{ width: 150 }}
          >
            <div className="relative h-32 bg-[#0A0A0A]">
              <img
                src={proxyImageUrl((pc.allImages?.[0]) ?? pc.avatar)}
                alt={pc.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
              <span className="absolute bottom-1.5 right-1.5 rounded bg-[rgba(201,104,90,0.8)] px-1.5 py-0.5 text-[10px] text-white">
                4选1 →
              </span>
            </div>
            <div className="p-2">
              <p className="truncate text-sm text-[#E8E8E8]">{pc.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-gray-500">{pc.projectId}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
