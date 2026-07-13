import type { ReactNode } from "react";
export type SettingsRoutePageProps = {
  children?: ReactNode;
  [key: string]: unknown;
};
export function SettingsRoutePage({ children }: SettingsRoutePageProps) {
  return <>{children}</>;
}
