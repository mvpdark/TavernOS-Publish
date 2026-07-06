import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import zh from "./locales/zh.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";

/**
 * i18n configuration for TavernOS.
 *
 * Language detection order:
 *   1. localStorage("tavernos.lang") — user manually selected language
 *   2. navigator.language — browser language preference
 *   3. fallbackLng — "zh" (Chinese is the primary language)
 *
 * Fallback strategy:
 *   When a translation key is missing in the active language, i18next falls
 *   back to "zh" (Chinese). This means un-translated English keys will show
 *   Chinese text rather than the raw key — preserving the existing UX while
 *   translations are progressively added.
 *
 * All 9000+ Chinese strings in the codebase will be gradually migrated to
 * t() calls. Until then, they display as-is (Chinese) regardless of the
 * active language. This is by design — no functional regression.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "zh", label: "中文", flag: "ZH" },
  { code: "en", label: "English", flag: "EN" },
  { code: "ja", label: "日本語", flag: "JA" },
  { code: "ko", label: "한국어", flag: "KO" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      ja: { translation: ja },
      ko: { translation: ko },
    },
    fallbackLng: "zh",
    supportedLngs: ["zh", "en", "ja", "ko"],
    // Detect language from localStorage first, then browser
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "tavernos.lang",
      caches: ["localStorage"],
    },
    interpolation: {
      // React already escapes by default, no need for i18next to do it
      escapeValue: false,
    },
    // Don't suspend — translations are bundled synchronously
    react: {
      useSuspense: false,
    },
    returnNull: false,
  });

export default i18n;
