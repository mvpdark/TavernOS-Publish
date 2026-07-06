import type { JSX } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { IconChevron } from "./Icons.js";

/**
 * Compact language switcher button.
 * Toggles between supported languages (zh / en).
 *
 * Usage:
 *   <LanguageSwitcher />
 *
 * Renders a small pill button showing the current language flag.
 * Clicking cycles to the next language.
 */
export default function LanguageSwitcher(): JSX.Element {
  const { currentLanguage, supportedLanguages, changeLanguage } = useLanguage();

  // Find current index and cycle to next
  const currentIndex = supportedLanguages.findIndex((l) => l.code === currentLanguage);
  const nextLang = supportedLanguages[(currentIndex + 1) % supportedLanguages.length];

  return (
    <button
      onClick={() => changeLanguage(nextLang.code)}
      className="flex items-center gap-1.5 rounded-control border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-xs text-[var(--color-text-faint)] transition-colors hover:bg-amber/5 hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]"
      title={nextLang.label}
      aria-label={`Switch language to ${nextLang.label}`}
    >
      <span className="font-mono font-medium">{currentLanguage.toUpperCase()}</span>
      <IconChevron size={10} direction="down" />
    </button>
  );
}
