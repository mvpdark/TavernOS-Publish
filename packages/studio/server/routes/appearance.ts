// ---------------------------------------------------------------------------
// Appearance routes: get and update UI theme / appearance configuration.
// Theme config is persisted alongside other settings in settings.json so it
// survives across devices when the user logs in from different browsers.
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import {
  type AppearanceConfig,
  loadSettings,
  withSettingsLock,
} from "../context";

/** Default appearance config used when none is persisted. */
const DEFAULT_APPEARANCE: AppearanceConfig = {
  mode: "light",
  preset: "default",
  primaryColor: "",
  backgroundImage: "",
  customCss: "",
  fontSize: 14,
  bubbleRadius: 8,
};

/** Available preset theme ids. */
const VALID_PRESETS = ["default", "warm", "dark-night", "ink"];
const VALID_MODES = ["light", "dark", "auto"];

export function createAppearanceRouter(): Hono {
  const router = new Hono();

  // Get current appearance config
  router.get("/api/appearance", async (c) => {
    const settings = await loadSettings();
    const config = settings.appearanceConfig ?? DEFAULT_APPEARANCE;
    return c.json({ config });
  });

  // Update appearance config (merge into existing settings)
  router.put("/api/appearance", async (c) => {
    const body = await c.req.json<Partial<AppearanceConfig>>();
    // Atomic read-merge-write under the settings mutex.
    const updated = await withSettingsLock(async (lock) => {
      const existing = await lock.load();
      const current = existing.appearanceConfig ?? DEFAULT_APPEARANCE;

      // Validate and clamp individual fields
      const mode = VALID_MODES.includes(body.mode ?? "")
        ? body.mode!
        : current.mode;
      const preset = VALID_PRESETS.includes(body.preset ?? "")
        ? body.preset!
        : current.preset;
      const primaryColor =
        typeof body.primaryColor === "string" ? body.primaryColor : current.primaryColor;
      const backgroundImage =
        typeof body.backgroundImage === "string"
          ? body.backgroundImage
          : current.backgroundImage;
      const customCss =
        typeof body.customCss === "string" ? body.customCss : current.customCss;
      const fontSize =
        typeof body.fontSize === "number"
          ? Math.max(12, Math.min(20, body.fontSize))
          : current.fontSize;
      const bubbleRadius =
        typeof body.bubbleRadius === "number"
          ? Math.max(0, Math.min(24, body.bubbleRadius))
          : current.bubbleRadius;

      const merged: AppearanceConfig = {
        mode,
        preset,
        primaryColor,
        backgroundImage,
        customCss,
        fontSize,
        bubbleRadius,
      };

      await lock.write({
        ...existing,
        appearanceConfig: merged,
      });
      return merged;
    });
    return c.json({ success: true, config: updated });
  });

  return router;
}
