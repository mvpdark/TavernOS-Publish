import { useState } from "react";
import { BTN } from "./ui.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// RetryButton — an inline error banner with a "重试" (retry) button.
// Uses BTN.ghost for the button styling to stay consistent with the design
// system. Supports an async onRetry callback and shows a "重试中..." label
// while the retry is in flight.
// ---------------------------------------------------------------------------

export function RetryButton({
  message,
  onRetry,
  className = "",
}: {
  /** The error message to display. */
  message: string;
  /** Callback invoked when the user clicks "重试". May be async. */
  onRetry: () => void | Promise<void>;
  /** Optional extra classes for the wrapper. */
  className?: string;
}): JSX.Element {
  const [retrying, setRetrying] = useState(false);

  const handleClick = async (): Promise<void> => {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-3 ${className}`}
    >
      <p className="text-sm text-[var(--color-danger)]">{message}</p>
      <button
        onClick={() => void handleClick()}
        disabled={retrying}
        className={`${BTN.ghost} shrink-0 whitespace-nowrap disabled:opacity-50`}
      >
        {retrying ? "重试中..." : "重试"}
      </button>
    </div>
  );
}
