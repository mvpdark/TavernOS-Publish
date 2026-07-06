// Character selection sidebar — presentational component.
// Receives character list, current selection, and select callback as props.

import type { PersonaCard } from "./types.js";
import type { JSX } from "react";

export interface ChatSidebarProps {
  characters: PersonaCard[];
  selectedChar: string;
  onSelectChar: (filename: string) => void;
}

export default function ChatSidebar({
  characters,
  selectedChar,
  onSelectChar,
}: ChatSidebarProps): JSX.Element {
  return (
    <div className="w-56 shrink-0 border-r border-[var(--color-border)] bg-gray-50">
      <div className="px-4 py-3 text-sm font-light">选择角色</div>
      <div className="overflow-y-auto">
        {characters.length === 0 ? (
          <div className="px-4 py-2 text-xs text-gray-400">暂无角色</div>
        ) : (
          characters.map((c) => (
            <button
              key={c.filename}
              onClick={() => onSelectChar(c.filename)}
              className={`btn-press block w-full truncate px-4 py-2 text-left text-sm transition-colors ${
                selectedChar === c.filename
                  ? "bg-indigo-100 font-medium text-indigo-700"
                  : "hover:bg-gray-100"
              }`}
            >
              {c.data.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
