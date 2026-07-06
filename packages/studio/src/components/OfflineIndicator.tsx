// ---------------------------------------------------------------------------
// OfflineIndicator — floating online/offline status badge.
//
//   - Online:        a tiny green dot in the bottom-left corner with breathing animation.
//   - Offline:       an amber banner: "离线模式 — 部分功能受限…"
//   - Reconnecting:  "正在重新连接…" with a pulse animation, shown briefly
//                    right after the connection is restored.
//
// Uses `navigator.onLine` plus the `online` / `offline` window events.
// Positioned bottom-left (z-40) so it never collides with TaskIndicator
// (bottom-right, z-50).
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import type { JSX } from "react";
import { IconWifiOff, IconRefreshCw } from "./Icons.js";

type Status = "online" | "offline" | "reconnecting";

const RECONNECTING_MS = 2500;

export default function OfflineIndicator(): JSX.Element {
  const [status, setStatus] = useState<Status>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const handleOnline = (): void => {
      if (timer) clearTimeout(timer);
      setStatus("reconnecting");
      timer = setTimeout(() => setStatus("online"), RECONNECTING_MS);
    };

    const handleOffline = (): void => {
      if (timer) clearTimeout(timer);
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Online: subtle green dot with breathing animation.
  if (status === "online") {
    return (
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100">
        <span className="sr-only">网络已连接</span>
        <span className="animate-breathe inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
      </div>
    );
  }

  // Reconnecting: pulsing amber pill.
  if (status === "reconnecting") {
    return (
      <div className="animate-fade-in-up fixed bottom-4 left-4 z-40">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5 shadow-lg">
          <span className="sr-only">正在重新连接</span>
          <IconRefreshCw size={12} className="animate-spin text-[var(--color-primary)]" />
          <span className="text-xs text-[var(--color-primary)]">正在重新连接…</span>
        </div>
      </div>
    );
  }

  // Offline: amber banner on dark background.
  return (
    <div className="animate-fade-in-up fixed bottom-4 left-4 z-40">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5 shadow-lg">
        <span className="sr-only">网络已断开</span>
        <IconWifiOff size={14} className="text-[var(--color-primary)]" />
        <span className="text-xs text-[var(--color-primary)]">
          离线模式 — 部分功能受限，数据显示可能不是最新
        </span>
      </div>
    </div>
  );
}
