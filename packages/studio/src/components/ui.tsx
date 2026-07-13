import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Strataform design system — shared primitives
// ---------------------------------------------------------------------------

/** Stratum container — the unified card/section wrapper.
 *  Every settings section uses this for consistent elevation, radius, and
 *  border treatment. Corner radius 14px, bg #141414, border #1A1A1A. */
export function Stratum({
  title,
  subtitle,
  children,
  className = "",
  flush = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}): JSX.Element {
  return (
    <div
      className={`${flush ? "" : "mt-7 "}rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] p-8 shadow-md ${className}`}
      style={{ boxShadow: "var(--shadow-sm), var(--surface-highlight)" }}
    >
      {title && (
        <>
          <h2 className="text-lg font-light text-[var(--color-primary)]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--color-text-faint)]">{subtitle}</p>}
          <div className="mt-4 space-y-4">{children}</div>
        </>
      )}
      {!title && children}
    </div>
  );
}

// Strataform input style — dark carbon, 8px radius, subtle border
const inputCls =
  "w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-placeholder)] transition-colors focus:border-[var(--color-border-accent)] focus:outline-none";

// Amber primary button — dark text on amber background, 8px radius
const primaryBtnCls =
  "btn-press rounded-control bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_0_12px_rgba(201,168,108,0.15)] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

// Ghost button — transparent with subtle border, 8px radius
const ghostBtnCls =
  "btn-press rounded-control border border-[var(--color-border-strong)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:border-[#3A3A3A] hover:text-[var(--color-text)]";

// Danger button — muted red on dark, 8px radius
const dangerBtnCls =
  "btn-press rounded-control bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[#D9786A]";

export function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-[var(--color-text-faint)]">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}): JSX.Element {
  return (
    <div>
      {label && <label className="mb-1.5 block text-xs text-[var(--color-text-faint)]">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={inputCls}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  optionLabels,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  /** Optional display labels paired with options by index. When omitted, the
   *  raw option value is shown. */
  optionLabels?: readonly string[];
}): JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-[var(--color-text-faint)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={inputCls}
      >
        {options.map((o, i) => (
          <option key={o} value={o}>
            {optionLabels?.[i] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** Optional lower bound; values below are clamped up. */
  min?: number;
  /** Optional upper bound; values above are clamped down. */
  max?: number;
}): JSX.Element {
  const clamp = (raw: number): number => {
    if (Number.isNaN(raw)) return min ?? 0;
    let v = raw;
    if (typeof min === "number" && v < min) v = min;
    if (typeof max === "number" && v > max) v = max;
    return v;
  };
  return (
    <div>
      <label className="mb-1.5 block text-xs text-[var(--color-text-faint)]">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className={inputCls}
      />
    </div>
  );
}

export function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      // Focus trap: keep Tab within the modal
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    // Focus the modal container on mount for screen readers
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl outline-none animate-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        <h2 className="mb-4 text-lg font-light text-[var(--color-text)]">{title}</h2>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => cancelBtnRef.current?.focus());
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label="确认操作"
      >
        <p className="text-sm text-[var(--color-text)]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelBtnRef} onClick={onCancel} className={`${ghostBtnCls} btn-press`}>
            取消
          </button>
          <button onClick={onConfirm} className={`${dangerBtnCls} btn-press`}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }): JSX.Element {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-faint)]">{children}</th>
  );
}

export function Td({ children }: { children: ReactNode }): JSX.Element {
  return <td className="px-4 py-2 align-top text-[var(--color-text)]">{children}</td>;
}

// Export button class strings for reuse in pages
export const BTN = {
  primary: primaryBtnCls,
  ghost: ghostBtnCls,
  danger: dangerBtnCls,
} as const;
