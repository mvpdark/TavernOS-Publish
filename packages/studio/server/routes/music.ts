// ---------------------------------------------------------------------------
// Music route: music generation config + Suno music generation endpoints.
//
// Endpoints:
//   GET  /api/music/config              — music gen config (apiKey masked) + providers
//   PUT  /api/music/config              — save music gen config
//   POST /api/music/generate            — generate music from a prompt
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { musicProviderRegistry, MusicGenConfigSchema, MusicGenRequestSchema, type MusicGenConfig } from "@tavernos/core";
import {
  type AppSettings,
  loadSettings,
  writeSettingsAtomic,
  createMusicClientFromSettings,
  withSettingsLock,
} from "../context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? "***" : "";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function createMusicRouter(): Hono {
  const router = new Hono();

  // GET /api/music/config — 返回当前 music 配置（apiKey 掩码）+ 可用 provider 列表
  router.get("/api/music/config", async (c) => {
    const settings = await loadSettings();
    const raw = settings.musicConfig ?? {};
    const config = MusicGenConfigSchema.parse({
      ...raw,
      apiKey: raw.apiKey || settings.apiKey || "",
      baseUrl: raw.baseUrl || (settings.service === "yunwu" ? settings.baseUrl : undefined) || "https://yunwu.ai",
    });

    return c.json({
      config: {
        ...config,
        apiKey: maskApiKey(config.apiKey),
      },
      providers: musicProviderRegistry.list(),
    });
  });

  // PUT /api/music/config — 保存 music 配置
  router.put("/api/music/config", async (c) => {
    try {
      const body = await c.req.json<Partial<MusicGenConfig>>();

      await withSettingsLock(async () => {
        const settings = await loadSettings();

        // 如果 apiKey 是掩码或空，保留原有 key
        const existingApiKey = settings.musicConfig?.apiKey ?? "";
        const newApiKey = body.apiKey && body.apiKey !== "***" && !body.apiKey.startsWith("***")
          ? body.apiKey
          : existingApiKey;

        const merged: MusicGenConfig = MusicGenConfigSchema.parse({
          provider: body.provider ?? settings.musicConfig?.provider ?? "yunwu",
          model: body.model ?? settings.musicConfig?.model ?? "chirp-v4",
          apiKey: newApiKey,
          baseUrl: body.baseUrl ?? settings.musicConfig?.baseUrl ?? "https://yunwu.ai",
          instrumental: body.instrumental ?? settings.musicConfig?.instrumental ?? false,
        });

        const newSettings: AppSettings = {
          ...settings,
          musicConfig: merged,
        };

        await writeSettingsAtomic(newSettings);
      });

      return c.json({ success: true });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  });

  // POST /api/music/generate — 生成音乐
  router.post("/api/music/generate", async (c) => {
    try {
      const raw = await c.req.json();
      const req = MusicGenRequestSchema.parse(raw);

      const client = await createMusicClientFromSettings();
      const result = await client.generate(req);

      return c.json({
        success: true,
        taskId: result.taskId,
        music: result.music,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[music] generate failed:", e);
      return c.json({ error: `Music generation failed: ${msg}` }, 500);
    }
  });

  return router;
}
