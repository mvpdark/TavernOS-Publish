// Setup view — character selection and group chat configuration form.
// Presentational component: receives all state and callbacks as props.

import type { PersonaCard } from "./types.js";
import type { JSX } from "react";

export interface SetupViewProps {
  characters: PersonaCard[];
  selectedMembers: Set<string>;
  order: "fixed" | "round-robin" | "random";
  turnInterval: number;
  scenario: string;
  error: string | null;
  onToggleMember: (filename: string) => void;
  onOrderChange: (order: "fixed" | "round-robin" | "random") => void;
  onTurnIntervalChange: (n: number) => void;
  onScenarioChange: (s: string) => void;
  onStart: () => void;
}

export default function SetupView({
  characters,
  selectedMembers,
  order,
  turnInterval,
  scenario,
  error,
  onToggleMember,
  onOrderChange,
  onTurnIntervalChange,
  onScenarioChange,
  onStart,
}: SetupViewProps): JSX.Element {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-light">群聊设置</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">选择多个角色参与群聊对话</p>

      {error && (
        <div className="mt-4 rounded bg-[var(--color-danger-bg)] px-4 py-2 text-sm text-[var(--color-danger)]">{error}</div>
      )}

      <div className="mt-6 space-y-4">
        {/* Character selection */}
        <div>
          <label className="text-sm font-medium">选择参与角色</label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {characters.length === 0 ? (
              <div className="col-span-full text-sm text-[var(--color-text-faint)]">暂无角色，请先在角色管理中创建</div>
            ) : (
              characters.map((c) => (
                <button
                  key={c.filename}
                  onClick={() => onToggleMember(c.filename)}
                  className={`btn-press rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedMembers.has(c.filename)
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  {c.data.name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Order config */}
        <div className="flex gap-4">
          <div>
            <label className="text-sm font-medium">发言顺序</label>
            <select
              value={order}
              onChange={(e) => onOrderChange(e.target.value as typeof order)}
              className="mt-1 block rounded-lg border bg-white px-3 py-1.5 text-sm"
            >
              <option value="fixed">固定顺序</option>
              <option value="round-robin">轮转顺序</option>
              <option value="random">随机顺序</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">每人连续发言数</label>
            <input
              type="number"
              min={1}
              max={10}
              value={turnInterval}
              onChange={(e) => onTurnIntervalChange(Number(e.target.value) || 1)}
              className="mt-1 block w-20 rounded-lg border bg-white px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Scenario */}
        <div>
          <label className="text-sm font-medium">场景描述（可选）</label>
          <textarea
            value={scenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            placeholder="例如：酒馆中，三个角色围坐在桌前..."
            rows={2}
            className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={onStart}
          disabled={selectedMembers.size === 0}
          className="btn-press rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          创建群聊
        </button>
      </div>
    </div>
  );
}
