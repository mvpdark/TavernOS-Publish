import type { JSX } from "react";
import type { Dispatch, SetStateAction } from "react";
import { proxyImageUrl } from "../api/client.js";
import type { ConfirmedSlotEntry, SlotViewState } from "./characters-utils.js";

// ---------------------------------------------------------------------------
// ConfirmedSlotNavigator — 5-level drill-down navigation for confirmed slots.
//
// Level 0: book cover (entry point)
// Level 1: realistic (MID_JOURNEY) vs anime (NIJI_JOURNEY)
// Level 2: male / female / non-binary
// Level 3: protagonist / supporting / NPC
// Level 4: character image strip
//
// Extracted from Characters.tsx to reduce main component size.
// ---------------------------------------------------------------------------

interface ConfirmedSlotNavigatorProps {
  confirmedSlots: ConfirmedSlotEntry[];
  slotView: SlotViewState;
  setSlotView: Dispatch<SetStateAction<SlotViewState>>;
}

export function ConfirmedSlotNavigator({
  confirmedSlots,
  slotView,
  setSlotView,
}: ConfirmedSlotNavigatorProps): JSX.Element {
  return (
    <div className="mb-8">
      {/* 面包屑导航 */}
      {slotView.entered && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <button
            onClick={() => setSlotView({ entered: false, mode: null, gender: null, role: null })}
            className={`transition-colors ${!slotView.mode ? "text-[#C9A86C]" : "text-gray-500 hover:text-gray-300"}`}
          >
            确选卡
          </button>
          {slotView.mode && (
            <>
              <span className="text-gray-700">›</span>
              <button
                onClick={() => setSlotView({ entered: true, mode: slotView.mode, gender: null, role: null })}
                className={`transition-colors ${!slotView.gender ? "text-[#C9A86C]" : "text-gray-500 hover:text-gray-300"}`}
              >
                {slotView.mode === "NIJI_JOURNEY" ? "动漫卡" : "写实卡"}
              </button>
            </>
          )}
          {slotView.gender && (
            <>
              <span className="text-gray-700">›</span>
              <button
                onClick={() => setSlotView({ entered: true, mode: slotView.mode, gender: slotView.gender, role: null })}
                className={`transition-colors ${!slotView.role ? "text-[#C9A86C]" : "text-gray-500 hover:text-gray-300"}`}
              >
                {slotView.gender === "male" ? "男角" : slotView.gender === "female" ? "女角" : "中性"}
              </button>
            </>
          )}
          {slotView.role && (
            <>
              <span className="text-gray-700">›</span>
              <span className="text-[#C9A86C]">
                {slotView.role === "protagonist" ? "主角" : slotView.role === "supporting" ? "配角" : "NPC"}
              </span>
            </>
          )}
          <span className="ml-auto text-[11px] text-gray-600">
            {confirmedSlots.length} 张已确认
          </span>
        </div>
      )}

      {/* Level 0: 书封面 */}
      {!slotView.entered && (
        <button
          onClick={() => setSlotView({ entered: true, mode: null, gender: null, role: null })}
          className="group relative overflow-hidden rounded-lg border border-[#C9A86C]/20 bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/50 hover:shadow-2xl"
          style={{ width: 120 }}
        >
          <div className="relative h-44 bg-[#0A0A0A]">
            <img src="/confirmed-card-cover.png" alt="确选卡" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <p className="text-sm font-medium text-[#C9A86C]">确选卡</p>
              <p className="text-[9px] text-gray-500">{confirmedSlots.length} 张</p>
            </div>
          </div>
        </button>
      )}

      {/* Level 1: 动漫卡 / 写实卡 */}
      {slotView.entered && slotView.mode === null && (
        <div className="flex gap-4">
          <button
            onClick={() => setSlotView({ entered: true, mode: "MID_JOURNEY", gender: null, role: null })}
            className="group relative overflow-hidden rounded-lg border border-[#78A0C8]/20 bg-[#0F0F0F] transition-all hover:border-[#78A0C8]/50 hover:shadow-2xl"
            style={{ width: 120 }}
          >
            <div className="relative h-44 bg-[#0A0A0A]">
              <img src="/realistic-card-cover.png" alt="写实卡" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className="text-sm font-medium text-[#78A0C8]">写实卡</p>
                <p className="text-[9px] text-gray-500">{confirmedSlots.filter((s) => s.botType === "MID_JOURNEY").length} 张</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSlotView({ entered: true, mode: "NIJI_JOURNEY", gender: null, role: null })}
            className="group relative overflow-hidden rounded-lg border border-[#A078C8]/20 bg-[#0F0F0F] transition-all hover:border-[#A078C8]/50 hover:shadow-2xl"
            style={{ width: 120 }}
          >
            <div className="relative h-44 bg-[#0A0A0A]">
              <img src="/anime-card-cover.png" alt="动漫卡" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className="text-sm font-medium text-[#A078C8]">动漫卡</p>
                <p className="text-[9px] text-gray-500">{confirmedSlots.filter((s) => s.botType === "NIJI_JOURNEY").length} 张</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Level 2: 男角 / 女角 / 中性 */}
      {slotView.entered && slotView.mode !== null && slotView.gender === null && (
        <div className="flex gap-4">
          {["male", "female", "non-binary"].map((g) => {
            const count = confirmedSlots.filter((s) => s.botType === slotView.mode && s.gender === g).length;
            const label = g === "male" ? "男角" : g === "female" ? "女角" : "中性";
            const accentColor = slotView.mode === "MID_JOURNEY" ? "#78A0C8" : "#A078C8";
            return (
              <button
                key={g}
                onClick={() => setSlotView({ entered: true, mode: slotView.mode, gender: g, role: null })}
                className="group relative overflow-hidden rounded-lg border bg-[#0F0F0F] transition-all hover:shadow-2xl"
                style={{ width: 120, borderColor: `${accentColor}33` }}
              >
                <div className="relative h-44 bg-[#0A0A0A] flex flex-col items-center justify-center gap-3">
                  <span className="text-5xl" style={{ color: accentColor }}>{g === "male" ? "♂" : g === "female" ? "♀" : "⚧"}</span>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: accentColor }}>{label}</p>
                    <p className="text-[9px] text-gray-500">{count} 张</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Level 3: 主角 / 配角 / NPC */}
      {slotView.entered && slotView.mode !== null && slotView.gender !== null && slotView.role === null && (
        <div className="flex gap-4">
          {["protagonist", "supporting", "npc"].map((r) => {
            const count = confirmedSlots.filter((s) =>
              s.botType === slotView.mode && s.gender === slotView.gender &&
              (r === "protagonist" ? (s.roleType ?? "").startsWith("protagonist") : r === "supporting" ? (s.roleType ?? "").startsWith("supporting") : (s.roleType ?? "").startsWith("NPC"))
            ).length;
            const label = r === "protagonist" ? "主角" : r === "supporting" ? "配角" : "NPC";
            const accentColor = slotView.mode === "MID_JOURNEY" ? "#78A0C8" : "#A078C8";
            return (
              <button
                key={r}
                onClick={() => setSlotView({ entered: true, mode: slotView.mode, gender: slotView.gender, role: r })}
                className="group relative overflow-hidden rounded-lg border bg-[#0F0F0F] transition-all hover:shadow-2xl"
                style={{ width: 120, borderColor: `${accentColor}33` }}
              >
                <div className="relative h-44 bg-[#0A0A0A] flex flex-col items-center justify-center gap-3">
                  <span className="text-4xl" style={{ color: accentColor }}>{r === "protagonist" ? "★" : r === "supporting" ? "◆" : "○"}</span>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: accentColor }}>{label}</p>
                    <p className="text-[9px] text-gray-500">{count} 张</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Level 4: 角色图片列表 */}
      {slotView.entered && slotView.mode !== null && slotView.gender !== null && slotView.role !== null && (() => {
        const filtered = confirmedSlots.filter((s) =>
          s.botType === slotView.mode &&
          s.gender === slotView.gender &&
          (slotView.role === "protagonist" ? (s.roleType ?? "").startsWith("protagonist") :
           slotView.role === "supporting" ? (s.roleType ?? "").startsWith("supporting") :
           (s.roleType ?? "").startsWith("NPC"))
        );
        if (filtered.length === 0) {
          return (
            <div className="rounded-lg border border-dashed border-[#2A2A2A] px-4 py-6 text-center text-xs text-gray-600">
              此分类下暂无角色
            </div>
          );
        }
        return (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {filtered.map((slot) => (
              <div
                key={slot.id}
                className="group relative flex-shrink-0 overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
                style={{ width: 120 }}
              >
                <div className="relative h-44 bg-[#0A0A0A]">
                  <img
                    src={proxyImageUrl(slot.imageUrl)}
                    alt={slot.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <p className="truncate text-sm font-medium text-[#C9A86C]">{slot.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
