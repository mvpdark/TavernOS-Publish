import type { ReactNode } from "react";
export type AppShellChromeProps = {
  children?: ReactNode;
  [key: string]: unknown;
};
export function AppShellChrome({ children }: AppShellChromeProps) {
  return <>{children}</>;
}
