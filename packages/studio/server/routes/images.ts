// ---------------------------------------------------------------------------
// Images route: image generation config + image generation endpoints.
//
// Endpoints:
//   GET  /api/images/config            — image gen config (apiKey masked) + providers
//   PUT  /api/images/config            — save image gen config
//   POST /api/projects/:id/images/generate — generate image(s) from a prompt
//   GET  /api/projects/:id/images      — list saved image metadata
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { imageProviderRegistry, ImageGenRequestSchema, providerRegistry } from "@tavernos/core";
import {
  type AppSettings,
  type ImageGenConfig,
  DATA_DIR,
  loadSettings,
  writeJson,
  ensureDir,
  readJson,
  createImageClientFromSettings,
  safeProjectId,
  withSettingsLock,
} from "../context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedImage {
  id: string;
  prompt: string;
  url: string;
  revisedPrompt?: string;
  b64Json?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createImagesRouter(): Hono {
  const router = new Hono();

  // --- Get image generation config (apiKey masked) + available providers ---
  router.get("/api/images/config", async (c) => {
    const settings = await loadSettings();
    const cfg = settings.imageConfig ?? {};
    const providers = imageProviderRegistry.list().map((p) => ({
      id: p.id,
      name: p.name,
      apiKeyOptional: p.apiKeyOptional ?? false,
      models: p.models.map((m) => ({ id: m.id, name: m.name })),
      baseUrl: p.baseUrl,
    }));

    // Merge live-fetched image models from LLM providers (e.g. yunwu).
    // When the user has fetched models from a provider like yunwu, image
    // models (dall-e, flux, etc.) are categorized separately and should
    // appear here in the image config dropdown.
    const liveImageModels = settings.liveImageModels ?? {};
    for (const [providerId, models] of Object.entries(liveImageModels)) {
      if (models.length === 0) continue;
      // Check if this provider is already in the image provider registry.
      // If not, add it as a live-fetched entry using the LLM provider's
      // API key and base URL.
      const existing = providers.find((p) => p.id === providerId);
      if (existing) {
        // Merge: add live models that aren't already in the list.
        const seen = new Set(existing.models.map((m) => m.id));
        for (const m of models) {
          if (!seen.has(m.id)) {
            existing.models.push({ id: m.id, name: m.name ?? "Unknown" });
          }
        }
      } else {
        // Add as a new provider entry using the LLM provider's config.
        const llmProvider = providerRegistry.get(providerId);
        const llmCred = settings.providerCredentials?.[providerId];
        if (llmProvider && (llmCred?.apiKey || llmCred?.oauthToken)) {
          providers.push({
            id: providerId,
            name: llmProvider.name,
            apiKeyOptional: false,
            models: models.map((m) => ({ id: m.id, name: m.name ?? "Unknown" })),
            baseUrl: llmProvider.baseUrl,
          });
        }
      }
    }

    return c.json({
      config: {
        ...cfg,
        apiKey: cfg.apiKey ? "***" : "",
      },
      providers,
    });
  });

  // --- Save image generation config (merge into settings.imageConfig) ---
  router.put("/api/images/config", async (c) => {
    const body = await c.req.json<Partial<ImageGenConfig>>();
    // Atomic read-merge-write under the settings mutex.
    await withSettingsLock(async (lock) => {
      const existing = await lock.load();

      // Preserve existing apiKey when the client sends the mask placeholder
      const apiKey =
        body.apiKey && body.apiKey !== "***"
          ? body.apiKey
          : existing.imageConfig?.apiKey ?? "";

      const imageConfig: Partial<ImageGenConfig> = {
        ...body,
        apiKey,
      };

      const updated: AppSettings = {
        ...existing,
        imageConfig,
      };
      await lock.write(updated);
    });
    return c.json({ success: true });
  });

  // --- Generate image(s) from a prompt ---
  router.post("/api/projects/:projectId/images/generate", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const raw = await c.req.json();
    const parseResult = ImageGenRequestSchema.safeParse(raw);

    if (!parseResult.success) {
      return c.json({ error: "Invalid request parameters", details: parseResult.error.issues }, 400);
    }

    const request = parseResult.data;

    let client;
    try {
      client = await createImageClientFromSettings();
    } catch (e) {
      console.error("[images] config error:", e);
      return c.json({ error: "Image generation configuration error" }, 500);
    }

    try {
      const response = await client.generate(request);

      // Persist image metadata to the project's images directory
      const imagesDir = join(DATA_DIR, projectId, "images");
      await ensureDir(imagesDir);

      const saved: SavedImage[] = response.images.map((img) => {
        const id = randomUUID();
        const record: SavedImage = {
          id,
          prompt: request.prompt,
          url: img.url,
          revisedPrompt: img.revisedPrompt,
          b64Json: img.b64Json,
          createdAt: response.created,
        };
        writeJson(join(imagesDir, `${id}.json`), record).catch((e) =>
          console.error("Failed to write image record:", e),
        );
        return record;
      });

      return c.json({ images: saved, created: response.created });
    } catch (e) {
      console.error("[images] generation failed:", e);
      return c.json({ error: "Image generation failed, please check server logs" }, 500);
    }
  });

  // --- List saved image metadata for a project (with pagination) ---
  router.get("/api/projects/:projectId/images", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const imagesDir = join(DATA_DIR, projectId, "images");
    await ensureDir(imagesDir);

    // Pagination: ?limit=50&offset=0 (L9)
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") ?? "50", 10) || 50, 1), 200);
    const offset = Math.max(parseInt(c.req.query("offset") ?? "0", 10) || 0, 0);

    const files = await readdir(imagesDir);
    const images: SavedImage[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const record = await readJson<SavedImage>(join(imagesDir, file));
      if (record) images.push(record);
    }
    // Newest first
    images.sort((a, b) => b.createdAt - a.createdAt);
    const total = images.length;
    const paged = images.slice(offset, offset + limit);
    return c.json({ images: paged, total });
  });

  return router;
}
