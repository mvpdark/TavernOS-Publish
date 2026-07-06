import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Skeleton loading components — shimmer placeholders using skeleton-shimmer.
// Aligned with the dark theme: uses CSS variables for surface colors.
// ---------------------------------------------------------------------------

/** A single shimmer bar. Use `className` to control width/height/radius. */
export function Skeleton({
  className = "",
}: {
  /** Tailwind classes appended after the base shimmer styles. */
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`skeleton-shimmer rounded-control ${className}`}
    />
  );
}

/** Renders N skeleton items for list loading states (e.g. sidebar lists). */
export function SkeletonList({
  count = 5,
  /** Height of each skeleton row in Tailwind units, e.g. "h-12". */
  itemClassName = "h-12",
  className = "",
}: {
  count?: number;
  itemClassName?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`w-full ${itemClassName}`} />
      ))}
    </div>
  );
}

/** A card-shaped skeleton for card-grid loading states (e.g. session cards). */
export function SkeletonCard({
  className = "",
}: {
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface-sunken)] ${className}`}
    >
      {/* Cover area */}
      <Skeleton className="h-44 w-full rounded-none" />
      {/* Text lines */}
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
