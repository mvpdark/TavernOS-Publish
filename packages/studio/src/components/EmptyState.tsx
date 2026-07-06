import { type JSX, type ReactNode, type FC } from "react";
import { IconBook, IconMessageSquare, IconFolder, IconLayers } from "./Icons.js";

// ---------------------------------------------------------------------------
// EmptyState - 统一空状态组件（Noir Atelier 风格）
// 使用 Icons.tsx 中的 SVG 图标，保持设计系统一致性
// ---------------------------------------------------------------------------

type IconVariant = "sword" | "book" | "chat" | "user" | "blueprint" | "chart" | "folder" | "clock" | "layers";

interface EmptyStateProps {
  readonly icon?: IconVariant;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

// Map variants to Icons components — use centralized icon library where available.
// For variants without a dedicated icon (sword, user, blueprint, chart, clock),
// we render a simple inline SVG with strokeWidth={1.5}.
const iconComponents: Partial<Record<IconVariant, FC<{ size?: number; className?: string }>>> = {
  book: IconBook,
  chat: IconMessageSquare,
  folder: IconFolder,
  layers: IconLayers,
};

const inlineIconPaths: Record<string, JSX.Element> = {
  sword: (
    <>
      <line x1="12" y1="2" x2="12" y2="20" />
      <polyline points="8 6 12 2 16 6" />
      <line x1="6" y1="20" x2="18" y2="20" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  blueprint: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="12" y2="14" />
    </>
  ),
  chart: (
    <>
      <line x1="18" y1="20" x2="6" y2="20" />
      <line x1="6" y1="20" x2="6" y2="4" />
      <rect x="8" y="12" width="3" height="8" />
      <rect x="13" y="8" width="3" height="12" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
};

function EmptyStateIcon({ variant }: { readonly variant: IconVariant }): JSX.Element {
  const IconComp = iconComponents[variant];
  if (IconComp) {
    return <IconComp size={48} className="text-[var(--color-border-strong)]" aria-hidden="true" />;
  }
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--color-border-strong)]"
      aria-hidden="true"
    >
      {inlineIconPaths[variant]}
    </svg>
  );
}

export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={`animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)]" aria-hidden="true">
        <EmptyStateIcon variant={icon} />
      </div>
      <p className="text-sm font-light text-[var(--color-text-muted)]">{title}</p>
      {description && <p className="mt-1 text-xs text-[var(--color-text-faint)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
