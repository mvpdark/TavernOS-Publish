import type { ReactNode } from "react";
export type WorkshopRoutePageProps = {
  children?: ReactNode;
  [key: string]: unknown;
};
export function WorkshopRoutePage({ children }: WorkshopRoutePageProps) {
  return <>{children}</>;
}
