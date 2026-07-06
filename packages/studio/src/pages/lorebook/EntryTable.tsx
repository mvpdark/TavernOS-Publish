import { Th, Td } from "../../components/ui.tsx";
import type { LoreEntry } from "./types.js";
import { truncate } from "./types.js";
import type { JSX } from "react";

interface EntryTableProps {
  entries: LoreEntry[];
  onDelete: (entry: LoreEntry) => void;
  onEdit: (entry: LoreEntry) => void;
}

export function EntryTable({ entries, onDelete, onEdit }: EntryTableProps): JSX.Element {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 rounded-lg bg-white shadow">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <Th>关键词</Th>
            <Th>备注</Th>
            <Th>内容</Th>
            <Th>逻辑</Th>
            <Th>顺序</Th>
            <Th>操作</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => {
            const content = entry.content ?? "";
            return (
              <tr key={entry.filename} className="text-sm">
                <Td>{entry.key?.join(", ") || "—"}</Td>
                <Td>{entry.comment || "—"}</Td>
                <Td>
                  <span className="line-clamp-2">
                    {content ? truncate(content) : "—"}
                  </span>
                </Td>
                <Td>{entry.selectiveLogic ?? "AND_ANY"}</Td>
                <Td>{String(entry.order ?? "")}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(entry)}
                      className="btn-press rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onDelete(entry)}
                      className="btn-press rounded-lg border border-red-200 px-3 py-1 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                    >
                      删除
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
