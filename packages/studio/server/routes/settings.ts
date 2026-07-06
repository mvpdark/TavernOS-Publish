// ---------------------------------------------------------------------------
// Settings routes: get and update application-level LLM configuration.
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { z } from "zod";
import {
  providerRegistry,
  createLLMClient,
  normalizeApiUrl,
  type LLMConfig,
  ImageGenConfigSchema,
  TTSConfigSchema,
  VideoGenConfigSchema,
  WebDAVConfigSchema,
  PlusConfigSchema,
  MusicGenConfigSchema,
  StorageModeSchema,
  LocalStorageConfigSchema,
  type EmbedderConfig,
} from "@tavernos/core";
import {
  type AppSettings,
  type ProviderCredential,
  type ProviderCredentials,
  DATA_DIR,
  loadSettings,
  withSettingsLock,
} from "../context";

/** Sentinel value returned by GET to indicate a credential is set but masked. */
const MASK = "***";

/** Mask a single credential string for safe return to the UI. */
function mask(v: string | undefined): string {
  return v ? MASK : "";
}

/**
 * Zod schema for PUT /api/settings body. Only known fields are allowed
 * (whitelist via .strict()); unknown keys are rejected with a 400 error.
 * This prevents injection of arbitrary fields into the settings file.
 */
const SettingsUpdateSchema = z.object({
  service: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  oauthToken: z.string().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().optional(),
  baseUrl: z.string().nullable().optional(),
  imageConfig: ImageGenConfigSchema.optional(),
  ttsConfig: TTSConfigSchema.optional(),
  videoConfig: VideoGenConfigSchema.optional(),
  musicConfig: MusicGenConfigSchema.optional(),
  appearanceConfig: z.record(z.unknown()).optional(),
  agentModels: z.record(z.string()).optional(),
  providerCredentials: z.record(z.unknown()).optional(),
  webdavConfig: WebDAVConfigSchema.optional(),
  storageMode: StorageModeSchema.optional(),
  localStorageConfig: LocalStorageConfigSchema.optional(),
  plusConfig: PlusConfigSchema.optional(),
  embedderConfig: z.record(z.unknown()).optional(),
  liveModels: z.record(z.array(z.unknown())).optional(),
  liveImageModels: z.record(z.array(z.unknown())).optional(),
  liveVideoModels: z.record(z.array(z.unknown())).optional(),
  liveTTSModels: z.record(z.array(z.unknown())).optional(),
}).strict();

export function createSettingsRouter(): Hono {
  const router = new Hono();

  // Get current settings (credentials masked) and available providers
  router.get("/api/settings", async (c) => {
    try {
    const settings = await loadSettings();
    const liveModels = settings.liveModels ?? {};
    const providers = providerRegistry.list().map((cfg) => {
      // Merge live-fetched models with hardcoded models. Some providers
      // (e.g. kimi-coding) have an incomplete /models endpoint, so we
      // always include the hardcoded list as a baseline and union it
      // with whatever the API returned.
      const fetched = liveModels[cfg.id];
      const hardcodedModels = cfg.models.map((m) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindowTokens,
      }));
      const seen = new Set<string>();
      const models: Array<{ id: string; name: string; contextWindow: number }> = [];
      for (const m of [...hardcodedModels, ...(fetched ?? [])]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          models.push({
            id: m.id,
            name: m.name ?? m.id,
            contextWindow: m.contextWindow ?? 0,
          });
        }
      }
      models.sort((a, b) => a.id.localeCompare(b.id));
      return {
        id: cfg.id,
        name: cfg.name,
        apiKeyOptional: cfg.apiKeyOptional ?? false,
        authType: cfg.authType ?? "api-key",
        // Expose the provider's default base URL so the client can decide
        // whether to clear or preserve the user's custom baseUrl on switch.
        baseUrl: cfg.baseUrl ?? "",
        models,
        modelsFetched: !!(fetched && fetched.length > 0),
      };
    });

    // Mask per-provider credentials: "***" when set, "" when empty.
    const maskedCreds: ProviderCredentials = {};
    for (const [id, cred] of Object.entries(settings.providerCredentials ?? {})) {
      maskedCreds[id] = {
        apiKey: mask(cred.apiKey),
        oauthToken: mask(cred.oauthToken),
      };
    }

    // Build a sanitized settings object: strip the raw providerCredentials so
    // plaintext secrets are never sent to the client. Only the masked copy
    // above is returned separately. Deep-clone first so the in-memory settings
    // cache/object is never polluted by the masking.
    const sanitized: AppSettings = {
      ...settings,
      apiKey: mask(settings.apiKey),
      oauthToken: mask(settings.oauthToken),
      // Mask nested config secrets: imageConfig/ttsConfig/videoConfig apiKey
      // and webdavConfig password. Non-sensitive fields (url/model/basePath/…)
      // are preserved verbatim. Cloned so the original settings stay intact.
      imageConfig: settings.imageConfig
        ? { ...settings.imageConfig, apiKey: mask(settings.imageConfig.apiKey) }
        : settings.imageConfig,
      ttsConfig: settings.ttsConfig
        ? { ...settings.ttsConfig, apiKey: mask(settings.ttsConfig.apiKey) }
        : settings.ttsConfig,
      videoConfig: settings.videoConfig
        ? {
            ...settings.videoConfig,
            apiKey: mask(settings.videoConfig.apiKey),
            // Mask jimeng-direct sessionid (sensitive session token)
            jimengSessionId: mask(settings.videoConfig.jimengSessionId),
          }
        : settings.videoConfig,
      webdavConfig: settings.webdavConfig
        ? { ...settings.webdavConfig, password: mask(settings.webdavConfig.password) }
        : settings.webdavConfig,
      storageMode: settings.storageMode,
      localStorageConfig: settings.localStorageConfig,
      // Mask embedder apiKey (Phase B RAG config). Non-sensitive fields
      // (type/model/dimensions/baseUrl) are preserved verbatim.
      embedderConfig: settings.embedderConfig
        ? { ...settings.embedderConfig, apiKey: mask(settings.embedderConfig.apiKey) }
        : settings.embedderConfig,
    };
    delete sanitized.providerCredentials;

    return c.json({
      settings: sanitized,
      providers,
      dataDir: DATA_DIR,
      agentModels: settings.agentModels ?? {},
      providerCredentials: maskedCreds,
    });
    } catch (err) {
      console.error("[settings] GET /api/settings error:", err);
      return c.json({ error: "Failed to load settings" }, 500);
    }
  });

  // Update settings (merge into existing)
  router.put("/api/settings", async (c) => {
    const parseResult = SettingsUpdateSchema.safeParse(await c.req.json());
    if (!parseResult.success) {
      return c.json({ error: "Invalid settings body", details: parseResult.error.issues }, 400);
    }
    const body = parseResult.data as Partial<AppSettings>;

    // Perform the read-merge-write atomically under the settings mutex so
    // concurrent PUTs can't clobber each other (last-write-no-longer-wins).
    await withSettingsLock(async (lock) => {
      const existing = await lock.load();

      // Merge per-provider credentials, preserving existing secrets when the
      // incoming value is the mask sentinel (i.e. unchanged from the UI).
      const incomingCreds = (body.providerCredentials ?? {}) as ProviderCredentials;
      const baseCreds: ProviderCredentials = { ...(existing.providerCredentials ?? {}) };
      for (const [id, cred] of Object.entries(incomingCreds)) {
        const prev = baseCreds[id] ?? {};
        const next: ProviderCredential = { ...prev };
        if (cred.apiKey !== undefined && cred.apiKey !== MASK) {
          next.apiKey = cred.apiKey;
        }
        if (cred.oauthToken !== undefined && cred.oauthToken !== MASK) {
          next.oauthToken = cred.oauthToken;
        }
        if (cred.refreshToken !== undefined && cred.refreshToken !== MASK) {
          next.refreshToken = cred.refreshToken;
        }
        // Drop the entry when all credential fields are empty (user cleared it).
        if (!next.apiKey && !next.oauthToken && !next.refreshToken) {
          delete baseCreds[id];
        } else {
          baseCreds[id] = next;
        }
      }

      const updated: AppSettings = {
        service: body.service ?? existing.service,
        model: body.model ?? existing.model,
        apiKey:
          body.apiKey && body.apiKey !== MASK ? body.apiKey : existing.apiKey,
        oauthToken:
          body.oauthToken && body.oauthToken !== MASK
            ? body.oauthToken
            : existing.oauthToken,
        temperature: body.temperature ?? existing.temperature,
        stream: body.stream ?? existing.stream,
        baseUrl: body.baseUrl ?? existing.baseUrl,
        // Preserve optional configs that are managed by their own endpoints
        imageConfig: existing.imageConfig,
        ttsConfig: existing.ttsConfig,
        appearanceConfig: existing.appearanceConfig,
        videoConfig: existing.videoConfig,
        // Music config — was previously omitted, causing it to be dropped on update
        musicConfig: body.musicConfig ?? existing.musicConfig,
        // Agent model overrides — passed through from body
        agentModels: body.agentModels ?? existing.agentModels,
        // Per-provider credentials (merged above, secrets preserved)
        providerCredentials: baseCreds,
        // WebDAV + Plus + Storage configs managed by their own endpoints
        webdavConfig: existing.webdavConfig,
        storageMode: existing.storageMode,
        localStorageConfig: existing.localStorageConfig,
        plusConfig: existing.plusConfig,
        // Embedder config (Phase B RAG): merge from body, preserving the
        // existing apiKey when the UI sent the mask sentinel (unchanged).
        embedderConfig:
          body.embedderConfig !== undefined
            ? {
                ...body.embedderConfig,
                apiKey:
                  body.embedderConfig.apiKey &&
                  body.embedderConfig.apiKey !== MASK
                    ? body.embedderConfig.apiKey
                    : existing.embedderConfig?.apiKey,
              }
            : existing.embedderConfig,
        // Live-fetched model lists — preserved from existing, falling back to body
        liveModels: body.liveModels ?? existing.liveModels ?? {},
        liveImageModels: body.liveImageModels ?? existing.liveImageModels ?? {},
        liveVideoModels: body.liveVideoModels ?? existing.liveVideoModels ?? {},
        liveTTSModels: body.liveTTSModels ?? existing.liveTTSModels ?? {},
      };
      await lock.write(updated);
    });
    return c.json({ success: true });
  });

  // POST /api/settings/validate-provider — test if a provider's saved key works.
  // Makes a minimal 1-token chat completion to verify the credential.
  router.post("/api/settings/validate-provider", async (c) => {
    const { providerId } = await c.req.json<{ providerId: string }>();
    if (!providerId) return c.json({ valid: false, error: "Missing providerId" }, 400);

    const settings = await loadSettings();
    const cred = settings.providerCredentials?.[providerId];
    const apiKey = cred?.apiKey || cred?.oauthToken || "";
    if (!apiKey) return c.json({ valid: false, error: "No API key configured" });

    const providerCfg = providerRegistry.get(providerId);
    if (!providerCfg) return c.json({ valid: false, error: "Unknown provider" });

    // Pick the first model from the provider for the test call.
    const testModel = providerCfg.models[0];
    if (!testModel) return c.json({ valid: false, error: "Provider has no available models" });

    const config: LLMConfig = {
      service: providerId,
      model: testModel.id,
      apiKey,
      baseUrl: providerCfg.baseUrl || "",
      stream: false,
      temperature: 0,
      apiFormat: "chat",
      provider: "custom",
      configSource: "studio",
      thinkingBudget: 0,
    };

    try {
      const client = createLLMClient(config);
      await client.chat(testModel.id, [{ role: "user", content: "Hi" }], {
        maxTokens: 1,
      });
      return c.json({ valid: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Distinguish auth errors from network errors
      const isAuthError = msg.includes("401") || msg.includes("403") || msg.includes("Authentication") || msg.includes("invalid_api_key");
      return c.json({
        valid: false,
        error: isAuthError ? "Invalid or expired API key" : `Connection failed: ${msg.slice(0, 120)}`,
      });
    }
  });

  // POST /api/settings/fetch-models — call the provider's /models endpoint
  // using the user's saved API key to dynamically retrieve the list of
  // models the key actually has access to. The result is persisted in
  // settings.liveModels and returned to the caller.
  router.post("/api/settings/fetch-models", async (c) => {
    const { providerId, baseUrl: customBaseUrl } = await c.req.json<{ providerId: string; baseUrl?: string }>();
    if (!providerId) return c.json({ error: "Missing providerId" }, 400);

    const settings = await loadSettings();
    const cred = settings.providerCredentials?.[providerId];
    const apiKey = cred?.apiKey || cred?.oauthToken || "";
    if (!apiKey || apiKey === MASK) {
      return c.json({ error: "Please configure the API key for this provider first" }, 400);
    }

    const providerCfg = providerRegistry.get(providerId);
    if (!providerCfg) return c.json({ error: "Unknown provider" }, 400);

    // Use custom baseUrl if provided (user override), otherwise the provider's default.
    const baseUrl = customBaseUrl || providerCfg.baseUrl || "";
    if (!baseUrl) return c.json({ error: "Missing baseUrl" }, 400);

    // Determine the models-list endpoint and headers based on API format.
    // OpenAI-compatible: GET {baseUrl}/models  with  Authorization: Bearer
    // Anthropic Messages API: GET {baseUrl}/v1/models  with  x-api-key + anthropic-version
    const isAnthropic = providerCfg.provider === "anthropic";
    const modelsUrl = isAnthropic
      ? normalizeApiUrl(baseUrl, "/v1/models")
      : normalizeApiUrl(baseUrl, "/models");
    const headers: Record<string, string> = isAnthropic
      ? {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        }
      : {
          "Authorization": `Bearer ${apiKey}`,
        };

    try {
      const response = await fetch(modelsUrl, { method: "GET", headers });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        const isAuthError = response.status === 401 || response.status === 403;
        return c.json({
          error: isAuthError
            ? `Invalid API key or insufficient permissions (${response.status})`
            : `Request failed ${response.status}: ${errText.slice(0, 200)}`,
        }, response.status >= 400 && response.status < 500 ? 400 : 502);
      }

      const data = await response.json() as {
        data?: Array<{ id: string; display_name?: string; context_window?: number; owned_by?: string }>;
      };

      // Normalise the response into our model-list shape.
      // OpenAI format: { data: [{ id, ... }] }
      // Anthropic format: { data: [{ id, display_name, ... }] }
      const rawModels = data.data ?? [];
      let apiModels = rawModels.map((m) => ({
        id: m.id,
        name: m.display_name ?? m.id,
        contextWindow: m.context_window ?? 0,
      }));

      // Categorize models into chat / image / video / tts based on ID patterns.
      // Non-chat models are separated out so they can appear in the correct
      // config dropdown (image gen, video gen, TTS) instead of cluttering
      // the LLM model list.
      const imagePatterns = [
        /^dall-e/i, /^gpt-image/i, /^flux/i, /^mj_/i, /^kling-image/i,
        /^kling-omni-image/i, /^z-image/i, /^doubao-seedream/i, /^qwen-image/i,
        /^grok-imagine/i, /^gemini-.*image/i, /^wan2.*image/i, /^pixverse.*image/i,
      ];
      const videoPatterns = [
        /^kling-video/i, /^kling-.*video/i, /^kling-omni-video/i, /^vidu/i,
        /^wan2/i, /^happyhorse/i, /^doubao-seedance/i, /^pixverse-video/i,
        /^pixverse.*video/i, /^mj_video/i, /^kling-effects/i, /^kling-motion/i,
        /^kling-custom/i, /^kling-multi/i, /^kling-advanced/i,
      ];
      const ttsPatterns = [
        /^tts-/i, /^gpt-4o.*tts/i, /^gpt-4o-mini.*tts/i, /^speech-/i,
        /^qwen3-tts/i, /^gemini-.*tts/i, /^vidu-tts/i, /^tts-hd/i,
        /^MiniMax-Voice/i,
      ];

      const imageModels: Array<{ id: string; name: string }> = [];
      const videoModels: Array<{ id: string; name: string }> = [];
      const ttsModels: Array<{ id: string; name: string }> = [];
      // Remove non-chat models from the main list and route them to their category.
      // Order: image → TTS → video (TTS before video so vidu-tts isn't caught by ^vidu)
      apiModels = apiModels.filter((m) => {
        if (imagePatterns.some((re) => re.test(m.id))) {
          imageModels.push({ id: m.id, name: m.name });
          return false;
        }
        if (ttsPatterns.some((re) => re.test(m.id))) {
          ttsModels.push({ id: m.id, name: m.name });
          return false;
        }
        if (videoPatterns.some((re) => re.test(m.id))) {
          videoModels.push({ id: m.id, name: m.name });
          return false;
        }
        return true;
      });

      // Apply provider's excluded model patterns (blacklist) to filter out
      // deprecated/old models from the live API response.
      if (providerCfg.excludedModelPatterns && providerCfg.excludedModelPatterns.length > 0) {
        const patterns = providerCfg.excludedModelPatterns.map((p) => new RegExp(p, "i"));
        apiModels = apiModels.filter((m) => !patterns.some((re) => re.test(m.id)));
      }

      // Merge API-fetched chat models with hardcoded models from the provider config.
      // Some providers (e.g. kimi-coding) have an incomplete /models endpoint
      // that only returns a subset of actually-available models. By merging,
      // we ensure the user always sees the full list of known models.
      const hardcodedModels = providerCfg.models.map((m) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindowTokens,
      }));
      const seen = new Set<string>();
      const models: Array<{ id: string; name: string; contextWindow: number }> = [];
      for (const m of [...hardcodedModels, ...apiModels]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          models.push(m);
        }
      }
      models.sort((a, b) => a.id.localeCompare(b.id));

      // Sort categorized models too.
      imageModels.sort((a, b) => a.id.localeCompare(b.id));
      videoModels.sort((a, b) => a.id.localeCompare(b.id));
      ttsModels.sort((a, b) => a.id.localeCompare(b.id));

      if (models.length === 0 && imageModels.length === 0 && videoModels.length === 0 && ttsModels.length === 0) {
        return c.json({ error: "API returned an empty model list" }, 502);
      }

      // Persist the fetched models in settings so they survive reloads.
      await withSettingsLock(async (lock) => {
        const existing = await lock.load();
        const updated: AppSettings = {
          ...existing,
          liveModels: {
            ...(existing.liveModels ?? {}),
            [providerId]: models,
          },
          liveImageModels: {
            ...(existing.liveImageModels ?? {}),
            [providerId]: imageModels,
          },
          liveVideoModels: {
            ...(existing.liveVideoModels ?? {}),
            [providerId]: videoModels,
          },
          liveTTSModels: {
            ...(existing.liveTTSModels ?? {}),
            [providerId]: ttsModels,
          },
        };
        await lock.write(updated);
      });

      return c.json({ models, imageModels, videoModels, ttsModels });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: `Connection failed: ${msg.slice(0, 200)}` }, 502);
    }
  });

  return router;
}
