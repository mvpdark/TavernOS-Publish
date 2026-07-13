import type { ReactNode } from "react";
export type AppRoutePagesProps = {
  children?: ReactNode;
  [key: string]: unknown;
};
export function AppRoutePages({ children }: AppRoutePagesProps) {
  return <>{children}</>;
}
