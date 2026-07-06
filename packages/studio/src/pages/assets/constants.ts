import type { AssetKind, TabKind } from "./types.js";

export const KIND_LABELS: Record<AssetKind | "all", string> = {
  all: "全部",
  character: "角色",
  scene: "场景",
  prop: "物品",
};

export const KIND_COLORS: Record<AssetKind, string> = {
  character: "bg-[var(--color-primary-tint-strong)] text-[var(--color-primary)]",
  scene: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  prop: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
};

export const TAB_KINDS: TabKind[] = ["all", "character", "scene", "prop"];
