import { createContext, useCallback, useContext, useState, useEffect, type JSX, type ReactNode } from "react";
import type { Toast, ToastType } from "../lib/theme";
import { IconX, IconCheckCircle, IconXCircle, IconAlertTriangle, IconInfo } from "./Icons.js";

// ---------------------------------------------------------------------------
// Toast context
// ---------------------------------------------------------------------------

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------

function ToastItem({ toast, onDismiss }: { readonly toast: Toast; readonly onDismiss: (id: number) => void }): JSX.Element {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss
    const timer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: "bg-[rgba(108,154,122,0.15)]", border: "border-[rgba(108,154,122,0.4)]", icon: "text-[var(--color-success)]" },
    error:   { bg: "bg-[rgba(201,104,90,0.15)]",  border: "border-[rgba(201,104,90,0.4)]",  icon: "text-[var(--color-danger)]" },
    info:    { bg: "bg-[rgba(107,155,209,0.15)]", border: "border-[rgba(107,155,209,0.4)]", icon: "text-[var(--color-info)]" },
    warning: { bg: "bg-[rgba(201,168,108,0.15)]", border: "border-[rgba(201,168,108,0.4)]", icon: "text-[var(--color-warning-text)]" },
  };

  const c = colors[toast.type];

  const iconMap: Record<ToastType, JSX.Element> = {
    success: <IconCheckCircle size={16} className={c.icon} />,
    error:   <IconXCircle size={16} className={c.icon} />,
    info:    <IconInfo size={16} className={c.icon} />,
    warning: <IconAlertTriangle size={16} className={c.icon} />,
  };

  const isAlert = toast.type === "error" || toast.type === "warning";

  return (
    <div
      role={isAlert ? "alert" : undefined}
      aria-live={isAlert ? undefined : "polite"}
      className={`animate-fade-in-up flex items-center gap-3 rounded-lg border ${c.bg} ${c.border} px-4 py-3 backdrop-blur-md transition-[opacity,transform] duration-300`}
      style={{
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? "translate3d(0,0,0)" : "translate3d(0,12px,0)",
        willChange: "transform, opacity",
      }}
    >
      <span className="shrink-0">{iconMap[toast.type]}</span>
      <span className="flex-1 text-sm text-[var(--color-text)]">{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          setLeaving(true);
          window.setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="shrink-0 rounded p-0.5 text-[var(--color-text-faint)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        aria-label="关闭"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast provider — renders a fixed stack in the top-right
// ---------------------------------------------------------------------------

let toastIdCounter = 0;

export function ToastProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-6 top-6 z-[99999] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
