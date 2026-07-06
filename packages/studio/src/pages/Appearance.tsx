import { useState, useEffect, useRef } from "react";
import type { JSX } from "react";
import { useThemeStore, resolveMode, type ThemeMode } from "../store/theme";
import { PRESET_THEMES } from "../themes/presets";
import { Stratum, SelectField, TextInput, TextArea, BTN } from "../components/ui";
import { useTranslation } from "react-i18next";

const MODE_OPTIONS: readonly ThemeMode[] = ["light", "dark", "auto"];

/**
 * Appearance settings page.
 * Lets the user pick a theme mode, preset, custom primary color,
 * background image, custom CSS, font size, and bubble radius.
 *
 * - Mode + preset changes apply instantly via the theme store.
 * - The "custom appearance" form (primary color, font size, bubble radius,
 *   background image, custom CSS) uses a local draft and is committed to the
 *   store (and persisted to the backend) only when the user clicks "保存".
 */
export default function Appearance(): JSX.Element {
  const config = useThemeStore((s) => s.config);
  const setMode = useThemeStore((s) => s.setMode);
  const setPreset = useThemeStore((s) => s.setPreset);
  const setConfig = useThemeStore((s) => s.setConfig);
  const reset = useThemeStore((s) => s.reset);
  const { t } = useTranslation();

  // --- Draft state for the custom-appearance form controls --------------
  // Committed to the store (persisted to localStorage + backend) on save.
  const [draftPrimary, setDraftPrimary] = useState(config.primaryColor);
  const [draftFontSize, setDraftFontSize] = useState(config.fontSize);
  const [draftBubbleRadius, setDraftBubbleRadius] = useState(config.bubbleRadius);
  const [draftBgImage, setDraftBgImage] = useState(config.backgroundImage);
  const [draftCss, setDraftCss] = useState(config.customCss);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Resync the draft from the store whenever the committed values change
  // externally (e.g. after a reset). Preset/mode changes do not touch these
  // fields, so in-progress local edits are preserved.
  useEffect(() => {
    setDraftPrimary(config.primaryColor);
    setDraftFontSize(config.fontSize);
    setDraftBubbleRadius(config.bubbleRadius);
    setDraftBgImage(config.backgroundImage);
    setDraftCss(config.customCss);
  }, [
    config.primaryColor,
    config.fontSize,
    config.bubbleRadius,
    config.backgroundImage,
    config.customCss,
  ]);

  const dirty =
    draftPrimary !== config.primaryColor ||
    draftFontSize !== config.fontSize ||
    draftBubbleRadius !== config.bubbleRadius ||
    draftBgImage !== config.backgroundImage ||
    draftCss !== config.customCss;

  function handleSave(): void {
    // Commit the full draft in one update; the store persists to
    // localStorage and best-effort syncs to the backend.
    setConfig({
      primaryColor: draftPrimary,
      fontSize: draftFontSize,
      bubbleRadius: draftBubbleRadius,
      backgroundImage: draftBgImage,
      customCss: draftCss,
    });
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1600);
  }

  const effectiveMode = resolveMode(config.mode);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-light">{t("appearance.pageTitle")}</h1>
      <p className="mt-1 text-sm text-[#787878]">
        {t("appearance.pageDescription")}
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Theme mode                                                        */}
      {/* ----------------------------------------------------------------- */}
      <Stratum title={t("appearance.themeMode")} subtitle={t("appearance.themeModeSubtitle")}>
        <SelectField
          label={t("appearance.displayMode")}
          value={config.mode}
          onChange={(v) => setMode(v)}
          options={MODE_OPTIONS}
        />
        <p className="text-xs text-[#787878]">
          {config.mode === "light" && t("appearance.lightAlways")}
          {config.mode === "dark" && t("appearance.darkAlways")}
          {config.mode === "auto" && t("appearance.autoFollow")}
        </p>
        <p className="text-xs text-[#555555]">
          {t("appearance.effectiveMode", { mode: effectiveMode === "dark" ? t("appearance.darkMode") : t("appearance.lightMode") })}
        </p>
      </Stratum>

      {/* ----------------------------------------------------------------- */}
      {/* Preset themes                                                     */}
      {/* ----------------------------------------------------------------- */}
      <Stratum
        title={t("appearance.presetThemes")}
        subtitle={t("appearance.presetSubtitle")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_THEMES.map((preset) => {
            const active = config.preset === preset.id;
            const c = preset.light;
            const dots = [
              { color: c.primary, label: t("appearance.colorPrimary") },
              { color: c.surface, label: t("appearance.colorSurface") },
              { color: c.bg, label: t("appearance.colorBg") },
              { color: c.text, label: t("appearance.colorText") },
            ];
            return (
              <div
                key={preset.id}
                className={`rounded-[10px] border-2 p-4 transition-colors ${
                  active
                    ? "border-[#C9A86C] bg-[rgba(201,168,108,0.06)]"
                    : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-[#E8E8E8]">
                    {preset.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[#555555]">
                    {preset.id}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#787878]">{preset.description}</p>

                {/* Color dots — 24px circles */}
                <div className="mt-3 flex items-center gap-2">
                  {dots.map((d, i) => (
                    <span
                      key={i}
                      className="inline-block h-6 w-6 rounded-full border border-black/20"
                      style={{ backgroundColor: d.color }}
                      title={d.label}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setPreset(preset.id)}
                  disabled={active}
                  className={`mt-4 w-full rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border border-[rgba(201,168,108,0.4)] text-[#C9A86C]"
                      : "bg-[#C9A86C] text-[#0A0A0A] hover:bg-[#D4B884]"
                  }`}
                >
                  {active ? t("appearance.applied") : t("common.apply")}
                </button>
              </div>
            );
          })}
        </div>
      </Stratum>

      {/* ----------------------------------------------------------------- */}
      {/* Custom appearance (draft + save)                                  */}
      {/* ----------------------------------------------------------------- */}
      <Stratum
        title={t("appearance.customAppearance")}
        subtitle={t("appearance.customSubtitle")}
      >
        {/* Custom primary color */}
        <div>
          <label className="mb-1.5 block text-xs text-[#787878]">{t("appearance.customPrimary")}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draftPrimary || "#4f46e5"}
              onChange={(e) => setDraftPrimary(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-[#1A1A1A] bg-[#0F0F0F]"
            />
            <input
              value={draftPrimary}
              onChange={(e) => setDraftPrimary(e.target.value)}
              placeholder={t("appearance.primaryPlaceholder")}
              className="flex-1 rounded-[7px] border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#444444] transition-colors focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
            />
            <button
              onClick={() => setDraftPrimary("")}
              className="shrink-0 text-xs text-[#787878] underline hover:text-[#E8E8E8]"
            >
              {t("common.reset")}
            </button>
          </div>
        </div>

        {/* Font size slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs text-[#787878]">{t("appearance.baseFontSize")}</label>
            <span className="text-xs font-medium text-[#C9A86C]">
              {draftFontSize}px
            </span>
          </div>
          <input
            type="range"
            min={12}
            max={18}
            step={1}
            value={draftFontSize}
            onChange={(e) => setDraftFontSize(Number(e.target.value))}
            className="w-full accent-[#C9A86C]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#555555]">
            <span>12px</span>
            <span>18px</span>
          </div>
        </div>

        {/* Bubble radius slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs text-[#787878]">{t("appearance.bubbleRadius")}</label>
            <span className="text-xs font-medium text-[#C9A86C]">
              {draftBubbleRadius}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={draftBubbleRadius}
            onChange={(e) => setDraftBubbleRadius(Number(e.target.value))}
            className="w-full accent-[#C9A86C]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#555555]">
            <span>0px</span>
            <span>20px</span>
          </div>
          <div className="mt-2 rounded-lg bg-[#0F0F0F] p-3">
            <span
              className="inline-block bg-[#C9A86C] px-4 py-2 text-[#0A0A0A]"
              style={{ borderRadius: `${draftBubbleRadius}px` }}
            >
              {t("appearance.bubblePreview")}
            </span>
          </div>
        </div>

        {/* Background image URL */}
        <TextInput
          label={t("appearance.bgImageUrl")}
          value={draftBgImage}
          onChange={(v) => setDraftBgImage(v)}
        />

        {/* Custom CSS */}
        <div>
          <p className="mb-1.5 text-xs text-[#787878]">
            {t("appearance.customCssHint")}
          </p>
          <TextArea
            label={t("appearance.customCssLabel")}
            value={draftCss}
            onChange={(v) => setDraftCss(v)}
            rows={6}
          />
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-xs text-[#6C9A7A]">{t("appearance.saved")}</span>}
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={BTN.primary}
          >
            {t("common.save")}
          </button>
        </div>
      </Stratum>

      {/* Reset */}
      <div className="mt-7 flex justify-end">
        <button
          onClick={() => {
            if (window.confirm(t("appearance.confirmReset"))) reset();
          }}
          className={BTN.danger}
        >
          {t("appearance.restoreDefault")}
        </button>
      </div>
    </div>
  );
}
