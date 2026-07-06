import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "../i18n";

/**
 * Hook for language switching.
 *
 * Usage:
 *   const { t, i18n, changeLanguage, currentLanguage } = useLanguage();
 *   t("nav.write")           // → "写作" or "Write"
 *   changeLanguage("en")     // → switch to English
 *   currentLanguage          // → "zh" | "en"
 */
export function useLanguage() {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(
    (code: LanguageCode) => {
      i18n.changeLanguage(code);
      // LanguageDetector caches to localStorage automatically
    },
    [i18n],
  );

  const currentLanguage = (i18n.language?.split("-")[0] as LanguageCode) ?? "zh";

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
