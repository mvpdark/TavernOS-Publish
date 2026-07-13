// ProjectBrowserPage.tsx — Stub for TavernOS integration
// The original Kaka Studio component handled full-page project browsing.
// In TavernOS, project management is handled by the Dashboard/Store.
// This stub renders the children directly.

import type { ReactNode } from "react";

export type ProjectBrowserPageProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  actionSlot?: ReactNode;
  children?: ReactNode;
};

export function ProjectBrowserPage({
  children,
  title,
  description,
  actionSlot,
}: ProjectBrowserPageProps) {
  return (
    <div className="project-browser-page">
      <div className="project-browser-page__header">
        {title && <h1 className="project-browser-page__title">{title}</h1>}
        {description && (
          <p className="project-browser-page__description">{description}</p>
        )}
        {actionSlot}
      </div>
      <div className="project-browser-page__content">{children}</div>
    </div>
  );
}
